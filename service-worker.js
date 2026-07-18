const CACHE_NAME = "marmita-aconcagua-v3";

const ARCHIVOS = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js"
];


self.addEventListener("install", evento => {

    evento.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            return cache.addAll(ARCHIVOS);
        })
    );

});
self.addEventListener("activate", evento => {

    evento.waitUntil(
        caches.keys().then(keys => {

            return Promise.all(
                keys.map(key => {

                    if(key !== CACHE_NAME){
                        return caches.delete(key);
                    }

                })
            );

        })
    );

    self.clients.claim();

});

self.addEventListener("fetch", evento => {

    evento.respondWith(

        caches.match(evento.request)
        .then(respuesta => {

            return respuesta || fetch(evento.request);

        })

    );

});
