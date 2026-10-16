// AI asistan: uygulamadan gelen soruyu, o haftanın içeriğiyle birlikte EVREN'e (OpenAI uyumlu API) iletir.
// Ayarlar Netlify panelinde ortam değişkeni (environment variable) olarak durur, koda/repoya yazılmaz:
//   EVREN_API_KEY   – EVREN API anahtarı (gizli)
//   EVREN_BASE_URL  – örn. https://.../v1   (sağlayıcı değişirse sadece bunu değiştir)
//   EVREN_MODEL     – örn. deepseek-chat     (model değişirse sadece bunu değiştir)
//   APP_SIFRE       – uygulamadaki asistan şifresi (yabancılar kullanmasın diye)

export const config = { path: "/api/asistan" };

const yanit = (govde, durum = 200) =>
  new Response(JSON.stringify(govde), { status: durum, headers: { "Content-Type": "application/json" } });

const env = (ad) => process.env[ad] ?? "";

export default async (req) => {
  if (req.method !== "POST") return yanit({ hata: "Sadece POST" }, 405);

  // 1) Şifre kontrolü
  const sifre = env("APP_SIFRE").trim();
  if (!sifre) {
    return yanit({ hata: "Netlify'da APP_SIFRE ayarı bulunamadı (adı doğru mu, ayardan sonra yeniden yayınlandı mı?)" }, 500);
  }
  if ((req.headers.get("x-app-sifre") ?? "").trim() !== sifre) {
    return yanit({ hata: "Asistan şifresi hatalı." }, 401);
  }

  let istek;
  try {
    istek = await req.json();
  } catch {
    return yanit({ hata: "Geçersiz istek" }, 400);
  }
  if (istek.kontrol) return yanit({ ok: true }); // sadece şifre doğrulama

  const baseUrl = env("EVREN_BASE_URL").replace(/\/+$/, "");
  if (!baseUrl || !env("EVREN_API_KEY") || !env("EVREN_MODEL")) {
    return yanit({ hata: "EVREN ayarları eksik (Netlify'da EVREN_API_KEY / EVREN_BASE_URL / EVREN_MODEL)" }, 500);
  }

  // Bağlantı testi: ayarları ve EVREN'in sunduğu model adlarını gösterir (anahtarı göstermez).
  if (istek.test) {
    const bilgi = { baseUrl, model: env("EVREN_MODEL") };
    try {
      const r = await fetch(`${baseUrl}/models`, { headers: { Authorization: `Bearer ${env("EVREN_API_KEY")}` } });
      const metin = await r.text();
      if (!r.ok) return yanit({ ...bilgi, hata: `EVREN ${r.status} döndü: ${metin.slice(0, 200)}` });
      const modeller = (JSON.parse(metin).data ?? []).map((m) => m.id);
      return yanit({ ...bilgi, modeller });
    } catch (h) {
      return yanit({ ...bilgi, hata: `EVREN'e ulaşılamadı: ${h.message}` });
    }
  }

  const mesajlar = (Array.isArray(istek.mesajlar) ? istek.mesajlar : [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12) // son 12 mesaj yeterli; maliyeti sınırlar
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  const slug = String(istek.hafta ?? "");
  if (!/^[a-z0-9-]+$/.test(slug) || !mesajlar.length) return yanit({ hata: "hafta ve mesajlar gerekli" }, 400);

  // 2) Haftanın içeriğini sitenin kendisinden oku (icerik/<slug>/*.json yayında duruyor)
  const site = new URL(req.url).origin;
  const oku = async (ad) => {
    const r = await fetch(`${site}/icerik/${slug}/${ad}.json`);
    if (!r.ok) throw new Error(ad);
    return r.json();
  };
  let ozet, calisma, test;
  try {
    [ozet, calisma, test] = await Promise.all([oku("ozet"), oku("calisma"), oku("test")]);
  } catch {
    return yanit({ hata: "Hafta bulunamadı" }, 404);
  }

  // 3) EVREN'e gönder
  const sistem = `Sen sabırlı ve samimi bir İngilizce öğretmenisin. Öğrenci Türk bir üniversite öğrencisi.
Açıklamaları Türkçe yap, İngilizce örnekleri İngilizce yaz ve gerektiğinde Türkçe çevirisini ver.
Bu haftanın konusu: ${ozet.baslik} – ${ozet.konu}
Öncelikle aşağıdaki haftalık içeriğe dayan. Konu dışı sorularda kısaca yardım et ama öğrenciyi bu haftanın konusuna geri yönlendir.
Öğrenciye soru sorduğunda bir seferde tek soru sor ve cevabını bekle; cevabı gelince doğru/yanlış olduğunu açıklayarak değerlendir.
Kısa ve anlaşılır yaz; uzun listelerden kaçın.

HAFTALIK İÇERİK (JSON):
${JSON.stringify({ ozet, calisma, test })}`;

  let ai;
  try {
    ai = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env("EVREN_API_KEY")}` },
      body: JSON.stringify({
        model: env("EVREN_MODEL"),
        messages: [{ role: "system", content: sistem }, ...mesajlar],
        temperature: 0.5,
      }),
    });
  } catch (h) {
    return yanit({ hata: `AI servisine ulaşılamadı: ${h.message}` }, 502);
  }

  if (!ai.ok) {
    const detay = (await ai.text()).slice(0, 300);
    console.error("EVREN hatası", ai.status, detay);
    return yanit({ hata: `AI servisi hata verdi (${ai.status}): ${detay}` }, 502);
  }
  const veri = await ai.json();
  return yanit({ cevap: veri?.choices?.[0]?.message?.content ?? "" });
};
