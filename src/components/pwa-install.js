// PWA installation component
// Handles install prompts for Chromium browsers

class PWAInstallComponent {
  constructor() {
    this.deferredPrompt = null;
    this.installButton = null;
  }
  
  init() {
    // Listen for install prompt event (Chromium browsers only)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });
    
    // Handle installation success
    window.addEventListener('appinstalled', () => {
      this.hideInstallButton();
      this.showSuccessMessage();
    });
  }
  
  showInstallButton() {
    // Create install button
    const button = document.createElement('div');
    button.className = 'pwa-install-prompt';
    button.innerHTML = `
      <button class="install-btn" title="Install for faster access and offline use">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 3v18M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Install App</span>
      </button>
      <div class="install-tooltip">
        <p>Get native app experience with offline access and faster loading</p>
        <ul>
          <li>QR code scanning</li>
          <li>Offline file transfers</li>
          <li>Push notifications</li>
        </ul>
      </div>
    `;
    
    document.body.appendChild(button);
    this.installButton = button;
    
    // Add event listener
    button.querySelector('.install-btn').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.triggerInstall();
    });
  }
  
  async triggerInstall() {
    if (!this.deferredPrompt) {
      console.log('No installation prompt available');
      return;
    }
    
    try {
      // Show the install prompt
      this.deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await this.deferredPrompt.userChoice;
      
      console.log(`User response to PWA install prompt: ${outcome}`);
      
      if (outcome === 'accepted') {
        this.hideInstallButton();
      }
      
      // Clear the saved prompt since it can't be used again
      this.deferredPrompt = null;
    } catch (error) {
      console.error('Error during PWA installation:', error);
    }
  }
  
  hideInstallButton() {
    if (this.installButton) {
      this.installButton.remove();
      this.installButton = null;
    }
  }
  
  showSuccessMessage() {
    // Success notification
    const notification = document.createElement('div');
    notification.className = 'install-success';
    notification.textContent = 'App installed successfully';
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PWAInstallComponent;
} else {
  window.PWAInstallComponent = PWAInstallComponent;
}