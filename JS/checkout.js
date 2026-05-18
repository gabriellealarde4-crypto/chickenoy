// Load cart items and display order summary
function loadOrderSummary() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const orderItemsDiv = document.getElementById("orderItems");
    let total = 0;

    if (cart.length === 0) {
        orderItemsDiv.innerHTML = "<p style='color: #999;'>Your cart is empty</p>";
        document.getElementById("checkoutForm").style.display = "none";
        return;
    }

    let itemsHTML = "";
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        itemsHTML += `
            <div class="order-item">
                <span>${item.name} x${item.quantity}</span>
                <span>₱${itemTotal.toFixed(2)}</span>
            </div>
        `;
    });

    orderItemsDiv.innerHTML = itemsHTML;
    document.getElementById("orderTotal").textContent = "₱" + total.toFixed(2);
}

// Generate unique order ID
function generateOrderID() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD${timestamp}${random}`;
}

// Handle checkout form submission
document.getElementById("checkoutForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    
    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    // Calculate total price
    let totalPrice = 0;
    cart.forEach(item => {
        totalPrice += item.price * item.quantity;
    });

    const paymentMethod = document.getElementById("payment").value;
    
    // Create order object with exact format
    const order = {
        _id: generateOrderID(),
        name: document.getElementById("name").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        address: document.getElementById("address").value.trim(),
        items: cart.map(item => ({
            menuItemId: item.menuItemId || item._id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            image: item.image || "",
            category: item.category || ""
        })),
        totalPrice: totalPrice,
        paymentMethod: paymentMethod,
        paymentStatus: paymentMethod === "GCASH" ? "Pending" : "Pending",
        orderStatus: "Processing",
        createdAt: new Date().toISOString().split('T')[0]
    };

    // Validate form
    if (!order.name || !order.phone || !order.address || !paymentMethod) {
        alert("Please fill in all fields!");
        return;
    }

    // Get auth token
    const token = localStorage.getItem("token");
    if (!token) {
        alert("Please login first!");
        window.location = "login.html";
        return;
    }

    try {
        const { response, data } = await window.ChickenoyApi.request("/api/orders/create", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(order)
        });

        if (!response.ok) {
            const message = data.error || data.message || "Order could not be created. Please check your login, cart items, and delivery details.";
            alert("Error creating order: " + message);
            console.error("Order creation error:", data);
            return;
        }

        // Clear cart after successful order
        localStorage.removeItem("cart");
        const savedOrderId = data._id || order._id;
        localStorage.setItem("lastOrderID", savedOrderId);
        localStorage.setItem("chickenNoyOrderStage", paymentMethod === "GCASH" ? "to-pay" : "to-ship");

        alert("Order placed successfully!\n\nOrder ID: " + savedOrderId + "\n\nYour order is now listed in your dashboard.");
        window.location = paymentMethod === "GCASH" ? "gcash-payment.html" : "dashboard.html";

    } catch (error) {
        console.error("Checkout error:", error);
        alert("Error creating order: " + error.message);
    }
});

// Load order summary when page loads
window.addEventListener("load", loadOrderSummary);
