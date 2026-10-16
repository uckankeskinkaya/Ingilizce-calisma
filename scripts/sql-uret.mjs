// icerik/<slug>/ klasöründeki JSON'ları kontrol eder ve Supabase'e yüklemek için SQL üretir.
// Kullanım:  node scripts/sql-uret.mjs hafta-01
// Çıkan SQL, Supabase MCP (execute_sql) veya Supabase panelindeki SQL Editor ile çalıştırılır.
import { readFileSync } from "node:fs";

const slug = process.argv[2];
if (!slug) {
  console.error("Kullanım: node scripts/sql-uret.mjs <slug>   (örn. hafta-01)");
  process.exit(1);
}

const oku = (ad) => JSON.parse(readFileSync(new URL(`../icerik/${slug}/${ad}.json`, import.meta.url), "utf8"));
const ozet = oku("ozet");
const calisma = oku("calisma");
const test = oku("test");

// --- Basit şema kontrolü: hatalı içerik uygulamayı bozmasın ---
const hatalar = [];
const gerekli = (kosul, mesaj) => { if (!kosul) hatalar.push(mesaj); };

gerekli(ozet.slug === slug, `ozet.slug "${ozet.slug}" klasör adıyla ("${slug}") aynı olmalı`);
gerekli(Number.isInteger(ozet.sira), "ozet.sira tam sayı olmalı");
gerekli(typeof ozet.baslik === "string" && ozet.baslik, "ozet.baslik eksik");
gerekli(typeof ozet.konu === "string" && ozet.konu, "ozet.konu eksik");
gerekli(Array.isArray(ozet.bolumler) && ozet.bolumler.length, "ozet.bolumler boş");

gerekli(Array.isArray(calisma.alistirmalar) && calisma.alistirmalar.length, "calisma.alistirmalar boş");
(calisma.alistirmalar || []).forEach((a, i) => {
  gerekli(a.baslik && Array.isArray(a.sorular) && a.sorular.length, `alıştırma ${i + 1}: baslik/sorular eksik`);
  (a.sorular || []).forEach((s, j) => gerekli(s.soru && s.cevap, `alıştırma ${i + 1}, soru ${j + 1}: soru/cevap eksik`));
});

gerekli(Array.isArray(test.sorular) && test.sorular.length, "test.sorular boş");
(test.sorular || []).forEach((s, i) => {
  gerekli(s.soru && Array.isArray(s.secenekler) && s.secenekler.length >= 2, `test sorusu ${i + 1}: soru/secenekler eksik`);
  gerekli(Number.isInteger(s.dogru) && s.dogru >= 0 && s.dogru < (s.secenekler || []).length, `test sorusu ${i + 1}: 'dogru' geçerli bir seçenek indeksi değil`);
  gerekli(s.aciklama, `test sorusu ${i + 1}: aciklama eksik`);
});

if (hatalar.length) {
  console.error("İçerik hataları:\n- " + hatalar.join("\n- "));
  process.exit(1);
}

// --- SQL üret (dollar-quoting ile; JSON içindeki tırnaklar sorun çıkarmaz) ---
const q = (deger) => {
  const metin = typeof deger === "string" ? deger : JSON.stringify(deger);
  if (metin.includes("$icerik$")) throw new Error("İçerikte '$icerik$' geçemez");
  return `$icerik$${metin}$icerik$`;
};

console.log(`insert into public.haftalar (slug, sira, baslik, konu, ozet, calisma, test, guncellendi)
values (${q(slug)}, ${ozet.sira}, ${q(ozet.baslik)}, ${q(ozet.konu)}, ${q(ozet)}::jsonb, ${q(calisma)}::jsonb, ${q(test)}::jsonb, now())
on conflict (slug) do update set
  sira = excluded.sira, baslik = excluded.baslik, konu = excluded.konu,
  ozet = excluded.ozet, calisma = excluded.calisma, test = excluded.test, guncellendi = now();`);
