const orderStages = [
    { key: "to-pay", label: "To Pay" },
    { key: "to-ship", label: "To Ship" },
    { key: "to-receive", label: "To Receive" },
    { key: "complete", label: "Complete Orders" }
];

let dashboardOrders = [];
let activeStage = localStorage.getItem("chickenNoyOrderStage") || "to-pay";

const productImageByKey = {
    "chicken-noy-party-platter": "../images/menu-item-1.png",
    "chicken-noy-bilao": "../images/menu-item-2.png",
    "chicken-bilao": "../images/menu-item-2.png",
    "chicken-fries-combo": "../images/menu-item-2.png",
    "chicken-and-fries-combo": "../images/menu-item-2.png",
    "chicken-noy-ultimate-feast": "../images/menu-item-3.png",
    "ultimate-chicken-feast": "../images/menu-item-3.png",
    "chicken-noy-classic-fried-leg": "../images/menu-item-4.png",
    "classic-fried-chicken-leg": "../images/menu-item-4.png",
    "chicken-noy-crispy-bundle": "../images/menu-item-5.png",
    "chickenoy-crispy-bundle": "../images/menu-item-5.png",
    "crispy-chicken-bundle": "../images/menu-item-5.png"
};

async function apiRequest(url, options = {}) {
    const token = localStorage.getItem("token");
    const { response, data } = await window.ChickenoyApi.request(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
            ...(token ? {"Authorization": `Bearer ${token}`} : {})
        }
    });
    if (!response.ok) throw new Error(data.error || data.message || "Request failed");
    return data;
}

async function loadDashboard() {
    const token = localStorage.getItem("token");

    if (!token) {
        setOrdersHtml(`
            <div class="empty-state">
                <div class="empty-state-icon lock-icon" aria-hidden="true"></div>
                <h3>Please Log In</h3>
                <p>You need to be logged in to view your orders.</p>
                <a href="login.html">Go to Login</a>
            </div>
        `);
        renderStageTabs([]);
        return;
    }

    try {
        dashboardOrders = await apiRequest("/api/orders");
        activeStage = chooseActiveStage(dashboardOrders);
        renderStageTabs(dashboardOrders);
        displayOrders();
        updateStats(dashboardOrders);
    } catch (error) {
        setOrdersHtml(`
            <div class="empty-state">
                <h3>Error Loading Orders</h3>
                <p>${escapeHtml(error.message)}</p>
                <button onclick="window.location.reload()" class="btn-inline">Retry</button>
            </div>
        `);
    }
}

function chooseActiveStage(orders) {
    if (orderStages.some(stage => stage.key === activeStage) && orders.some(order => getOrderStage(order) === activeStage)) {
        return activeStage;
    }
    const firstWithOrders = orderStages.find(stage => orders.some(order => getOrderStage(order) === stage.key));
    return firstWithOrders ? firstWithOrders.key : "to-pay";
}

function setActiveStage(stageKey) {
    activeStage = stageKey;
    localStorage.setItem("chickenNoyOrderStage", activeStage);
    renderStageTabs(dashboardOrders);
    displayOrders();
}

function renderStageTabs(orders) {
    const container = document.getElementById("orderStageTabs");
    if (!container) return;

    container.innerHTML = orderStages.map(stage => {
        const count = orders.filter(order => getOrderStage(order) === stage.key).length;
        const isActive = stage.key === activeStage;
        return `
            <button type="button" class="order-stage-tab ${isActive ? "active" : ""}" onclick="setActiveStage('${stage.key}')">
                <span>${stage.label}</span>
                <strong>${count}</strong>
            </button>
        `;
    }).join("");
}

function displayOrders() {
    const stage = orderStages.find(item => item.key === activeStage) || orderStages[0];
    const filteredOrders = dashboardOrders.filter(order => getOrderStage(order) === stage.key);

    if (!dashboardOrders.length) {
        setOrdersHtml(`
            <div class="empty-state">
                <h3>No Orders Yet</h3>
                <a href="menu.html">Browse Menu</a>
                <p>Explore more our products!</p>
            </div>
        `);
        return;
    }

    if (!filteredOrders.length) {
        setOrdersHtml(stage.key === "to-pay" ? `
            <div class="empty-state">
                <a href="menu.html">Browse Menu</a>
                <p>Explore more our products!</p>
            </div>
        ` : `
            <div class="empty-state">
                <h3>No ${stage.label} Orders</h3>
                <p>Orders will appear here automatically when they reach this stage.</p>
            </div>
        `);
        return;
    }

    const ordersList = document.getElementById("ordersList");
    ordersList.innerHTML = "";
    filteredOrders.forEach(order => ordersList.appendChild(createOrderElement(order)));
}

function setOrdersHtml(html) {
    document.getElementById("ordersList").innerHTML = html;
}

function getOrderStage(order) {
    const status = String(order.orderStatus || "Processing").toLowerCase();
    const payment = String(order.paymentStatus || "Pending").toLowerCase();

    if (status === "reviewed" && payment === "paid") return "complete";
    if (status === "to receive") return "to-receive";
    if (status === "received") return "complete";
    if (status === "shipped") return payment === "paid" ? "to-receive" : "to-ship";
    if (status === "processing" && payment === "pending") return "to-pay";
    if (status === "processing" && payment === "paid") return "to-ship";
    if (status === "reviewed") return "complete";
    return "to-ship";
}

function createOrderElement(order) {
    const div = document.createElement("article");
    div.className = "order-card";
    const statusClass = getStatusClass(order.orderStatus);
    const paymentStatusClass = getPaymentStatusClass(order.paymentStatus);
    const createdDate = new Date(order.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });

    div.innerHTML = `
        <div class="order-card-header">
            <div>
                <div class="order-id">Order #${escapeHtml(order._id)}</div>
                <div class="order-date">${createdDate}</div>
            </div>
            <div class="order-badges">
                <span class="order-status ${statusClass}">${escapeHtml(displayOrderStatus(order.orderStatus))}</span>
                <span class="order-status ${paymentStatusClass}">${escapeHtml(order.paymentStatus || "Pending")}</span>
            </div>
        </div>

        <div class="order-card-body">
            <section class="order-products">
                <div class="order-section-title">Product Ordered</div>
                ${renderOrderProducts(order.items || [])}
            </section>

            <section class="order-customer-box">
                <div class="order-section-title">Customer Information</div>
                ${detailRow("Name", order.name)}
                ${detailRow("Phone", order.phone)}
                ${detailRow("Address", order.address)}
                ${detailRow("Payment Method", order.paymentMethod || "COD")}
            </section>
        </div>

        <div class="order-total">
            <span>Total Amount</span>
            <span>${formatPrice(order.totalPrice || 0)}</span>
        </div>

        <div class="order-actions">${renderActions(order)}</div>
    `;

    return div;
}

function renderOrderProducts(items) {
    if (!items.length) {
        return `<p class="review-note">No product details were recorded for this order.</p>`;
    }

    return items.map(item => {
        const itemTotal = Number(item.price || 0) * Number(item.quantity || 0);
        const productImage = resolveOrderProductImage(item);
        const fallbackImage = fallbackOrderProductImage(item) || "../images/logo.png";
        return `
            <div class="order-product">
                <img src="${escapeAttribute(productImage)}" alt="${escapeAttribute(item.name || "Ordered product")}" onerror="this.onerror=null; this.src='${escapeAttribute(fallbackImage)}'">
                <div class="order-product-info">
                    <strong>${escapeHtml(item.name || "Menu Item")}</strong>
                    <span>${escapeHtml(item.category || "Chicken Noy")}</span>
                    <span>${formatPrice(item.price || 0)} x ${Number(item.quantity || 0)}</span>
                </div>
                <div class="order-product-total">${formatPrice(itemTotal)}</div>
            </div>
        `;
    }).join("");
}

function productKey(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function fallbackOrderProductImage(item) {
    const idKey = productKey(item?.menuItemId || item?._id);
    const nameKey = productKey(item?.name);
    return productImageByKey[idKey] || productImageByKey[nameKey] || "";
}

function isLogoImage(image) {
    return !image || /(?:^|\/)logo\.png(?:$|\?)/i.test(String(image));
}

function resolveOrderProductImage(item) {
    const storedImage = getImageUrl(item?.image);
    const productImage = getImageUrl(fallbackOrderProductImage(item));

    if (storedImage && !isLogoImage(storedImage)) return storedImage;
    if (productImage) return productImage;
    return "../images/logo.png";
}

function getImageUrl(image) {
    if (!image) return "../images/logo.png";
    if (/^https?:\/\//i.test(image)) return image;
    if (/^data:/i.test(image)) return image;
    if (image.startsWith("../")) return image;
    if (image.startsWith("/Frontend/images/")) return `..${image.replace(/^\/Frontend\//, "")}`;
    if (image.startsWith("/images/")) return `..${image}`;
    if (image.startsWith("images/")) return `../${image}`;
    if (image.startsWith("Frontend/images/")) return `../${image.replace(/^Frontend\//, "")}`;
    if (image.startsWith("/")) return image;
    return image;
}

function detailRow(label, value) {
    return `
        <div class="order-detail-row">
            <span class="order-detail-label">${escapeHtml(label)}</span>
            <span class="order-detail-value">${escapeHtml(value || "-")}</span>
        </div>
    `;
}

function renderActions(order) {
    if (String(order.paymentMethod || "").toUpperCase() === "GCASH" && String(order.paymentStatus || "").toLowerCase() !== "paid") {
        return `<button class="btn-inline" onclick="payOrder('${escapeAttribute(order._id)}')">Pay with GCash</button>`;
    }

    if (order.orderStatus === "To Receive" || order.orderStatus === "Shipped") {
        return `<button class="btn-inline" onclick="markReceived('${escapeAttribute(order._id)}')">Receive Order</button>`;
    }

    if (order.orderStatus === "Received") {
        return `
            <form class="review-form" onsubmit="submitReview(event, '${escapeAttribute(order._id)}')">
                <select name="rating" required>
                    <option value="">Rating</option>
                    <option value="5">5 - Excellent</option>
                    <option value="4">4 - Good</option>
                    <option value="3">3 - Okay</option>
                    <option value="2">2 - Needs Improvement</option>
                    <option value="1">1 - Poor</option>
                </select>
                <input name="comment" placeholder="Write your review" required>
                <button class="btn-inline" type="submit">Submit Review</button>
            </form>
        `;
    }

    if (order.review && order.review.rating) {
        return `<p class="review-note">Your review: ${escapeHtml(order.review.rating)}/5 - ${escapeHtml(order.review.comment || "Thank you for reviewing.")}</p>`;
    }

    return `<p class="review-note">Your order is being updated by the store.</p>`;
}

function payOrder(orderId) {
    localStorage.setItem("lastOrderID", orderId);
    window.location.href = "gcash-payment.html";
}

async function markReceived(orderId) {
    try {
        await apiRequest(`/api/orders/${orderId}/receive`, {method: "PATCH"});
        activeStage = "complete";
        await loadDashboard();
    } catch (error) {
        alert(error.message);
    }
}

async function submitReview(event, orderId) {
    event.preventDefault();
    const form = event.target;
    try {
        await apiRequest(`/api/orders/${orderId}/review`, {
            method: "PATCH",
            body: JSON.stringify({
                rating: form.rating.value,
                comment: form.comment.value
            })
        });
        activeStage = "complete";
        await loadDashboard();
    } catch (error) {
        alert(error.message);
    }
}

function getStatusClass(status) {
    switch ((status || "").toLowerCase()) {
        case "reviewed":
        case "received":
            return "status-delivered";
        case "to receive":
        case "shipped":
            return "status-shipped";
        default:
            return "status-pending";
    }
}

function displayOrderStatus(status) {
    return status === "To Receive" ? "To Receive" : (status || "Processing");
}

function getPaymentStatusClass(status) {
    return (status || "").toLowerCase() === "paid" ? "status-confirmed" : "status-pending";
}

function updateStats(orders) {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(order => !["Received", "Reviewed"].includes(order.orderStatus)).length;
    const totalSpent = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);

    document.getElementById("totalOrders").textContent = totalOrders;
    document.getElementById("pendingOrders").textContent = pendingOrders;
    document.getElementById("totalSpent").textContent = formatPrice(totalSpent);
}

function formatPrice(price) {
    return `\u20b1${Number(price || 0).toFixed(2)}`;
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

function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
}

function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("cart");
        window.location = "login.html";
    }
}

window.addEventListener("load", loadDashboard);
