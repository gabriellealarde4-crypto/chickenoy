const menuContainer = document.getElementById("menuContainer");
const customerReviewsBtn = document.getElementById("customerReviewsBtn");
const PRODUCT_REVIEWS_KEY = "chickenNoyProductReviews";
let currentProducts = [];

const ratingLabels = {
  1: "1 star - Poor",
  2: "2 stars - Fair",
  3: "3 stars - Good",
  4: "4 stars - Very good",
  5: "5 stars - Excellent"
};

const fallbackMenu = [
  {
    _id: "chicken-noy-party-platter",
    name: "Chicken Noy Party Platter",
    description: "Crispy chicken bites with shanghai and chicken skin for group sharing.",
    price: 1000,
    image: "/images/menu-item-1.png",
    category: "Combo",
    stock: 25,
    isAvailable: true
  },
  {
    _id: "chicken-fries-combo",
    name: "Chicken Noy Bilao",
    description: "Golden crispy chicken bites. Served fresh in a bilao for sharing.",
    price: 320,
    image: "/images/menu-item-2.png",
    category: "Chicken",
    stock: 50,
    isAvailable: true
  },
  {
    _id: "ultimate-chicken-feast",
    name: "Chicken Noy Ultimate Feast",
    description: "Large crispy fried chicken platter made for the whole family.",
    price: 1000,
    image: "/images/menu-item-3.png",
    category: "Feast",
    stock: 25,
    isAvailable: true
  },
  {
    _id: "classic-fried-chicken-leg",
    name: "Chicken Noy Classic Fried Leg",
    description: "Tender chicken leg with a crispy outside and juicy inside.",
    price: 25,
    image: "/images/menu-item-4.png",
    category: "Chicken",
    stock: 100,
    isAvailable: true
  },
  {
    _id: "crispy-chicken-bundle",
    name: "Chicken Noy Crispy Bundle",
    description: "Flavor-packed crispy chicken bites fried fresh for every order.",
    price: 500,
    image: "/images/menu-item-5.png",
    category: "Chicken",
    stock: 50,
    isAvailable: true
  }
];

function formatPrice(price) {
  return `\u20b1${Number(price || 0).toFixed(2)}`;
}

function getImageUrl(image) {
  if (!image) {
    return placeholderImage("Fried Chicken");
  }

  if (/^https?:\/\//i.test(image) || /^data:/i.test(image)) {
    return image;
  }

  const normalized = String(image)
    .replace(/\\/g, "/")
    .replace(/^(\.\.\/)+/, "/")
    .replace(/^(\.\/)+/, "");

  if (window.location.protocol === "file:" && normalized.startsWith("/")) {
    return `..${normalized}`;
  }

  if (normalized.startsWith("/")) {
    const apiBase = window.ChickenoyApi?.baseUrl || "";
    return apiBase ? `${apiBase}${normalized}` : normalized;
  }

  if (normalized.startsWith("images/")) return `../${normalized}`;
  if (normalized.startsWith("Frontend/images/")) return `../${normalized.replace(/^Frontend\//, "")}`;

  return normalized;
}

function placeholderImage(label) {
  const safeLabel = String(label || "Fried Chicken").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="440" viewBox="0 0 640 440"><rect width="640" height="440" fill="#fff7dd"/><circle cx="320" cy="188" r="92" fill="#ffbe0b" opacity=".18"/><text x="320" y="198" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="800" fill="#4a2f00">${safeLabel}</text><text x="320" y="245" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#805300">Chicken Noy</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function setImageFallback(image, label) {
  image.onerror = () => {
    image.onerror = null;
    image.src = placeholderImage(label);
  };
}

function productNameFromId(productIdValue) {
  const item = currentProducts.find(menuItem => reviewProductId(menuItem) === productIdValue || productId(menuItem) === productIdValue);
  return item?.name || productIdValue || "Menu Item";
}

function productImageFromReview(review) {
  if (review.productImage) return getImageUrl(review.productImage);
  const item = currentProducts.find(menuItem => reviewProductId(menuItem) === review.productId || productId(menuItem) === review.productId);
  return getImageUrl(item?.image);
}

function renderStars(value) {
  const rating = Math.max(0, Math.min(5, Number(value || 0)));
  return `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`;
}

function refreshStarPicker(picker, value = 0) {
  const selected = Number(value || 0);
  picker.dataset.rating = selected ? String(selected) : "";
  picker.querySelectorAll(".rating-star").forEach((label, index) => {
    const active = index < selected;
    label.classList.toggle("selected", active);
    label.querySelector("span").textContent = active ? "★" : "☆";
  });
}

function createStarPicker() {
  const picker = document.createElement("div");
  picker.className = "rating-picker";
  picker.setAttribute("role", "radiogroup");
  picker.setAttribute("aria-label", "Choose a star rating");

  for (let value = 1; value <= 5; value += 1) {
    const label = document.createElement("label");
    label.className = "rating-star";
    label.title = ratingLabels[value];

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "rating";
    input.value = String(value);
    input.required = value === 1;

    const star = document.createElement("span");
    star.textContent = "☆";
    star.setAttribute("aria-hidden", "true");

    label.append(input, star);
    label.addEventListener("mouseenter", () => refreshStarPicker(picker, value));
    label.addEventListener("focusin", () => refreshStarPicker(picker, value));
    input.addEventListener("change", () => refreshStarPicker(picker, value));
    picker.appendChild(label);
  }

  picker.addEventListener("mouseleave", () => {
    const selected = picker.querySelector('input[name="rating"]:checked')?.value || 0;
    refreshStarPicker(picker, selected);
  });

  refreshStarPicker(picker, 0);
  return picker;
}

function createRatingGuidelines() {
  const guidelines = document.createElement("div");
  guidelines.className = "rating-guidelines";

  const label = document.createElement("strong");
  label.textContent = "Rating guidelines";
  guidelines.appendChild(label);

  Object.entries(ratingLabels).forEach(([value, text]) => {
    const row = document.createElement("span");
    row.textContent = `${value} - ${text.replace(/^\d+\sstars?\s-\s/i, "")}`;
    guidelines.appendChild(row);
  });

  return guidelines;
}

function getCurrentUserName() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.name || "Customer";
  } catch (error) {
    return "Customer";
  }
}

function getReviews() {
  try {
    const reviews = JSON.parse(localStorage.getItem(PRODUCT_REVIEWS_KEY) || "[]");
    return Array.isArray(reviews) ? reviews : [];
  } catch (error) {
    return [];
  }
}

function saveReviews(reviews) {
  localStorage.setItem(PRODUCT_REVIEWS_KEY, JSON.stringify(reviews));
}

async function loadReviews() {
  if (window.location.protocol === "file:" || !window.ChickenoyApi) {
    updateRatingSummaries();
    return;
  }

  try {
    const { response, data } = await window.ChickenoyApi.request("/api/reviews");
    if (!response.ok || !Array.isArray(data)) return;
    saveReviews(data);
    updateRatingSummaries();
  } catch (error) {
    console.warn("Reviews API unavailable. Using local reviews instead.", error);
  }
}

function productId(item) {
  return item._id || item.name.toLowerCase().replace(/\s+/g, "-");
}

function reviewProductId(item) {
  return item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function reviewsForProduct(item) {
  const id = reviewProductId(item);
  return getReviews().filter(review => review.productId === id);
}

function averageRating(reviews) {
  if (!reviews.length) return 0;
  const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
  return total / reviews.length;
}

function ratingSummaryText(item) {
  const reviews = reviewsForProduct(item);
  const average = averageRating(reviews);
  const countText = reviews.length === 1 ? "1 rating" : `${reviews.length} ratings`;
  return `★ ${average ? average.toFixed(1) : "0.0"} (${countText})`;
}

function addToCart(item, button) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const itemId = item._id || item.name.toLowerCase().replace(/\s+/g, "-");
  const existingItem = cart.find(cartItem => cartItem._id === itemId);
  const stockLimit = Number(item.stock || 0);

  if (item.isAvailable === false || stockLimit <= 0) {
    alert(`${item.name} is sold out.`);
    return;
  }

  if (existingItem && existingItem.quantity >= stockLimit) {
    alert(`${item.name} has only ${stockLimit} available.`);
    return;
  }

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      _id: itemId,
      menuItemId: itemId,
      name: item.name,
      price: Number(item.price || 0),
      quantity: 1,
      category: item.category || "",
      image: item.image || ""
    });
  }

  localStorage.setItem("cart", JSON.stringify(cart));

  const originalText = button.textContent;
  button.classList.add("tap-feedback");
  button.textContent = "Added";
  button.disabled = true;
  button.classList.add("added");

  window.setTimeout(() => {
    button.classList.remove("tap-feedback");
    button.textContent = originalText;
    button.disabled = false;
    button.classList.remove("added");
  }, 1200);
}

function buyNow(item, button) {
  button.classList.add("tap-feedback");
  addToCart(item, button);
  window.setTimeout(() => {
    window.location.href = "checkout.html";
  }, 350);
}

function createMenuCard(item, index) {
  const card = document.createElement("div");
  card.className = "menu-card";
  card.style.animationDelay = `${index * 0.1}s`;

  const imageWrap = document.createElement("div");
  imageWrap.className = "menu-card-image";

  const image = document.createElement("img");
  image.src = getImageUrl(item.image);
  image.alt = item.name;
  setImageFallback(image, item.name);
  imageWrap.appendChild(image);
  imageWrap.tabIndex = 0;
  imageWrap.setAttribute("role", "button");
  imageWrap.setAttribute("aria-label", `Rate and review ${item.name}`);
  imageWrap.addEventListener("click", () => openProductReview(item));
  imageWrap.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProductReview(item);
    }
  });

  if (item.category) {
    const badge = document.createElement("div");
    badge.className = "menu-card-badge";
    badge.textContent = item.category;
    imageWrap.appendChild(badge);
  }

  const content = document.createElement("div");
  content.className = "menu-card-content";

  const title = document.createElement("h3");
  const titleBreaks = {
    "Chicken Noy Bilao": ["Chicken Noy", "Bilao"],
    "Chicken Noy Ultimate Feast": ["Chicken Noy", "Ultimate Feast"],
    "Chicken Noy Classic Fried Leg": ["Chicken Noy", "Classic Fried Leg"],
    "Chicken Noy Crispy Bundle": ["Chicken Noy", "Crispy Bundle"]
  };
  if (titleBreaks[item.name]) {
    title.append(titleBreaks[item.name][0], document.createElement("br"), titleBreaks[item.name][1]);
  } else {
    title.textContent = item.name;
  }

  const description = document.createElement("p");
  description.textContent = item.description || "";

  const rating = document.createElement("div");
  rating.className = "rating-summary";
  rating.dataset.productRating = reviewProductId(item);
  rating.textContent = ratingSummaryText(item);

  const footer = document.createElement("div");
  footer.className = "menu-card-footer";

  const price = document.createElement("div");
  price.className = "menu-card-price";
  price.textContent = formatPrice(item.price);

  const stock = document.createElement("div");
  stock.className = "menu-card-stock";
  const available = item.isAvailable !== false && Number(item.stock || 0) > 0;
  stock.textContent = available ? `${item.stock ?? "Fresh"} available` : "Sold out";

  const actions = document.createElement("div");
  actions.className = "menu-card-actions";

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.textContent = "Add to Cart";
  addButton.disabled = !available;
  addButton.addEventListener("click", () => addToCart(item, addButton));

  const buyButton = document.createElement("button");
  buyButton.type = "button";
  buyButton.textContent = "Pay";
  buyButton.className = "btn-buy-now";
  buyButton.disabled = !available;
  buyButton.addEventListener("click", () => buyNow(item, buyButton));

  actions.append(addButton, buyButton);
  footer.append(price, stock);
  content.append(title, description, rating, footer, actions);
  card.append(imageWrap, content);

  return card;
}

function updateRatingSummaries() {
  const cards = menuContainer.querySelectorAll("[data-product-rating]");
  cards.forEach(element => {
    const item = currentProducts.find(menuItem => reviewProductId(menuItem) === element.dataset.productRating || productId(menuItem) === element.dataset.productRating);
    if (item) element.textContent = ratingSummaryText(item);
  });
}

function closeReviewOverlay() {
  document.querySelector(".review-overlay")?.remove();
  document.documentElement.classList.remove("no-scroll");
  document.body.classList.remove("no-scroll");
}

function createOverlay() {
  closeReviewOverlay();
  const overlay = document.createElement("div");
  overlay.className = "review-overlay open";
  document.documentElement.classList.add("no-scroll");
  document.body.classList.add("no-scroll");
  overlay.addEventListener("click", event => {
    if (event.target === overlay) closeReviewOverlay();
  });

  const dialog = document.createElement("section");
  dialog.className = "review-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");

  const close = document.createElement("button");
  close.type = "button";
  close.className = "review-close";
  close.textContent = "×";
  close.setAttribute("aria-label", "Close reviews");
  close.addEventListener("click", closeReviewOverlay);

  dialog.appendChild(close);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  return dialog;
}

function legacyOpenProductReview(item) {
  const dialog = createOverlay();
  const layout = document.createElement("div");
  layout.className = "review-product-layout";

  const image = document.createElement("img");
  image.className = "review-product-image";
  image.src = getImageUrl(item.image);
  image.alt = item.name;
  setImageFallback(image, item.name);

  const panel = document.createElement("div");
  panel.className = "review-form-panel";

  const title = document.createElement("h2");
  title.textContent = item.name;

  const summary = document.createElement("p");
  summary.className = "rating-summary";
  summary.textContent = ratingSummaryText(item);

  const form = document.createElement("form");
  const guidelines = createRatingGuidelines();
  const options = createStarPicker();

  Object.entries(ratingLabels).forEach(([value, label]) => {
    const row = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "rating";
    input.value = value;
    input.required = true;
    const text = document.createElement("span");
    text.textContent = `${"★".repeat(Number(value))} ${label}`;
    row.append(input, text);
    options.appendChild(row);
  });

  const comment = document.createElement("textarea");
  comment.name = "comment";
  comment.placeholder = "Write your comment";

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "review-submit";
  submit.textContent = "Submit Rating";

  form.append(options, comment, submit);
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const formData = new FormData(form);
    submit.disabled = true;
    submit.textContent = "Submitting...";

    const reviewPayload = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      productId: reviewProductId(item),
      productName: item.name,
      productImage: item.image,
      rating: Number(formData.get("rating")),
      comment: String(formData.get("comment") || "").trim(),
      userName: getCurrentUserName(),
      submittedAt: new Date().toISOString()
    };

    let savedReview = reviewPayload;
    if (window.location.protocol !== "file:" && window.ChickenoyApi) {
      try {
        const token = localStorage.getItem("token");
        const { response, data } = await window.ChickenoyApi.request("/api/reviews", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify(reviewPayload)
        });
        if (response.ok) savedReview = data;
      } catch (error) {
        console.warn("Review API unavailable. Saving review locally instead.", error);
      }
    }

    const reviews = getReviews().filter(review => review.id !== savedReview.id && review._id !== savedReview._id);
    reviews.unshift(savedReview);
    saveReviews(reviews);
    updateRatingSummaries();
    closeReviewOverlay();
    openCustomerReviews();
  });

  panel.append(title, summary, form);
  layout.append(image, panel);
  dialog.appendChild(layout);
}

function legacyReviewCard(review) {
  const item = document.createElement("article");
  item.className = "review-item";

  const heading = document.createElement("strong");
  heading.textContent = `${review.productName} - ${"★".repeat(Number(review.rating || 0))}`;

  const meta = document.createElement("span");
  meta.className = "review-meta";
  meta.textContent = `${review.userName || "Customer"} | ${new Date(review.submittedAt).toLocaleString()}`;

  item.append(heading, meta);
  if (review.comment) {
    const comment = document.createElement("p");
    comment.textContent = review.comment;
    item.appendChild(comment);
  }
  return item;
}

function openProductReview(item) {
  const dialog = createOverlay();
  const layout = document.createElement("div");
  layout.className = "review-product-layout";

  const image = document.createElement("img");
  image.className = "review-product-image";
  image.src = getImageUrl(item.image);
  image.alt = item.name;
  setImageFallback(image, item.name);

  const panel = document.createElement("div");
  panel.className = "review-form-panel";

  const title = document.createElement("h2");
  title.textContent = item.name;

  const summary = document.createElement("p");
  summary.className = "rating-summary";
  summary.textContent = ratingSummaryText(item);

  const form = document.createElement("form");
  const guidelines = createRatingGuidelines();
  const options = createStarPicker();

  const comment = document.createElement("textarea");
  comment.name = "comment";
  comment.placeholder = "Write your comment";

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "review-submit";
  submit.textContent = "Submit Rating";

  form.append(guidelines, options, comment, submit);
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const formData = new FormData(form);
    submit.disabled = true;
    submit.textContent = "Submitting...";

    const reviewPayload = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      productId: reviewProductId(item),
      productName: item.name,
      productImage: item.image,
      rating: Number(formData.get("rating")),
      comment: String(formData.get("comment") || "").trim(),
      userName: getCurrentUserName(),
      submittedAt: new Date().toISOString()
    };

    let savedReview = reviewPayload;
    if (window.location.protocol !== "file:" && window.ChickenoyApi) {
      try {
        const token = localStorage.getItem("token");
        const { response, data } = await window.ChickenoyApi.request("/api/reviews", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify(reviewPayload)
        });
        if (response.ok) savedReview = data;
      } catch (error) {
        console.warn("Review API unavailable. Saving review locally instead.", error);
      }
    }

    const reviews = getReviews().filter(review => review.id !== savedReview.id && review._id !== savedReview._id);
    reviews.unshift(savedReview);
    saveReviews(reviews);
    await loadReviews();
    updateRatingSummaries();
    closeReviewOverlay();
    openCustomerReviews();
  });

  panel.append(title, summary, form);
  layout.append(image, panel);
  dialog.appendChild(layout);
}

function reviewCard(review) {
  const item = document.createElement("article");
  item.className = "review-item";

  const image = document.createElement("img");
  image.className = "review-item-image";
  image.src = productImageFromReview(review);
  image.alt = review.productName || productNameFromId(review.productId);
  setImageFallback(image, review.productName || productNameFromId(review.productId));

  const body = document.createElement("div");
  body.className = "review-item-body";

  const heading = document.createElement("strong");
  heading.textContent = review.productName || productNameFromId(review.productId);

  const stars = document.createElement("span");
  stars.className = "review-stars";
  stars.textContent = renderStars(review.rating);

  const meta = document.createElement("span");
  meta.className = "review-meta";
  meta.textContent = `${review.userName || "Customer"} | ${new Date(review.submittedAt).toLocaleString()}`;

  body.append(heading, stars, meta);
  if (review.comment) {
    const comment = document.createElement("p");
    comment.textContent = review.comment;
    body.appendChild(comment);
  }

  item.append(image, body);
  return item;
}

function openCustomerReviews() {
  const dialog = createOverlay();
  const panel = document.createElement("div");
  panel.className = "reviews-panel";

  const title = document.createElement("h2");
  title.textContent = "Customer Reviews";

  const list = document.createElement("div");
  list.className = "review-list";

  const reviews = getReviews();
  if (!reviews.length) {
    const empty = document.createElement("article");
    empty.className = "review-item";
    empty.innerHTML = "<strong>No reviews yet</strong><p>Customer ratings and comments will appear here.</p>";
    list.appendChild(empty);
  } else {
    reviews.forEach(review => list.appendChild(reviewCard(review)));
  }

  panel.append(title, list);
  dialog.appendChild(panel);
}

function renderMenu(items) {
  const products = Array.isArray(items) && items.length > 0 ? items.slice(0, 5) : fallbackMenu;
  currentProducts = products;

  menuContainer.innerHTML = "";
  products.forEach((item, index) => {
    menuContainer.appendChild(createMenuCard(item, index));
  });
}

async function loadMenu() {
  menuContainer.innerHTML = '<div class="loading-spinner"></div>';

  if (window.location.protocol === "file:") {
    renderMenu(fallbackMenu);
    return;
  }

  try {
    const { response, data } = await window.ChickenoyApi.request("/api/menu", { headers: { Accept: "application/json" } });

    if (!response.ok) {
      throw new Error(`Menu API returned ${response.status}`);
    }

    renderMenu(data);
  } catch (error) {
    console.warn("Menu API unavailable. Showing built-in menu instead.", error);
    renderMenu(fallbackMenu);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  loadMenu();
  loadReviews();
});
customerReviewsBtn?.addEventListener("click", async () => {
  await loadReviews();
  openCustomerReviews();
});
