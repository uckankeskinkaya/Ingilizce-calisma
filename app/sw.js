// Basit çevrimdışı destek: önce internetten dene, olmazsa son kaydedilen sürümü göster.
const ONBELLEK = "ingilizce-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (ev) => ev.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (ev) => {
  const istek = ev.request;
  if (istek.method !== "GET") return; // asistan (POST) önbelleğe alınmaz
  ev.respondWith(
    fetch(istek)
      .then((cevap) => {
        if (cevap.ok) {
          const kopya = cevap.clone();
          caches.open(ONBELLEK).then((c) => c.put(istek, kopya));
        }
        return cevap;
      })
      .catch(() => caches.match(istek)),
  );
});
