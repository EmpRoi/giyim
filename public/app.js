const formatTRY = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0
});

const SHIPPING_LIMIT = 1500;
const SHIPPING_FEE = 79;
const CART_KEY = "anatolia-cart-v1";
const AUTH_KEY = "anatolia-auth-v1";
const API_BASE = resolveApiBase();

const state = {
  allProducts: [],
  products: [],
  cart: loadCart(),
  authUser: null,
  paymentUnlocked: false,
  filters: {
    category: "all",
    search: "",
    sort: "featured"
  }
};

const productGrid = document.getElementById("productGrid");
const productMeta = document.getElementById("productMeta");
const searchInput = document.getElementById("searchInput");
const categoryInput = document.getElementById("categoryInput");
const sortInput = document.getElementById("sortInput");

const cartToggle = document.getElementById("cartToggle");
const cartDrawer = document.getElementById("cartDrawer");
const closeCart = document.getElementById("closeCart");
const overlay = document.getElementById("overlay");

const cartItems = document.getElementById("cartItems");
const cartCount = document.getElementById("cartCount");
const subtotalValue = document.getElementById("subtotalValue");
const shippingValue = document.getElementById("shippingValue");
const totalValue = document.getElementById("totalValue");

const checkoutForm = document.getElementById("checkoutForm");
const checkoutButton = document.getElementById("checkoutButton");
const orderResult = document.getElementById("orderResult");
const authNotice = document.getElementById("authNotice");
const checkoutSection = document.getElementById("checkoutSection");
const paymentPanel = document.getElementById("paymentPanel");
const paymentLockNote = document.getElementById("paymentLockNote");
const proceedPayment = document.getElementById("proceedPayment");

const paymentMethodInput = document.getElementById("paymentMethod");
const cardFields = document.getElementById("cardFields");
const cardNumberInput = document.getElementById("cardNumber");
const cardFieldNames = ["cardHolder", "cardNumber", "expiryMonth", "expiryYear", "cvv"];

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

function getAuthToken() {
  return localStorage.getItem(AUTH_KEY) || "";
}

function clearAuthToken() {
  localStorage.removeItem(AUTH_KEY);
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatCardNumberValue(value) {
  return onlyDigits(value)
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function isValidCardNumber(rawNumber) {
  const cardNumber = onlyDigits(rawNumber);
  if (cardNumber.length < 13 || cardNumber.length > 19) {
    return false;
  }

  let sum = 0;
  let shouldDouble = false;

  for (let i = cardNumber.length - 1; i >= 0; i -= 1) {
    let digit = Number(cardNumber[i]);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function normalizeExpiryYear(rawYear) {
  const year = Number.parseInt(rawYear, 10);
  if (!Number.isInteger(year)) {
    return null;
  }
  if (year < 100) {
    return 2000 + year;
  }
  return year;
}

function isCardExpired(expiryMonth, expiryYear) {
  const now = new Date();
  const lastMomentOfMonth = new Date(expiryYear, expiryMonth, 0, 23, 59, 59, 999);
  return lastMomentOfMonth.getTime() < now.getTime();
}

function validateCardPayload(cardPayload) {
  const cardHolder = String(cardPayload.cardHolder || "").trim();
  const cardNumber = onlyDigits(cardPayload.cardNumber);
  const expiryMonth = Number.parseInt(cardPayload.expiryMonth, 10);
  const expiryYear = normalizeExpiryYear(cardPayload.expiryYear);
  const cvv = onlyDigits(cardPayload.cvv);

  if (!cardHolder || cardHolder.length < 2) {
    return "Kart uzerindeki isim gecersiz.";
  }

  if (!isValidCardNumber(cardNumber)) {
    return "Kart numarasi gecersiz.";
  }

  if (!Number.isInteger(expiryMonth) || expiryMonth < 1 || expiryMonth > 12 || !expiryYear) {
    return "Son kullanma tarihi gecersiz.";
  }

  if (isCardExpired(expiryMonth, expiryYear)) {
    return "Kartin son kullanma tarihi gecmis.";
  }

  if (!/^\d{3,4}$/.test(cvv)) {
    return "CVV gecersiz.";
  }

  return null;
}

function buildProductQuery() {
  return new URLSearchParams({ sort: "featured" }).toString();
}

function setAuthNotice(user) {
  if (user) {
    authNotice.textContent = `Giris yapildi: ${user.fullName} (${user.email}). Siparisleriniz icin Uyelik paneline gidebilirsiniz.`;
    return;
  }

  authNotice.textContent = 'Siparis vermek icin once uyelik girisi yapmalisiniz.';
}

function applyUserToCheckout(user) {
  const fullNameInput = checkoutForm.elements.fullName;
  const emailInput = checkoutForm.elements.email;
  const phoneInput = checkoutForm.elements.phone;

  if (!user) {
    emailInput.readOnly = false;
    return;
  }

  fullNameInput.value = user.fullName || fullNameInput.value;
  emailInput.value = user.email || emailInput.value;
  phoneInput.value = user.phone || phoneInput.value;
  emailInput.readOnly = true;
}

async function hydrateSession() {
  const token = getAuthToken();

  if (!token) {
    state.authUser = null;
    setAuthNotice(null);
    applyUserToCheckout(null);
    return;
  }

  try {
    const response = await fetch(apiUrl("/api/auth/me"), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error("Oturum gecersiz");
    }

    const data = await response.json();
    state.authUser = data.user;
    setAuthNotice(state.authUser);
    applyUserToCheckout(state.authUser);
  } catch {
    clearAuthToken();
    state.authUser = null;
    setAuthNotice(null);
    applyUserToCheckout(null);
  }
}

function applyFilters() {
  let output = [...state.allProducts];

  if (state.filters.category && state.filters.category !== "all") {
    output = output.filter((item) => item.category === state.filters.category);
  }

  if (state.filters.search) {
    const q = state.filters.search.toLowerCase();
    output = output.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }

  if (state.filters.sort === "price-asc") {
    output.sort((a, b) => a.price - b.price);
  } else if (state.filters.sort === "price-desc") {
    output.sort((a, b) => b.price - a.price);
  } else if (state.filters.sort === "new") {
    output.sort((a, b) => Number(b.new) - Number(a.new));
  } else {
    output.sort((a, b) => Number(b.featured) - Number(a.featured));
  }

  state.products = output;
  renderProducts();
}

async function fetchProducts() {
  productGrid.innerHTML = '<p class="empty-state">Urunler yukleniyor...</p>';

  const response = await fetch(apiUrl(`/api/products?${buildProductQuery()}`));
  if (!response.ok) {
    throw new Error("Urun listesi alinamadi.");
  }

  state.allProducts = await response.json();
  applyFilters();
}

function renderProducts() {
  if (state.products.length === 0) {
    productGrid.innerHTML = '<p class="empty-state">Aradiginiz kriterde urun bulunamadi.</p>';
    productMeta.textContent = "0 urun listeleniyor";
    return;
  }

  productMeta.textContent = `${state.products.length} urun listeleniyor`;

  productGrid.innerHTML = state.products
    .map((item, index) => {
      const sizes = item.sizes.map((size) => `<option value="${size}">${size}</option>`).join("");
      const badge = item.new ? '<span class="tag">YENI</span>' : "";
      const delay = (index % 8) * 40;
      const discount = item.oldPrice ? '<span class="discount-badge">İndirim</span>' : '';

      return `
        <article class="product-card" style="animation-delay:${delay}ms" data-id="${item.id}">
          <a href="product-detail.html?id=${item.id}" class="product-image-link">
            <img class="product-image" src="${item.image}" alt="${item.name}" loading="lazy" />
            <div class="product-overlay">
              <button type="button" class="wishlist-toggle" data-id="${item.id}" aria-label="Add to wishlist">❤</button>
              <button type="button" class="quick-view-btn" data-id="${item.id}">Hizli Gorunum</button>
            </div>
            ${badge}
            ${discount}
          </a>
          <div class="card-body">
            <div class="card-top">
              <h4><a href="product-detail.html?id=${item.id}">${item.name}</a></h4>
            </div>
            ${item.description ? `<p class="product-desc">${item.description}</p>` : ''}
            <div class="price-row">
              <span class="current-price">${formatTRY.format(item.price)}</span>
              ${item.oldPrice ? `<span class="old-price">${formatTRY.format(item.oldPrice)}</span>` : ''}
            </div>
            ${item.stock < 5 ? `<p class="stock-warning">Son ${item.stock} urun!</p>` : `<p class="stock">Stok: ${item.stock} adet</p>`}
            <div class="card-actions">
              <select data-role="size-select" data-product-id="${item.id}">
                <option value="">Beden Sec</option>
                ${sizes}
              </select>
              <button class="add-btn" data-role="add-cart" data-product-id="${item.id}">Sepete Ekle</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
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

function totals() {
  const subtotal = state.cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const shipping = subtotal >= SHIPPING_LIMIT || subtotal === 0 ? 0 : SHIPPING_FEE;
  return {
    subtotal,
    shipping,
    total: subtotal + shipping
  };
}

function renderCart() {
  cartCount.textContent = String(state.cart.reduce((sum, item) => sum + item.quantity, 0));

  if (state.cart.length === 0) {
    cartItems.innerHTML = '<p class="empty-state">Sepetiniz bos. Urun ekleyerek baslayin.</p>';
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
  updatePaymentFlow();
}

function findProductById(productId) {
  return state.allProducts.find((item) => item.id === productId);
}

function addToCart(productId, selectedSize) {
  const product = findProductById(productId);

  if (!product) {
    setOrderMessage("Urun bulunamadi.", true);
    return;
  }

  if (product.stock <= 0) {
    setOrderMessage("Bu urun stokta kalmadi.", true);
    return;
  }

  const key = `${productId}::${selectedSize}`;
  const existing = state.cart.find((item) => item.key === key);
  const currentQty = existing ? existing.quantity : 0;

  if (currentQty + 1 > product.stock) {
    setOrderMessage(`Maksimum stok adedine ulasildi: ${product.name}`, true);
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
  setOrderMessage(`${product.name} sepete eklendi.`, false);
}

function updateQuantity(key, delta) {
  const index = state.cart.findIndex((item) => item.key === key);
  if (index < 0) {
    return;
  }

  const line = state.cart[index];
  const product = findProductById(line.productId);
  if (!product) {
    return;
  }

  const nextQuantity = line.quantity + delta;

  if (nextQuantity <= 0) {
    state.cart.splice(index, 1);
  } else if (nextQuantity <= product.stock) {
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

function setOrderMessage(text, isError) {
  orderResult.textContent = text;
  orderResult.classList.toggle("error", Boolean(isError));
  orderResult.classList.toggle("success", !isError);
}

function updatePaymentFlow() {
  const hasItems = state.cart.length > 0;
  proceedPayment.disabled = !hasItems;

  if (!hasItems) {
    state.paymentUnlocked = false;
  }

  if (state.paymentUnlocked && hasItems) {
    paymentPanel.classList.remove("hidden");
    paymentLockNote.textContent = "Odeme sistemi aktif. Bilgileri doldurup siparisi tamamlayabilirsiniz.";
    return;
  }

  paymentPanel.classList.add("hidden");

  if (hasItems) {
    paymentLockNote.textContent = 'Sepet hazir. Sepetten "Odeme Yap" secenegine tiklayarak odeme ekranini acin.';
    return;
  }

  paymentLockNote.textContent = 'Sepete urun ekledikten sonra sepetten "Odeme Yap" butonuna tiklayin.';
}

function openPaymentFlow() {
  if (state.cart.length === 0) {
    setOrderMessage("Odeme ekranini acmak icin sepete urun ekleyin.", true);
    return;
  }

  state.paymentUnlocked = true;
  updatePaymentFlow();
  hideCart();
  checkoutSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setCardFieldsVisibility() {
  const useCard = paymentMethodInput.value === "Kredi Karti";
  cardFields.classList.toggle("hidden", !useCard);

  for (const fieldName of cardFieldNames) {
    const input = checkoutForm.elements[fieldName];
    if (!input) {
      continue;
    }

    input.required = useCard;

    if (!useCard) {
      input.value = "";
    }
  }
}

function getCardPayload(formData) {
  return {
    cardHolder: formData.get("cardHolder"),
    cardNumber: formData.get("cardNumber"),
    expiryMonth: formData.get("expiryMonth"),
    expiryYear: formData.get("expiryYear"),
    cvv: formData.get("cvv")
  };
}

async function submitOrder(event) {
  event.preventDefault();

  if (state.cart.length === 0) {
    setOrderMessage("Siparis icin once sepete urun ekleyin.", true);
    return;
  }

  if (!state.paymentUnlocked) {
    setOrderMessage('Once sepetten "Odeme Yap" secenegine tiklayin.', true);
    return;
  }

  const token = getAuthToken();
  if (!token) {
    setOrderMessage("Siparis icin once uyelik girisi yapin.", true);
    return;
  }

  const formData = new FormData(checkoutForm);
  const paymentMethod = formData.get("paymentMethod");

  const customer = {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    city: formData.get("city"),
    district: formData.get("district"),
    postalCode: formData.get("postalCode")
  };

  let payment = null;
  if (paymentMethod === "Kredi Karti") {
    payment = getCardPayload(formData);
    const validationMessage = validateCardPayload(payment);

    if (validationMessage) {
      setOrderMessage(validationMessage, true);
      return;
    }
  }

  const payload = {
    customer,
    paymentMethod,
    payment,
    items: state.cart.map((item) => ({
      productId: item.productId,
      size: item.size,
      quantity: item.quantity
    }))
  };

  checkoutButton.disabled = true;
  checkoutButton.textContent = "Siparis olusturuluyor...";

  try {
    const response = await fetch(apiUrl("/api/orders"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthToken();
        state.authUser = null;
        setAuthNotice(null);
        applyUserToCheckout(null);
      }
      throw new Error(data.message || "Siparis olusturulamadi.");
    }

    const approvalText = data.approvalCode ? ` | Onay Kodu: ${data.approvalCode}` : "";
    const trackingText = data.trackingStatus ? ` | Durum: ${data.trackingStatus}` : "";

    setOrderMessage(`Siparis alindi. Siparis No: ${data.orderNo}${trackingText}${approvalText}`, false);

    checkoutForm.reset();
    setCardFieldsVisibility();
    applyUserToCheckout(state.authUser);

    state.cart = [];
    state.paymentUnlocked = false;
    saveCart();
    renderCart();
    await fetchProducts();
    openCart();
  } catch (error) {
    setOrderMessage(error.message, true);
  } finally {
    checkoutButton.disabled = false;
    checkoutButton.textContent = "Siparisi Tamamla";
  }
}

function bindEvents() {
  // Cart-related events (elements that should exist on most pages)
  const cartToggle = document.getElementById("cartToggle");
  const closeCart = document.getElementById("cartClose");
  const overlay = document.getElementById("overlay");
  const cartItems = document.getElementById("cartItems");
  const checkoutBtn = document.getElementById("checkoutBtn");
  
  if (cartToggle) cartToggle.addEventListener("click", openCart);
  if (closeCart) closeCart.addEventListener("click", hideCart);
  if (overlay) overlay.addEventListener("click", hideCart);
  if (checkoutBtn) checkoutBtn.addEventListener("click", openPaymentFlow);

  // Product grid and filter events (products.html and index.html only)
  const searchInput = document.getElementById("searchInput");
  const categoryInput = document.getElementById("categoryInput");
  const sortInput = document.getElementById("sortInput");
  const productGrid = document.getElementById("productGrid");
  
  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      state.filters.search = event.target.value.trim();
      applyFilters();
    });
  }

  if (categoryInput) {
    categoryInput.addEventListener("change", (event) => {
      state.filters.category = event.target.value;
      applyFilters();
    });
  }

  if (sortInput) {
    sortInput.addEventListener("change", (event) => {
      state.filters.sort = event.target.value;
      applyFilters();
    });
  }

  // Payment form events (products.html only)
  const paymentMethodInput = document.getElementById("paymentMethod");
  const cardNumberInput = document.getElementById("cardNumber");
  const checkoutForm = document.getElementById("checkoutForm");
  
  if (paymentMethodInput) {
    paymentMethodInput.addEventListener("change", setCardFieldsVisibility);
  }

  if (cardNumberInput) {
    cardNumberInput.addEventListener("input", (event) => {
      event.target.value = formatCardNumberValue(event.target.value);
    });
  }

  // Product grid add to cart events
  if (productGrid) {
    productGrid.addEventListener("click", (event) => {
      const button = event.target.closest('[data-role="add-cart"]');
      if (!button) {
        return;
      }

      const productId = button.getAttribute("data-product-id");
      const select = productGrid.querySelector(`[data-role="size-select"][data-product-id="${productId}"]`);
      const size = select ? select.value : "M";

      addToCart(productId, size);
    });
  }

  // Cart items events
  if (cartItems) {
    cartItems.addEventListener("click", (event) => {
      const target = event.target;
      const key = target.getAttribute("data-key");

      if (!key) {
        return;
      }

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

  if (checkoutForm) {
    checkoutForm.addEventListener("submit", submitOrder);
  }

  // Newsletter form handler - optional element, may not exist on some pages
  const newsletterForm = document.getElementById("newsletterForm");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = document.getElementById("newsletterEmail").value.trim();
      const messageEl = document.getElementById("newsletterMessage");
      
      if (!email) {
        if (messageEl) {
          messageEl.textContent = "Lutfen email adresinizi giriniz.";
          messageEl.className = "newsletter-message error";
        }
        return;
      }

      try {
        const response = await fetch(apiUrl("/api/newsletter"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });

        const data = await response.json();
        
        if (messageEl) {
          if (response.ok) {
            messageEl.textContent = "Bultene basariyla kayit olundu!";
            messageEl.className = "newsletter-message success";
            newsletterForm.reset();
          } else {
            messageEl.textContent = data.error || "Kayit olurken bir hata olustu.";
            messageEl.className = "newsletter-message error";
          }
        }
      } catch (error) {
        if (messageEl) {
          messageEl.textContent = "Baglanti hatasi. Lutfen tekrar deneyin.";
          messageEl.className = "newsletter-message error";
        }
      }
    });
  }

  // Contact form handler - optional element, only on contact.html
  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(contactForm);
      const data = {
        name: formData.get("name")?.trim() || "",
        email: formData.get("email")?.trim() || "",
        subject: formData.get("subject") || "",
        message: formData.get("message")?.trim() || ""
      };

      if (!data.name || !data.email || !data.message) {
        alert("Lutfen tum zorunlu alanlari doldurunuz.");
        return;
      }

      try {
        const response = await fetch(apiUrl("/api/contact"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });

        if (response.ok) {
          alert("Mesajiniz basariyla gonderildi! En kisa surede size donus yapacagiz.");
          contactForm.reset();
        } else {
          const errorData = await response.json();
          alert(errorData.error || "Mesaj gonderilirken bir hata olustu.");
        }
      } catch (error) {
        alert("Baglanti hatasi. Lutfen tekrar deneyin.");
      }
    });
  }
}

async function init() {
  bindEvents();
  renderCart();
  
  // Only call these functions if elements exist
  if (typeof setCardFieldsVisibility === "function") {
    setCardFieldsVisibility();
  }
  if (typeof updatePaymentFlow === "function") {
    updatePaymentFlow();
  }
  
  await hydrateSession();

  // Only fetch and render products if productGrid exists
  const productGrid = document.getElementById("productGrid");
  const productMeta = document.getElementById("productMeta");
  
  if (productGrid) {
    try {
      await fetchProducts();
    } catch (error) {
      productGrid.innerHTML = `<p class="empty-state">${error.message}</p>`;
      if (productMeta) {
        productMeta.textContent = "0 urun listeleniyor";
      }
    }
  }
}

init();
