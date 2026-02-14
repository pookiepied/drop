<!-- PROJECT LOGO -->
<br />
<div align="center">
  <h1 align="center">drop.</h1>
  <p align="center">
    <strong>Peer-to-Peer File Sharing</strong><br />
    <br />
    <br />
    <a href="#quick-start">Quick Start</a>
    ·
    <a href="#how-it-works">How It Works</a>
    ·
    <a href="#features">Features</a>
    ·
    <a href="#technical-details">Technical Details</a>
  </p>
</div>

<br />

## About The Project

**drop.** is a minimalist peer-to-peer file sharing system built for **LAN and internet file transfers**. Created for personal use, this project solves the need for quick, secure file sharing without relying on cloud services or third-party servers.

### Key Features

- **True P2P**: Files travel directly between peers - no middleman
- **Three-Tier Connectivity System**:
  - **Layer 1**: Pure LAN WebRTC (fastest)
  - **Layer 2**: P2P WebRTC over internet using Google STUN
  - **Layer 3**: Cloudflare TURN server for restrictive networks
- **No Account Required**: Share instantly with room codes or QR codes
- **Cross-Platform**: Works on any modern browser
- **PWA Support**: Installable app experience with offline capabilities
- **QR Code Scanning**: Built-in QR scanner for mobile users (PWA only)
- **Streaming Support**: Zero RAM footprint on supported browsers
- **Pause/Resume**: Supported. Transfers can be paused and resumed during operation. Minor edge cases may still exist and are being refined.

### Why This Exists

I built this because existing file-sharing tools felt bloated and clunky. I wanted something lightweight that just works the way I think about sharing files.


> **Note**: This is a personal hobby project. It works, but don't expect enterprise (dawgg it's bad) grade service/performance.

<br />

## Quick Start

### Prerequisites

- **Cloudflare Account** (free tier works perfectly)
- **Node.js** (for Wrangler CLI)

### Step 1: Deploy Signaling Server

```bash
# Install Wrangler globally
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy the signaling server
wrangler deploy
```

**Save your Worker URL** - it'll look like: `https://drop-signal.yourname.workers.dev`

### Step 2: Configure Frontend

Open `index.html` and update line 961:

```javascript
// Replace with your deployed Worker URL
const SIGNAL_HTTP = "https://drop-signal.yourname.workers.dev";
```

### Step 3: Optional - Enable TURN Server

For better connectivity through firewalls:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Media → Real-time → TURN Server
2. Create a TURN key and get your API token
3. In your Worker settings, add environment variables:
   - `TURN_KEY_ID` = your_key_id
   - `TURN_API_TOKEN` = your_api_token

### Step 4: Host Your Frontend

Upload `index.html` to any static hosting service:
- **Cloudflare Pages** (recommended)
- **GitHub Pages**
- **Vercel**

Or simply open the file locally for testing!

> **Bandwidth Notice**: Cloudflare's free tier includes 1,000 GB/month bandwidth. The public instance I've deployed uses this allocation. Feel free to use it, but please be considerate of bandwidth usage. For heavy or frequent transfers, I recommend deploying your own instance.

<br />

## How It Works

### Architecture Overview

```
Peer A ←→ [ Signaling Server (Cloudflare Worker) ] ←→ Peer B
              ↑
         [ TURN Server (optional) ]
```

### Connection Flow

1. **Sender** creates a room → Worker generates unique room ID
2. **Receiver** joins with room code → Both peers connect to Worker via WebSocket
3. **WebRTC Handshake**: 
   - Offer/Answer exchange through signaling server
   - ICE candidate negotiation
   - Direct P2P connection established
4. **File Transfer**: Data flows directly between peers via RTCDataChannel

### Three-Tier Connection System

| Tier | Technology | Use Case | Speed |
|-------|------------|----------|-------|
| **Layer 1** | Pure LAN WebRTC | Local network | Fastest |
| **Layer 2** | P2P WebRTC + Google STUN | Internet (no NAT) | Fast |
| **Layer 3** | Cloudflare TURN Server | Restricted networks | Good |

### Data Protocol

```javascript
// 1. Metadata (JSON)
{ "__meta": true, "name": "file.zip", "size": 1048576, "type": "application/zip" }

// 2. Data Chunks (Base64 encoded)
{ "sequence": 0, "data": "base64_chunk_data", "checksum": 123456789, "isFinal": false }

// 3. End of Transfer
{ "__eof": true }
```

<br />

## Features & Capabilities

### Current Features

- **Single File Transfer**: Drag & drop or file picker
- **Room Codes**: 6-character unique identifiers
- **QR Code Sharing**: Instant mobile connection
- **QR Code Scanning**: Built-in scanner for PWA users
- **PWA Support**: Installable app experience with offline capabilities
- **Shareable Links**: `?room=abc123` URL parameters
- **Progress Tracking**: Real-time speed, ETA, and progress bars
- **Pause/Resume**: Control transfers mid-flight
- **Streaming Mode**: Zero RAM usage (Chromium browsers)
- **Checksum Validation**: CRC32 integrity checking
- **Responsive Design**: Works on desktop and mobile

### Planned Features

- **Folder Support**: Multi-file transfers with directory structure
- **File Queue**: Send multiple files sequentially
- **Multi-peer Rooms**: More than 2 people in a room
- **Transfer History**: Recent connections and files
- **File Previews**: Image/audio/video thumbnails

### Browser Support

| Feature | Chrome/Edge | Firefox | Safari | Mobile Chrome | Mobile Safari |
|---------|-------------|---------|---------|---------------|---------------|
| Basic Transfer | ✅ | ✅ | ✅ | ✅ | ✅ |
| Streaming Mode | ✅ (86+) | ❌ | ❌ | ✅ | ❌ |
| QR Codes | ✅ | ✅ | ✅ | ✅ | ✅ |
| Link Sharing | ✅ | ✅ | ✅ | ✅ | ✅ |

<br />

## Technical Details

### Project Structure

```
📁 Project Root
├── index.html                    # Complete frontend application
├── src/
│   ├── index.js                  # Cloudflare Worker (signaling server)
│   ├── branding.js               # Shared branding configuration
│   └── components/
│       └── pwa-install.js        # PWA installation component
├── favicon.png                   # Site favicon
├── social-preview.png            # Social media preview image
├── manifest.json                 # PWA manifest configuration
├── service-worker.js             # Service worker for PWA functionality
├── wrangler.toml                 # Worker deployment configuration
└── README.md                     # This file
```

### Core Components

#### 1. Frontend (index.html)
- **Size**: Small & single file
- **No build step required**
- **Self-contained**: All CSS, JS, and HTML in one file
- **Libraries used**: 
  - [QRious](https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js) for QR code generation
  - Native WebRTC APIs

#### 2. Signaling Server (src/index.js)
- **Runtime**: Cloudflare Workers
- **Storage**: Durable Objects for room state
- **WebSocket**: Real-time peer coordination
- **TURN Integration**: Dynamic credential fetching

#### 3. WebRTC Configuration

```javascript
// Default ICE configuration
const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },  // Google STUN
    // TURN servers added dynamically from Cloudflare API
  ]
};
```

### Security Considerations

- **No Authentication**: Join just using a code
- **Ephemeral Rooms**: Auto-deleted after 3 minutes of inactivity
- **End-to-End Encryption**: WebRTC provides built-in encryption
- **No Data Storage**: Files never touch the server
- **Temporary Room IDs**: 6-character random identifiers

### Performance Metrics

- **Chunk Size**: 16KB (optimized for WebRTC)
- **Memory Usage**: 
  - Streaming mode: ~50MB peak
  - Traditional mode: File size + overhead
- **Connection Time**: 1-3 seconds (LAN), 1-5 seconds (internet)
- **Transfer Speed**: Limited by network bandwidth and NAT type

### Limitations & Known Issues

- **Two Peers Only**: Room capacity hard-limited to 2 connections
- **Single File**: No folder or batch support yet
- **Pause/Resume Bugs**: UI controls work but reliability varies

<br />

## Development & Customization

### Local Development

```bash
# Serve locally for testing
npx serve .

# Or with Python
python3 -m http.server 8080

# Test on local network
http://YOUR_LOCAL_IP:8080
```


### Adding New Features

1. **Frontend**: Edit `index.html` - all logic is contained in `<script>` tags
2. **Backend**: Modify `src/index.js` for signaling logic
3. **Deploy**: `wrangler deploy` to update your Worker

### Debugging Tips

```javascript
// Enable detailed logging
console.log("[webrtc] connectionState =", pc.connectionState);
console.log("[signal] WebSocket messages =", msg);

// Check ICE candidates
pc.addEventListener("icecandidate", e => {
  console.log("ICE candidate:", e.candidate);
});

// Monitor data channel
dataChannel.addEventListener("open", () => {
  console.log("Data channel opened");
});
```

<br />

## Contributing

This is a **personal project** maintained by one developer. While I appreciate feedback and suggestions, I'm not actively seeking contributions or feature requests. 

However, feel free to:
- Fork and modify for your own use
- Report bugs you encounter 
- Share your deployment experiences


## License

This project is released under the **MIT License** - see the [LICENSE](LICENSE) file for details.

**TL;DR**: You may use, modify, and distribute this project for any purpose. It is provided “as is,” without warranties of any kind, and the author is not liable for any damages, data loss, or issues resulting from its use.

<br />

## About the Developer

**Hi, I'm pookiepied**

I’m a game developer who has a habit of building tools instead of working on the actual game. What started as a small, unnecessary (according to my friends) idea turned into a full project—part curiosity, part avoidance, fully intentional.

### My Journey

- I don't even know what the heck I'm doing!


### Connect With Me (Please Don't)

- **Website**: [pookiepied.dev](https://pookiepied.dev)
- **GitHub**: [github.com/pookiepied](https://github.com/pookiepied)
- **Instagram**: [@pookiepied](https://instagram.com/pookiepied)
- **YouTube**: [pookiepied](https://youtube.com/@pookiepied)
- **Twitter**: [@pookiepied](https://twitter.com/pookiepied)

## Acknowledgments

- **Cloudflare Workers** team for amazing documentation
- **ChatGPT** for helping me work through complex problems

---

<div align="center">
  <p><strong>Made with ❤️</strong></p>
  <p><em>drop. - what happens when “just send it to me” becomes a project</em></p>
</div>
