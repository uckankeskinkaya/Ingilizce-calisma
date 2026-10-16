// Yayına hazırlık: icerik/ altındaki tüm haftaları kontrol eder, app/ ile birlikte dist/ klasörüne koyar
// ve hafta listesini (dist/haftalar.json) üretir. Netlify bunu her yayında otomatik çalıştırır.
// Elle kontrol için:  node scripts/hazirla.mjs
// Not: kaynaklar/ (PDF'ler) bilerek yayına KONMAZ.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const kok = new URL("../", import.meta.url);
const yol = (p) => new URL(p, kok);

const hatalar = [];
const gerekli = (kosul, mesaj) => { if (!kosul) hatalar.push(mesaj); };

function haftaKontrol(slug) {
  const oku = (ad) => {
    const dosya = yol(`icerik/${slug}/${ad}.json`);
    if (!existsSync(dosya)) { hatalar.push(`${slug}: ${ad}.json yok`); return null; }
    try { return JSON.parse(readFileSync(dosya, "utf8")); }
    catch (h) { hatalar.push(`${slug}/${ad}.json geçerli JSON değil: ${h.message}`); return null; }
  };
  const ozet = oku("ozet"), calisma = oku("calisma"), test = oku("test");
  if (!ozet || !calisma || !test) return null;
  const k = (kosul, mesaj) => gerekli(kosul, `${slug}: ${mesaj}`);

  k(ozet.slug === slug, `ozet.slug "${ozet.slug}" klasör adıyla aynı olmalı`);
  k(Number.isInteger(ozet.sira), "ozet.sira tam sayı olmalı");
  k(typeof ozet.baslik === "string" && ozet.baslik, "ozet.baslik eksik");
  k(typeof ozet.konu === "string" && ozet.konu, "ozet.konu eksik");
  k(Array.isArray(ozet.bolumler) && ozet.bolumler.length, "ozet.bolumler boş");

  k(Array.isArray(calisma.alistirmalar) && calisma.alistirmalar.length, "calisma.alistirmalar boş");
  (calisma.alistirmalar || []).forEach((a, i) => {
    k(a.baslik && Array.isArray(a.sorular) && a.sorular.length, `alıştırma ${i + 1}: baslik/sorular eksik`);
    (a.sorular || []).forEach((s, j) => k(s.soru && s.cevap, `alıştırma ${i + 1}, soru ${j + 1}: soru/cevap eksik`));
  });

  k(Array.isArray(test.sorular) && test.sorular.length, "test.sorular boş");
  (test.sorular || []).forEach((s, i) => {
    k(s.soru && Array.isArray(s.secenekler) && s.secenekler.length >= 2, `test sorusu ${i + 1}: soru/secenekler eksik`);
    k(Number.isInteger(s.dogru) && s.dogru >= 0 && s.dogru < (s.secenekler || []).length, `test sorusu ${i + 1}: 'dogru' geçerli bir seçenek indeksi değil`);
    k(s.aciklama, `test sorusu ${i + 1}: aciklama eksik`);
  });

  return { slug, sira: ozet.sira, baslik: ozet.baslik, konu: ozet.konu };
}

const slugs = readdirSync(yol("icerik/"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const haftalar = slugs.map(haftaKontrol).filter(Boolean).sort((a, b) => a.sira - b.sira);

if (hatalar.length) {
  console.error("❌ İçerik hataları:\n- " + hatalar.join("\n- "));
  process.exit(1);
}

rmSync(yol("dist/"), { recursive: true, force: true });
mkdirSync(yol("dist/"));
cpSync(yol("app/"), yol("dist/"), { recursive: true });
for (const h of haftalar) cpSync(yol(`icerik/${h.slug}/`), yol(`dist/icerik/${h.slug}/`), { recursive: true });
writeFileSync(yol("dist/haftalar.json"), JSON.stringify(haftalar, null, 2));

console.log(`✅ ${haftalar.length} hafta hazır: ${haftalar.map((h) => h.slug).join(", ")}`);
