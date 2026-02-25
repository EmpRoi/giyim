const AUTH_KEY = "anatolia-auth-v1";
const API_BASE = resolveApiBase();

const formatTRY = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0
});

// DOM Elements
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const authSection = document.getElementById("authSection");
const managementSection = document.getElementById("managementSection");

// Product-related elements
const productForm = document.getElementById("productForm");
const productIdInput = document.getElementById("productIdInput");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const productMessage = document.getElementById("productMessage");
const productsList = document.getElementById("productsList");
const productCount = document.getElementById("productCount");

// Order-related elements
const orderCount = document.getElementById("orderCount");
const ordersList = document.getElementById("ordersList");
const orderModal = document.getElementById("orderModal");
const orderModalContent = document.getElementById("orderModalContent");

// Admin-related elements
const adminForm = document.getElementById("adminForm");
const adminMessage = document.getElementById("adminMessage");
const adminsList = document.getElementById("adminsList");
const adminCount = document.getElementById("adminCount");

// Shared elements
const logoutBtn = document.getElementById("logoutBtn");
const tabsContainer = document.querySelector(".admin-tabs");
const tabContents = document.querySelectorAll(".tab-content");

// Password change modal elements
const passwordModal = document.getElementById("passwordModal");
const changePasswordBtn = document.getElementById("changePasswordBtn");
const closePasswordModal = document.getElementById("closePasswordModal");
const passwordForm = document.getElementById("passwordForm");
const passwordMessage = document.getElementById("passwordMessage");

const state = {
  user: null,
  products: [],
  orders: [],
  admins: []
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

function getToken() {
  return localStorage.getItem(AUTH_KEY) || "";
}

function setToken(token) {
  localStorage.setItem(AUTH_KEY, token);
}

function clearToken() {
  localStorage.removeItem(AUTH_KEY);
}

function setMessage(text, isError) {
  productMessage.textContent = text;
  productMessage.classList.toggle("error", Boolean(isError));
  productMessage.classList.toggle("success", !isError && Boolean(text));
}

function setLoginMessage(text, isError) {
  loginMessage.textContent = text;
  loginMessage.classList.toggle("error", Boolean(isError));
  loginMessage.classList.toggle("success", !isError && Boolean(text));
}

async function callApi(url, { method = "GET", body, auth = false } = {}) {
  const headers = {};

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getToken();
    if (!token) {
      throw new Error("Bu islem icin giris yapmalisiniz.");
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(apiUrl(url), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.message || "Islem basarisiz.");
  }

  return data;
}

async function refreshSession() {
  const token = getToken();

  if (!token) {
    state.user = null;
    showAuth();
    return;
  }

  try {
    const data = await callApi("/api/auth/me", { auth: true });
    state.user = data.user;
    showAdmin();
    await Promise.all([fetchProducts(), fetchOrders(), fetchAdmins()]);
  } catch (error) {
    clearToken();
    state.user = null;
    showAuth();
  }
}

function showAuth() {
  authSection.style.display = "block";
  managementSection.style.display = "none";
}

function showAdmin() {
  authSection.style.display = "none";
  managementSection.style.display = "block";
}

function switchTab(tabName) {
  tabsContainer.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  tabContents.forEach((content) => {
    content.classList.toggle("active", content.id === `${tabName}Tab`);
  });
}

// ===================================
// PRODUCT-RELATED FUNCTIONS
// ===================================

async function fetchProducts() {
  const products = await callApi("/api/products");
  state.products = Array.isArray(products) ? products : [];
  renderProducts();
}

function renderProducts() {
  productCount.textContent = `${state.products.length} urun`;

  if (state.products.length === 0) {
    productsList.innerHTML = '<p class="empty-state">Henuz urun bulunmuyor.</p>';
    return;
  }

  productsList.innerHTML = state.products
    .map((product) => {
      const sizes = product.sizes.join(", ");
      return `
        <article class="admin-product-card">
          <img src="${product.image}" alt="${product.name}" class="admin-product-image" />
          <div class="admin-product-info">
            <h4>${product.name}</h4>
            <p class="category">${product.category}</p>
            <p class="price">${formatTRY.format(product.price)}</p>
            <p class="stock">Stok: ${product.stock}</p>
            <p class="sizes">Bedenler: ${sizes}</p>
            <div class="admin-product-actions">
              <button type="button" class="edit-btn" data-id="${product.id}">Duzenle</button>
              <button type="button" class="delete-btn" data-id="${product.id}">Sil</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function getSelectedSizes() {
  const sizesSelect = productForm.elements.sizes;
  const selected = [];
  for (let i = 0; i < sizesSelect.options.length; i++) {
    if (sizesSelect.options[i].selected) {
      selected.push(sizesSelect.options[i].value);
    }
  }
  return selected;
}

async function handleProductSubmit(event) {
  event.preventDefault();

  const formData = new FormData(productForm);
  const sizes = getSelectedSizes();

  if (sizes.length === 0) {
    setMessage("En az bir beden secmelisiniz.", true);
    return;
  }

  const payload = {
    name: formData.get("name"),
    category: formData.get("category"),
    price: Number(formData.get("price")),
    oldPrice: Number(formData.get("oldPrice")) || Number(formData.get("price")),
    image: formData.get("image"),
    stock: Number(formData.get("stock")),
    sizes: sizes,
    description: formData.get("description"),
    featured: productForm.elements.featured.checked,
    new: productForm.elements.new.checked
  };

  const productId = productIdInput.value;

  try {
    if (productId) {
      await callApi(`/api/admin/products/${productId}`, {
        method: "PUT",
        body: payload,
        auth: true
      });
      setMessage("Urun basariyla guncellendi.", false);
    } else {
      await callApi("/api/admin/products", {
        method: "POST",
        body: payload,
        auth: true
      });
      setMessage("Urun basariyla eklendi.", false);
    }

    productForm.reset();
    resetForm();
    await fetchProducts();
  } catch (error) {
    setMessage(error.message, true);
  }
}

function editProduct(productId) {
  const product = state.products.find((p) => p.id === productId);
  if (!product) return;

  productIdInput.value = product.id;
  productForm.elements.name.value = product.name;
  productForm.elements.category.value = product.category;
  productForm.elements.price.value = product.price;
  productForm.elements.oldPrice.value = product.oldPrice || "";
  productForm.elements.image.value = product.image || "";
  productForm.elements.stock.value = product.stock;
  productForm.elements.description.value = product.description || "";
  productForm.elements.featured.checked = product.featured;
  productForm.elements.new.checked = product.new;

  const sizesSelect = productForm.elements.sizes;
  for (let i = 0; i < sizesSelect.options.length; i++) {
    sizesSelect.options[i].selected = product.sizes.includes(sizesSelect.options[i].value);
  }

  saveBtn.textContent = "Guncelle";
  cancelBtn.style.display = "inline-block";
  setMessage("", false);
  window.scrollTo(0, 0);
}

async function deleteProduct(productId) {
  if (!confirm("Bu urunu silmek istediginizden emin misiniz?")) {
    return;
  }

  try {
    await callApi(`/api/admin/products/${productId}`, {
      method: "DELETE",
      auth: true
    });
    setMessage("Urun basariyla silindi.", false);
    await fetchProducts();
  } catch (error) {
    setMessage(error.message, true);
  }
}

function resetForm() {
  productIdInput.value = "";
  productForm.reset();
  saveBtn.textContent = "Urun Ekle";
  cancelBtn.style.display = "none";
  
  const sizesSelect = productForm.elements.sizes;
  for (let i = 0; i < sizesSelect.options.length; i++) {
    sizesSelect.options[i].selected = ["S", "M", "L", "XL"].includes(sizesSelect.options[i].value);
  }
  
  setMessage("", false);
}


// ===================================
// ORDER-RELATED FUNCTIONS
// ===================================

async function fetchOrders() {
  try {
    // Assuming an admin endpoint that returns all orders
    const orders = await callApi("/api/admin/orders", { auth: true });
    state.orders = Array.isArray(orders) ? orders : [];
    renderOrders();
  } catch (error) {
    console.error("Siparisler yuklenemedi:", error);
    ordersList.innerHTML = `<p class="empty-state error">Siparisler yuklenemedi. Detaylar icin konsolu kontrol edin.</p>`;
  }
}

function renderOrders() {
  orderCount.textContent = `${state.orders.length} siparis`;

  if (state.orders.length === 0) {
    ordersList.innerHTML = '<p class="empty-state">Henuz siparis bulunmuyor.</p>';
    return;
  }

  ordersList.innerHTML = state.orders
    .map((order) => {
      const createdDate = new Date(order.createdAt).toLocaleDateString("tr-TR");
      const statusClass = order.cancelled ? "cancelled" : order.status.toLowerCase().replace(" ", "-");

      return `
        <div class="admin-order-card" data-order-no="${order.orderNo}">
          <div class="order-header">
            <h4>Siparis #${order.orderNo}</h4>
            <span class="order-status ${statusClass}">${order.cancelled ? 'Iptal Edildi' : order.status}</span>
          </div>
          <div class="order-body">
            <p><strong>Musteri:</strong> ${order.customer.fullName}</p>
            <p><strong>Tarih:</strong> ${createdDate}</p>
            <p><strong>Tutar:</strong> ${formatTRY.format(order.total)}</p>
          </div>
          <div class="order-footer">
            <button type="button" class="details-btn" data-order-no="${order.orderNo}">Detaylar</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function openOrderModal(orderNo) {
  const order = state.orders.find((o) => o.orderNo === orderNo);
  if (!order) return;

  const createdDate = new Date(order.createdAt).toLocaleString("tr-TR");
  const address = order.customer;
  const statusClass = order.cancelled ? "cancelled" : order.status.toLowerCase().replace(" ", "-");

  orderModalContent.innerHTML = `
    <span class="close-modal" id="closeOrderModal">&times;</span>
    <h3>Siparis Detayi #${order.orderNo}</h3>
    
    <div class="order-detail-grid">
        <div class="order-detail-group">
            <h4>Musteri Bilgileri</h4>
            <p><strong>Ad Soyad:</strong> ${address.fullName}</p>
            <p><strong>E-posta:</strong> ${address.email}</p>
            <p><strong>Telefon:</strong> ${address.phone}</p>
        </div>

        <div class="order-detail-group">
            <h4>Teslimat Adresi</h4>
            <p>${address.address}</p>
            <p>${address.district}, ${address.city}, ${address.postalCode}</p>
        </div>

        <div class="order-detail-group">
            <h4>Siparis Bilgileri</h4>
            <p><strong>Tarih:</strong> ${createdDate}</p>
            <p><strong>Odeme Yontemi:</strong> ${order.paymentMethod}</p>
            <p><strong>Durum:</strong> <span class="order-status ${statusClass}">${order.cancelled ? 'Iptal Edildi' : order.status}</span></p>
        </div>
    </div>
    
    <h4>Siparis Ozeti</h4>
    <ul class="order-items-list">
        ${order.items.map(item => `
            <li>
                <span>${item.name} (${item.size}) x ${item.quantity}</span>
                <span>${formatTRY.format(item.lineTotal)}</span>
            </li>
        `).join('')}
    </ul>
    
    <div class="order-totals">
        <p><span>Ara Toplam:</span> <span>${formatTRY.format(order.subtotal)}</span></p>
        <p><span>Kargo:</span> <span>${formatTRY.format(order.shipping)}</span></p>
        <p><strong><span>Genel Toplam:</span> <span>${formatTRY.format(order.total)}</span></strong></p>
    </div>

    <div class="order-actions">
        <h4>Siparis Durumunu Guncelle</h4>
        <div class="status-update-form">
            <select id="statusSelector" data-order-no="${order.orderNo}">
                <option value="Hazirlaniyor" ${order.status === 'Hazirlaniyor' ? 'selected' : ''}>Hazirlaniyor</option>
                <option value="Kargoya Verildi" ${order.status === 'Kargoya Verildi' ? 'selected' : ''}>Kargoya Verildi</option>
                <option value="Yolda" ${order.status === 'Yolda' ? 'selected' : ''}>Yolda</option>
                <option value="Teslim Edildi" ${order.status === 'Teslim Edildi' ? 'selected' : ''}>Teslim Edildi</option>
            </select>
            <button type="button" class="checkout-button" id="updateStatusBtn">Guncelle</button>
        </div>
        ${!order.cancelled ? `<button type="button" class="secondary-btn danger" id="cancelOrderBtn" data-order-no="${order.orderNo}">Siparisi Iptal Et</button>` : ''}
    </div>
  `;

  orderModal.style.display = "flex";
}

function closeOrderModal() {
  orderModal.style.display = "none";
}

async function updateOrderStatus(orderNo, newStatus) {
  try {
    await callApi(`/api/admin/orders/${orderNo}/status`, {
      method: "PUT",
      body: { status: newStatus },
      auth: true
    });
    // Refresh orders to show the new status
    await fetchOrders();
    closeOrderModal();
    // Re-open modal to show updated status if needed, or just close it.
  } catch (error) {
    alert(`Durum guncellenemedi: ${error.message}`);
  }
}

async function cancelOrder(orderNo) {
  if (!confirm("Bu siparisi iptal etmek istediginizden emin misiniz? Stoklar geri eklenecektir.")) {
    return;
  }
  
  try {
    await callApi(`/api/admin/orders/${orderNo}/cancel`, {
      method: "POST",
      auth: true
    });
    await fetchOrders();
    closeOrderModal();
  } catch(error) {
    alert(`Siparis iptal edilemedi: ${error.message}`);
  }
}

// ===================================
// ADMIN MANAGEMENT FUNCTIONS
// ===================================

async function fetchAdmins() {
  try {
    const users = await callApi("/api/admin/users", { auth: true });
    state.admins = Array.isArray(users) ? users.filter(user => user.isAdmin) : [];
    renderAdmins();
  } catch (error) {
    console.error("Yoneticiler yuklenemedi:", error);
    adminsList.innerHTML = `<p class="empty-state error">Yoneticiler yuklenemedi. Detaylar icin konsolu kontrol edin.</p>`;
  }
}

function renderAdmins() {
  adminCount.textContent = `${state.admins.length} yonetici`;

  if (state.admins.length === 0) {
    adminsList.innerHTML = '<p class="empty-state">Henuz yonetici bulunmuyor.</p>';
    return;
  }

  adminsList.innerHTML = state.admins
    .map((admin) => {
      const createdDate = new Date(admin.createdAt).toLocaleDateString("tr-TR");
      return `
        <div class="admin-user-card">
          <div class="admin-user-info">
            <h4>${admin.fullName}</h4>
            <p class="email">${admin.email}</p>
            <p class="created">Kayit: ${createdDate}</p>
          </div>
          <div class="admin-user-badge">
            <span class="badge admin-badge">Yönetici</span>
          </div>
        </div>
      `;
    })
    .join("");
}

async function handleAdminSubmit(event) {
  event.preventDefault();

  const formData = new FormData(adminForm);
  const payload = {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password")
  };

  try {
    await callApi("/api/admin/users", {
      method: "POST",
      body: payload,
      auth: true
    });
    adminMessage.textContent = "Yonetici basariyla eklendi.";
    adminMessage.className = "order-result success";
    adminForm.reset();
    await fetchAdmins();
  } catch (error) {
    adminMessage.textContent = error.message;
    adminMessage.className = "order-result error";
  }
}

// ===================================
// AUTH & COMMON FUNCTIONS
// ===================================

async function handleLogin(event) {
  event.preventDefault();

  const formData = new FormData(loginForm);
  const payload = {
    email: formData.get("email"),
    password: formData.get("password")
  };

  try {
    const data = await callApi("/api/auth/login", {
      method: "POST",
      body: payload
    });

    setToken(data.token);
    setLoginMessage("Giris basarili.", false);
    loginForm.reset();
    await refreshSession();
  } catch (error) {
    setLoginMessage(error.message, true);
  }
}

async function handleLogout() {
  try {
    await callApi("/api/auth/logout", { method: "POST", auth: true });
  } finally {
    clearToken();
    state.user = null;
    showAuth();
  }
}

function openPasswordModal() {
  passwordModal.style.display = "flex";
  passwordForm.reset();
  passwordMessage.textContent = "";
}

function closePasswordModalFunc() {
  passwordModal.style.display = "none";
}

async function handlePasswordChange(event) {
  event.preventDefault();

  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (newPassword !== confirmPassword) {
    passwordMessage.textContent = "Yeni sifreler eslesmiyor.";
    passwordMessage.className = "order-result error";
    return;
  }

  if (newPassword.length < 6) {
    passwordMessage.textContent = "Yeni sifre en az 6 karakter olmali.";
    passwordMessage.className = "order-result error";
    return;
  }

  try {
    await callApi("/api/auth/change-password", {
      method: "POST",
      body: {
        currentPassword: currentPassword,
        newPassword: newPassword
      },
      auth: true
    });

    passwordMessage.textContent = "Sifre basariyla degistirildi.";
    passwordMessage.className = "order-result success";
    
    setTimeout(() => {
      closePasswordModalFunc();
    }, 1500);
  } catch (error) {
    passwordMessage.textContent = error.message;
    passwordMessage.className = "order-result error";
  }
}

function bindEvents() {
  loginForm.addEventListener("submit", handleLogin);
  logoutBtn.addEventListener("click", handleLogout);
  productForm.addEventListener("submit", handleProductSubmit);
  cancelBtn.addEventListener("click", resetForm);
  adminForm.addEventListener("submit", handleAdminSubmit);

  // Tab switching
  tabsContainer.addEventListener("click", (event) => {
    if (event.target.matches(".tab-btn")) {
      switchTab(event.target.dataset.tab);
    }
  });

  // Product list actions
  productsList.addEventListener("click", (event) => {
    const target = event.target;
    const productId = target.getAttribute("data-id");

    if (!productId) return;

    if (target.classList.contains("edit-btn")) {
      editProduct(productId);
    } else if (target.classList.contains("delete-btn")) {
      deleteProduct(productId);
    }
  });
  
  // Order list actions
  ordersList.addEventListener("click", (event) => {
    const target = event.target.closest(".admin-order-card, .details-btn");
    if (target) {
      const orderNo = target.dataset.orderNo;
      openOrderModal(orderNo);
    }
  });
  
  // Order modal actions
  orderModal.addEventListener("click", (event) => {
    if (event.target.id === "closeOrderModal" || event.target === orderModal) {
      closeOrderModal();
    }
    
    if (event.target.id === "updateStatusBtn") {
      const selector = document.getElementById("statusSelector");

      updateOrderStatus(selector.dataset.orderNo, selector.value);
    }

    if (event.target.id === "cancelOrderBtn") {
      cancelOrder(event.target.dataset.orderNo);
    }
  });

  // Password change events
  changePasswordBtn.addEventListener("click", openPasswordModal);
  closePasswordModal.addEventListener("click", closePasswordModalFunc);
  passwordForm.addEventListener("submit", handlePasswordChange);
  
  passwordModal.addEventListener("click", (event) => {
    if (event.target === passwordModal) {
      closePasswordModalFunc();
    }
  });
}

async function init() {
  bindEvents();
  await refreshSession();
  switchTab("products");
}

init();
