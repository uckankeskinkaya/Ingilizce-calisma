// AI asistan: uygulamadan gelen soruyu, o haftanın içeriğiyle birlikte EVREN'e (OpenAI uyumlu API) iletir.
// Anahtar ve ayarlar Supabase secret olarak durur, koda/repoya yazılmaz:
//   EVREN_API_KEY   – EVREN API anahtarı
//   EVREN_BASE_URL  – örn. https://.../v1   (sağlayıcı değişirse sadece bunu değiştir)
//   EVREN_MODEL     – örn. deepseek-chat     (model değişirse sadece bunu değiştir)
//   APP_SIFRE       – uygulamadaki asistan şifresi (yabancılar kullanmasın diye)
// SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY Supabase tarafından otomatik sağlanır.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-app-sifre",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const yanit = (govde: unknown, durum = 200) =>
  new Response(JSON.stringify(govde), { status: durum, headers: { ...CORS, "Content-Type": "application/json" } });

const env = (ad: string) => Deno.env.get(ad) ?? "";

type Mesaj = { role: "user" | "assistant"; content: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return yanit({ hata: "Sadece POST" }, 405);

  // 1) Şifre kontrolü
  const sifre = env("APP_SIFRE");
  if (!sifre || req.headers.get("x-app-sifre") !== sifre) {
    return yanit({ hata: "sifre", mesaj: "Asistan şifresi hatalı." }, 401);
  }

  let istek: { hafta?: string; mesajlar?: Mesaj[]; kontrol?: boolean };
  try {
    istek = await req.json();
  } catch {
    return yanit({ hata: "Geçersiz istek" }, 400);
  }
  if (istek.kontrol) return yanit({ ok: true }); // sadece şifre doğrulama

  const mesajlar = (istek.mesajlar ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12) // son 12 mesaj yeterli; maliyeti sınırlar
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (!istek.hafta || !mesajlar.length) return yanit({ hata: "hafta ve mesajlar gerekli" }, 400);

  // 2) Haftanın içeriğini veritabanından al
  const db = await fetch(
    `${env("SUPABASE_URL")}/rest/v1/haftalar?slug=eq.${encodeURIComponent(istek.hafta)}&select=baslik,konu,ozet,calisma,test`,
    { headers: { apikey: env("SUPABASE_SERVICE_ROLE_KEY"), Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}` } },
  );
  const satirlar = db.ok ? await db.json() : [];
  if (!satirlar.length) return yanit({ hata: "Hafta bulunamadı" }, 404);
  const h = satirlar[0];

  // 3) EVREN'e gönder
  const sistem = `Sen sabırlı ve samimi bir İngilizce öğretmenisin. Öğrenci Türk bir üniversite öğrencisi.
Açıklamaları Türkçe yap, İngilizce örnekleri İngilizce yaz ve gerektiğinde Türkçe çevirisini ver.
Bu haftanın konusu: ${h.baslik} – ${h.konu}
Öncelikle aşağıdaki haftalık içeriğe dayan. Konu dışı sorularda kısaca yardım et ama öğrenciyi bu haftanın konusuna geri yönlendir.
Öğrenciye soru sorduğunda bir seferde tek soru sor ve cevabını bekle; cevabı gelince doğru/yanlış olduğunu açıklayarak değerlendir.
Kısa ve anlaşılır yaz; uzun listelerden kaçın.

HAFTALIK İÇERİK (JSON):
${JSON.stringify({ ozet: h.ozet, calisma: h.calisma, test: h.test })}`;

  const baseUrl = env("EVREN_BASE_URL").replace(/\/+$/, "");
  if (!baseUrl || !env("EVREN_API_KEY") || !env("EVREN_MODEL")) {
    return yanit({ hata: "EVREN ayarları eksik (EVREN_API_KEY / EVREN_BASE_URL / EVREN_MODEL)" }, 500);
  }

  const ai = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env("EVREN_API_KEY")}` },
    body: JSON.stringify({
      model: env("EVREN_MODEL"),
      messages: [{ role: "system", content: sistem }, ...mesajlar],
      temperature: 0.5,
    }),
  });

  if (!ai.ok) {
    const detay = (await ai.text()).slice(0, 500);
    console.error("EVREN hatası", ai.status, detay);
    return yanit({ hata: `AI servisi hata verdi (${ai.status})`, detay }, 502);
  }
  const veri = await ai.json();
  const cevap = veri?.choices?.[0]?.message?.content ?? "";
  return yanit({ cevap });
});
