const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { promisify } = require("util");

const scryptAsync = promisify(crypto.scrypt);

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = path.join(__dirname, "data");
const productsPath = path.join(dataDir, "products.json");
const ordersPath = path.join(dataDir, "orders.json");
const usersPath = path.join(dataDir, "users.json");
const sessionsPath = path.join(dataDir, "sessions.json");
const wishlistsPath = path.join(dataDir, "wishlists.json");
const reviewsPath = path.join(dataDir, "reviews.json");
const newslettersPath = path.join(dataDir, "newsletters.json");
const publicDir = path.join(__dirname, "public");

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicDir));
app.use((req, res, next) => {
  const origin = normalizeText(req.headers.origin);
  const allowedOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

  if (origin && allowedOriginPattern.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

async function ensureFile(filePath, defaultValue) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2), "utf8");
  }
}

async function readJson(filePath, fallback = []) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    if (!text.trim()) {
      return fallback;
    }
    const sanitized = text.replace(/^\uFEFF/, "");
    return JSON.parse(sanitized);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

function normalizeText(value) {
  return String(value || "").trim().replace(/[<>]/g, "");
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function onlyDigits(value) {
  return normalizeText(value).replace(/\D/g, "");
}

function toInt(value) {
  return Number.parseInt(value, 10);
}

function isEmailValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createUserId() {
  return `USR-${Date.now().toString(36)}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

function createProductId() {
  return `urun-${Date.now().toString(36)}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function createOrderNo() {
  const stamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 900 + 100);
  return `GS-${stamp}-${random}`;
}

function createApprovalCode() {
  const stamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 900 + 100);
  return `APR-${stamp}-${random}`;
}

function normalizeExpiryYear(rawYear) {
  const year = toInt(rawYear);
  if (!Number.isInteger(year)) {
    return null;
  }

  if (year < 100) {
    return 2000 + year;
  }

  return year;
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

function detectCardBrand(cardNumber) {
  if (/^4/.test(cardNumber)) {
    return "Visa";
  }

  if (/^(5[1-5]|2[2-7])/.test(cardNumber)) {
    return "Mastercard";
  }

  if (/^3[47]/.test(cardNumber)) {
    return "Amex";
  }

  return "Kart";
}

function isCardExpired(month, year) {
  const now = new Date();
  const lastMomentOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
  return lastMomentOfMonth.getTime() < now.getTime();
}

function resolveTrackingStatus(createdAt) {
  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) {
    return "Hazirlaniyor";
  }

  const ageHours = (Date.now() - createdTime) / (1000 * 60 * 60);

  if (ageHours < 2) {
    return "Hazirlaniyor";
  }

  if (ageHours < 24) {
    return "Kargoya Verildi";
  }

  if (ageHours < 72) {
    return "Yolda";
  }

  return "Teslim Edildi";
}

function withTracking(order) {
  return {
    ...order,
    trackingStatus: resolveTrackingStatus(order.createdAt)
  };
}

function sanitizeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    isAdmin: user.isAdmin || false,
    createdAt: user.createdAt
  };
}

function sanitizeProduct(product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    oldPrice: product.oldPrice,
    image: product.image,
    stock: product.stock,
    sizes: product.sizes,
    description: product.description,
    featured: product.featured,
    new: product.new
  };
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await scryptAsync(password, salt, 64);
  return `${salt}:${key.toString("hex")}`;
}

async function verifyPassword(password, hash) {
  const [salt, storedKeyHex] = String(hash || "").split(":");
  if (!salt || !storedKeyHex) {
    return false;
  }

  const storedKey = Buffer.from(storedKeyHex, "hex");
  const derivedKey = await scryptAsync(password, salt, storedKey.length);

  if (storedKey.length !== derivedKey.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedKey, derivedKey);
}

async function readActiveSessions() {
  const sessions = await readJson(sessionsPath, []);
  const now = Date.now();
  const active = sessions.filter((session) => new Date(session.expiresAt).getTime() > now);

  if (active.length !== sessions.length) {
    await writeJson(sessionsPath, active);
  }

  return active;
}

async function createSession(userId) {
  const sessions = await readActiveSessions();
  const token = createSessionToken();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  sessions.push({
    token,
    userId,
    createdAt,
    expiresAt
  });

  await writeJson(sessionsPath, sessions);
  return { token, expiresAt };
}

async function removeSession(token) {
  if (!token) {
    return;
  }

  const sessions = await readActiveSessions();
  const nextSessions = sessions.filter((session) => session.token !== token);

  if (nextSessions.length !== sessions.length) {
    await writeJson(sessionsPath, nextSessions);
  }
}

function extractBearerToken(req) {
  const authHeader = normalizeText(req.headers.authorization);
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return authHeader.slice(7).trim();
}

async function resolveAuthUser(req) {
  const token = extractBearerToken(req);

  if (!token) {
    return { token: null, user: null };
  }

  const sessions = await readActiveSessions();
  const session = sessions.find((item) => item.token === token);

  if (!session) {
    return { token: null, user: null };
  }

  const users = await readJson(usersPath, []);
  const user = users.find((item) => item.id === session.userId);

  if (!user) {
    await removeSession(token);
    return { token: null, user: null };
  }

  return { token, user };
}

async function requireAuth(req, res, next) {
  try {
    const { token, user } = await resolveAuthUser(req);

    if (!user) {
      return res.status(401).json({ message: "Bu islem icin giris yapmalisiniz." });
    }

    req.authToken = token;
    req.authUser = user;
    return next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Oturum kontrolu yapilamadi." });
  }
}

async function requireAdmin(req, res, next) {
  try {
    const { token, user } = await resolveAuthUser(req);

    if (!user) {
      return res.status(401).json({ message: "Bu islem icin giris yapmalisiniz." });
    }

    if (!user.isAdmin) {
      return res.status(403).json({ message: "Bu islem icin admin yetkisi gereklidir." });
    }

    req.authToken = token;
    req.authUser = user;
    return next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Oturum kontrolu yapilamadi." });
  }
}

function validateCardPayment(payment) {
  const cardHolder = normalizeText(payment?.cardHolder);
  const cardNumber = onlyDigits(payment?.cardNumber);
  const expiryMonth = toInt(payment?.expiryMonth);
  const expiryYear = normalizeExpiryYear(payment?.expiryYear);
  const cvv = onlyDigits(payment?.cvv);

  if (!cardHolder || cardHolder.length < 2) {
    return { ok: false, message: "Kart uzerindeki isim gecersiz." };
  }

  if (!isValidCardNumber(cardNumber)) {
    return { ok: false, message: "Kart numarasi gecersiz." };
  }

  if (!Number.isInteger(expiryMonth) || expiryMonth < 1 || expiryMonth > 12 || !expiryYear) {
    return { ok: false, message: "Son kullanma tarihi gecersiz." };
  }

  if (isCardExpired(expiryMonth, expiryYear)) {
    return { ok: false, message: "Kartin son kullanma tarihi gecmis." };
  }

  if (!/^\d{3,4}$/.test(cvv)) {
    return { ok: false, message: "CVV gecersiz." };
  }

  return {
    ok: true,
    snapshot: {
      method: "Kredi Karti",
      cardHolder,
      cardBrand: detectCardBrand(cardNumber),
      cardLast4: cardNumber.slice(-4),
      approvalCode: createApprovalCode()
    }
  };
}

// ============ AUTH ROUTES ============

app.post("/api/auth/register", async (req, res) => {
  const fullName = normalizeText(req.body?.fullName);
  const email = normalizeEmail(req.body?.email);
  const phone = normalizeText(req.body?.phone);
  const password = String(req.body?.password || "");

  if (!fullName || !email || !phone || !password) {
    return res.status(400).json({ message: "Kayit icin tum alanlar zorunludur." });
  }

  if (!isEmailValid(email)) {
    return res.status(400).json({ message: "E-posta formati gecersiz." });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Sifre en az 6 karakter olmalidir." });
  }

  const users = await readJson(usersPath, []);
  const exists = users.some((item) => item.email === email);

  if (exists) {
    return res.status(409).json({ message: "Bu e-posta ile kayitli bir hesap var." });
  }

  const user = {
    id: createUserId(),
    fullName,
    email,
    phone,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString()
  };

  users.push(user);
  await writeJson(usersPath, users);

  const session = await createSession(user.id);

  return res.status(201).json({
    message: "Uyelik basarili.",
    token: session.token,
    user: sanitizeUser(user)
  });
});

app.post("/api/auth/login", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");

  if (!email || !password) {
    return res.status(400).json({ message: "E-posta ve sifre zorunludur." });
  }

  const users = await readJson(usersPath, []);
  const user = users.find((item) => item.email === email);

  if (!user) {
    return res.status(401).json({ message: "E-posta veya sifre hatali." });
  }

  const validPassword = await verifyPassword(password, user.passwordHash);

  if (!validPassword) {
    return res.status(401).json({ message: "E-posta veya sifre hatali." });
  }

  const session = await createSession(user.id);

  return res.json({
    message: "Giris basarili.",
    token: session.token,
    user: sanitizeUser(user)
  });
});

app.post("/api/auth/logout", async (req, res) => {
  const token = extractBearerToken(req);
  await removeSession(token);
  return res.json({ message: "Oturum sonlandirildi." });
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  return res.json({ user: sanitizeUser(req.authUser) });
});

// Change Password Endpoint
app.post("/api/auth/change-password", requireAuth, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Mevcut ve yeni sifre zorunludur." });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: "Yeni sifre en az 6 karakter olmalidir." });
  }

  const users = await readJson(usersPath, []);
  const userIndex = users.findIndex((item) => item.id === req.authUser.id);

  if (userIndex === -1) {
    return res.status(404).json({ message: "Kullanici bulunamadi." });
  }

  const user = users[userIndex];
  const validCurrent = await verifyPassword(currentPassword, user.passwordHash);

  if (!validCurrent) {
    return res.status(400).json({ message: "Mevcut sifre hatali." });
  }

  user.passwordHash = await hashPassword(newPassword);
  users[userIndex] = user;
  await writeJson(usersPath, users);

  return res.json({ message: "Sifre basariyla degistirildi." });
});

// Update Profile Endpoint
app.patch("/api/auth/profile", requireAuth, async (req, res) => {
  const fullName = normalizeText(req.body?.fullName);
  const phone = normalizeText(req.body?.phone);

  if (!fullName || !phone) {
    return res.status(400).json({ message: "Ad Soyad ve Telefon zorunludur." });
  }

  const users = await readJson(usersPath, []);
  const userIndex = users.findIndex((item) => item.id === req.authUser.id);

  if (userIndex === -1) {
    return res.status(404).json({ message: "Kullanici bulunamadi." });
  }

  const user = users[userIndex];
  user.fullName = fullName;
  user.phone = phone;
  users[userIndex] = user;
  await writeJson(usersPath, users);

  return res.json({ message: "Profil basariyla guncellendi.", user: sanitizeUser(user) });
});

// Delete Account Endpoint
app.delete("/api/auth/account", requireAuth, async (req, res) => {
  const password = String(req.body?.password || "");

  if (!password) {
    return res.status(400).json({ message: "Hesabi silmek icin sifre gerekli." });
  }

  const users = await readJson(usersPath, []);
  const userIndex = users.findIndex((item) => item.id === req.authUser.id);

  if (userIndex === -1) {
    return res.status(404).json({ message: "Kullanici bulunamadi." });
  }

  const user = users[userIndex];
  const validPassword = await verifyPassword(password, user.passwordHash);

  if (!validPassword) {
    return res.status(400).json({ message: "Sifre hatali." });
  }

  // Remove user
  users.splice(userIndex, 1);
  await writeJson(usersPath, users);

  // Remove all sessions
  await removeSession(extractBearerToken(req));

  return res.json({ message: "Hesap basariyla silindi." });
});

// ============ WISHLIST ROUTES ============

app.get("/api/wishlist", requireAuth, async (req, res) => {
  const wishlists = await readJson(wishlistsPath, []);
  const userWishlist = wishlists.find((w) => w.userId === req.authUser.id);
  const productIds = userWishlist ? userWishlist.productIds : [];
  const products = await readJson(productsPath, []);
  const wishlistProducts = products.filter((p) => productIds.includes(p.id));
  return res.json(wishlistProducts);
});

app.post("/api/wishlist/:productId", requireAuth, async (req, res) => {
  const productIds = await readJson(wishlistsPath, []);
  const userId = req.authUser.id;
  const productId = req.params.productId;
  
  const products = await readJson(productsPath, []);
  const product = products.find((p) => p.id === productId);
  
  if (!product) {
    return res.status(404).json({ message: "Urun bulunamadi." });
  }

  let userWishlist = productIds.find((w) => w.userId === userId);
  
  if (!userWishlist) {
    userWishlist = { userId, productIds: [productId] };
    productIds.push(userWishlist);
  } else if (!userWishlist.productIds.includes(productId)) {
    userWishlist.productIds.push(productId);
  }
  
  await writeJson(wishlistsPath, productIds);
  return res.json({ message: "Urun favorilere eklendi." });
});

app.delete("/api/wishlist/:productId", requireAuth, async (req, res) => {
  const productIds = await readJson(wishlistsPath, []);
  const userId = req.authUser.id;
  const productId = req.params.productId;
  const wishlistIndex = productIds.findIndex((w) => w.userId === userId);
  
  if (wishlistIndex === -1) {
    return res.status(404).json({ message: "Favori listesi bulunamadi." });
  }
  
  const userWishlist = productIds[wishlistIndex];
  userWishlist.productIds = userWishlist.productIds.filter((id) => id !== productId);
  
  if (userWishlist.productIds.length === 0) {
    productIds.splice(wishlistIndex, 1);
  }
  
  await writeJson(wishlistsPath, productIds);
  return res.json({ message: "Urun favorilerden cikarildi." });
});

// ============ REVIEWS ROUTES ============

app.get("/api/reviews/:productId", async (req, res) => {
  const reviews = await readJson(reviewsPath, []);
  const productReviews = reviews.filter((r) => r.productId === req.params.productId);
  return res.json(productReviews);
});

app.post("/api/reviews", requireAuth, async (req, res) => {
  const productId = normalizeText(req.body?.productId);
  const rating = parseInt(req.body?.rating, 10);
  const comment = normalizeText(req.body?.comment);
  
  if (!productId) {
    return res.status(400).json({ message: "Urun ID zorunludur." });
  }
  
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Puanlama 1-5 arasinda olmalidir." });
  }
  
  if (!comment || comment.length < 10 || comment.length > 500) {
    return res.status(400).json({ message: "Yorum 10-500 karakter arasinda olmalidir." });
  }
  
  const reviews = await readJson(reviewsPath, []);
  const newReview = {
    id: `r-${Date.now()}`,
    productId,
    userId: req.authUser.id,
    userName: req.authUser.fullName,
    rating,
    comment: normalizeText(comment),
    createdAt: new Date().toISOString()
  };
  
  reviews.push(newReview);
  await writeJson(reviewsPath, reviews);
  return res.json({ message: "Yorum basariyla eklendi.", review: newReview });
});

app.delete("/api/reviews/:reviewId", requireAuth, async (req, res) => {
  const reviews = await readJson(reviewsPath, []);
  const reviewIndex = reviews.findIndex((r) => r.id === req.params.reviewId);
  
  if (reviewIndex === -1) {
    return res.status(404).json({ message: "Yorum bulunamadi." });
  }
  
  const review = reviews[reviewIndex];
  
  if (review.userId !== req.authUser.id) {
    return res.status(403).json({ message: "Bu yorumu silemezsiniz." });
  }
  
  reviews.splice(reviewIndex, 1);
  await writeJson(reviewsPath, reviews);
  return res.json({ message: "Yorum basariyla silindi." });
});

// ============ NEWSLETTER ROUTES ============

app.post("/api/newsletter/subscribe", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  
  if (!email || !isEmailValid(email)) {
    return res.status(400).json({ message: "Gecerli bir e-posta adresi gereklidir." });
  }
  
  const newsletters = await readJson(newslettersPath, []);
  const exists = newsletters.some((n) => n.email === email);
  
  if (exists) {
    return res.status(400).json({ message: "Bu e-posta zaten kayitli." });
  }
  
  newsletters.push({
    email,
    subscribedAt: new Date().toISOString()
  });
  
  await writeJson(newslettersPath, newsletters);
  return res.json({ message: "Basariyla kayit oldunuz." });
});

app.delete("/api/newsletter/unsubscribe", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  
  if (!email || !isEmailValid(email)) {
    return res.status(400).json({ message: "Gecerli bir e-posta adresi gereklidir." });
  }
  
  const newsletters = await readJson(newslettersPath, []);
  const initialLength = newsletters.length;
  const filtered = newsletters.filter((n) => n.email !== email);
  
  if (filtered.length === initialLength) {
    return res.status(404).json({ message: "E-posta bulunamadi." });
  }
  
  await writeJson(newslettersPath, filtered);
  return res.json({ message: "Basariyla iptal edildi." });
});

// ============ PRODUCT ROUTES ============

app.get("/api/products", async (req, res) => {
  const products = await readJson(productsPath, []);
  const { category, search, sort } = req.query;

  let output = [...products];

  if (category && category !== "all") {
    output = output.filter((item) => item.category === category);
  }

  if (search) {
    const q = normalizeText(search).toLowerCase();
    output = output.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }

  if (sort === "price-asc") {
    output.sort((a, b) => a.price - b.price);
  } else if (sort === "price-desc") {
    output.sort((a, b) => b.price - a.price);
  } else if (sort === "new") {
    output.sort((a, b) => Number(b.new) - Number(a.new));
  } else {
    output.sort((a, b) => Number(b.featured) - Number(a.featured));
  }

  res.json(output);
});

// Get single product
app.get("/api/products/:id", async (req, res) => {
  const productId = normalizeText(req.params.id);
  const products = await readJson(productsPath, []);
  
  const product = products.find((item) => item.id === productId);

  if (!product) {
    return res.status(404).json({ message: "Urun bulunamadi." });
  }

  return res.json(sanitizeProduct(product));
});

// ============ ADMIN PRODUCT ROUTES ============

// Create product
app.post("/api/admin/products", requireAdmin, async (req, res) => {
  const { name, category, price, oldPrice, image, stock, sizes, description, featured, new: isNew } = req.body || {};

  if (!name || !category || !price || !sizes || !description) {
    return res.status(400).json({ message: "Urun bilgileri eksik." });
  }

  const products = await readJson(productsPath, []);
  
  const newProduct = {
    id: createProductId(),
    name: normalizeText(name),
    category: normalizeText(category),
    price: toInt(price),
    oldPrice: toInt(oldPrice) || toInt(price),
    image: normalizeText(image) || "https://via.placeholder.com/400",
    stock: toInt(stock) || 0,
    sizes: Array.isArray(sizes) ? sizes : [sizes],
    description: normalizeText(description),
    featured: Boolean(featured),
    new: Boolean(isNew)
  };

  products.push(newProduct);
  await writeJson(productsPath, products);

  return res.status(201).json({
    message: "Urun basariyla eklendi.",
    product: sanitizeProduct(newProduct)
  });
});

// Update product
app.put("/api/admin/products/:id", requireAdmin, async (req, res) => {
  const productId = normalizeText(req.params.id);
  const { name, category, price, oldPrice, image, stock, sizes, description, featured, new: isNew } = req.body || {};

  const products = await readJson(productsPath, []);
  const productIndex = products.findIndex((item) => item.id === productId);

  if (productIndex === -1) {
    return res.status(404).json({ message: "Urun bulunamadi." });
  }

  const product = products[productIndex];
  
  if (name) product.name = normalizeText(name);
  if (category) product.category = normalizeText(category);
  if (price) product.price = toInt(price);
  if (oldPrice) product.oldPrice = toInt(oldPrice);
  if (image) product.image = normalizeText(image);
  if (stock !== undefined) product.stock = toInt(stock);
  if (sizes) product.sizes = Array.isArray(sizes) ? sizes : [sizes];
  if (description) product.description = normalizeText(description);
  if (featured !== undefined) product.featured = Boolean(featured);
  if (isNew !== undefined) product.new = Boolean(isNew);

  products[productIndex] = product;
  await writeJson(productsPath, products);

  return res.json({
    message: "Urun basariyla guncellendi.",
    product: sanitizeProduct(product)
  });
});

// Delete product
app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
  const productId = normalizeText(req.params.id);

  const products = await readJson(productsPath, []);
  const productIndex = products.findIndex((item) => item.id === productId);

  if (productIndex === -1) {
    return res.status(404).json({ message: "Urun bulunamadi." });
  }

  products.splice(productIndex, 1);
  await writeJson(productsPath, products);

  return res.json({ message: "Urun basariyla silindi." });
});

// ============ ADMIN USER ROUTES ============

// Create admin user
app.post("/api/admin/users", requireAdmin, async (req, res) => {
  const { fullName, email, password } = req.body || {};

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: "Tum alanlar zorunludur." });
  }

  if (!isEmailValid(email)) {
    return res.status(400).json({ message: "E-posta formati gecersiz." });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Sifre en az 6 karakter olmalidir." });
  }

  const users = await readJson(usersPath, []);
  const exists = users.some((item) => item.email === normalizeEmail(email));

  if (exists) {
    return res.status(409).json({ message: "Bu e-posta ile kayitli bir hesap var." });
  }

  const newUser = {
    id: createUserId(),
    fullName: normalizeText(fullName),
    email: normalizeEmail(email),
    phone: "", // Or some default
    passwordHash: await hashPassword(password),
    isAdmin: true,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  await writeJson(usersPath, users);

  return res.status(201).json({
    message: "Admin kullanici basariyla eklendi.",
    user: sanitizeUser(newUser)
  });
});

// Get all users (for admin)
app.get("/api/admin/users", requireAdmin, async (req, res) => {
  const users = await readJson(usersPath, []);
  res.json(users.map(sanitizeUser));
});

// ============ ADMIN ORDER ROUTES ============

// Get all orders (for admin)
app.get("/api/admin/orders", requireAdmin, async (req, res) => {
  const orders = await readJson(ordersPath, []);
  
  const sortedOrders = orders
    .map((order) => withTracking(order))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json(sortedOrders);
});

// Update order status (for admin)
app.put("/api/admin/orders/:orderNo/status", requireAdmin, async (req, res) => {
  const orderNo = normalizeText(req.params.orderNo);
  const newStatus = normalizeText(req.body.status);
  const validStatuses = ["Hazirlaniyor", "Kargoya Verildi", "Yolda", "Teslim Edildi"];

  if (!newStatus || !validStatuses.includes(newStatus)) {
    return res.status(400).json({ message: "Gecersiz durum degeri." });
  }

  const orders = await readJson(ordersPath, []);
  const orderIndex = orders.findIndex((item) => item.orderNo === orderNo);

  if (orderIndex === -1) {
    return res.status(404).json({ message: "Siparis bulunamadi." });
  }
  
  orders[orderIndex].status = newStatus;
  
  // If status is changed to something else from cancelled, un-cancel it
  if (orders[orderIndex].cancelled) {
    orders[orderIndex].cancelled = false;
  }

  await writeJson(ordersPath, orders);

  return res.json({
    message: "Siparis durumu guncellendi.",
    order: withTracking(orders[orderIndex])
  });
});

// Cancel order (for admin)
app.post("/api/admin/orders/:orderNo/cancel", requireAdmin, async (req, res) => {
  const orderNo = normalizeText(req.params.orderNo);
  const orders = await readJson(ordersPath, []);
  const products = await readJson(productsPath, []);
  const productById = new Map(products.map((item) => [item.id, item]));

  const orderIndex = orders.findIndex((item) => item.orderNo === orderNo);

  if (orderIndex === -1) {
    return res.status(404).json({ message: "Siparis bulunamadi." });
  }

  const order = orders[orderIndex];

  if (order.cancelled) {
    return res.status(400).json({ message: "Bu siparis zaten iptal edilmis." });
  }

  // Restore stock
  for (const item of order.items) {
    const product = productById.get(item.productId);
    if (product) {
      product.stock += item.quantity;
    }
  }

  order.cancelled = true;
  order.status = "Iptal Edildi";
  order.cancelledAt = new Date().toISOString();

  orders[orderIndex] = order;

  await writeJson(ordersPath, orders);
  await writeJson(productsPath, products);

  return res.json({
    message: "Siparis basariyla iptal edildi.",
    order: withTracking(order)
  });
});

// ============ ORDER ROUTES ============

app.post("/api/orders", requireAuth, async (req, res) => {
  const { customer, items, paymentMethod, payment } = req.body || {};

  const cleanCustomer = {
    fullName: normalizeText(customer?.fullName) || req.authUser.fullName,
    email: req.authUser.email,
    phone: normalizeText(customer?.phone) || req.authUser.phone,
    address: normalizeText(customer?.address),
    city: normalizeText(customer?.city),
    district: normalizeText(customer?.district),
    postalCode: normalizeText(customer?.postalCode)
  };

  const missingFields = Object.entries(cleanCustomer)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingFields.length > 0) {
    return res.status(400).json({
      message: "Musteri bilgileri eksik.",
      missingFields
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Sepet bos olamaz." });
  }

  const selectedPaymentMethod = normalizeText(paymentMethod) || "Kapida Odeme";
  let paymentSnapshot = {
    method: selectedPaymentMethod
  };

  if (selectedPaymentMethod === "Kredi Karti") {
    const cardValidation = validateCardPayment(payment);
    if (!cardValidation.ok) {
      return res.status(400).json({ message: cardValidation.message });
    }
    paymentSnapshot = cardValidation.snapshot;
  }

  const products = await readJson(productsPath, []);
  const productById = new Map(products.map((item) => [item.id, item]));

  const normalizedItems = [];
  let subtotal = 0;

  for (const rawItem of items) {
    const productId = normalizeText(rawItem.productId);
    const size = normalizeText(rawItem.size);
    const quantity = toInt(rawItem.quantity);

    const product = productById.get(productId);

    if (!product) {
      return res.status(400).json({ message: `Urun bulunamadi: ${productId}` });
    }

    if (!size || !product.sizes.includes(size)) {
      return res.status(400).json({ message: `Beden gecersiz: ${product.name}` });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ message: `Adet gecersiz: ${product.name}` });
    }

    if (quantity > product.stock) {
      return res.status(400).json({
        message: `Yetersiz stok: ${product.name}. Kalan stok: ${product.stock}`
      });
    }

    const lineTotal = product.price * quantity;
    subtotal += lineTotal;

    normalizedItems.push({
      productId: product.id,
      name: product.name,
      size,
      quantity,
      unitPrice: product.price,
      lineTotal
    });
  }

  const shipping = subtotal >= 1500 ? 0 : 79;
  const total = subtotal + shipping;

  const order = {
    orderNo: createOrderNo(),
    userId: req.authUser.id,
    createdAt: new Date().toISOString(),
    customer: cleanCustomer,
    items: normalizedItems,
    paymentMethod: selectedPaymentMethod,
    payment: paymentSnapshot,
    subtotal,
    shipping,
    total,
    status: "Hazirlaniyor",
    cancelled: false
  };

  const currentOrders = await readJson(ordersPath, []);
  currentOrders.push(order);

  for (const item of normalizedItems) {
    const product = productById.get(item.productId);
    product.stock -= item.quantity;
  }

  await writeJson(ordersPath, currentOrders);
  await writeJson(productsPath, products);

  return res.status(201).json({
    message: "Siparis alindi.",
    orderNo: order.orderNo,
    total: order.total,
    trackingStatus: withTracking(order).trackingStatus,
    approvalCode: paymentSnapshot.approvalCode || null
  });
});

app.get("/api/orders/my", requireAuth, async (req, res) => {
  const orders = await readJson(ordersPath, []);

  const myOrders = orders
    .filter((order) => order.userId === req.authUser.id)
    .map((order) => withTracking(order))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json(myOrders);
});

app.get("/api/orders/track/:orderNo", requireAuth, async (req, res) => {
  const orderNo = normalizeText(req.params.orderNo);
  const orders = await readJson(ordersPath, []);

  const order = orders.find((item) => item.orderNo === orderNo && item.userId === req.authUser.id);

  if (!order) {
    return res.status(404).json({ message: "Siparis bulunamadi." });
  }

  return res.json(withTracking(order));
});

app.get("/api/orders/:orderNo", requireAuth, async (req, res) => {
  const orderNo = normalizeText(req.params.orderNo);
  const orders = await readJson(ordersPath, []);

  const order = orders.find((item) => item.orderNo === orderNo && item.userId === req.authUser.id);

  if (!order) {
    return res.status(404).json({ message: "Siparis bulunamadi." });
  }

  return res.json(withTracking(order));
});

// Cancel order endpoint
app.post("/api/orders/:orderNo/cancel", requireAuth, async (req, res) => {
  const orderNo = normalizeText(req.params.orderNo);
  const orders = await readJson(ordersPath, []);
  const products = await readJson(productsPath, []);
  const productById = new Map(products.map((item) => [item.id, item]));

  const orderIndex = orders.findIndex((item) => item.orderNo === orderNo && item.userId === req.authUser.id);

  if (orderIndex === -1) {
    return res.status(404).json({ message: "Siparis bulunamadi." });
  }

  const order = orders[orderIndex];

  // Check if order can be cancelled
  if (order.cancelled) {
    return res.status(400).json({ message: "Bu siparis zaten iptal edilmis." });
  }

  const trackingStatus = resolveTrackingStatus(order.createdAt);
  if (trackingStatus === "Teslim Edildi") {
    return res.status(400).json({ message: "Teslim edilmis siparisler iptal edilemez." });
  }

  // Restore stock
  for (const item of order.items) {
    const product = productById.get(item.productId);
    if (product) {
      product.stock += item.quantity;
    }
  }

  order.cancelled = true;
  order.status = "Iptal Edildi";
  order.cancelledAt = new Date().toISOString();

  orders[orderIndex] = order;

  await writeJson(ordersPath, orders);
  await writeJson(productsPath, products);

  return res.json({
    message: "Siparis basariyla iptal edildi.",
    order: withTracking(order)
  });
});

// ============ PAGE ROUTES ============

app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.get("/urunler", (req, res) => {
  res.sendFile(path.join(publicDir, "products.html"));
});

app.get("/hakkinda", (req, res) => {
  res.sendFile(path.join(publicDir, "about.html"));
});

app.get("/iletisim", (req, res) => {
  res.sendFile(path.join(publicDir, "contact.html"));
});

app.get("/uyelik", (req, res) => {
  res.sendFile(path.join(publicDir, "account.html"));
});

app.get("/panel", (req, res) => {
  res.sendFile(path.join(publicDir, "admin.html"));
});

app.get("/yonetici", (req, res) => {
  res.sendFile(path.join(publicDir, "admin.html"));
});

app.get("/urun/:id", (req, res) => {
  res.sendFile(path.join(publicDir, "product-detail.html"));
});

app.use("/api", (req, res) => {
  res.status(404).json({ message: "API endpoint bulunamadi." });
});

app.get("*", (req, res) => {
  res.redirect("/");
});

async function boot() {
  await fs.mkdir(dataDir, { recursive: true });
  await ensureFile(productsPath, []);
  await ensureFile(ordersPath, []);
  await ensureFile(usersPath, []);
  await ensureFile(sessionsPath, []);

  app.listen(PORT, () => {
    console.log(`Server running: http://localhost:${PORT}`);
  });
}

boot();

