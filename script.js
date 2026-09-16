// Demo state is stored in the browser, so it remains after refresh.
let cart = JSON.parse(localStorage.getItem("amazon_cart")) || [];
let currentUser = localStorage.getItem("amazon_user") || "";
let deliveryAddress = JSON.parse(localStorage.getItem("amazon_address")) || null;
let orders = JSON.parse(localStorage.getItem("amazon_orders")) || [];
let selectedProduct = null;
let checkoutAfterAddress = false;

const $ = (selector) => document.querySelector(selector);
const boxes = [...document.querySelectorAll(".box")];
const cartCountSpan = $("#cart-count");
const userDisplay = $("#userDisplay");
const cartModal = $("#cartModal");
const productModal = $("#productModal");
const addressModal = $("#addressModal");
const ordersModal = $("#ordersModal");
const toast = $("#toast");

if (!currentUser) window.location.replace("login.html");
else userDisplay.textContent = `Hello, ${currentUser}`;

function formatPrice(value) { return Number(value).toLocaleString("en-IN"); }
function saveCart() { localStorage.setItem("amazon_cart", JSON.stringify(cart)); updateCartCount(); }
function updateCartCount() { cartCountSpan.textContent = cart.reduce((sum, item) => sum + item.qty, 0); }
function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}
function openModal(modal) { modal.style.display = "flex"; modal.setAttribute("aria-hidden", "false"); }
function closeModal(modal) { modal.style.display = "none"; modal.setAttribute("aria-hidden", "true"); }
function updateAddressDisplay() {
    $("#addressDisplay").textContent = deliveryAddress ? deliveryAddress.city : "Choose address";
}
function addressText(address) { return `${address.fullName}, ${address.addressLine}, ${address.city} - ${address.pincode}`; }
function productFromBox(box) {
    return { id: box.dataset.id, productName: box.dataset.product, price: Number(box.dataset.price), image: box.dataset.image, description: box.dataset.description };
}
function showProduct(product) {
    selectedProduct = product;
    $("#product-title").textContent = product.productName;
    $("#product-description").textContent = product.description;
    $("#product-price").textContent = formatPrice(product.price);
    const image = $("#product-image");
    image.src = product.image;
    image.alt = product.productName;
    openModal(productModal);
}
function addToCart(product) {
    const item = cart.find((cartItem) => cartItem.id === product.id);
    if (item) item.qty += 1;
    else cart.push({ ...product, qty: 1 });
    saveCart();
    showToast(`${product.productName} added to your cart`);
}
function renderCartItems() {
    const container = $("#cart-items-container");
    const totalSpan = $("#cart-total");
    const checkoutButton = $("#checkout-btn");
    if (!cart.length) {
        container.innerHTML = '<p class="empty-cart">Your Amazon Cart is empty.</p>';
        totalSpan.textContent = "0";
        checkoutButton.disabled = true;
        return;
    }
    checkoutButton.disabled = false;
    let total = 0;
    container.innerHTML = cart.map((item) => {
        total += item.price * item.qty;
        return `<article class="cart-item-row">
            <img src="${item.image || ""}" alt="${item.productName}">
            <div class="cart-item-info"><strong>${item.productName}</strong><p>₹${formatPrice(item.price)}</p>
                <div class="quantity-control"><button data-action="decrease" data-id="${item.id}" aria-label="Decrease quantity">−</button><span>${item.qty}</span><button data-action="increase" data-id="${item.id}" aria-label="Increase quantity">+</button></div>
            </div>
            <button class="remove-btn" data-action="remove" data-id="${item.id}">Remove</button>
        </article>`;
    }).join("");
    totalSpan.textContent = formatPrice(total);
}

boxes.forEach((box) => box.addEventListener("click", () => showProduct(productFromBox(box))));
$("#add-to-cart-btn").addEventListener("click", () => { if (selectedProduct) { addToCart(selectedProduct); closeModal(productModal); } });
$("#cartBtn").addEventListener("click", () => { renderCartItems(); openModal(cartModal); });
$(".close-cart").addEventListener("click", () => closeModal(cartModal));
$(".close-product").addEventListener("click", () => closeModal(productModal));

$("#cart-items-container").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const index = cart.findIndex((item) => item.id === button.dataset.id);
    if (index < 0) return;
    if (button.dataset.action === "increase") cart[index].qty += 1;
    if (button.dataset.action === "decrease") cart[index].qty -= 1;
    if (button.dataset.action === "remove" || cart[index]?.qty === 0) cart.splice(index, 1);
    saveCart(); renderCartItems();
});
$("#checkout-btn").addEventListener("click", () => {
    if (!cart.length) return;
    if (!deliveryAddress) {
        checkoutAfterAddress = true;
        closeModal(cartModal);
        openModal(addressModal);
        showToast("Please add a delivery address first.");
        return;
    }
    placeOrder();
});
function placeOrder() {
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    orders.unshift({ id: `AMZ-${Date.now().toString().slice(-7)}`, date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }), items: cart, total, address: deliveryAddress });
    localStorage.setItem("amazon_orders", JSON.stringify(orders));
    cart = []; saveCart(); closeModal(cartModal);
    showToast("Order placed successfully. See it in Your Orders.");
}
function renderOrders() {
    const container = $("#orders-container");
    if (!orders.length) { container.innerHTML = '<p class="empty-cart">No orders yet. Your placed orders will appear here.</p>'; return; }
    container.innerHTML = orders.map((order) => `<article class="order-card">
        <div class="order-top"><div><small>ORDER PLACED</small><strong>${order.date}</strong></div><div><small>TOTAL</small><strong>₹${formatPrice(order.total)}</strong></div><div><small>ORDER #</small><strong>${order.id}</strong></div></div>
        <p class="order-status">Arriving soon</p>
        <p>${order.items.map((item) => `${item.productName} × ${item.qty}`).join(" · ")}</p>
        <small>Deliver to: ${addressText(order.address)}</small>
    </article>`).join("");
}
$("#addressBtn").addEventListener("click", () => {
    if (deliveryAddress) {
        $("#fullName").value = deliveryAddress.fullName;
        $("#addressLine").value = deliveryAddress.addressLine;
        $("#city").value = deliveryAddress.city;
        $("#pincode").value = deliveryAddress.pincode;
    }
    openModal(addressModal);
});
$("#addressForm").addEventListener("submit", (event) => {
    event.preventDefault();
    deliveryAddress = { fullName: $("#fullName").value.trim(), addressLine: $("#addressLine").value.trim(), city: $("#city").value.trim(), pincode: $("#pincode").value.trim() };
    localStorage.setItem("amazon_address", JSON.stringify(deliveryAddress));
    updateAddressDisplay(); closeModal(addressModal); showToast("Delivery address saved.");
    if (checkoutAfterAddress) { checkoutAfterAddress = false; placeOrder(); }
});
$("#ordersBtn").addEventListener("click", () => { renderOrders(); openModal(ordersModal); });
$(".close-address").addEventListener("click", () => closeModal(addressModal));
$(".close-orders").addEventListener("click", () => closeModal(ordersModal));
$("#openLoginModalBtn").addEventListener("click", () => {
    if (confirm(`Signed in as ${currentUser}. Do you want to sign out?`)) {
        localStorage.removeItem("amazon_user"); window.location.replace("login.html");
    }
});
function performSearch() {
    const query = $("#searchInput").value.toLowerCase().trim();
    let visibleCount = 0;
    boxes.forEach((box) => { const matches = !query || box.dataset.product.toLowerCase().includes(query); box.hidden = !matches; if (matches) visibleCount += 1; });
    if (query && !visibleCount) showToast("No matching products found.");
}
$("#searchBtn").addEventListener("click", performSearch);
$("#searchInput").addEventListener("keydown", (event) => { if (event.key === "Enter") performSearch(); });
window.addEventListener("click", (event) => { if ([cartModal, productModal, addressModal, ordersModal].includes(event.target)) closeModal(event.target); });
window.addEventListener("keydown", (event) => { if (event.key === "Escape") [cartModal, productModal, addressModal, ordersModal].forEach(closeModal); });
updateCartCount();
updateAddressDisplay();
