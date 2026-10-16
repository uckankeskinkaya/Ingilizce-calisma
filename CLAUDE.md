# İngilizce Çalışma – Proje Rehberi (Claude için)

Kişisel kullanım için İngilizce ders çalışma uygulaması. Kullanıcı tablet kullanıyor ve kodlama
tecrübesi sınırlı: **Türkçe konuş, adımları açık ve kısa anlat, teknik jargonu açıkla.**

## Mimari (basit tut – veritabanı YOK)
- `kaynaklar/hafta-XX/` → kullanıcının yüklediği ders PDF'leri (girdi). Yayına **konmaz**.
  `kaynaklar/ornek-hafta/` test amaçlıdır.
- `icerik/hafta-XX/{ozet,calisma,test}.json` → Claude'un ürettiği içerik. Tek doğru kaynak budur.
- `app/` → derleme gerektirmeyen PWA (düz HTML/CSS/JS). İçeriği `haftalar.json` ve `icerik/<slug>/*.json`
  dosyalarından okur.
- `scripts/hazirla.mjs` → tüm içeriği kontrol eder, `app/` + `icerik/` → `dist/` kopyalar, `dist/haftalar.json`
  listesini üretir. İçerik hatalıysa çıkış kodu 1 verir (Netlify yayını durdurur, eski sürüm açık kalır).
- `netlify/functions/asistan.mjs` → AI asistan (`POST /api/asistan`). Haftanın JSON'larını sitenin
  kendisinden okur, EVREN'e (OpenAI uyumlu `/chat/completions`) gönderir.
- Barındırma: **Netlify** (`netlify.toml`). GitHub'a push → Netlify otomatik derler ve yayınlar.

## Ayarlar (Netlify → Site configuration → Environment variables)
- `EVREN_API_KEY` (gizli), `EVREN_BASE_URL`, `EVREN_MODEL`, `APP_SIFRE` (asistan şifresi).
- Sağlayıcı/model değişikliği = sadece ilgili değişkeni güncelle + "Trigger deploy". Kod değişmez.

## KESİN KURALLAR
1. **EVREN API anahtarı (ve hiçbir gizli anahtar/şifre) asla repoya, `app/` içine yazılmaz.**
   Anahtarı kullanıcı Netlify panelinde kendisi girer; sohbete yapıştırmasını önerme, yapıştırırsa
   kullanma ve anahtarı EVREN'de yenilemesini öner.
2. `.env*` dosyaları `.gitignore`'da; asla commit etme.
3. `kaynaklar/` (telifli PDF'ler) asla `dist/`'e kopyalanmaz.
4. Gereksiz karmaşıklık ekleme: framework, build aracı, npm bağımlılığı, veritabanı ekleme
   (gerçekten şart değilse).
5. Geliştirme dalı ve push kuralları oturum talimatlarında belirtilir. Netlify'ın yayınladığı dal: `main`.

## "hafta-XX'i işle" komutu – yapılacaklar
1. `kaynaklar/hafta-XX/` içindeki TÜM dosyaları oku (PDF'leri Read aracıyla; gerekirse `pdftotext`).
   Klasör yoksa/boşsa kullanıcıya PDF'leri GitHub'a nasıl yükleyeceğini anlat ve dur.
2. `icerik/hafta-XX/` altına üç dosya üret (şema aşağıda, örnek: `icerik/ornek-hafta/`):
   - `ozet.json` — konu özeti: önemli kurallar, örnek cümleler (EN + TR), dikkat noktaları, kelimeler.
   - `calisma.json` — en az 3 farklı türde alıştırma, toplam ~12-20 soru, cevap anahtarı + kısa açıklama.
   - `test.json` — 10-15 çoktan seçmeli soru (4 seçenek), her birine Türkçe açıklama. Doğru şıkların
     yerini karıştır (hep aynı şık olmasın).
   İçerik PDF'e sadık olsun; PDF'te olmayan konu ekleme. Açıklamalar Türkçe, İngilizce örnekler İngilizce.
3. Kontrol: `node scripts/hazirla.mjs` → "✅" görmeden devam etme (hata varsa JSON'u düzelt).
4. Commit + push. Değişiklik `main`'e ulaşınca Netlify birkaç dakikada yayınlar.
5. Kullanıcıya kısa özet ver: konu, kaç alıştırma/soru, uygulamada nereden açacağı.

### JSON şeması
```
ozet.json:    { slug: "hafta-03", sira: 3, baslik: "Hafta 3", konu: "…",
                giris: "…", bolumler: [{ baslik, metin, maddeler: [..], ornekler: [{ en, tr }] }],
                dikkat: [".."], kelimeler: [{ en, tr }] }
calisma.json: { alistirmalar: [{ baslik, yonerge, sorular: [{ soru, cevap, aciklama }] }] }
test.json:    { sorular: [{ soru, secenekler: ["..",".."], dogru: <0'dan başlayan indeks>, aciklama }] }
```
- `slug` klasör adıyla aynı olmalı; `sira` hafta numarası (örnek hafta = 0).
- `calisma` cevabında alternatifler veya birden fazla boşluk ` / ` ile ayrılır
  (örn. `"haven't finished / have not finished"`, `"Did / see"`); uygulama bunları otomatik kabul eder.

## Yerel deneme
`node scripts/hazirla.mjs && cd dist && python3 -m http.server 8000` → http://localhost:8000
(Asistan yerelde çalışmaz; Netlify'da çalışır.)
