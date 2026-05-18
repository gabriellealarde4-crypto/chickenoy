const adminLogin = document.getElementById("adminLogin");
const adminApp = document.getElementById("adminApp");
const adminMessage = document.getElementById("adminMessage");
const adminControls = document.getElementById("adminControls");
const PRODUCT_REVIEWS_KEY = "chickenNoyProductReviews";

let currentMessages = [];
const expandedMessageIds = new Set();
const productImageByKey = {
    "chicken-noy-party-platter": "../images/menu-item-1.png",
    "chicken-noy-bilao": "../images/menu-item-2.png",
    "chicken-bilao": "../images/menu-item-2.png",
    "chicken-noy-ultimate-feast": "../images/menu-item-3.png",
    "ultimate-chicken-feast": "../images/menu-item-3.png",
    "chicken-noy-classic-fried-leg": "../images/menu-item-4.png",
    "classic-fried-chicken-leg": "../images/menu-item-4.png",
    "chicken-noy-crispy-bundle": "../images/menu-item-5.png",
    "chickenoy-crispy-bundle": "../images/menu-item-5.png",
    "crispy-chicken-bundle": "../images/menu-item-5.png"
};

function getAdminToken() {
    return localStorage.getItem("adminToken");
}

async function adminRequest(url, options = {}) {
    const { response, data } = await window.ChickenoyApi.request(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
            "Authorization": `Bearer ${getAdminToken()}`
        }
    });
    if (!response.ok) {
        const error = new Error(data.error || "Admin request failed");
        error.status = response.status;
        throw error;
    }
    return data;
}

function showMessage(message, isError = false) {
    adminMessage.textContent = message;
    adminMessage.className = isError ? "admin-message error" : "admin-message";
}

function clearAdminSession() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    localStorage.removeItem("adminSessionActive");
}

function setAdminHeader(isLoggedIn) {
    document.body.classList.toggle("admin-login-active", isLoggedIn);
    if (adminControls) adminControls.style.display = isLoggedIn ? "" : "none";
    const menuToggle = document.getElementById("adminMenuToggle");
    if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
    adminControls?.classList.remove("active");
}

function isSessionError(error) {
    return error.status === 401 || error.status === 403 || /token|login required|admin access/i.test(error.message || "");
}

async function loginAdmin(event) {
    event.preventDefault();
    const form = event.target;

    try {
        const { response, data } = await window.ChickenoyApi.request("/api/admin/login", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                username: form.username.value.trim(),
                password: form.password.value
            })
        });
        if (!response.ok) throw new Error(data.error || "Login failed");

        localStorage.setItem("adminToken", data.token);
        localStorage.setItem("adminUser", data.username);
        localStorage.setItem("adminSessionActive", "true");
        await loadAdmin();
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function loadAdmin() {
    if (!getAdminToken()) {
        if (adminApp) adminApp.style.display = "none";
        setAdminHeader(false);
        showMessage("Owner access only. Redirecting to login.");
        window.location.replace("login.html");
        return;
    }

    try {
        const summary = await adminRequest("/api/admin/summary");
        if (adminLogin) adminLogin.style.display = "none";
        if (adminApp) adminApp.style.display = "block";
        setAdminHeader(true);
        currentMessages = summary.messages || [];
        renderStats(summary.stats, summary.productReviews || []);
        renderUsers(summary.users || []);
        renderMenu(summary.menu);
        renderOrders(summary.orders);
        renderProductReviews(summary.productReviews);
        renderMessagePreview(currentMessages);
        renderMessengerMessages(currentMessages);
        showMessage("Admin dashboard loaded.");
    } catch (error) {
        clearAdminSession();
        if (adminLogin) adminLogin.style.display = "none";
        if (adminApp) adminApp.style.display = "none";
        setAdminHeader(false);
        showMessage(isSessionError(error) ? "Your admin session expired. Please log in again." : error.message, true);
        if (isSessionError(error)) window.location.replace("login.html");
    }
}

function renderStats(stats, serverReviews = []) {
    const bellCount = document.getElementById("adminBellCount");
    const unread = stats.unreadMessages || 0;
    const reviewCount = serverReviews.length ? Number(stats.reviews || serverReviews.length) : Number(stats.reviews || 0) + getProductReviews().length;
    if (bellCount) {
        bellCount.textContent = unread > 0 ? String(unread) : "";
        bellCount.setAttribute("aria-label", unread > 0 ? `${unread} unread customer message${unread === 1 ? "" : "s"}` : "No unread customer messages");
        bellCount.classList.toggle("active", unread > 0);
    }

    document.getElementById("adminStats").innerHTML = `
        <div><strong>${stats.orders}</strong><span>Orders</span></div>
        <div><strong>${stats.users || 0}</strong><span>Customers</span></div>
        <div><strong>${formatPrice(stats.revenue)}</strong><span>Revenue</span></div>
        <div><strong>${reviewCount}</strong><span>Reviews</span></div>
        <div><strong>${unread}</strong><span>Unread Messages</span></div>
    `;
}

function formatDate(value) {
    if (!value) return "Not recorded";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString();
}

function getProductReviews() {
    try {
        const reviews = JSON.parse(localStorage.getItem(PRODUCT_REVIEWS_KEY) || "[]");
        return Array.isArray(reviews) ? reviews : [];
    } catch (error) {
        return [];
    }
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));
}

function productKey(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function normalizeImageUrl(image) {
    if (!image) return "";
    const normalized = String(image)
        .replace(/\\/g, "/")
        .replace(/^(\.\.\/)+/, "/")
        .replace(/^(\.\/)+/, "");

    if (/^https?:\/\//i.test(normalized) || /^data:/i.test(normalized)) return normalized;
    if (normalized.startsWith("/Frontend/images/")) return `..${normalized.replace(/^\/Frontend\//, "")}`;
    if (normalized.startsWith("/images/")) return `..${normalized}`;
    if (normalized.startsWith("images/")) return `../${normalized}`;
    if (normalized.startsWith("Frontend/images/")) return `../${normalized.replace(/^Frontend\//, "")}`;
    if (normalized.startsWith("/")) return normalized;
    return normalized;
}

function productFallbackImage(item) {
    const idKey = productKey(item?._id || item?.menuItemId);
    const nameKey = productKey(item?.name);
    return productImageByKey[idKey] || productImageByKey[nameKey] || "../images/logo.png";
}

function productImageSrc(item) {
    const image = normalizeImageUrl(item?.image);
    if (image && !/(?:^|\/)logo\.png(?:$|\?)/i.test(image)) return image;
    return productFallbackImage(item);
}

function isAttachmentOnlyMessage(reply) {
    return Boolean(reply?.attachment) && /^photo or video attachment$/i.test(String(reply.message || "").trim());
}

function stockState(item) {
    const stock = Number(item?.stock || 0);
    if (stock <= 0) return {label: "Sold out", className: "danger"};
    if (stock <= 5) return {label: "Low stock - restock soon", className: "warning"};
    return {label: "Stock healthy", className: "healthy"};
}

function renderMenu(menu) {
    const container = document.getElementById("adminMenu");
    if (!Array.isArray(menu) || !menu.length) {
        container.innerHTML = `<article class="admin-message-card"><strong>No menu items found</strong><p>Add menu items in the database to manage stock here.</p></article>`;
        return;
    }

    container.innerHTML = menu.map(item => {
        const stock = stockState(item);
        const available = item.isAvailable !== false && Number(item.stock || 0) > 0;
        return `
        <article class="admin-card inventory-card">
            <div class="inventory-card-head">
                <img src="${escapeHtml(productImageSrc(item))}" alt="${escapeHtml(item.name)}" onerror="this.onerror=null; this.src='${escapeHtml(productFallbackImage(item))}'">
                <div>
                <h3>${escapeHtml(item.name)}</h3>
                    <div class="inventory-meta">
                        <span class="inventory-pill">${escapeHtml(item.category)}</span>
                        <span class="inventory-pill">${formatPrice(item.price)}</span>
                        <span class="inventory-pill">Sold ${Number(item.sold || 0)}</span>
                        <span class="inventory-pill ${stock.className}">Stock ${Number(item.stock || 0)}</span>
                    </div>
                    <span class="stock-status ${stock.className}">${stock.label}</span>
                    <p>Customer menu: ${available ? "Shown for ordering" : "Hidden until restocked or enabled"}</p>
                </div>
            </div>
            <div class="inventory-form-grid">
                <label>Product Name
                    <input id="name-${item._id}" value="${escapeHtml(item.name || "")}">
                </label>
                <label>Category
                    <input id="category-${item._id}" value="${escapeHtml(item.category || "")}">
                </label>
                <label>Price
                    <input id="price-${item._id}" type="number" min="0" step="0.01" value="${Number(item.price || 0)}">
                </label>
                <label>Stock
                    <input id="stock-${item._id}" type="number" min="0" value="${item.stock || 0}">
                </label>
                <label class="full">Description
                    <textarea id="description-${item._id}" rows="3">${escapeHtml(item.description || "")}</textarea>
                </label>
                <label class="check-row full">
                    <input id="available-${item._id}" type="checkbox" ${item.isAvailable !== false ? "checked" : ""}>
                    Show this product on the customer menu
                </label>
                <p class="availability-note full">Turn this off for sold-out items, seasonal products, or products that should be hidden while restocking.</p>
                <button class="full" onclick="updateMenuItem('${item._id}')">Save Product</button>
            </div>
        </article>
    `}).join("");
}

function renderUsers(users) {
    const container = document.getElementById("adminUsers");
    if (!container) return;

    if (!Array.isArray(users) || !users.length) {
        container.innerHTML = `<article class="admin-user"><strong>No registered customers yet</strong><span>New customer accounts will appear here.</span></article>`;
        return;
    }

    container.innerHTML = `
        <div class="admin-table-wrap" role="region" aria-label="Registered customer table" tabindex="0">
            <table class="admin-customer-table">
                <thead>
                    <tr>
                        <th>Customer</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Joined</th>
                        <th>Last Login</th>
                        <th>Logins</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${escapeHtml(user.name || "Customer")}</td>
                            <td>${escapeHtml(user.email || "No email")}</td>
                            <td>${escapeHtml(user.phone || "No phone number")}</td>
                            <td>${formatDate(user.createdAt)}</td>
                            <td>${formatDate(user.lastLogin)}</td>
                            <td>${Number(user.loginCount || 0)}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function renderOrders(orders) {
    const container = document.getElementById("adminOrders");
    if (!Array.isArray(orders) || !orders.length) {
        container.innerHTML = `<article class="admin-message-card"><strong>No customer orders yet</strong><p>Orders will appear here after customers check out.</p></article>`;
        return;
    }

    container.classList.remove("admin-orders-grid");
    container.innerHTML = orders.map(order => `
        <article class="admin-order">
            <div class="admin-order-head">
                <strong>#${escapeHtml(order._id)}</strong>
                <span>${new Date(order.createdAt).toLocaleString()}</span>
            </div>
            <div class="admin-order-summary">
                <span><strong>Customer</strong><br>${escapeHtml(order.name)}</span>
                <span><strong>Phone</strong><br>${escapeHtml(order.phone)}</span>
                <span><strong>Payment</strong><br>${escapeHtml(order.paymentMethod)} / ${escapeHtml(order.paymentStatus)}</span>
                <span><strong>Status</strong><br>${escapeHtml(order.orderStatus || "Processing")}</span>
            </div>
            <div class="admin-order-items"><strong>Address</strong><br>${escapeHtml(order.address)}</div>
            <div class="admin-order-items">
                <strong>Items</strong>
                <div class="order-item-list">
                    ${(order.items || []).map(item => `
                        <div class="order-item-row">
                            <img src="${escapeHtml(productImageSrc(item))}" alt="${escapeHtml(item.name)}" onerror="this.onerror=null; this.src='${escapeHtml(productFallbackImage(item))}'">
                            <span>${escapeHtml(item.name)}<br><small>${formatPrice(item.price)} each</small></span>
                            <strong>x${Number(item.quantity || 0)}</strong>
                        </div>
                    `).join("")}
                </div>
            </div>
            <div class="admin-order-total">Total: ${formatPrice(order.totalPrice)}</div>
            ${order.review && order.review.rating ? `<p>Review: ${order.review.rating}/5 - ${escapeHtml(order.review.comment || "")}</p>` : ""}
            <div class="admin-actions">
                <button type="button" class="paid-check ${order.paymentStatus === "Paid" ? "is-paid" : ""}" onclick="markOrderPaid('${order._id}')" aria-label="Mark order payment as paid">✓</button>
                <select id="status-${order._id}">
                    ${[
                        {value: "Processing", label: "Processing"},
                        {value: "Shipped", label: "Shipped"},
                        {value: "To Receive", label: "To Receive"},
                        {value: "Reviewed", label: "Review"}
                    ].map(status => `<option value="${status.value}" ${order.orderStatus === status.value ? "selected" : ""}>${status.label}</option>`).join("")}
                </select>
                <select id="payment-${order._id}">
                    ${["Pending", "Paid", "Failed"].map(status => `<option value="${status}" ${order.paymentStatus === status ? "selected" : ""}>${status}</option>`).join("")}
                </select>
                <button onclick="updateOrder('${order._id}')">Update</button>
            </div>
        </article>
    `).join("");
}

function renderProductReviews(serverReviews) {
    const container = document.getElementById("adminReviews");
    if (!container) return;

    const reviews = Array.isArray(serverReviews) ? serverReviews : getProductReviews();
    if (!reviews.length) {
        container.innerHTML = `<article class="admin-message-card"><strong>No customer ratings yet</strong><p>Product ratings and comments from the menu page will appear here.</p></article>`;
        return;
    }

    container.innerHTML = reviews.map(review => `
        <article class="admin-message-card">
            <strong>${escapeHtml(review.productName || "Menu Item")} - ${"★".repeat(Number(review.rating || 0))}</strong>
            <p>${escapeHtml(review.comment || "No comment provided.")}</p>
            <span>${escapeHtml(review.userName || "Customer")} | ${new Date(review.submittedAt).toLocaleString()}</span>
        </article>
    `).join("");
}

function renderMessagePreview(messages) {
    const container = document.getElementById("adminMessagesPreview");
    if (!container) return;

    if (!messages.length) {
        container.innerHTML = `<article class="admin-message-card"><strong>No messages yet</strong><p>Customer contact messages will appear in the messenger panel.</p></article>`;
        return;
    }

    const unread = messages.filter(message => !message.isRead).length;
    container.innerHTML = `
        <article class="admin-message-card ${unread ? "unread" : ""}">
            <strong>${unread ? `${unread} unread message${unread === 1 ? "" : "s"}` : "All messages read"}</strong>
            <p>Use the messenger for order support, payment proof, delivery updates, complaints, and admin replies with photo or video attachments.</p>
        </article>
    `;
}

function renderProductReviewsTable(serverReviews) {
    const container = document.getElementById("adminReviews");
    if (!container) return;

    const reviews = Array.isArray(serverReviews) ? serverReviews : getProductReviews();
    if (!reviews.length) {
        container.innerHTML = `<article class="admin-message-card"><strong>No customer ratings yet</strong><p>Product ratings and comments from the menu page will appear here.</p></article>`;
        return;
    }

    container.innerHTML = `
        <table class="admin-review-table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Rating</th>
                    <th>Comment</th>
                    <th>Customer</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${reviews.map(review => `
                    <tr>
                        <td>${escapeHtml(review.productName || "Menu Item")}</td>
                        <td>${"★".repeat(Number(review.rating || 0)) || "No rating"}</td>
                        <td>${escapeHtml(review.comment || "No comment provided.")}</td>
                        <td>${escapeHtml(review.userName || "Customer")}</td>
                        <td>${new Date(review.submittedAt).toLocaleString()}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

renderProductReviews = renderProductReviewsTable;

function profileType(name) {
    const first = String(name || "").trim().split(/\s+/)[0].toLowerCase();
    const femaleNames = ["abby", "anna", "ana", "maria", "mary", "mae", "joy", "jane", "angel", "princess", "kate", "kim", "bea", "joan", "rose"];
    const maleNames = ["gio", "john", "juan", "mark", "michael", "paul", "james", "joshua", "carl", "ken", "angelo", "jose"];
    if (femaleNames.includes(first)) return "woman";
    if (maleNames.includes(first)) return "man";
    return "person";
}

function profileInitial(name) {
    return String(name || "C").trim().charAt(0).toUpperCase() || "C";
}

function renderMessengerMessages(messages) {
    const list = document.getElementById("adminMessengerList");
    if (!list) return;

    if (!messages.length) {
        list.innerHTML = `<div class="messenger-empty">No customer messages yet.</div>`;
        return;
    }

    const orderedMessages = [...messages].sort((a, b) =>
        new Date(a.updatedAt || a.createdAt || 0) - new Date(b.updatedAt || b.createdAt || 0)
    );

    list.innerHTML = orderedMessages.map(message => {
        const type = profileType(message.name);
        const thread = Array.isArray(message.replies) && message.replies.length
            ? message.replies
            : [{sender: "customer", message: message.message, createdAt: message.createdAt}];
        const latestReply = thread[thread.length - 1] || {};
        const isUnread = !message.isRead;
        const expanded = expandedMessageIds.has(message._id);
        const latestTime = latestReply.createdAt || message.updatedAt || message.createdAt;

        return `
            <article class="messenger-thread ${isUnread ? "unread" : ""} ${expanded ? "expanded" : "collapsed"}">
                <div class="messenger-thread-head">
                    <div class="profile-avatar ${type}">${profileInitial(message.name)}</div>
                    <div>
                        <strong>${escapeHtml(message.name)}</strong>
                        <span>${escapeHtml(message.subject || "Customer Message")} | ${new Date(latestTime).toLocaleString()}</span>
                    </div>
                    <button type="button" class="messenger-thread-toggle" onclick="toggleMessengerThread('${message._id}')" aria-label="${expanded ? "Shrink conversation" : "View conversation"}" aria-expanded="${expanded}">
                        <span class="thread-arrow" aria-hidden="true">${expanded ? "&#9662;" : "&#9656;"}</span>
                        ${isUnread ? '<span class="message-unread-dot" aria-label="Unread message"></span>' : ""}
                    </button>
                </div>
                ${expanded ? `
                    <div class="messenger-bubbles">
                        ${thread.map(reply => `
                            <div class="message-bubble ${reply.sender === "admin" ? "admin" : "customer"}">
                                <p>${escapeHtml(isAttachmentOnlyMessage(reply) ? "Photo shared earlier. Use Facebook Business Chat for product photos." : reply.message)}</p>
                                <span>${reply.sender === "admin" ? "Admin" : escapeHtml(message.name || "Customer")} | ${new Date(reply.createdAt || message.createdAt).toLocaleString()}</span>
                            </div>
                        `).join("")}
                    </div>
                    <form class="messenger-reply-form" onsubmit="sendAdminReply(event, '${message._id}')">
                        <input name="message" placeholder="Reply to ${escapeHtml(message.name)}" required>
                        <button type="submit">Send</button>
                    </form>
                ` : `
                    <div class="messenger-preview">${escapeHtml(isAttachmentOnlyMessage(latestReply) ? "Photo shared earlier. Use Facebook Business Chat for product photos." : (latestReply.message || message.message || "Message"))}</div>
                `}
            </article>
        `;
    }).join("");
    scrollMessengerToLatest(list);
}

function scrollMessengerToLatest(list) {
    window.requestAnimationFrame(() => {
        list.scrollTop = list.scrollHeight;
        list.querySelectorAll(".messenger-bubbles").forEach(thread => {
            thread.scrollTop = thread.scrollHeight;
        });
    });
}

function toggleMessengerThread(messageId) {
    if (expandedMessageIds.has(messageId)) {
        expandedMessageIds.delete(messageId);
    } else {
        expandedMessageIds.add(messageId);
        markMessageRead(messageId);
    }
    renderMessengerMessages(currentMessages);
}

async function openCustomerMessages() {
    document.getElementById("adminMessengerOverlay")?.classList.add("open");
    try {
        await loadAdmin();
        document.getElementById("adminMessengerOverlay")?.classList.add("open");
    } catch (error) {
        showMessage(error.message, true);
    }
}

function closeCustomerMessages() {
    document.getElementById("adminMessengerOverlay")?.classList.remove("open");
}

async function markMessageRead(messageId) {
    const message = currentMessages.find(item => item._id === messageId);
    if (!message || message.isRead) return;
    try {
        await adminRequest(`/api/admin/messages/${messageId}/read`, {method: "PATCH"});
        currentMessages = currentMessages.map(item => item._id === messageId ? {...item, isRead: true} : item);
        const unread = currentMessages.filter(item => !item.isRead).length;
        const bellCount = document.getElementById("adminBellCount");
        if (bellCount) {
            bellCount.textContent = unread > 0 ? String(unread) : "";
            bellCount.setAttribute("aria-label", unread > 0 ? `${unread} unread customer message${unread === 1 ? "" : "s"}` : "No unread customer messages");
            bellCount.classList.toggle("active", unread > 0);
        }
        renderMessagePreview(currentMessages);
        renderMessengerMessages(currentMessages);
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function sendAdminReply(event, messageId) {
    event.preventDefault();
    await submitAdminReply(event.target, messageId);
}

async function submitAdminReply(form, messageId) {
    const button = form.querySelector("button");
    const input = form.message;
    const messageText = input.value.trim();
    input.setCustomValidity("");
    if (!messageText) {
        input.setCustomValidity("Please fill in your reply before sending.");
        form.reportValidity();
        input.setCustomValidity("");
        return;
    }

    button.disabled = true;
    button.textContent = "Sending...";

    try {
        await adminRequest(`/api/admin/messages/${messageId}/reply`, {
            method: "PATCH",
            body: JSON.stringify({message: messageText})
        });
        form.reset();
        await loadAdmin();
        document.getElementById("adminMessengerOverlay")?.classList.add("open");
    } catch (error) {
        showMessage(error.message, true);
    } finally {
        button.disabled = false;
        button.textContent = "Send";
    }
}

async function updateMenuItem(id) {
    try {
        await adminRequest(`/api/admin/menu/${id}`, {
            method: "PATCH",
            body: JSON.stringify({
                name: document.getElementById(`name-${id}`).value.trim(),
                category: document.getElementById(`category-${id}`).value.trim(),
                price: document.getElementById(`price-${id}`).value,
                description: document.getElementById(`description-${id}`).value.trim(),
                stock: document.getElementById(`stock-${id}`).value,
                isAvailable: document.getElementById(`available-${id}`).checked
            })
        });
        await loadAdmin();
        showMessage("Menu item updated.");
    } catch (error) {
        showMessage(error.message, true);
    }
}

function adjustStock(id, amount) {
    const input = document.getElementById(`stock-${id}`);
    if (!input) return;
    const nextValue = Math.max(0, Number(input.value || 0) + Number(amount || 0));
    input.value = String(nextValue);
}

async function updateOrder(id) {
    try {
        await adminRequest(`/api/admin/orders/${id}`, {
            method: "PATCH",
            body: JSON.stringify({
                orderStatus: document.getElementById(`status-${id}`).value,
                paymentStatus: document.getElementById(`payment-${id}`).value
            })
        });
        await loadAdmin();
        showMessage("Order updated.");
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function markOrderPaid(id) {
    const statusSelect = document.getElementById(`payment-${id}`);
    if (statusSelect) statusSelect.value = "Paid";
    const paidButton = document.querySelector(`.paid-check[onclick="markOrderPaid('${id}')"]`);
    paidButton?.classList.add("is-paid");
    try {
        await adminRequest(`/api/admin/orders/${id}`, {
            method: "PATCH",
            body: JSON.stringify({paymentStatus: "Paid"})
        });
        await loadAdmin();
        showMessage("Payment marked as paid.");
    } catch (error) {
        showMessage(error.message, true);
    }
}

function adminLogout() {
    clearAdminSession();
    window.location.href = "index.html";
}

function formatPrice(price) {
    return `\u20b1${Number(price || 0).toFixed(2)}`;
}

adminLogin?.addEventListener("submit", loginAdmin);
document.getElementById("adminMenuToggle")?.addEventListener("click", event => {
    const expanded = adminControls?.classList.toggle("active") || false;
    event.currentTarget.setAttribute("aria-expanded", String(expanded));
});
document.addEventListener("click", event => {
    const menuToggle = document.getElementById("adminMenuToggle");
    if (!adminControls || !menuToggle || !adminControls.classList.contains("active")) return;
    if (adminControls.contains(event.target) || menuToggle.contains(event.target)) return;
    adminControls.classList.remove("active");
    menuToggle.setAttribute("aria-expanded", "false");
});
window.addEventListener("load", loadAdmin);
window.setInterval(() => {
    const panelOpen = document.getElementById("adminMessengerOverlay")?.classList.contains("open");
    if (getAdminToken() && !panelOpen) loadAdmin();
}, 15000);
