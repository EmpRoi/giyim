const formatTRY = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0
});

const CART_KEY = "anatolia-cart-v1";
const API_BASE = resolveApiBase();

const productDetail = document.getElementById("productDetail");
const cartToggle = document.getElementById("cartToggle");
const cartDrawer = document.getElementById("cartDrawer");
const closeCart = document.getElementById("closeCart");
const overlay = document.getElementById("overlay");
const cartItems = document.getElementById("cartItems");
const subtotalValue = document.getElementById("subtotalValue");
const shippingValue = document.getElementById("shippingValue");
const totalValue = document.getElementById("totalValue");
const proceedPayment = document.getElementById("proceedPayment");

const state = {
  product: null,
  cart: loadCart()
};

function resolveApiBase() {
  const host = window.location.hostname;
  const port = window.location.port;
  const isLocalhost = host === "localhost" || host === "127.0.0.1";

  if (isLocalhost && port && port !== "3000") {
    return "http://localhost:3000";
  }

  return "";
}

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

function loadCart() {
  try {
    const saved = localStorage.getItem(CART_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
}

function getProductIdFromUrl() {
  const path = window.location.pathname;
  const match = path.match(/\/urun\/(.+)/);
  if (match) {
    return decodeURIComponent(match[1]);
  }
  
  // Also check query string
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function fetchProduct() {
  const productId = getProductIdFromUrl();
  
  if (!productId) {
    productDetail.innerHTML = '<p class="empty-state">Urun bulunamadi.</p>';
    return;
  }

  try {
    const response = await fetch(apiUrl(`/api/products/${encodeURIComponent(productId)}`));
    
    if (!response.ok) {
      throw new Error("Urun bulunamadi.");
    }

    state.product = await response.json();
    renderProduct();
  } catch (error) {
    productDetail.innerHTML = `<p class="empty-state">${error.message}</p>`;
  }
}

function renderProduct() {
  if (!state.product) return;

  const product = state.product;
  const sizes = product.sizes.map((size) => `<option value="${size}">${size}</option>`).join("");
  const badge = product.new ? '<span class="tag">YENI</span>' : "";
  const discount = product.oldPrice > product.price 
    ? Math.round((1 - product.price / product.oldPrice) * 100) 
    : 0;

  productDetail.innerHTML = `
    <div class="detail-image">
      <img src="${product.image}" alt="${product.name}" />
      ${badge}
    </div>
    <div class="detail-info">
      <p class="detail-category">${product.category}</p>
      <h2>${product.name}</h2>
      <div class="detail-prices">
        <span class="current-price">${formatTRY.format(product.price)}</span>
        ${product.oldPrice > product.price ? `
          <span class="old-price">${formatTRY.format(product.oldPrice)}</span>
          <span class="discount-badge">%${discount}</span>
        ` : ""}
      </div>
      <p class="detail-description">${product.description}</p>
      <p class="detail-stock">Stok: ${product.stock} adet</p>
      
      <div class="detail-actions">
        <select id="sizeSelect" class="size-select">
          ${sizes}
        </select>
        <button id="addToCartBtn" class="checkout-button" data-product-id="${product.id}">Sepete Ekle</button>
      </div>
      
      <p id="messageArea" class="order-result"></p>
    </div>
  `;

  // Add event listener for add to cart button
  document.getElementById("addToCartBtn").addEventListener("click", () => {
    addToCart();
  });
}

function findProductById(productId) {
  if (state.product && state.product.id === productId) {
    return state.product;
  }
  return null;
}

function addToCart() {
  const productId = state.product.id;
  const select = document.getElementById("sizeSelect");
  const selectedSize = select ? select.value : "M";

  const product = state.product;

  if (!product) {
    showMessage("Urun bulunamadi.", true);
    return;
  }

  if (product.stock <= 0) {
    showMessage("Bu urun stokta kalmadi.", true);
    return;
  }

  const key = `${productId}::${selectedSize}`;
  const existing = state.cart.find((item) => item.key === key);
  const currentQty = existing ? existing.quantity : 0;

  if (currentQty + 1 > product.stock) {
    showMessage(`Maksimum stok adedine ulasildi: ${product.name}`, true);
    return;
  }

  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      key,
      productId,
      name: product.name,
      size: selectedSize,
      quantity: 1,
      unitPrice: product.price
    });
  }

  saveCart();
  renderCart();
  showMessage(`${product.name} sepete eklendi.`, false);
}

function showMessage(text, isError) {
  const messageArea = document.getElementById("messageArea");
  if (messageArea) {
    messageArea.textContent = text;
    messageArea.classList.toggle("error", Boolean(isError));
    messageArea.classList.toggle("success", !isError && Boolean(text));
  }
}

function totals() {
  const SHIPPING_LIMIT = 1500;
  const SHIPPING_FEE = 79;
  
  const subtotal = state.cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const shipping = subtotal >= SHIPPING_LIMIT || subtotal === 0 ? 0 : SHIPPING_FEE;
  return {
    subtotal,
    shipping,
    total: subtotal + shipping
  };
}

function renderCart() {
  if (state.cart.length === 0) {
    cartItems.innerHTML = '<p class="empty-state">Sepetiniz bos.</p>';
  } else {
    cartItems.innerHTML = state.cart
      .map(
        (item) => `
          <article class="cart-item">
            <div class="cart-item-top">
              <div>
                <h5>${item.name}</h5>
                <p>Beden: ${item.size}</p>
              </div>
              <strong>${formatTRY.format(item.unitPrice * item.quantity)}</strong>
            </div>
            <div class="qty-row">
              <button type="button" data-role="qty-minus" data-key="${item.key}">-</button>
              <strong>${item.quantity}</strong>
              <button type="button" data-role="qty-plus" data-key="${item.key}">+</button>
            </div>
            <button class="remove-btn" type="button" data-role="remove" data-key="${item.key}">Kaldir</button>
          </article>
        `
      )
      .join("");
  }

  const { subtotal, shipping, total } = totals();
  subtotalValue.textContent = formatTRY.format(subtotal);
  shippingValue.textContent = shipping === 0 ? "Ucretsiz" : formatTRY.format(shipping);
  totalValue.textContent = formatTRY.format(total);
}

function updateQuantity(key, delta) {
  const index = state.cart.findIndex((item) => item.key === key);
  if (index < 0) return;

  const line = state.cart[index];
  const nextQuantity = line.quantity + delta;

  if (nextQuantity <= 0) {
    state.cart.splice(index, 1);
  } else {
    line.quantity = nextQuantity;
  }

  saveCart();
  renderCart();
}

function removeLine(key) {
  state.cart = state.cart.filter((item) => item.key !== key);
  saveCart();
  renderCart();
}

function openCart() {
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
  overlay.classList.remove("hidden");
}

function hideCart() {
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
  overlay.classList.add("hidden");
}

function bindEvents() {
  if (cartToggle) {
    cartToggle.addEventListener("click", openCart);
  }
  if (closeCart) {
    closeCart.addEventListener("click", hideCart);
  }
  if (overlay) {
    overlay.addEventListener("click", hideCart);
  }

  if (cartItems) {
    cartItems.addEventListener("click", (event) => {
      const target = event.target;
      const key = target.getAttribute("data-key");

      if (!key) return;

      if (target.matches('[data-role="qty-minus"]')) {
        updateQuantity(key, -1);
        return;
      }

      if (target.matches('[data-role="qty-plus"]')) {
        updateQuantity(key, 1);
        return;
      }

      if (target.matches('[data-role="remove"]')) {
        removeLine(key);
      }
    });
  }
}

async function init() {
  bindEvents();
  renderCart();
  await fetchProduct();
}

init();
