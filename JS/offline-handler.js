// Offline Error Handler for Authentication & Checkout
// Prevents users from trying to login/signup/checkout without internet.

(function() {
    'use strict';

    let isOffline = !navigator.onLine;
    let hideOfflineBannerTimer = null;

    // Create a persistent site-wide offline notice.
    function createOfflineNotification() {
        const banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.setAttribute('role', 'status');
        banner.setAttribute('aria-live', 'polite');
        banner.style.cssText = `
            position: fixed;
            top: calc(var(--nav-height, 64px) + 10px);
            left: 50%;
            transform: translateX(-50%);
            background: transparent;
            color: #ffffff;
            padding: 0;
            text-align: center;
            font-size: 14px;
            font-weight: 800;
            line-height: 1.3;
            text-shadow: 0 2px 5px rgba(0, 0, 0, 0.9);
            z-index: 3000;
            display: none;
            pointer-events: none;
            white-space: nowrap;
        `;
        banner.textContent = 'No Internet Connection';
        document.body.appendChild(banner);
        
        return banner;
    }

    const offlineBanner = createOfflineNotification();

    function showOfflineNotice() {
        clearTimeout(hideOfflineBannerTimer);
        offlineBanner.style.display = 'block';
    }

    // Update offline status
    function updateOfflineStatus() {
        isOffline = !navigator.onLine;
        if (isOffline) {
            showOfflineNotice();
            disableAuthAndCheckout();
        } else {
            clearTimeout(hideOfflineBannerTimer);
            offlineBanner.style.display = 'none';
            enableAuthAndCheckout();
        }
    }

    // Disable login, signup, checkout buttons
    function disableAuthAndCheckout() {
        // Disable login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            const inputs = loginForm.querySelectorAll('input');
            const buttons = loginForm.querySelectorAll('button');
            inputs.forEach(input => input.disabled = true);
            buttons.forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.6';
                btn.style.cursor = 'not-allowed';
                btn.title = 'Internet required to login';
            });
        }

        // Disable register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            const inputs = registerForm.querySelectorAll('input');
            const buttons = registerForm.querySelectorAll('button');
            inputs.forEach(input => input.disabled = true);
            buttons.forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.6';
                btn.style.cursor = 'not-allowed';
                btn.title = 'Internet required to register';
            });
        }

        // Disable checkout button (safe text match)
        const checkoutBtn = document.querySelector('[onclick*="checkout"]') ||
                   Array.from(document.querySelectorAll('button')).find(btn => btn.textContent && btn.textContent.trim().toLowerCase().includes('checkout'));
        if (checkoutBtn) {
            checkoutBtn.disabled = true;
            checkoutBtn.style.opacity = '0.6';
            checkoutBtn.style.cursor = 'not-allowed';
            checkoutBtn.title = 'Internet required to purchase';
        }

        // Disable add to cart for checkout
        const proceedBtn = document.querySelector('a[href*="checkout"]');
        if (proceedBtn) {
            proceedBtn.style.pointerEvents = 'none';
            proceedBtn.style.opacity = '0.6';
            proceedBtn.title = 'Internet required to purchase';
        }

        // Disable login buttons in navbar
        const loginBtns = document.querySelectorAll('.login-btn, button[onclick*="login"]');
        loginBtns.forEach(btn => {
            if (!btn.classList.contains('logout-btn')) {
                btn.disabled = true;
                btn.style.opacity = '0.6';
                btn.style.cursor = 'not-allowed';
                btn.title = 'Internet required to login';
            }
        });
    }

    // Enable auth and checkout buttons
    function enableAuthAndCheckout() {
        // Enable login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            const inputs = loginForm.querySelectorAll('input');
            const buttons = loginForm.querySelectorAll('button');
            inputs.forEach(input => input.disabled = false);
            buttons.forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
                btn.title = '';
            });
        }

        // Enable register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            const inputs = registerForm.querySelectorAll('input');
            const buttons = registerForm.querySelectorAll('button');
            inputs.forEach(input => input.disabled = false);
            buttons.forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
                btn.title = '';
            });
        }

        // Enable checkout button (safe text match)
        const checkoutBtn = document.querySelector('[onclick*="checkout"]') ||
                   Array.from(document.querySelectorAll('button')).find(btn => btn.textContent && btn.textContent.trim().toLowerCase().includes('checkout'));
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.style.opacity = '1';
            checkoutBtn.style.cursor = 'pointer';
            checkoutBtn.title = '';
        }

        // Enable proceed button
        const proceedBtn = document.querySelector('a[href*="checkout"]');
        if (proceedBtn) {
            proceedBtn.style.pointerEvents = 'auto';
            proceedBtn.style.opacity = '1';
            proceedBtn.title = '';
        }

        // Enable login buttons
        const loginBtns = document.querySelectorAll('.login-btn, button[onclick*="login"]');
        loginBtns.forEach(btn => {
            if (!btn.classList.contains('logout-btn')) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
                btn.title = '';
            }
        });
    }

    // Add event listeners for online/offline
    window.addEventListener('online', updateOfflineStatus);
    window.addEventListener('offline', updateOfflineStatus);

    // Check initial status
    document.addEventListener('DOMContentLoaded', updateOfflineStatus);

    // Also check when page becomes visible (phone returning from sleep)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            updateOfflineStatus();
        }
    });

    // Prevent form submission when offline
    document.addEventListener('submit', (e) => {
        // Check if form is login, register, or checkout
        const form = e.target;
        const isAuthForm = form.id === 'loginForm' || form.id === 'registerForm' || form.id === 'checkoutForm';
        
        if (isOffline && isAuthForm) {
            e.preventDefault();
            alert('No Internet Connection\n\nYou cannot login, register, or make purchases without an internet connection.\n\nPlease connect to WiFi or mobile data and try again.');
            return false;
        }
    }, true);

    // Prevent link clicks for checkout when offline
    document.addEventListener('click', (e) => {
        const target = e.target.closest('a[href*="checkout"], a[href*="login"], a[href*="register"]');
        if (isOffline && target) {
            // Check if it's a checkout/login/register link
            const href = target.getAttribute('href');
            if (href && (href.includes('checkout') || href.includes('login') || href.includes('register'))) {
                e.preventDefault();
                alert('No Internet Connection\n\nYou cannot access this page without an internet connection.\n\nPlease connect to WiFi or mobile data and try again.');
                return false;
            }
        }
    }, true);

    // Export functions for external use
    window.offlineHandler = {
        isOffline: () => isOffline,
        checkConnection: () => {
            if (isOffline) {
                alert('No Internet Connection\n\nThis action requires an internet connection.');
                return false;
            }
            return true;
        }
    };

})();
