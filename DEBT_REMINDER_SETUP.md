# Borç Hatırlatma Sistemi Kurulum Rehberi

Bu rehber, Supabase, Telegram Bot ve SendGrid entegrasyonu ile borç hatırlatma sisteminin kurulumunu açıklar.

## 🚀 Özellikler

- ✅ Otomatik borç hatırlatmaları (E-posta + Telegram)
- ✅ Telegram Bot entegrasyonu
- ✅ SendGrid e-posta servisi
- ✅ Supabase Edge Functions
- ✅ Cron job ile zamanlanmış görevler
- ✅ React/TypeScript frontend
- ✅ Gerçek zamanlı bildirimler

## 📋 Gereksinimler

- Supabase hesabı
- Telegram Bot Token
- SendGrid hesabı (ücretsiz tier)
- Node.js 18+

## 🛠️ Kurulum Adımları

### 1. Supabase Kurulumu

#### 1.1 Veritabanı Migration'larını Çalıştırın

```bash
# Supabase CLI kurulumu (eğer yoksa)
npm install -g supabase

# Supabase'e login olun
supabase login

# Projeyi başlatın
supabase start

# Migration'ları çalıştırın
supabase db push
```

#### 1.2 Edge Functions'ları Deploy Edin

```bash
# Telegram webhook function'ını deploy edin
supabase functions deploy telegram-webhook

# Reminder gönderme function'ını deploy edin
supabase functions deploy send-reminders
```

#### 1.3 Environment Variables Ayarlayın

Supabase Dashboard > Settings > Edge Functions > Environment Variables:

```
TELEGRAM_BOT_TOKEN=8012766744:AAEXzvBDYi9SPtKdb5MnkdMVHS6Rm3CddaI
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@yourcompany.com
```

### 2. Telegram Bot Kurulumu

#### 2.1 Bot Token'ı Alın
Bot token'ı zaten mevcut: `8012766744:AAEXzvBDYi9SPtKdb5MnkdMVHS6Rm3CddaI`

#### 2.2 Webhook'u Ayarlayın

```bash
# Webhook URL'ini ayarlayın
curl -X POST "https://api.telegram.org/bot8012766744:AAEXzvBDYi9SPtKdb5MnkdMVHS6Rm3CddaI/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-project-ref.supabase.co/functions/v1/telegram-webhook"
  }'
```

### 3. SendGrid Kurulumu

#### 3.1 SendGrid Hesabı Oluşturun
1. [SendGrid](https://sendgrid.com) hesabı oluşturun
2. API Key oluşturun (Settings > API Keys)
3. Sender Identity doğrulayın (Settings > Sender Authentication)

#### 3.2 API Key'i Ekleyin
Supabase Dashboard'da `SENDGRID_API_KEY` environment variable'ını ekleyin.

### 4. Frontend Kurulumu

#### 4.1 Bağımlılıkları Yükleyin

```bash
npm install
```

#### 4.2 Environment Variables

`.env.local` dosyası oluşturun:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### 4.3 Uygulamayı Başlatın

```bash
npm run dev
```

### 5. Cron Jobs Kurulumu

#### 5.1 pg_cron Extension'ını Aktifleştirin

Supabase Dashboard > Database > Extensions > pg_cron'u aktifleştirin.

#### 5.2 Cron Jobs Migration'ını Çalıştırın

```bash
supabase db push
```

**Not:** `20250115000001_setup_cron_jobs.sql` dosyasındaki `your-project-ref` kısmını kendi Supabase project ref'iniz ile değiştirin.

## 📱 Kullanım

### Müşteri Kaydı (Telegram)

1. Müşteri [@PhoneReminderBot](https://t.me/PhoneReminderBot) botunu başlatır
2. `/start` komutu ile botu aktifleştirir
3. `/register` komutu ile e-posta adresini girer
4. Sistem otomatik olarak müşteriyi eşleştirir

### Admin Paneli

1. **Borç Yönetimi**: Yeni borç ekle, mevcut borçları görüntüle
2. **Telegram Yönetimi**: Kullanıcıları yönet, toplu mesaj gönder
3. **Hatırlatma Ayarları**: Otomatik hatırlatma zamanlarını ayarla

### Otomatik Hatırlatmalar

- Sistem her gün saat 09:00'da çalışır
- **DÜN vadesi geçmiş** borçlar için gecikme bildirimi gönderir
- Örnek: Son ödeme tarihi 02.09.2025 olan borç için 03.09.2025 sabah 09:00'da bildirim
- Hem e-posta hem Telegram üzerinden bildirim
- Gecikme süresi (kaç gün gecikmeli olduğu) mesajda belirtilir

## 🔧 Yapılandırma

### Hatırlatma Zamanları

Admin panelinden aşağıdaki ayarları yapabilirsiniz:

- **Hatırlatma Günleri**: Vade öncesi kaç gün hatırlatma gönderileceği
- **Hatırlatma Saati**: Günlük hatırlatmaların gönderileceği saat
- **E-posta/Telegram**: Hangi kanalların aktif olacağı

### Cron Job Zamanları

- **Günlük Hatırlatmalar**: Her gün 09:00
- **Gecikmiş Borç Kontrolü**: Her saat başı
- **Eski Kayıt Temizliği**: Her Pazar 02:00

## 🐛 Sorun Giderme

### Telegram Bot Çalışmıyor

1. Webhook URL'ini kontrol edin
2. Bot token'ının doğru olduğundan emin olun
3. Edge function loglarını kontrol edin

```bash
supabase functions logs telegram-webhook
```

### E-posta Gönderilmiyor

1. SendGrid API key'ini kontrol edin
2. Sender identity'nin doğrulandığından emin olun
3. SendGrid dashboard'dan activity loglarını kontrol edin

### Cron Jobs Çalışmıyor

1. pg_cron extension'ının aktif olduğundan emin olun
2. Cron job'ların doğru schedule edildiğini kontrol edin:

```sql
SELECT * FROM cron.job;
```

3. Function'ların doğru çalıştığını test edin:

```sql
SELECT trigger_reminder_function();
```

## 📊 Monitoring

### Supabase Dashboard

- **Edge Functions**: Function logları ve performans
- **Database**: Tablo içerikleri ve query performansı
- **Auth**: Kullanıcı aktiviteleri

### Telegram Bot

- Bot komutları: `/status` ile bot durumunu kontrol edin
- Webhook durumu: Telegram API'den webhook info alın

### SendGrid

- Activity dashboard'dan e-posta delivery durumunu takip edin
- Bounce/spam raporlarını kontrol edin

## 🔒 Güvenlik

- Tüm API key'ler environment variable olarak saklanır
- RLS (Row Level Security) politikaları aktiftir
- Kullanıcılar sadece kendi verilerine erişebilir
- Bot token'ı güvenli şekilde saklanır

## 📈 Ölçeklendirme

- Supabase otomatik ölçeklendirme sağlar
- SendGrid ücretsiz tier: 100 e-posta/gün
- Telegram Bot API: Sınırsız mesaj (rate limit dahilinde)
- Edge Functions: Serverless, otomatik ölçeklendirme

## 🆘 Destek

Sorun yaşarsanız:

1. Bu dokümandaki sorun giderme bölümünü kontrol edin
2. Supabase/SendGrid/Telegram API dokümantasyonlarını inceleyin
3. GitHub issues'da benzer sorunları arayın

---

**Not**: Bu sistem tamamen ücretsiz servisler kullanılarak oluşturulmuştur ve küçük-orta ölçekli işletmeler için uygundur.