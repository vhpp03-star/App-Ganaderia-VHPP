// Guarda la app en el teléfono para que abra sin internet.
// La API de Google (otro dominio) nunca pasa por aquí: va directo a la red.
const CACHE = "vhpp-app-v1";
const PRECACHE = ["./fletes.html", "./manifest-fletes.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== location.origin) return;
  e.respondWith(redPrimeroConRespaldo(req));
});

function sinRedireccion(resp) {
  if (!resp.redirected) return resp;
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: resp.headers });
}

// Con internet baja la versión nueva (y la guarda); sin internet o con señal lenta (4 s) usa la guardada.
async function redPrimeroConRespaldo(req) {
  const cache = await caches.open(CACHE);
  try {
    const resp = await Promise.race([fetch(req), new Promise((_, no) => setTimeout(() => no(new Error("lento")), 4000))]);
    if (resp && resp.ok) cache.put(req, resp.clone());
    return sinRedireccion(resp);
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return sinRedireccion(hit);
    if (req.mode === "navigate") { const f = await cache.match("./fletes.html"); if (f) return sinRedireccion(f); }
    return Response.error();
  }
}
