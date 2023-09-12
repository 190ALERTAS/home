// Verifique se o Service Worker é suportado pelo navegador
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('https://190alertas.github.io/home/conteudo/js/sw.js')
        .then(function(registration) {
            console.log('Service Worker registrado com sucesso:', registration);
        })
        .catch(function(error) {
            console.error('Erro ao registrar o Service Worker:', error);
        });
}
