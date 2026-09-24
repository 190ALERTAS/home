// Service worker da versão 4 (substituído pelo /home/sw.js da versão 5).
// Se ainda estiver registrado em algum aparelho, apenas limpa o cache antigo e
// remove o próprio registro. Não intercepta nenhuma requisição.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        await caches.delete('minha-pagina-cache-v1');
      } finally {
        await self.registration.unregister();
      }
    })(),
  );
});
