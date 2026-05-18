(function () {
  // Allow quick override via URL parameter `?apiBase=` or `?chickenoyApiBase=` (persisted to localStorage)
  try {
    const params = new URLSearchParams(window.location.search || '');
    const urlParam = params.get('apiBase') || params.get('chickenoyApiBase');
    if (urlParam) {
      localStorage.setItem('chickenoyApiBase', urlParam);
      console.log('chickenoyApiBase set from URL parameter');
    }
  } catch (e) {}

  let configuredApiBase = localStorage.getItem("chickenoyApiBase") || "";
  const needsBackendOrigin = window.location.protocol === "file:" || window.location.port === "63342";

  // Ensure default API base for local development is http://localhost:5000
  // This will persist to localStorage only when no override is present
  if (!configuredApiBase && needsBackendOrigin) {
    try {
      configuredApiBase = 'http://localhost:5000';
      localStorage.setItem('chickenoyApiBase', configuredApiBase);
      console.log('chickenoyApiBase defaulted to http://localhost:5000');
    } catch (e) {}
  }

  let apiBase = configuredApiBase || (needsBackendOrigin ? "http://localhost:5000" : "");
  const normalizedPath = window.location.pathname.replace(/\/+$/, "").toLowerCase() || "/";
  const isAdminPage = normalizedPath === "/admin" || normalizedPath.endsWith("/admin.html") || normalizedPath.endsWith("/page/admin.html");

  function apiUrl(path) {
    if (/^https?:\/\//i.test(path)) return path;
    return `${apiBase}${path.startsWith("/") ? path : `/${path}`}`;
  }

  // Fetch helper with timeout that respects an optional user-provided signal
  async function fetchWithTimeout(url, options = {}, timeoutMs = 7000) {
    const userSignal = options.signal;
    if (userSignal && userSignal.aborted) {
      const err = new DOMException('Aborted', 'AbortError');
      throw err;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // If a user signal is provided, abort our controller when it fires
    const onUserAbort = () => controller.abort();
    if (userSignal) userSignal.addEventListener('abort', onUserAbort, { once: true });

    try {
      const merged = Object.assign({}, options, { signal: controller.signal });
      const resp = await fetch(url, merged);
      return resp;
    } finally {
      clearTimeout(timeoutId);
      if (userSignal) userSignal.removeEventListener('abort', onUserAbort);
    }
  }

  // Robust API request: try primary base, then quick fallbacks if network fails.
  async function apiRequest(path, options = {}) {
    const candidates = [];

    // If path is already absolute, try it directly
    if (/^https?:\/\//i.test(path)) candidates.push(path);

    // prefer configured / currently-known base
    if (apiBase) candidates.push(apiUrl(path));

    // Common local dev fallback hosts (short timeouts applied)
    if (!configuredApiBase && needsBackendOrigin) {
      ['http://127.0.0.1:5000', 'http://localhost:5000', 'http://127.0.0.1:3000', 'http://localhost:3000', 'http://127.0.0.1:8000', 'http://localhost:8000'].forEach(b => {
        const p = path.startsWith('/') ? `${b}${path}` : `${b}/${path}`;
        if (!candidates.includes(p)) candidates.push(p);
      });
    }

    // finally try same origin as a last resort
    try {
      const origin = window.location.origin;
      if (origin) {
        const p = path.startsWith('/') ? `${origin}${path}` : `${origin}/${path}`;
        if (!candidates.includes(p)) candidates.push(p);
      }
    } catch (e) {}

    let lastError = null;

    for (const url of candidates) {
      try {
        const response = await fetchWithTimeout(url, options, 6000);
        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();
        let data = {};

        if (text && contentType.includes('application/json')) {
          try { data = JSON.parse(text); } catch (e) { data = {}; }
        } else if (text) {
          throw new Error(`Server returned ${response.status} ${response.statusText || 'non-JSON response'}. Make sure the backend is running on ${new URL(url).origin}.`);
        }

        // update effective base for subsequent calls when successful
        try { apiBase = new URL(url).origin; window.ChickenoyApi && (window.ChickenoyApi.baseUrl = apiBase); } catch (e) {}

        return { response, data };
      } catch (err) {
        lastError = err;
        // try next candidate
      }
    }

    // Nothing worked — surface a clearer error message for the caller
    if (lastError) {
      if (lastError.name === 'AbortError') throw lastError;
      const baseHint = apiBase || window.location.origin || 'http://localhost:5000';
      const shortMsg = (lastError && lastError.message) ? lastError.message : String(lastError);
      throw new Error(`${shortMsg}. Make sure the backend API is running and reachable at ${baseHint} (or set localStorage key "chickenoyApiBase" to the correct base URL).`);
    }
    throw new Error('Network error while contacting the API');
  }

  window.ChickenoyApi = {
    baseUrl: apiBase,
    url: apiUrl,
    request: apiRequest
  };

  const navLinks = document.getElementById("navLinks");
  if (!isAdminPage && navLinks && !navLinks.querySelector('a[href="contact.html"]')) {
    const contactLink = document.createElement("a");
    contactLink.href = "contact.html";
    contactLink.textContent = "Contact";
    if (window.location.pathname.endsWith("contact.html")) {
      contactLink.className = "active";
    }
    navLinks.appendChild(contactLink);
  }

  if (!isAdminPage && navLinks) {
    if (localStorage.getItem("token") && !navLinks.querySelector('a[href="profile.html"]')) {
      const profileLink = document.createElement("a");
      profileLink.href = "profile.html";
      profileLink.textContent = "Profile";
      navLinks.appendChild(profileLink);
    }

    const path = window.location.pathname.toLowerCase();
    const orderedNav = [
      { match: "index", href: "index.html", label: "Home" },
      { match: "menu", href: "menu.html", label: "Menu" },
      { match: "cart", href: "cart.html", label: "Cart" },
      { match: "dashboard", href: "dashboard.html", label: "Orders" },
      { match: "contact", href: "contact.html", label: "Contact" },
      { match: "profile", href: "profile.html", label: "Profile" }
    ];

    orderedNav.forEach(item => {
      const link = Array.from(navLinks.querySelectorAll("a")).find(navLink => {
        const href = navLink.getAttribute("href") || "";
        return href.includes(item.href) || href.includes(`/${item.match}`);
      });

      if (!link) return;
      link.textContent = item.label;
      link.href = item.href;
      link.classList.toggle("active", path.endsWith(`/${item.href}`) || path.endsWith(`/${item.match}`) || (item.match === "index" && (path.endsWith("/") || path.endsWith("/page/index.html"))));
      navLinks.appendChild(link);
    });
  }

  if (!isAdminPage) {
    document.querySelectorAll(".login-btn").forEach(element => {
      if (element.textContent.trim().toLowerCase() === "login") element.textContent = "Log In";
    });

    document.querySelectorAll(".signin-btn").forEach(element => {
      if (/sign\s*in/i.test(element.textContent.trim())) element.textContent = "Sign Up";
    });

    const isCustomerLoggedIn = Boolean(localStorage.getItem("token"));
    // Toggle a single class on <body> and <html> for auth state. CSS will handle animations/visibility.
    document.body.classList.toggle('user-logged-in', isCustomerLoggedIn);
    try { document.documentElement.classList.toggle('user-logged-in', isCustomerLoggedIn); } catch (e) {}
  }

  if (!isAdminPage && localStorage.getItem("adminSessionActive") === "true") {
    document.body.classList.add("admin-session-active");
    try { document.documentElement.classList.add("admin-session-active"); } catch (e) {}
  }

  if (!isAdminPage) {
    (function syncAuthWithResponsiveNav() {
      const nav = document.querySelector("nav");
      const navLinks = document.getElementById("navLinks");
      const authButtons = document.querySelector(".auth-buttons");
      const menuToggle = document.querySelector(".menu-toggle");
      const mobileQuery = window.matchMedia("(max-width: 768px)");

      if (!nav || !navLinks || !authButtons) return;

      function placeAuthButtons() {
        if (mobileQuery.matches) {
          if (authButtons.parentElement !== navLinks) {
            navLinks.appendChild(authButtons);
          }
          syncMenuToggleState();
          return;
        }

        if (authButtons.parentElement !== nav) {
          nav.insertBefore(authButtons, menuToggle || null);
        }
        authButtons.classList.remove("active");
        syncMenuToggleState();
      }

      function syncMenuToggleState() {
        if (!menuToggle) return;
        menuToggle.classList.toggle("is-open", mobileQuery.matches && navLinks.classList.contains("active"));
      }

      placeAuthButtons();
      if (menuToggle) {
        menuToggle.addEventListener("click", () => {
          menuToggle.classList.remove("is-tapping");
          void menuToggle.offsetWidth;
          menuToggle.classList.add("is-tapping");
          window.setTimeout(() => {
            menuToggle.classList.remove("is-tapping");
            syncMenuToggleState();
          }, 180);
          window.setTimeout(syncMenuToggleState, 0);
        });
      }
      new MutationObserver(syncMenuToggleState).observe(navLinks, { attributes: true, attributeFilter: ["class"] });
      window.addEventListener("resize", placeAuthButtons);
      if (mobileQuery.addEventListener) {
        mobileQuery.addEventListener("change", placeAuthButtons);
      } else if (mobileQuery.addListener) {
        mobileQuery.addListener(placeAuthButtons);
      }
      document.addEventListener("DOMContentLoaded", placeAuthButtons);
    })();
  }

  const facebookUrl = "https://www.facebook.com/share/18fVSw4Dds/";
  const footer = document.querySelector("footer");
  if (!isAdminPage && footer) {
    footer.classList.add("site-footer");
    footer.innerHTML = `
      <div class="footer-grid">
        <div class="footer-brand">
          <h2 class="footer-tagline">Crispy Crafted, Flavor Perfected</h2>
          <p>Chicken Noy serves hot, crispy fried chicken prepared fresh for pickup and local delivery.</p>
        </div>
        <div>
          <h3>Contact</h3>
          <p>Phone: <a href="tel:09481409798">09481409798</a></p>
          <p>Email: <a href="mailto:chickenoyofficial@gmail.com">chickenoyofficial@gmail.com</a></p>
          <p>Service Area: Local Chicken Noy delivery area</p>
          <p><span class="footer-label">Address:</span> San Vicente, Camarines Norte, Brgy. Man-ogob, Purok 1</p>
        </div>
        <div>
          <h3>Store Hours</h3>
          <p>Monday to Saturday</p>
          <p>9:00 AM - 9:00 PM</p>
          <p>Cash on Delivery and GCash accepted</p>
        </div>
        <div>
          <h3>About Us</h3>
          <div class="footer-links" aria-label="Footer information links">
            <a href="about.html">About Us</a>
            <a href="privacy-policy.html">Privacy and Policy</a>
            <a href="terms-conditions.html">Terms &amp; Conditions</a>
            <a href="contact.html">Contact Us</a>
            <a href="delivery-information.html">Delivery Information</a>
          </div>
        </div>
        <div>
          <h3>Follow Us</h3>
          <a class="footer-icon-link" href="${facebookUrl}" target="_blank" rel="noopener noreferrer" aria-label="Open Chicken Noy on Facebook">
            <span class="fb-mark" aria-hidden="true">f</span>
            <span>Chicken Noy</span>
          </a>
        </div>
        <div class="payment-gateways">
          <h3>Payment Gateways</h3>
            <a class="footer-icon-link" href="gcash-payment.html" aria-label="Open GCash payment page">
              <div class="gcash-badge" aria-hidden="true"></div>
              <img class="gcash-logo" src="../images/gcash-logo.png?v=2" alt="GCash">
              <span class="sr-only">GCash</span>
          </a>
        </div>
      </div>
      <div class="footer-bottom">&copy; 2026 Chicken Noy. All rights reserved.</div>
    `;
  }

  if (!isAdminPage) {
    const widget = document.createElement("div");
    widget.className = "message-widget";
    widget.innerHTML = `
      <button class="message-toggle" type="button" aria-expanded="false" aria-controls="messagePanel">
        <span class="message-dot"></span>
        Message
      </button>
      <section class="message-panel" id="messagePanel" aria-label="Message Chicken Noy">
        <div class="message-panel-head">
          <strong>Message Chicken Noy</strong>
          <button type="button" class="message-close" aria-label="Close message panel">x</button>
        </div>
        <p>Need help with an order, delivery, payment, or reservation? Send a quick message and the business will see it in the admin dashboard.</p>
        <div class="message-details">
          <a href="tel:09481409798">Call 09481409798</a>
          <span>Open Monday to Saturday, 9:00 AM - 9:00 PM</span>
          <span>Facebook: Chicken Noy</span>
        </div>
        <form class="message-form" id="quickMessageForm">
          <input name="name" placeholder="Your name" required>
          <input name="phone" placeholder="Phone number" required>
          <textarea name="message" placeholder="Write your message" rows="3" required></textarea>
          <button type="submit">Send Message</button>
          <a href="contact.html">Open full contact page</a>
        </form>
        <div class="message-status" id="quickMessageStatus"></div>
      </section>
    `;
    document.body.appendChild(widget);

    const toggle = widget.querySelector(".message-toggle");
    const panel = widget.querySelector(".message-panel");
    const close = widget.querySelector(".message-close");
    const form = widget.querySelector("#quickMessageForm");
    const status = widget.querySelector("#quickMessageStatus");
    const dot = widget.querySelector(".message-dot");

    async function refreshMessageNotification() {
      const token = localStorage.getItem("token");
      if (!dot || !token) {
        dot?.classList.remove("active");
        return;
      }

      try {
        const { response, data } = await apiRequest("/api/contact/my-messages", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const hasUnread = response.ok && Array.isArray(data) && data.some(message => message.customerHasUnread);
        dot.classList.toggle("active", hasUnread);
      } catch (error) {
        dot.classList.remove("active");
      }
    }

    function setOpen(isOpen) {
      panel.classList.toggle("open", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
      // Prevent background scrolling while widget is open
      try { document.body.classList.toggle('no-scroll', isOpen); document.documentElement.classList.toggle('no-scroll', isOpen); } catch(e) {}
      // Move focus into the panel for accessibility when opened
      try {
        if (isOpen) {
          const first = panel.querySelector('input, textarea, button');
          if (first) first.focus();
        } else {
          toggle.focus();
        }
      } catch (er) {}
    }

    toggle.addEventListener("click", () => setOpen(!panel.classList.contains("open")));
    close.addEventListener("click", () => setOpen(false));
    refreshMessageNotification();
    window.setInterval(refreshMessageNotification, 15000);

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const button = form.querySelector("button");
      const messageText = form.message.value.trim();
      form.message.setCustomValidity("");
      if (!messageText) {
        form.message.setCustomValidity("Please fill in your message before sending.");
        form.reportValidity();
        form.message.setCustomValidity("");
        return;
      }

      button.disabled = true;
      button.textContent = "Sending...";
      status.textContent = "";

      try {
        const { response, data } = await apiRequest("/api/contact", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            name: form.name.value.trim(),
            phone: form.phone.value.trim(),
            message: messageText,
            subject: "Quick Website Message",
            source: "floating-widget"
          })
        });
        if (!response.ok) throw new Error(data.error || "Message failed");
        form.reset();
        status.textContent = data.message || "Message sent.";
      } catch (error) {
        status.textContent = error.message;
      } finally {
        button.disabled = false;
        button.textContent = "Send Message";
      }
    });
  }

  // Global logout handler: works on any page by listening for clicks
  document.addEventListener('click', (e) => {
    try {
      const btn = e.target.closest && e.target.closest('.logout-btn');
      if (!btn) return;
      // If there is a page-specific logout() function, defer to it to avoid duplicate prompts or redirects
      if (typeof window.logout === 'function') {
        try { window.logout(); } catch (er) { console.error(er); }
        return;
      }
      if (!confirm('Are you sure you want to logout?')) return;
      // remove only customer auth data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('welcomeToast');
      // update classes immediately to avoid flicker on navigation
      document.body.classList.remove('user-logged-in');
      try { document.documentElement.classList.remove('user-logged-in'); } catch (er) {}
      alert('Logged out successfully');
      // navigate to home
      window.location.href = 'index.html';
    } catch (err) {
      console.error('Logout error', err);
    }
  });

  function setupPasswordToggles() {
    document.querySelectorAll('.password-toggle').forEach(button => {
      if (button.dataset.ready === 'true') return;
      const field = button.closest('.password-field');
      const input = field ? field.querySelector('input') : null;
      if (!input) return;
      button.dataset.ready = 'true';
      button.addEventListener('click', () => {
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        button.classList.toggle('is-visible', !showing);
        button.setAttribute('aria-pressed', String(!showing));
        button.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
        input.focus({preventScroll: true});
      });
    });
  }

  document.addEventListener('DOMContentLoaded', setupPasswordToggles);
  setupPasswordToggles();
  
  // Enforce consistent Login/Sign Up button sizing across pages
  (function enforceAuthButtonSize() {
    function applySizing() {
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      document.querySelectorAll('.auth-buttons').forEach(container => {
        const isActive = container.classList.contains('active');
        const login = container.querySelector('.login-btn');
        const signin = container.querySelector('.signin-btn');
        [login, signin].forEach(btn => {
          if (!btn) return;
          // Mobile expanded menu: let buttons grow to full width
          if (isMobile && isActive) {
            btn.style.width = '';
            btn.style.minWidth = '';
            btn.style.flex = '1';
            btn.style.padding = '12px 16px';
            btn.style.height = '';
          } else {
            // Desktop / normal state: fixed, identical sizing
            btn.style.width = '110px';
            btn.style.minWidth = '110px';
            btn.style.flex = '';
            btn.style.padding = '8px 18px';
            btn.style.height = '40px';
          }
          btn.style.display = 'inline-flex';
          btn.style.alignItems = 'center';
          btn.style.justifyContent = 'center';
          btn.style.fontSize = '14px';
          btn.style.borderRadius = '8px';
          btn.style.boxSizing = 'border-box';
        });
      });
    }

    // Apply initially and on resize
    try { applySizing(); } catch (e) {}
    window.addEventListener('resize', applySizing);

    // Re-apply when auth-buttons classlist changes (menu open/close)
    const attachObservers = () => {
      document.querySelectorAll('.auth-buttons').forEach(el => {
        if (el._authObserver) return;
        const obs = new MutationObserver(applySizing);
        obs.observe(el, { attributes: true, attributeFilter: ['class'] });
        el._authObserver = obs;
      });
    };

    // DOM may change; ensure observers are attached after load
    document.addEventListener('DOMContentLoaded', () => {
      applySizing();
      attachObservers();
    });
  })();

    // Hidden helper: Ctrl+Shift+D opens a prompt to set `chickenoyApiBase` quickly.
    (function setupApiBaseShortcut(){
      window.addEventListener('keydown', function(e){
        try {
          if (e.ctrlKey && e.shiftKey && e.key && e.key.toLowerCase() === 'd') {
            const current = localStorage.getItem('chickenoyApiBase') || '';
            const input = prompt('Set chickenoyApiBase (leave empty to clear):', current);
            if (input === null) return;
            if (input.trim() === '') {
              localStorage.removeItem('chickenoyApiBase');
              alert('API base cleared. Reloading page.');
            } else {
              localStorage.setItem('chickenoyApiBase', input.trim());
              alert('API base saved. Reloading page.');
            }
            window.location.reload();
          }
        } catch (err) {}
      });
    })();
})();
