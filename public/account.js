const AUTH_KEY = "anatolia-auth-v1";
const API_BASE = resolveApiBase();

const formatTRY = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0
});

const dateFormat = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeStyle: "short"
});

const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const logoutButton = document.getElementById("logoutButton");
const accountMessage = document.getElementById("accountMessage");
const accountInfo = document.getElementById("accountInfo");
const ordersList = document.getElementById("ordersList");
const trackForm = document.getElementById("trackForm");
const trackResult = document.getElementById("trackResult");
const passwordForm = document.getElementById("changePasswordForm");
const passwordMessage = document.getElementById("passwordMessage");
const profileForm = document.getElementById("profileForm");
const profileSection = document.getElementById("profileSection");
const profileMessage = document.getElementById("profileMessage");
const deleteAccountForm = document.getElementById("deleteAccountForm");
const deleteMessage = document.getElementById("deleteMessage");
const ordersSection = document.getElementById("ordersSection");
const passwordSection = document.getElementById("passwordSection");
const trackSection = document.getElementById("trackSection");
const cancelSection = document.getElementById("cancelSection");
const deleteSection = document.getElementById("deleteSection");

const state = {
  user: null,
  orders: []
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

function setAccountMessage(text, isError) {
  accountMessage.textContent = text;
  accountMessage.classList.toggle("error", Boolean(isError));
  accountMessage.classList.toggle("success", !isError && Boolean(text));
}

function setTrackMessage(text, isError) {
  trackResult.textContent = text;
  trackResult.classList.toggle("error", Boolean(isError));
  trackResult.classList.toggle("success", !isError && Boolean(text));
}

function setPasswordMessage(text, isError) {
  passwordMessage.textContent = text;
  passwordMessage.classList.toggle("error", Boolean(isError));
  passwordMessage.classList.toggle("success", !isError && Boolean(text));
}

function setProfileMessage(text, isError) {
  profileMessage.textContent = text;
  profileMessage.classList.toggle("error", Boolean(isError));
  profileMessage.classList.toggle("success", !isError && Boolean(text));
}

function setDeleteMessage(text, isError) {
  deleteMessage.textContent = text;
  deleteMessage.classList.toggle("error", Boolean(isError));
  deleteMessage.classList.toggle("success", !isError && Boolean(text));
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

function statusClass(status) {
  const key = String(status || "").toLowerCase();

  if (key.includes("teslim")) {
    return "delivered";
  }

  if (key.includes("yolda") || key.includes("kargo")) {
    return "shipping";
  }

  if (key.includes("iptal")) {
    return "cancelled";
  }

  return "preparing";
}

function renderOrders() {
  if (!state.user) {
    ordersList.innerHTML = '<p class="empty-state">Giris yaptiktan sonra siparisleriniz burada gorulecek.</p>';
    return;
  }

  if (state.orders.length === 0) {
    ordersList.innerHTML = '<p class="empty-state">Bu hesapta henuz siparis bulunmuyor.</p>';
    return;
  }

  ordersList.innerHTML = state.orders
    .map((order) => {
      const items = order.items
        .map((item) => `${item.name} (${item.size}) x${item.quantity}`)
        .join(" | ");
      const createdAt = dateFormat.format(new Date(order.createdAt));
      const pillClass = statusClass(order.trackingStatus);
      const isCancelled = order.cancelled || order.status === "Iptal Edildi";
      const canCancel = !isCancelled && order.trackingStatus !== "Teslim Edildi";

      return `
        <article class="order-card ${isCancelled ? 'cancelled' : ''}">
          <div class="order-top">
            <h4>${order.orderNo}</h4>
            <span class="status-pill ${pillClass}">${order.trackingStatus}</span>
          </div>
          <p>Tarih: ${createdAt}</p>
          <p>Toplam: ${formatTRY.format(order.total)}</p>
          <p>Odeme: ${order.paymentMethod}</p>
          <p class="order-items">Urunler: ${items}</p>
          ${canCancel ? `
            <button type="button" class="cancel-order-btn" data-order-no="${order.orderNo}">Siparisi Iptal Et</button>
          ` : ''}
        </article>
      `;
    })
    .join("");
}

function renderAccountState() {
  if (!state.user) {
    accountInfo.innerHTML = "<p>Henuz giris yapilmadi.</p>";
    logoutButton.classList.add("hidden");
    
    // Hide all user-specific sections
    if (profileSection) profileSection.classList.add("hidden");
    if (ordersSection) ordersSection.classList.add("hidden");
    if (passwordSection) passwordSection.classList.add("hidden");
    if (trackSection) trackSection.classList.add("hidden");
    if (cancelSection) cancelSection.classList.add("hidden");
    if (deleteSection) deleteSection.classList.add("hidden");
    return;
  }

  accountInfo.innerHTML = `
    <p><strong>Ad Soyad:</strong> ${state.user.fullName}</p>
    <p><strong>E-posta:</strong> ${state.user.email}</p>
    <p><strong>Telefon:</strong> ${state.user.phone || "-"}</p>
  `;
  logoutButton.classList.remove("hidden");
  
  // Show all user-specific sections
  if (profileSection) profileSection.classList.remove("hidden");
  if (ordersSection) ordersSection.classList.remove("hidden");
  if (passwordSection) passwordSection.classList.remove("hidden");
  if (trackSection) trackSection.classList.remove("hidden");
  if (cancelSection) cancelSection.classList.remove("hidden");
  if (deleteSection) deleteSection.classList.remove("hidden");
  
  // Pre-fill profile form
  if (profileForm) {
    const emailInput = profileForm.querySelector('[name="email"]');
    const fullNameInput = profileForm.querySelector('[name="fullName"]');
    const phoneInput = profileForm.querySelector('[name="phone"]');
    if (emailInput) emailInput.value = state.user.email;
    if (fullNameInput) fullNameInput.value = state.user.fullName;
    if (phoneInput) phoneInput.value = state.user.phone || "";
  }
  }
}

async function refreshOrders() {
  if (!state.user) {
    state.orders = [];
    renderOrders();
    return;
  }

  const orders = await callApi("/api/orders/my", { auth: true });
  state.orders = Array.isArray(orders) ? orders : [];
  renderOrders();
}

async function refreshSession() {
  const token = getToken();

  if (!token) {
    state.user = null;
    state.orders = [];
    renderAccountState();
    renderOrders();
    return;
  }

  try {
    const data = await callApi("/api/auth/me", { auth: true });
    state.user = data.user;
    renderAccountState();
    await refreshOrders();
  } catch (error) {
    clearToken();
    state.user = null;
    state.orders = [];
    renderAccountState();
    renderOrders();
    setAccountMessage(error.message, true);
  }
}

async function handleRegister(event) {
  event.preventDefault();

  const formData = new FormData(registerForm);
  const payload = {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password")
  };

  try {
    const data = await callApi("/api/auth/register", {
      method: "POST",
      body: payload
    });

    setToken(data.token);
    setAccountMessage("Uyelik basarili. Hesabiniza giris yapildi.", false);
    registerForm.reset();
    await refreshSession();
  } catch (error) {
    setAccountMessage(error.message, true);
  }
}

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
    setAccountMessage("Giris basarili.", false);
    loginForm.reset();
    await refreshSession();
  } catch (error) {
    setAccountMessage(error.message, true);
  }
}

async function handleLogout() {
  try {
    await callApi("/api/auth/logout", { method: "POST", auth: true });
  } finally {
    clearToken();
    state.user = null;
    state.orders = [];
    renderAccountState();
    renderOrders();
    setAccountMessage("Oturum kapatildi.", false);
  }
}

async function handleTrack(event) {
  event.preventDefault();

  if (!state.user) {
    setTrackMessage("Siparis takip icin once giris yapmalisiniz.", true);
    return;
  }

  const formData = new FormData(trackForm);
  const orderNo = String(formData.get("orderNo") || "").trim();

  if (!orderNo) {
    setTrackMessage("Siparis numarasi giriniz.", true);
    return;
  }

  try {
    const order = await callApi(`/api/orders/track/${encodeURIComponent(orderNo)}`, { auth: true });
    setTrackMessage(`Siparis ${order.orderNo} durumu: ${order.trackingStatus}`, false);
  } catch (error) {
    setTrackMessage(error.message, true);
  }
}

async function handleChangePassword(event) {
  event.preventDefault();

  if (!state.user) {
    setPasswordMessage("Sifre degistirmek icin giris yapmalisiniz.", true);
    return;
  }

  const formData = new FormData(passwordForm);
  const currentPassword = formData.get("currentPassword");
  const newPassword = formData.get("newPassword");
  const confirmPassword = formData.get("confirmPassword");

  if (!currentPassword || !newPassword || !confirmPassword) {
    setPasswordMessage("Tum alanlari doldurun.", true);
    return;
  }

  if (newPassword !== confirmPassword) {
    setPasswordMessage("Yeni sifreler eslesmiyor.", true);
    return;
  }

  if (newPassword.length < 6) {
    setPasswordMessage("Yeni sifre en az 6 karakter olmalidir.", true);
    return;
  }

  try {
    await callApi("/api/auth/change-password", {
      method: "POST",
      body: {
        currentPassword,
        newPassword
      },
      auth: true
    });

    setPasswordMessage("Sifre basariyla degistirildi.", false);
    passwordForm.reset();
  } catch (error) {
    setPasswordMessage(error.message, true);
  }
}

async function handleCancelOrder(orderNo) {
  if (!confirm(`Siparis ${orderNo} iptal etmek istediginizden emin misiniz?`)) {
    return;
  }

  try {
    await callApi(`/api/orders/${encodeURIComponent(orderNo)}/cancel`, {
      method: "POST",
      auth: true
    });

    setAccountMessage(`Siparis ${orderNo} basariyla iptal edildi.`, false);
    await refreshOrders();
  } catch (error) {
    setAccountMessage(error.message, true);
  }
}

async function handleProfileUpdate(event) {
  event.preventDefault();

  const formData = new FormData(profileForm);
  const fullName = formData.get("fullName");
  const phone = formData.get("phone");

  if (!fullName || !phone) {
    setProfileMessage("Tum alanlari doldurun.", true);
    return;
  }

  try {
    const response = await callApi("/api/auth/profile", {
      method: "PATCH",
      body: { fullName, phone },
      auth: true
    });

    state.user = response.user;
    renderAccountState();
    setProfileMessage("Profil basariyla guncellendi.", false);
  } catch (error) {
    setProfileMessage(error.message, true);
  }
}

async function handleDeleteAccount(event) {
  event.preventDefault();

  const formData = new FormData(deleteAccountForm);
  const password = formData.get("deletePassword");

  if (!password) {
    setDeleteMessage("Sifre zorunludur.", true);
    return;
  }

  if (!confirm("Hesabinizi silmek istediginizden emin misiniz? Bu islem geri alinamaz!")) {
    return;
  }

  try {
    await callApi("/api/auth/account", {
      method: "DELETE",
      body: { password },
      auth: true
    });

    setDeleteMessage("Hesap basariyla silindi. Yonlendiriliyorsunuz...", false);
    clearToken();
    state.user = null;
    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);
  } catch (error) {
    setDeleteMessage(error.message, true);
  }
}

function bindEvents() {
  registerForm.addEventListener("submit", handleRegister);
  loginForm.addEventListener("submit", handleLogin);
  logoutButton.addEventListener("click", handleLogout);
  trackForm.addEventListener("submit", handleTrack);
  
  if (passwordForm) {
    passwordForm.addEventListener("submit", handleChangePassword);
  }

  if (profileForm) {
    profileForm.addEventListener("submit", handleProfileUpdate);
  }

  if (deleteAccountForm) {
    deleteAccountForm.addEventListener("submit", handleDeleteAccount);
  }

  ordersList.addEventListener("click", (event) => {
    const target = event.target;
    if (target.classList.contains("cancel-order-btn")) {
      const orderNo = target.getAttribute("data-order-no");
      if (orderNo) {
        handleCancelOrder(orderNo);
      }
    }
  });
}

async function init() {
  bindEvents();
  renderAccountState();
  renderOrders();
  await refreshSession();
}

init();
