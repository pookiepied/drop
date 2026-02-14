// WebRTC Signaling Server
// Cloudflare Worker with Durable Objects

// Protocol:
// 1. POST /room        → Creates new room, returns { roomId }
// 2. GET  /room/:id/ws → WebSocket upgrade, joins room
// 3. GET  /turn-config → TURN server config
// 4. Forward WebRTC signaling messages between peers

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // TURN server configuration endpoint
    if (request.method === "GET" && path === "/turn-config") {
      try {
        // Fetch TURN credentials from Cloudflare Realtime API
        const turnKeyId = env.TURN_KEY_ID;
        const turnApiToken = env.TURN_API_TOKEN;
        
        console.log("TURN_KEY_ID exists:", !!turnKeyId);
        console.log("TURN_API_TOKEN exists:", !!turnApiToken);
        
        if (!turnKeyId || !turnApiToken) {
          console.log("Missing TURN credentials, returning empty iceServers");
          // Return empty array to fallback to STUN only
          return Response.json({
            iceServers: [],
            debug: {
              hasKeyId: !!turnKeyId,
              hasApiToken: !!turnApiToken,
              message: "TURN credentials not configured, using STUN only"
            }
          }, { headers: cors });
        }
        
        // Log key ID (first 8 chars) for debugging
        console.log("Attempting to call Cloudflare API with key ID:", turnKeyId.substring(0, 8) + "...");  
        
        // Generate TURN credentials with 24-hour TTL
        const response = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${turnKeyId}/credentials/generate-ice-servers`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${turnApiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ttl: 86400 }) // 24 hours TTL
        });
        
        console.log("API response status:", response.status, "statusText:", response.statusText);
        
        if (response.ok) {
          const data = await response.json();
          console.log("Successfully fetched TURN credentials");
          return Response.json(data, { headers: cors });
        } else {
          console.error("Failed to generate TURN credentials:", response.status, response.statusText);
          const errorBody = await response.text();
          console.error("Error response body:", errorBody);
          
          // Fallback to STUN only with debug info
          return Response.json({
            iceServers: [],
            debug: {
              message: "Failed to fetch TURN credentials from Cloudflare API",
              status: response.status,
              statusText: response.statusText,
              errorDetails: errorBody,
              attemptedUrl: `https://rtc.live.cloudflare.com/v1/turn/keys/${turnKeyId}/credentials/generate-ice-servers`
            }
          }, { headers: cors });
        }
      } catch (error) {
        console.error("Error generating TURN config:", error);
        // Fallback to STUN only with error info
        return Response.json({
          iceServers: [],
          debug: {
            message: "Error occurred while trying to fetch TURN credentials",
            error: error.message
          }
        }, { headers: cors });
      }
    }

    if (request.method === "POST" && path === "/room") {
      const roomId = generateId();
      const id = env.ROOMS.idFromName(roomId);
      const stub = env.ROOMS.get(id);
      await stub.fetch(new Request("https://internal/init"));
      return Response.json({ roomId }, { headers: cors });
    }

    const wsMatch = path.match(/^\/room\/([^/]+)\/ws$/);
    if (wsMatch) {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket upgrade", { status: 426, headers: cors });
      }
      const roomId = wsMatch[1];
      const id = env.ROOMS.idFromName(roomId);
      const stub = env.ROOMS.get(id);
      return stub.fetch(request);
    }

    return new Response("Not found", { status: 404, headers: cors });
  },
};

// Durable Object for room management
//
// Cloudflare's Hibernatable WebSocket API doesn't preserve
// in-memory state between events. Each event is a fresh instantiation.
//
// Solution:
// • Store peerId via ws.serializeAttachment()
// • Use this.state.getWebSockets() to enumerate live sockets
export class Room {
  constructor(state, env) {
    this.state = state;
  }

  // Cleanup alarm - removes empty rooms automatically
  async alarm() {
    const sockets = this.state.getWebSockets();
    const activeSockets = sockets.filter(s => s.readyState <= 1); // OPEN or CLOSING
    
    if (activeSockets.length === 0) {
      // Clean up empty room data
      await this.state.storage.deleteAll();
      console.log(`[cleanup] Room expired and cleaned up`);
    } else {
      // Reschedule cleanup if room still has connections
      await this.state.storage.setAlarm(Date.now() + 3 * 60 * 1000); // Check again in 3 minutes
    }
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/init") {
      return new Response("ok");
    }

    // Limit to 2 peers per room
    const sockets = this.state.getWebSockets();
    if (sockets.length >= 2) {
      return new Response("Room full", { status: 403 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    this.state.acceptWebSocket(server);

    const peerId = generateId(8);

    // Store peerId on socket - survives hibernation
    server.serializeAttachment({ peerId });

    // getWebSockets() includes this socket since acceptWebSocket was called
    const peerCount = this.state.getWebSockets().length;

    server.send(
      JSON.stringify({ type: "welcome", peerId, peerCount })
    );

    // Notify other peer
    this.broadcast({ type: "peer-joined", peerId }, peerId);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    const { peerId: senderId } = ws.deserializeAttachment();

    if (
      data.type === "offer" ||
      data.type === "answer" ||
      data.type === "ice-candidate"
    ) {
      this.broadcast({ ...data, from: senderId }, senderId);
      return;
    }

    // Handle pause/resume signals
    if (data.type === "transfer-paused") {
      this.broadcast({ type: "transfer-paused", from: senderId }, senderId);
      return;
    }
    
    if (data.type === "transfer-resumed") {
      this.broadcast({ type: "transfer-resumed", from: senderId }, senderId);
      return;
    }
    
    if (data.type === "ping") {
      ws.send(JSON.stringify({ type: "pong", peerCount: this.state.getWebSockets().length }));
      return;
    }
  }

  async webSocketClose(ws) {
    try {
      const { peerId } = ws.deserializeAttachment();
      this.broadcast({ type: "peer-left", peerId }, peerId);
      
      // Schedule cleanup if room becomes empty
      const remainingSockets = this.state.getWebSockets().filter(
        s => s !== ws && s.readyState <= 1
      ).length;
      
      if (remainingSockets === 0) {
        // Set alarm for 3 minutes from now
        await this.state.storage.setAlarm(Date.now() + 3 * 60 * 1000);
        console.log(`[cleanup] Scheduled room cleanup in 3 minutes (room empty)`);
      }
    } catch {}
  }

  async webSocketError(ws) {
    try {
      const { peerId } = ws.deserializeAttachment();
      this.broadcast({ type: "peer-left", peerId }, peerId);
      
      // Schedule cleanup on error if room becomes empty
      const remainingSockets = this.state.getWebSockets().filter(
        s => s !== ws && s.readyState <= 1
      ).length;
      
      if (remainingSockets === 0) {
        await this.state.storage.setAlarm(Date.now() + 3 * 60 * 1000);
        console.log(`[cleanup] Scheduled room cleanup due to connection error`);
      }
    } catch {}
  }

  broadcast(msg, excludePeerId = null) {
    const text = JSON.stringify(msg);
    for (const ws of this.state.getWebSockets()) {
      try {
        const { peerId } = ws.deserializeAttachment();
        if (peerId !== excludePeerId) {
          ws.send(text);
        }
      } catch {
        // Socket closed
      }
    }
  }
}

function generateId(len = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (const byte of arr) id += chars[byte % chars.length];
  return id;
}
