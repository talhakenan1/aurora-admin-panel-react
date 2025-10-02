# 🚀 Deployment Rehberi

## Vercel ile Ücretsiz Yayınlama (Önerilen)

### 1️⃣ Vercel Hesabı Oluşturun

1. [https://vercel.com](https://vercel.com) adresine gidin
2. "Sign Up" butonuna tıklayın
3. **GitHub hesabınızla giriş yapın** (Continue with GitHub)
4. Vercel'in GitHub hesabınıza erişim izni vermesine izin verin

### 2️⃣ Projeyi Deploy Edin

1. Vercel dashboard'unda **"Add New"** > **"Project"** butonuna tıklayın
2. GitHub repositories listesinde **"aurora-admin-panel-react"** projesini bulun
3. **"Import"** butonuna tıklayın
4. Ayarları kontrol edin:
   - **Framework Preset**: Vite (otomatik algılanmalı)
   - **Build Command**: `npm run build` (otomatik dolu olmalı)
   - **Output Directory**: `dist` (otomatik dolu olmalı)
   - **Install Command**: `npm install` (otomatik dolu olmalı)

5. **Environment Variables** (Önemli! ⚠️):
   Aşağıdaki environment variable'ları ekleyin (Supabase panelinden alın):
   
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
   
   > 💡 **Not**: Bu değerleri Supabase Dashboard > Project Settings > API'den alabilirsiniz.

6. **"Deploy"** butonuna tıklayın

### 3️⃣ Deployment Tamamlandı! 🎉

- Deployment yaklaşık 2-3 dakika sürecektir
- Tamamlandığında size bir URL verilecektir (örn: `your-project.vercel.app`)
- Her GitHub push'unda otomatik olarak yeniden deploy edilecektir

---

## 🔄 Alternatif: Netlify ile Yayınlama

### 1️⃣ Netlify Hesabı Oluşturun

1. [https://netlify.com](https://netlify.com) adresine gidin
2. "Sign Up" butonuna tıklayın
3. **GitHub hesabınızla giriş yapın**

### 2️⃣ Projeyi Deploy Edin

1. **"Add new site"** > **"Import an existing project"** tıklayın
2. **"GitHub"** seçin ve repository'yi bulun
3. Build ayarlarını yapın:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`

4. **Environment Variables** ekleyin:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

5. **"Deploy site"** butonuna tıklayın

---

## 📱 Manuel Deploy (npm ile)

Eğer Vercel CLI kullanmak isterseniz:

### 1️⃣ Vercel CLI Kur

```bash
npm install -g vercel
```

### 2️⃣ Login

```bash
vercel login
```

### 3️⃣ Deploy

```bash
vercel
```

İlk deploy'da birkaç soru soracaktır:
- Project name: `aurora-admin-panel` (veya istediğiniz isim)
- Framework: `Vite` seçin
- Diğerleri için Enter'a basın

### 4️⃣ Production Deploy

```bash
vercel --prod
```

---

## 🔧 Environment Variables Kontrolü

Deployment'tan önce `.env` dosyanızda şunların olduğundan emin olun:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

⚠️ **Önemli**: Bu değerleri Vercel/Netlify dashboard'unda da eklemelisiniz!

---

## ✅ Deploy Sonrası Kontrol Listesi

- [ ] Site açılıyor mu?
- [ ] Login çalışıyor mu?
- [ ] Supabase bağlantısı çalışıyor mu?
- [ ] Tüm sayfalar yükleniyor mu?
- [ ] Dark mode çalışıyor mu?

---

## 🌐 Custom Domain (Opsiyonel)

Vercel/Netlify üzerinden kendi domain'inizi ekleyebilirsiniz:

1. Vercel/Netlify Dashboard'da projenize gidin
2. **Settings** > **Domains** bölümüne gidin
3. Domain'inizi ekleyin
4. DNS kayıtlarını güncelleyin (panel size gösterecektir)

---

## 🔗 Faydalı Linkler

- **Vercel Docs**: https://vercel.com/docs
- **Netlify Docs**: https://docs.netlify.com
- **Supabase Dashboard**: https://app.supabase.com
- **GitHub Repository**: https://github.com/talhakenan1/aurora-admin-panel-react

---

## 💡 İpuçları

1. **Ücretsiz Limitler**:
   - Vercel: Sınırsız deployment, 100 GB bandwidth/ay
   - Netlify: 300 build dakikası/ay, 100 GB bandwidth/ay

2. **Otomatik Deployment**:
   - GitHub'a her push yaptığınızda otomatik deploy olur
   - Preview deployment'lar pull request'ler için oluşturulur

3. **Analytics**:
   - Vercel ve Netlify ücretsiz analytics sağlar
   - Ziyaretçi sayısı, sayfa görüntülemeleri vb. görebilirsiniz

---

## 🆘 Sorun Giderme

### Build Hatası

Eğer build başarısız olursa:
1. Environment variables'ların doğru girildiğinden emin olun
2. Vercel/Netlify loglarını kontrol edin
3. Lokal'de `npm run build` çalıştırarak test edin

### Supabase Bağlantı Hatası

1. CORS ayarlarını kontrol edin (Supabase Dashboard)
2. Environment variables'ların Production'da da ayarlandığından emin olun
3. URL'lerin başında/sonunda boşluk olmadığından emin olun

### 404 Hatası

Eğer sayfa yenilemede 404 alıyorsanız:
- `vercel.json` dosyasının doğru yapılandırıldığından emin olun
- Rewrites ayarlarının aktif olduğunu kontrol edin

---

Başarılar! 🚀
