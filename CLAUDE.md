# İngilizce Çalışma – Proje Rehberi (Claude için)

Kişisel kullanım için İngilizce ders çalışma uygulaması. Kullanıcı tablet kullanıyor ve kodlama
tecrübesi sınırlı: **Türkçe konuş, adımları açık ve kısa anlat, teknik jargonu açıkla.**

## Mimari (basit tut)
- `kaynaklar/hafta-XX/` → kullanıcının yüklediği ders PDF'leri (girdi). `kaynaklar/ornek-hafta/` test amaçlıdır.
- `icerik/hafta-XX/{ozet,calisma,test}.json` → Claude'un ürettiği içerik (çıktı, repoda tutulur).
- Supabase `public.haftalar` tablosu → uygulamanın okuduğu kopya (her hafta = bir satır).
- `app/` → derleme adımı olmayan PWA (düz HTML/CSS/JS). GitHub Pages'te `main` dalından yayınlanır
  (`.github/workflows/pages.yml`).
- `supabase/functions/asistan/` → AI asistan Edge Function. Haftanın içeriğini DB'den alıp EVREN'e
  (OpenAI uyumlu `/chat/completions`) gönderir.
- `supabase/migrations/` → veritabanı şeması. `scripts/sql-uret.mjs` → içerik kontrolü + yükleme SQL'i.

## Supabase
- Proje: bkz. `app/config.js` (`SUPABASE_URL`). Proje ref'i URL'deki alt alan adıdır.
- Tablo yazma yetkisi sadece yöneticide (RLS: anon/authenticated sadece SELECT).
- Edge Function secret'ları: `EVREN_API_KEY`, `EVREN_BASE_URL`, `EVREN_MODEL`, `APP_SIFRE`.
  Sağlayıcı/model değişikliği = sadece ilgili secret'ı güncelle, kod değişmez.
- `asistan` fonksiyonu `verify_jwt: false` ile deploy edilir; koruma `x-app-sifre` başlığı + `APP_SIFRE` ile.

## KESİN KURALLAR
1. **EVREN API anahtarı (ve hiçbir gizli anahtar) asla repoya, `app/` içine veya sohbete yazılmaz.**
   Secret'ları ayarlamak için Supabase MCP `create_edge_function_secret` kullan (değeri kullanıcı
   Supabase panelinde girer, sohbete geçmez). Kullanıcı anahtarı sohbete yapıştırmak isterse bunu önerme.
2. `app/config.js` sadece Supabase URL + publishable/anon anahtar içerir (bunlar herkese açık olabilir).
3. `.env*` dosyaları `.gitignore`'da; asla commit etme. Service role anahtarını hiçbir dosyaya yazma.
4. Gereksiz karmaşıklık ekleme: framework, build adımı, npm bağımlılığı ekleme (gerçekten şart değilse).
5. Geliştirme dalı ve push kuralları oturum talimatlarında belirtilir; yayın `main` dalından olur.

## "hafta-XX'i işle" komutu – yapılacaklar
1. `kaynaklar/hafta-XX/` içindeki TÜM dosyaları oku (PDF'leri Read aracıyla; gerekirse `pdftotext`).
   Klasör yoksa/boşsa kullanıcıya PDF'leri nasıl yükleyeceğini anlat ve dur.
2. `icerik/hafta-XX/` altına üç dosya üret (şema aşağıda, örnek: `icerik/ornek-hafta/`):
   - `ozet.json` — konu özeti: önemli kurallar, örnek cümleler (EN + TR), dikkat noktaları, kelimeler.
   - `calisma.json` — en az 3 farklı türde alıştırma, toplam ~12-20 soru, cevap anahtarı + kısa açıklama.
   - `test.json` — 10-15 çoktan seçmeli soru (4 seçenek), her birine Türkçe açıklama. Doğru şıkların
     yerini karıştır (hep aynı şık olmasın).
   İçerik PDF'e sadık olsun; PDF'te olmayan konu ekleme. Açıklamalar Türkçe, İngilizce örnekler İngilizce.
3. Kontrol + SQL: `node scripts/sql-uret.mjs hafta-XX` (hata verirse JSON'u düzelt).
4. Çıkan SQL'i Supabase MCP `execute_sql` ile çalıştır (proje ref: `app/config.js`). Sonra
   `select slug, baslik from haftalar order by sira` ile doğrula.
5. Commit + push. Kullanıcıya kısa özet ver: konu, kaç alıştırma/soru, uygulamada nereden açacağı.

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
`cd app && python3 -m http.server 8000` → http://localhost:8000
