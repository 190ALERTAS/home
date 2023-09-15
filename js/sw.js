// Cache de arquivos
const cacheName = 'minha-pagina-cache-v1';
const cacheFiles = [
    'https://190alertas.github.io/home',
    'https://190alertas.github.io/home/release',
    'https://190alertas.github.io/home/veiculos',
    'https://190alertas.github.io/home/assuntos',
    'https://190alertas.github.io/home/feedback',
    'https://190alertas.github.io/home/js/main.js',
    'https://190alertas.github.io/home/js/ReleaseScript.js',
    'https://190alertas.github.io/home/js/manifest.json',
    'https://190alertas.github.io/home/js/AssuntosScript.js',
    'https://190alertas.github.io/home/js/VeiculoScript.js',
    'https://190alertas.github.io/home/css/theme.css', // Se você tiver um arquivo CSS
    'https://raw.githubusercontent.com/190ALERTAS/190/main/img/Logo%20190ALERTAS.png', // Se você tiver imagens
    'https://raw.githubusercontent.com/190ALERTAS/home/main/img/moon-solid-24.png'
    'https://raw.githubusercontent.com/190ALERTAS/home/main/img/sun-solid-24.png'
	'https://raw.githubusercontent.com/190ALERTAS/home/main/img/favicon_io/favicon.ico'
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
