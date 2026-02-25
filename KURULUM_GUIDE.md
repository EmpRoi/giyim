# ANATOLIA WEAR - Detaylı Kurulum Kılavuzu

## 📋 Proje Hakkında
Bu, Node.js ile geliştirilmiş modern bir e-ticaret giyim web sitesidir. Tam fonksiyonel kullanıcı hesabı, sepet, sipariş, ürün yönetimi, inceleme ve sosyal medya özelliklerine sahiptir.

## 📁 Proje Yapısı

```
giyim sayfası/
├── package.json              # Node.js bağımlılıkları
├── server.js                # Backend sunucusu (Express.js)
├── data/                    # Veri dosyaları
│   ├── users.json          # Kullanıcı bilgileri
│   ├── products.json       # Ürün bilgileri
│   ├── orders.json         # Sipariş kayıtları
│   ├── sessions.json       # Oturum yönetimi
│   ├── wishlists.json     # İstek listesi verileri
│   ├── reviews.json       # Ürün incelemeleri
│   └── newsletters.json   # Bülten abonelikleri
└── public/                 # Genel web dosyaları
    ├── index.html          # Ana sayfa
    ├── products.html       # Ürünler sayfası
    ├── product-detail.html # Ürün detay sayfası
    ├── about.html          # Hakkımızda sayfası
    ├── contact.html        # İletişim sayfası
    ├── account.html        # Kullanıcı hesabı sayfası
    ├── admin.html         # Yönetici paneli
    ├── styles.css          # Tüm stiller
    ├── app.js             # Genel JavaScript işlevleri
    ├── account.js         # Hesap işlevleri
    ├── admin.js           # Yönetici işlevleri
    └── product-detail.js  # Ürün detay işlevleri
```

## 🚀 Yerel Kurulum Adımları

### 1. Gereksinimler
- **Node.js** (v16 veya üzeri) - https://nodejs.org/
- **npm** (Node.js ile birlikte gelir)
- Modern bir web tarayıcısı

### 2. Bağımlılıkları Yükle

Proje klasörüne gidin ve terminal'i açın, ardından şu komutları çalıştırın:

```bash
npm install
```

Bu komut aşağıdaki paketleri yükler:
- `express` - Web sunucusu framework'ü
- `cors` - Cross-origin resource sharing desteği
- `body-parser` - JSON isteklerini işlemek için

### 3. Veri Dosyalarını Oluştur

Veri dosyaları otomatik olarak oluşturulacaktır, ancak manuel olarak oluşturmak isterseniz:

`data/` klasörü altında boş veya mevcut verilerle JSON dosyaları oluşturun:

```json
data/
├── users.json: []
├── products.json: []
├── orders.json: []
├── sessions.json: []
├── wishlists.json: []
├── reviews.json: []
└── newsletters.json: []
```

### 4. Sunucuyu Başlat

Sunucuyu başlatmak için şu komutu çalıştırın:

```bash
node server.js
```

Veya development modunda (değişiklikler için otomatik yeniden başlatma):

```bash
npm install -g nodemon
nodemon server.js
```

### 5. Web Sitesini Açın

Tarayıcınızda şu adrese gidin:

```
http://localhost:3000
```

Konsolda şunları görmelisiniz:
```
Server running on port 3000
```

## 🌐 Public Klasöre Dağıtım

### Seçenek 1: Hosting'e Yükleme (Netlify, Vercel, GitHub Pages)

#### A. Public Klasörü Oluştur

Proje klasörünüzde yeni bir klasör oluşturun:

```bash
cd "c:/Users/hasan"
mkdir anakliawear-public
```

#### B. Klasörü Hazırlama

Aşağıdaki dosyaları kopyalayın:

```
anakliawear-public/
├── index.html           (public/index.html'den kopyala)
├── products.html        (public/products.html'den kopyala)
├── product-detail.html  (public/product-detail.html'den kopyala)
├── about.html          (public/about.html'den kopyala)
├── contact.html        (public/contact.html'den kopyala)
├── account.html        (public/account.html'den kopyala)
├── admin.html         (public/admin.html'den kopyala)
├── styles.css          (public/styles.css'den kopyala)
├── app.js             (public/app.js'den kopyala)
├── account.js         (public/account.js'den kopyala)
├── admin.js           (public/admin.js'den kopyala)
└── product-detail.js  (public/product-detail.js'den kopyala)
```

**Önemli:** Bu yöntemde sadece statik dosyalar sunulur. Backend API'leri çalışmaz.

#### C. Netlify'a Yükleme

1. Netlify.com hesabı oluşturun
2. "Add new site" → "Deploy manually" seçin
3. `anakliawear-public` klasörünü sürükleyip bırakın
4. Siteniz anında yayına girecek!

### Seçenek 2: Backend Dahil Tam Dağıtım

#### A. Render.com veya Heroku Kullanma (Tavsiye Edilen)

**Render.com için:**

1. Render.com hesabı oluşturun
2. GitHub'da projenizi fork edin
3. Render'da "New +" → "Web Service" seçeneği
4. GitHub reposunu bağlayın
5. Build komutu: `node server.js`
6. Start komutu: `node server.js`

**Heroku için:**

1. Heroku hesabı oluşturun
2. Heroku CLI yükleyin: `npm install -g heroku`
3. Proje klasöründe çalıştırın:
   ```bash
   heroku login
   heroku create anaklia-wear
   git init
   git add .
   git commit -m "Initial commit"
   heroku git:remote -a anaklia-wear
   git push heroku master
   ```

#### B. Environment Variables Ayarlama

Hosting platformunuzda şu değişkenleri ayarlayın:
- `PORT` = 3000 (veya hosting'in sunduğu port)
- `NODE_ENV` = production

## 🔧 Yapılandırma Ayarları

`server.js` dosyasındaki port numarasını değiştirmek için:

```javascript
const PORT = process.env.PORT || 3000;
```

## 📦 Dosya İzinleri

Tüm dosyaların okuma iznine sahip olduğundan emin olun. Linux/Mac için:

```bash
chmod -R 755 public/
chmod 644 public/*.html public/*.css public/*.js
```

## 🎨 Özel Değişkenler

Tema ve metinleri değiştirmek için `styles.css` ve HTML dosyaları düzenleyin:

### Mağaza Bilgilerini Değiştirme

**Branding özellikleri:**
- `YENİ SEZON 2026` - Sezon metni
- `ANATOLIA WEAR` - Marka adı
- `© 2026 ANATOLIA WEAR` - Telif hakkı metni

### CSS Özelleştirme

`styles.css` dosyasında renkleri değiştirin:

```css
--primary: #1a1a2e;        /* Ana renk */
--accent: #c9a227;         /* Vurgu renk */
--light: #f8f9fa;           /* Açık arka plan */
```

## 🛠️ Sorun Giderme

### Port 3000 Kullanımda Hatası
```bash
# Windows'da port kullanan işlemi bulun
netstat -ano | findstr :3000

# İşlemi sonlandırın (PID'yi son komuttan alın)
taskkill /PID <process_id> /F
```

### Modüllerin bulunamaması
```bash
# node_modules'ü silip yeniden yükleyin
rmdir /S /Q node_modules
npm install
```

### Veri dosyaları hatası
Veri klasörünün doğru yerde olduğundan ve JSON formatının doğru olduğundan emin olun.

## 📱 Mobil Uyumluluk

Siteniz %100 responsive'dir ve şunları destekler:
- iPhone/iPad Safari
- Android Chrome
- Windows Phone Edge
- Tüm modern masaüstü tarayıcıları

## 🔒 Güvenlik Özellikleri

XSS Koruması:
- `innerHTML` yerine `textContent` kullanıldı
- `escapeHtml()` fonksiyonu eklendi
- Kullanıcı girişleri sanitizasyon edildi

Oturum Güvenliği:
- JWT benzeri token tabanlı oturum yönetimi
- Parolalar hashed saklanır

## 📊 API Endpoints

```
POST /api/auth/register       - Kullanıcı kaydı
POST /api/auth/login          - Kullanıcı girişi
POST /api/auth/logout         - Çıkış
GET  /api/auth/me            - Oturum bilgisini getir
PATCH /api/auth/profile       - Profil güncelleme
DELETE /api/auth/account      - Hesabı sil
POST /api/auth/change-password - Şifre değiştir

GET    /api/products          - Tüm ürünleri getir
GET    /api/products/:id      - Tek ürün detaylarını getir

GET    /api/orders            - Kullanıcı siparişlerini getir
POST   /api/orders            - Yeni sipariş oluştur
DELETE /api/orders/:id/cancel - Siparişi iptal et

POST   /api/wishlist          - İstek listesine ekle
GET    /api/wishlist          - İstek listesini getir
DELETE /api/wishlist/:id      - İstek listesinden sil

POST   /api/reviews           - İnceleme ekle
GET    /api/reviews/:productId - Ürün incelemelerini getir
DELETE /api/reviews/:id       - İncelemeyi sil

POST   /api/newsletter         - Bülten aboneliği
DELETE /api/newsletter/:email   - Aboneliği iptal et
```

## 🎯 Özellikler

### Kullanıcı Özellikleri
- ✅ Kayıt ve giriş
- ✅ Profil yönetimi
- ✅ Şifre değiştirme
- ✅ Hesap silme
- ✅ Sipariş görüntüleme
- ✅ Sipariş takibi
- ✅ Sipariş iptali

### Alışveriş Özellikleri
- ✅ Sepet yönetimi
- ✅ Ürün arama ve filtreleme
- ✅ Sıralama seçenekleri
- ✅ Çoklu ödeme yöntemi
- ✅ Kredi kartı doğrulama

### Sosyal Özellikler
- ✅ İstek listesi (Wishlist)
- ✅ Ürün incelemeleri
- ✅ Bülten aboneliği
- ✅ Sosyal medya entegrasyonu

### Admin Özellikleri
- ✅ Kullanıcı yönetimi
- ✅ Sipariş yönetimi
- ✅ Ürün ekleme/düzenleme

## 📞 Destek

Sorunlarınız için:
- GitHub Issues: Proje repo'nuzun issues bölümü
- İletişim: Sitenin contact.html sayfası

## ✅ Kontrol Listesi - Başarılı Kurulum İçin

Yerel test için:
- [ ] Node.js v16+ yüklü
- [ ] npm install çalıştırıldı
- [ ] data/ klasörü mevcut
- [ ] node server.js çalışıyor
- [ ] http://localhost:3000 erişilebilir
- [ ] Kullanıcı kaydı çalışıyor
- [ ] Sepet ekleme çalışıyor
- [ ] Sipariş oluşturma çalışıyor

Public hosting için:
- [ ] Tüm HTML/CSS/JS dosyaları kopyalandı
- [ ] Hosting platformu seçildi
- [ ] Dosyalar yüklendi
- [ ] Site yayında erişilebilir
- [ ] Mobil test yapıldı

## 🎉 TEBRİKLER!

ANATOLIA WEAR web siteniz artık kurulu ve kullanıma hazır!

---

**Not:** Bu kılavuzu güncellemek veya eklemek için istediğiniz zaman bana ulaşabilirsiniz.
