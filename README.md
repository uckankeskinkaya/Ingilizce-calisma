# İngilizce Çalışma

Kişisel İngilizce ders çalışma uygulaması (PWA). Haftalık ders PDF'lerinden Claude'un ürettiği
özet, çalışma kağıdı ve test; ayrıca haftanın konusuna göre çalışan bir AI asistan.

- Uygulama: `app/` · Barındırma: Netlify (`netlify.toml`)
- Kaynak PDF'ler: `kaynaklar/hafta-XX/` (yayına konmaz)
- Üretilen içerik: `icerik/hafta-XX/`
- AI asistan: `netlify/functions/asistan.mjs` (anahtar Netlify ortam değişkeninde)
- Proje kuralları ve "hafta-XX'i işle" talimatı: [CLAUDE.md](CLAUDE.md)

## Kurulum (bir kez)
1. https://app.netlify.com → **GitHub ile giriş yap**.
2. **Add new project → Import an existing project → GitHub** → `Ingilizce-calisma` reposunu seç.
3. Branch: `main`. Diğer ayarlar `netlify.toml`'dan otomatik gelir → **Deploy**.
4. **Site configuration → Environment variables → Add a variable** ile dört değişken ekle:
   `EVREN_API_KEY`, `EVREN_BASE_URL`, `EVREN_MODEL`, `APP_SIFRE`.
5. **Deploys → Trigger deploy → Deploy site** (değişkenlerin devreye girmesi için).
