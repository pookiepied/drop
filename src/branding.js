// Branding configuration
// Shared elements for web and app versions

const BRANDING = {
  // Core branding
  name: 'Drop',
  displayName: 'drop.',
  tagline: 'peer-to-peer · no server · no trace',
  
  // Color scheme
  colors: {
    primary: '#e8ff6e',        // Electric chartreuse
    secondary: '#6effd8',      // Mint
    background: '#0c0c0e',     // Dark background
    surface: '#141416',        // Card surfaces
    border: '#2a2a2e',         // Borders
    dim: '#3a3a40',            // Dim elements
    muted: '#666670',          // Muted text
    text: '#e8e8ee',           // Main text
    danger: '#ff6e6e',         // Error/warning
    success: '#6effa0'         // Success states
  },
  
  // Core features
  features: {
    p2p: 'Peer-to-peer file sharing',
    encrypted: 'End-to-end encrypted',
    noServer: 'No cloud storage required',
    offline: 'Works offline when installed',
    instant: 'Real-time transfers'
  },
  
  // PWA exclusive features
  pwaExclusive: [
    'QR code scanning',
    'Push notifications', 
    'Native app experience',
    'Home screen integration',
    'Background transfers',
    'Device integration'
  ],
  
  // Web-only features
  webFeatures: [
    'Browser based',
    'No installation required',
    'Cross-platform compatibility',
    'Immediate access'
  ],
  
  // Feature descriptions for consistent messaging
  featureDescriptions: {
    'p2p': 'Files transfer directly between devices without intermediaries',
    'encrypted': 'All data is encrypted end-to-end for maximum security',
    'noServer': 'No cloud storage or third-party servers involved',
    'offline': 'Continue using the app even without internet connection',
    'instant': 'Files transfer in real-time with minimal latency',
    'qrScanning': 'Quickly join file transfers by scanning QR codes',
    'notifications': 'Get notified when transfers complete or peers connect',
    'native': 'App-like experience with native performance and integration'
  },
  
  // Platform-specific messaging
  platformMessages: {
    web: {
      title: 'Browser Version',
      description: 'Works immediately in any modern browser',
      benefits: [
        'No installation required',
        'Cross-platform compatibility',
        'Immediate access to core features',
        'Works on all devices with a browser'
      ]
    },
    pwa: {
      title: 'App Version',
      description: 'Install for enhanced functionality and performance',
      benefits: [
        'Native app experience',
        'Offline capability',
        'Push notifications',
        'QR code scanning',
        'Faster loading times'
      ]
    }
  },
  
  // Installation guidance
  installation: {
    chromium: {
      prompt: 'Install for faster access and offline use',
      steps: [
        'Click the install button below',
        'Confirm installation in the browser prompt',
        'Access from your home screen or app launcher'
      ]
    },
    safari: {
      prompt: 'Add to Home Screen for app-like experience',
      steps: [
        'Tap the Share button',
        'Select "Add to Home Screen"',
        'Tap "Add" to confirm'
      ]
    }
  }
};

// Export module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BRANDING;
} else {
  // Make available globally
  window.BRANDING = BRANDING;
  
  // Make components available
  window.BRANDING_COLORS = BRANDING.colors;
  window.BRANDING_FEATURES = BRANDING.features;
  window.BRANDING_PWA_EXCLUSIVE = BRANDING.pwaExclusive;
}

// Branding utilities
const BrandingUtils = {
  // Get feature description by key
  getFeatureDescription: (key) => {
    return BRANDING.featureDescriptions[key] || '';
  },
  
  // Get platform-specific message
  getPlatformMessage: (platform) => {
    return BRANDING.platformMessages[platform] || BRANDING.platformMessages.web;
  },
  
  // Get installation guidance
  getInstallationGuidance: (browser) => {
    if (browser.includes('Safari')) {
      return BRANDING.installation.safari;
    }
    return BRANDING.installation.chromium;
  },
  
  // Check if feature is PWA exclusive
  isPWAExclusive: (feature) => {
    return BRANDING.pwaExclusive.includes(feature);
  },
  
  // Get all features for a platform
  getFeaturesForPlatform: (platform) => {
    if (platform === 'pwa') {
      return [...Object.values(BRANDING.features), ...BRANDING.pwaExclusive];
    }
    return [...Object.values(BRANDING.features), ...BRANDING.webFeatures];
  }
};

// Export utilities
if (typeof module !== 'undefined' && module.exports) {
  module.exports.utils = BrandingUtils;
} else {
  window.BrandingUtils = BrandingUtils;
}