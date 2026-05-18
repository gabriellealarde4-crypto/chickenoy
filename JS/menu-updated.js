// Initialize menu when page loads
const menuContainer = document.getElementById("menuContainer");

// Fetch menu items from backend API
async function loadMenu() {
    try {
        menuContainer.innerHTML = '<div class="loading-spinner"></div>';
        
        const { response, data } = await window.ChickenoyApi.request("/api/menu");
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        if (!data || data.length === 0) {
            menuContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999; padding: 40px;">No menu items available. Please come back soon!</p>';
            return;
        }
        
        menuContainer.innerHTML = '';
        
        data.forEach(item => {
            const card = document.createElement("div");
            card.className = "menu-card";

            const imageUrl = item.image || 'https://via.placeholder.com/260x240?text=Fried+Chicken';

            card.innerHTML = `
                <div class="menu-card-image">
                    <img src="${imageUrl}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/260x240?text=${encodeURIComponent(item.name)}'">
                    <div class="menu-card-badge">${item.category}</div>
                </div>
                <div class="menu-card-content">
                    <h3>${item.name}</h3>
                    <p>${item.description}</p>
                    <div class="menu-card-footer">
                        <div class="menu-card-price">₱${item.price}</div>
                        <button onclick="addToCartItem(this, ${item._id || Math.random()}, '${item.name}', ${item.price})">Add</button>
                    </div>
                </div>
            `;

            menuContainer.appendChild(card);
        });
    } catch (error) {
        console.error("Error fetching menu:", error);
        menuContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: red; padding: 40px;">⚠️ Error loading menu. Please try again later.</p>';
    }
}

// Add item to shopping cart
function addToCartItem(btnElement, itemId, itemName, itemPrice) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    // Get the item ID from the button's data attribute or generate one
    const existingItem = cart.find(p => p.name === itemName && p.price === itemPrice);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            _id: itemId || Math.random().toString(36).substr(2, 9),
            name: itemName,
            price: itemPrice,
            quantity: 1,
            category: ""
        });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    
    // Show success animation
    const originalText = btnElement.textContent;
    btnElement.textContent = "✅ Added!";
    btnElement.style.backgroundColor = "#4CAF50";
    btnElement.style.color = "white";
    
    setTimeout(() => {
        btnElement.textContent = originalText;
        btnElement.style.backgroundColor = "";
        btnElement.style.color = "";
    }, 1500);
}

// Load menu when page loads
window.addEventListener("load", loadMenu);
