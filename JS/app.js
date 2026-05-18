window.addEventListener("DOMContentLoaded", () => {
    window.ChickenoyApi.request("/api/menu")
        .then(({ data }) => {
            const container = document.getElementById("menuContainer");
            if (!container) return;

            data.forEach(item => {
                const card = document.createElement("div");

                card.innerHTML = `
        
        <div class="card">
        
        <img src="${item.image}" width="200">

        <h3>${item.name}</h3>

        <p>${item.description}</p>

        <h4>PHP ${item.price}</h4>

        <button onclick="addToCart('${item.name}',${item.price})">
        Add to Cart
        </button>

        </div>
        `;

                container.appendChild(card);
            });
        });
});
