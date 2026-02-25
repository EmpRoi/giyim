# Giyim Satış Sitesi

Node.js ve Express kullanılarak geliştirilen giyim ürünleri satış sitesi.

## 🚀 Canlı Site

[View Live Site](LIVE_URL_YAZILACAK) - Link deploy sonrası eklenecek

## 📋 Özellikler

- Ürün listeleme ve detay görüntüleme
- Sepet yönetimi
- Kullanıcı hesap işlemleri
- Admin paneli
- Ürün yönetimi
- Yorum sistemi
- Favori listesi
- İletişim formu

## 🛠️ Teknoloji Yığını

- **Backend**: Node.js, Express.js
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Deployment**: Render (GitHub Actions ile otomatik deploy)

## 📦 Kurulum

Geliştirme ortamında kurulum için:

```bash
# Bağımlılıkları yükle
npm install

# Sunucuyu başlat
npm start

# Geliştirme modunda başlat (watch mode)
npm run dev
```

Sunucu `http://localhost:3000` adresinde çalışacaktır.

## 🌐 Yayınlama (Deployment Prosesi)

### Render + GitHub Actions ile Otomatik Deployment

Bu proje GitHub'dan Render'e otomatik deploy edilir.

#### Adım 1: Render Hesabı Oluşturun

1. [render.com](https://render.com) adresine gidin ve ücretsiz hesap oluşturun
2. GitHub hesabınızla ilişkilendirin

#### Adım 2: Render'da Web Servisi Oluşturun

1. Render panelinde "New+" → "Web Service" seçin
2. GitHub'dan bu projeyi seçin (`EmpRoi/giyim`)
3. Aşağıdaki ayarları yapın:
   ```
   Name: giyim-satis-sitesi
   Region: Frankfurt (veya en yakın)
   Branch: main
   Root Directory: (boş bırakın)
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   Instance Type: Free
   ```
4. "Create Web Service" butonuna tıklayın

#### Adım 3: Deploy URL Çıkarın

Render uygulamanız oluşturulduğunda şunları not edin:
- **Application URL**: `https://giyim-satis-sitesi.onrender.com` (veya benzeri)

#### Adım 4: GitHub Secrets Yapılandırın

Main branch'a push yaptığınızda otomatik deploy olması için:

1. GitHub deposu'na gidin → Settings → Secrets and variables → Actions
2. Aşağıdaki secrestleri ekleyin:
   
   `RENDER_DEPLOY_HOOK`:
   - Render panelinde uygulamanızı açın
   - "Deploys" sekmesine gidin
   - "Manual Deploy" bölümü varsa, buradaki deploy hook URL'ini kopyalayın
   - Eğer yoksa bu secret'i boş bırakabilirsiniz
   
   `RENDER_APP_URL`:
   - Render uygulamanızın URL'i: `https://giyim-satis-sitesi.onrender.com`

#### Adım 5: Oto-Deploy Ayarı (Opsiyonel)

Render panelinde:
1. Uygulamanızı açın
2. "Settings" sekmesine gidin
3. "Auto-Deploy" bölümünde "Yes"i seçin
4. Şimdi GitHub'a her push yaptığınızda otomatik deploy olacak!

### Manuel Deploy

Otomatik deploy kurulumu yapmadan manuel deploy yapmak isterseniz:

1. kod değişikliklerinizi GitHub'a pushlayın: `git push origin main`
2. Render panelinde uygulamanızı açın
3. "Manual Deploy" → "Deploy latest commit" tıklayın

## 📝 Veri Yönetimi

Tüm veriler `data/` klasöründeki JSON dosyalarında saklanır:
- `products.json` - Ürün bilgileri
- `orders.json` - Siparişler
- `users.json` - Kullanıcı hesapları
- `sessions.json` - Oturum bilgileri
- `reviews.json` - Ürün yorumları
- `wishlists.json` - Favori listeleri
- `newsletters.json` - E-bülten kayıtları

## 👤 Admin Paneli

Varsayılan admin bilgileri:
- Admin paneli: `http://localhost:3000/admin.html`
- Şifre sıfırlama için: `node reset-admin-password.js` çalıştırın

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/X`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add X'`)
4. Branch'inizi pushlayın (`git push origin feature/X`)
5. Pull Request açın

## 📄 Lisans

MIT
