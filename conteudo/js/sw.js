// Cache de arquivos
const cacheName = 'minha-pagina-cache-v1';
const cacheFiles = [
    'https://190alertas.github.io/home',
    '/index.html',
    '/main.js',
    '/styles.css', // Se você tiver um arquivo CSS
    '/imagens/logo.png', // Se você tiver imagens
];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(cacheName)
            .then(function(cache) {
                return cache.addAll(cacheFiles);
            })
    );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});