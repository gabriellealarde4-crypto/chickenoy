// Service Worker Registration and PWA Setup
// This script should be included in all HTML pages

(function() {
  'use strict';

  // Check if service workers are supported and only register on secure origins
  if ('serviceWorker' in navigator) {
    const hostname = (window.location && window.location.hostname) || '';
    const protocol = (window.location && window.location.protocol) || '';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isSecureOrigin = protocol === 'https:' || isLocalhost;

    if (!isSecureOrigin) {
      console.log('Service Worker registration skipped: insecure origin (protocol=' + protocol + ', hostname=' + hostname + ')');
    } else {
      window.addEventListener('load', () => {
        try {
          navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
              console.log('✅ Service Worker registered successfully:', registration);
              // Check for updates periodically
              setInterval(() => {
                try { registration.update(); } catch (e) {}
              }, 60000); // Check every minute
            })
            .catch(error => {
              console.log('❌ Service Worker registration failed:', error);
            });
        } catch (err) {
          console.log('Service Worker registration error', err);
        }
      });

      // Handle updates
      try {
        navigator.serviceWorker.addEventListener('controller', () => {
          console.log('Service Worker controller changed');
        });
      } catch (er) {}
    }
  }

  // Detect if PWA is installed
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', e => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event for later use
    deferredPrompt = e;
    console.log('Install prompt available');
  });

  // Provide a way to trigger install prompt if needed
  window.installApp = function() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(choiceResult => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        deferredPrompt = null;
      });
    }
  };

  // Detect app installed status
  window.addEventListener('appinstalled', () => {
    console.log('✅ PWA was installed successfully!');
    deferredPrompt = null;
  });

  // Handle network status
  function updateNetworkStatus() {
    const status = navigator.onLine ? 'online' : 'offline';
    document.documentElement.setAttribute('data-network', status);
    console.log('Network status:', status);
  }

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();

})();
