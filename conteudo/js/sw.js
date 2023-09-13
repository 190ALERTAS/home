// Cache de arquivos
const cacheName = 'minha-pagina-cache-v1';
const cacheFiles = [
    'https://190alertas.github.io/home',
    'https://190alertas.github.io/home/conteudo/release',
    'https://190alertas.github.io/home/conteudo/veiculos',
    'https://190alertas.github.io/home/conteudo/assuntos',
    'https://190alertas.github.io/home/conteudo/feedback',
    'https://190alertas.github.io/home/conteudo/js/main.js',
    'https://190alertas.github.io/home/conteudo/js/ReleaseScript.js',
    'https://190alertas.github.io/home/conteudo/js/manifest.json',
    'https://190alertas.github.io/home/conteudo/js/AssuntosScript.js',
    'https://190alertas.github.io/home/conteudo/js/VeiculoScript.js',
    'https://190alertas.github.io/home/conteudo/css/theme.css', // Se você tiver um arquivo CSS
    'https://raw.githubusercontent.com/190ALERTAS/190/main/conteudo/img/Logo%20190ALERTAS.png', // Se você tiver imagens
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
