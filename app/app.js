// İngilizce Çalışma – tek dosyalık basit uygulama (derleme adımı yok).
// Ekranlar:  #/                     → hafta listesi
//            #/h/<slug>/<sekme>      → ozet | calisma | test | asistan

const ekran = document.getElementById("ekran");
const onbellek = {}; // slug → hafta verisi

// ---------- yardımcılar ----------
const e = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const depo = {
  al(k, vars) { try { return JSON.parse(localStorage.getItem(k)) ?? vars; } catch { return vars; } },
  koy(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  sil(k) { try { localStorage.removeItem(k); } catch {} },
};

// İçerik sitenin kendi JSON dosyalarından okunur (veritabanı yok).
async function jsonAl(yol) {
  const r = await fetch(yol);
  if (!r.ok) throw new Error(r.status === 404 ? "İçerik bulunamadı." : `Veri alınamadı (${r.status})`);
  return r.json();
}

async function haftaGetir(slug) {
  if (!onbellek[slug]) {
    const d = `icerik/${encodeURIComponent(slug)}`;
    const [ozet, calisma, test] = await Promise.all([jsonAl(`${d}/ozet.json`), jsonAl(`${d}/calisma.json`), jsonAl(`${d}/test.json`)]);
    onbellek[slug] = { slug, baslik: ozet.baslik, konu: ozet.konu, ozet, calisma, test };
  }
  return onbellek[slug];
}

// Cevap karşılaştırma: büyük/küçük harf, fazla boşluk ve sondaki noktalama önemsiz.
const normal = (s) =>
  String(s).toLowerCase().replace(/[’`]/g, "'").replace(/[.!?,;]+$/g, "").replace(/\s+/g, " ").trim();
function cevapDogruMu(girilen, cevap) {
  const g = normal(girilen);
  if (!g) return false;
  const secenekler = cevap.split(" / ").concat(cevap.replace(/ \/ /g, " "));
  return secenekler.some((c) => normal(c) === g);
}

// Asistan cevapları için mini markdown (kalın, italik, kod, madde).
function md(metin) {
  return e(metin)
    .split(/\n{2,}/)
    .map((p) => {
      const satirlar = p.split("\n");
      if (satirlar.every((s) => /^\s*[-*•]\s+/.test(s))) {
        return "<ul class='liste'>" + satirlar.map((s) => `<li>${s.replace(/^\s*[-*•]\s+/, "")}</li>`).join("") + "</ul>";
      }
      return `<p>${satirlar.join("<br>")}</p>`;
    })
    .join("")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

// ---------- yönlendirme ----------
async function yonlendir() {
  const [, tur, slug, sekme = "ozet"] = location.hash.split("/");
  window.scrollTo(0, 0);
  try {
    if (tur === "h" && slug) await haftaEkrani(decodeURIComponent(slug), sekme);
    else await listeEkrani();
  } catch (hata) {
    ekran.innerHTML = `<div class="hata">⚠️ ${e(hata.message)}</div><p><a href="#/">← Ana sayfa</a></p>`;
  }
}
window.addEventListener("hashchange", yonlendir);

// ---------- hafta listesi ----------
async function listeEkrani() {
  const haftalar = await jsonAl("haftalar.json");
  if (!haftalar.length) {
    ekran.innerHTML = `<h1>Haftalar</h1><p class="bilgi">Henüz içerik yok.</p>`;
    return;
  }
  ekran.innerHTML =
    `<h1>Haftalar</h1>` +
    haftalar
      .map((h) => {
        const p = depo.al(`puan:${h.slug}`);
        const rozet = p ? `<span class="rozet">Son test: ${p.dogru}/${p.toplam}</span>` : "";
        return `<a class="kart" href="#/h/${encodeURIComponent(h.slug)}/ozet">
          <h3>${e(h.baslik)}</h3><div class="alt">${e(h.konu)}</div>${rozet}</a>`;
      })
      .join("");
}

// ---------- hafta ekranı ----------
const SEKMELER = [
  ["ozet", "📖 Özet"],
  ["calisma", "✏️ Çalışma"],
  ["test", "✅ Test"],
  ["asistan", "🤖 Asistan"],
];

async function haftaEkrani(slug, sekme) {
  const h = await haftaGetir(slug);
  const ust =
    `<p><a href="#/">← Haftalar</a></p><h1>${e(h.baslik)}</h1><div class="bilgi">${e(h.konu)}</div>` +
    `<nav class="sekmeler">` +
    SEKMELER.map(([k, ad]) => `<a href="#/h/${encodeURIComponent(slug)}/${k}" class="${k === sekme ? "aktif" : ""}">${ad}</a>`).join("") +
    `</nav><div id="icerik"></div>`;
  ekran.innerHTML = ust;
  const alan = document.getElementById("icerik");
  ({ ozet: ozetGoster, calisma: calismaGoster, test: testGoster, asistan: asistanGoster }[sekme] || ozetGoster)(alan, h);
}

// ---------- özet ----------
function ozetGoster(alan, h) {
  const o = h.ozet;
  let html = o.giris ? `<div class="kart">${e(o.giris)}</div>` : "";
  for (const b of o.bolumler || []) {
    html += `<div class="kart"><h3>${e(b.baslik)}</h3>`;
    if (b.metin) html += `<p>${e(b.metin)}</p>`;
    if (b.maddeler?.length) html += `<ul class="liste">${b.maddeler.map((m) => `<li>${e(m)}</li>`).join("")}</ul>`;
    for (const x of b.ornekler || []) html += `<div class="ornek"><div>${e(x.en)}</div><div class="tr">${e(x.tr)}</div></div>`;
    html += `</div>`;
  }
  if (o.dikkat?.length)
    html += `<div class="kart dikkat"><h3>⚠️ Dikkat</h3><ul class="liste">${o.dikkat.map((d) => `<li>${e(d)}</li>`).join("")}</ul></div>`;
  if (o.kelimeler?.length)
    html += `<div class="kart"><h3>📝 Kelimeler</h3><table class="kelime">${o.kelimeler
      .map((k) => `<tr><td>${e(k.en)}</td><td>${e(k.tr)}</td></tr>`)
      .join("")}</table></div>`;
  alan.innerHTML = html;
}

// ---------- çalışma kağıdı ----------
function calismaGoster(alan, h) {
  alan.innerHTML = h.calisma.alistirmalar
    .map(
      (a, i) => `<div class="kart"><h3>${e(a.baslik)}</h3>${a.yonerge ? `<div class="bilgi">${e(a.yonerge)}</div>` : ""}
      ${a.sorular
        .map(
          (s, j) => `<div class="soru" data-i="${i}" data-j="${j}">
            <div>${j + 1}. ${e(s.soru)}</div>
            <div class="cevap-satir"><input type="text" placeholder="Cevabın" autocapitalize="off" autocomplete="off">
              <button class="ikincil kontrol">Kontrol</button><button class="ikincil goster">Cevap</button></div>
            <div class="cevap" hidden><b>Cevap:</b> ${e(s.cevap)}${s.aciklama ? `<div class="bilgi">${e(s.aciklama)}</div>` : ""}</div>
          </div>`,
        )
        .join("")}</div>`,
    )
    .join("");

  alan.onclick = (ev) => {
    const kutu = ev.target.closest(".soru");
    if (!kutu || ev.target.tagName !== "BUTTON") return;
    const s = h.calisma.alistirmalar[kutu.dataset.i].sorular[kutu.dataset.j];
    const input = kutu.querySelector("input");
    if (ev.target.classList.contains("kontrol")) {
      const dogru = cevapDogruMu(input.value, s.cevap);
      input.classList.toggle("dogru", dogru);
      input.classList.toggle("yanlis", !dogru);
      if (dogru) kutu.querySelector(".cevap").hidden = false;
    } else {
      kutu.querySelector(".cevap").hidden = false;
    }
  };
}

// ---------- test ----------
function testGoster(alan, h) {
  const sorular = h.test.sorular;
  const secim = {};
  let bitti = false;

  function ciz() {
    let dogruSay = 0;
    const html = sorular
      .map((s, i) => {
        if (secim[i] === s.dogru) dogruSay++;
        return `<div class="kart"><div><b>${i + 1}.</b> ${e(s.soru)}</div>
          ${s.secenekler
            .map((sec, k) => {
              let sinif = "";
              if (bitti) sinif = k === s.dogru ? "dogru" : secim[i] === k ? "yanlis" : "";
              else if (secim[i] === k) sinif = "secili";
              return `<button class="secenek ${sinif}" data-i="${i}" data-k="${k}" ${bitti ? "disabled" : ""}>${"ABCDEFG"[k]}) ${e(sec)}</button>`;
            })
            .join("")}
          ${bitti ? `<div class="cevap">${secim[i] === s.dogru ? "✅ Doğru." : "❌ Yanlış."} ${e(s.aciklama)}</div>` : ""}
        </div>`;
      })
      .join("");

    const cevaplanan = Object.keys(secim).length;
    const alt = bitti
      ? `<div class="kart puan">Puan: ${dogruSay} / ${sorular.length} (%${Math.round((dogruSay / sorular.length) * 100)})</div>
         <div class="butonlar"><button id="tekrar">Testi tekrar çöz</button></div>`
      : `<div class="butonlar"><button id="bitir">Testi bitir (${cevaplanan}/${sorular.length} cevaplandı)</button></div>`;

    alan.innerHTML = (bitti ? alt : "") + html + alt;
    if (bitti) depo.koy(`puan:${h.slug}`, { dogru: dogruSay, toplam: sorular.length, tarih: Date.now() });
  }

  alan.onclick = (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    if (b.id === "bitir") {
      if (Object.keys(secim).length < sorular.length && !confirm("Boş sorular var. Yine de bitirilsin mi?")) return;
      bitti = true; ciz(); window.scrollTo(0, 0);
    } else if (b.id === "tekrar") {
      for (const k in secim) delete secim[k];
      bitti = false; ciz(); window.scrollTo(0, 0);
    } else if (b.dataset.i !== undefined && !bitti) {
      secim[b.dataset.i] = Number(b.dataset.k); ciz();
    }
  };
  ciz();
}

// ---------- AI asistan ----------
async function asistanCagir(govde) {
  const r = await fetch("api/asistan", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-app-sifre": depo.al("asistanSifre", "") },
    body: JSON.stringify(govde),
  });
  const veri = await r.json().catch(() => ({}));
  if (r.status === 401) { depo.sil("asistanSifre"); throw new Error("Şifre hatalı, tekrar dene."); }
  if (!r.ok) throw new Error(veri.hata || `Asistan hata verdi (${r.status})`);
  return veri;
}

function asistanGoster(alan, h) {
  if (!depo.al("asistanSifre")) {
    alan.innerHTML = `<div class="kart"><h3>🔒 Asistan şifresi</h3>
      <p class="bilgi">Bu cihazda bir kez gireceksin, sonra hatırlanır.</p>
      <div class="cevap-satir"><input type="password" id="sifre" placeholder="Şifre">
      <button id="sifreGir">Giriş</button></div><p id="sifreMesaj" class="bilgi"></p></div>`;
    alan.querySelector("#sifreGir").onclick = async () => {
      depo.koy("asistanSifre", alan.querySelector("#sifre").value.trim());
      try { await asistanCagir({ kontrol: true }); asistanGoster(alan, h); }
      catch (err) { alan.querySelector("#sifreMesaj").textContent = err.message; }
    };
    return;
  }

  const anahtar = `sohbet:${h.slug}`;
  const mesajlar = depo.al(anahtar, []);
  alan.innerHTML = `
    <div class="butonlar">
      <button class="ikincil hazir" data-m="Bu haftanın konusunu bana adım adım, basitçe anlatır mısın?">Konuyu anlat</button>
      <button class="ikincil hazir" data-m="Bu haftanın konusuyla ilgili günlük hayattan birkaç örnek cümle verir misin?">Örnek ver</button>
      <button class="ikincil hazir" data-m="Bana bu haftanın konusundan bir soru sor, cevabımı değerlendir.">Bana soru sor</button>
      <button class="ikincil" id="temizle">Yeni sohbet</button>
    </div>
    <div class="sohbet" id="sohbet"></div>
    <div class="yaz"><textarea id="mesaj" placeholder="Sorunu yaz…"></textarea><button id="gonder">Gönder</button></div>
    <p><button class="ikincil" id="baglantiTesti">🔧 Bağlantı testi</button></p><div id="testSonuc"></div>`;
  const sohbet = alan.querySelector("#sohbet");
  const kutu = alan.querySelector("#mesaj");
  const gonderBtn = alan.querySelector("#gonder");

  const ciz = () => {
    sohbet.innerHTML = mesajlar.length
      ? mesajlar.map((m) => `<div class="balon ${m.role}">${m.role === "assistant" ? md(m.content) : e(m.content)}</div>`).join("")
      : `<p class="bilgi">Bu haftanın konusu hakkında istediğini sorabilirsin.</p>`;
  };

  async function gonder(metin) {
    metin = metin.trim();
    if (!metin || gonderBtn.disabled) return;
    mesajlar.push({ role: "user", content: metin });
    kutu.value = "";
    ciz();
    sohbet.insertAdjacentHTML("beforeend", `<div class="balon assistant bilgi" id="yaziyor">Yazıyor…</div>`);
    gonderBtn.disabled = true;
    try {
      const { cevap } = await asistanCagir({ hafta: h.slug, mesajlar });
      mesajlar.push({ role: "assistant", content: cevap });
      depo.koy(anahtar, mesajlar);
      ciz();
    } catch (err) {
      mesajlar.pop();
      ciz();
      sohbet.insertAdjacentHTML("beforeend", `<div class="hata">⚠️ ${e(err.message)}</div>`);
      kutu.value = metin;
    } finally {
      gonderBtn.disabled = false;
      sohbet.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  alan.querySelectorAll(".hazir").forEach((b) => (b.onclick = () => gonder(b.dataset.m)));
  alan.querySelector("#temizle").onclick = () => { mesajlar.length = 0; depo.sil(anahtar); ciz(); };
  gonderBtn.onclick = () => gonder(kutu.value);
  alan.querySelector("#baglantiTesti").onclick = async () => {
    const sonuc = alan.querySelector("#testSonuc");
    sonuc.innerHTML = `<p class="bilgi">Test ediliyor…</p>`;
    try {
      const t = await asistanCagir({ test: true });
      sonuc.innerHTML = `<div class="kart"><div><b>Adres:</b> ${e(t.baseUrl)}</div><div><b>Seçili model:</b> ${e(t.model)}</div>
        ${t.hata ? `<div class="hata">⚠️ ${e(t.hata)}</div>` : `<div>✅ Bağlantı çalışıyor. Kullanılabilir modeller:</div>
        <ul class="liste">${t.modeller.map((m) => `<li>${e(m)}</li>`).join("") || "<li>(liste boş)</li>"}</ul>`}</div>`;
    } catch (err) {
      sonuc.innerHTML = `<div class="hata">⚠️ ${e(err.message)}</div>`;
    }
  };
  ciz();
}

// ---------- başlat ----------
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
yonlendir();
