/* 땅따먹기 — 오프라인에서도 열리게 하고, 앱으로 설치되게 합니다.
   앱 본문(index.html)은 늘 서버에서 새로 받고, 못 받을 때만 저장본을 씁니다. */
var CACHE = "ttang-v4";
var FILES = [
  "./manifest.json",
  "./icon-192.png", "./icon-512.png", "./icon-mask.png", "./apple-touch-icon.png"
];

self.addEventListener("install", function(e){
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(FILES.map(function(f){ return c.add(f).catch(function(){}); }));
    })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ if(k !== CACHE) return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

function isPage(req){
  if(req.mode === "navigate") return true;
  var u = req.url.split("?")[0];
  return /\/$|index\.html$|manifest\.json$|sw\.js$/.test(u);
}

self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET") return;
  if(isPage(e.request)){
    /* 늘 서버 먼저 — 캐시 헤더도 무시하고 받아요 */
    e.respondWith(
      fetch(e.request, {cache:"no-store"}).then(function(res){
        if(res && res.ok){
          var copy=res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy).catch(function(){}); });
        }
        return res;
      }).catch(function(){
        /* 오프라인일 때만 저장본 */
        return caches.match(e.request, {ignoreSearch:true}).then(function(hit){
          return hit || caches.match("./index.html", {ignoreSearch:true});
        });
      })
    );
    return;
  }
  /* 그림 같은 것은 저장본 먼저 */
  e.respondWith(
    caches.match(e.request).then(function(hit){
      if(hit) return hit;
      return fetch(e.request).then(function(res){
        if(res && res.ok){
          var copy=res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy).catch(function(){}); });
        }
        return res;
      });
    })
  );
});

self.addEventListener("message", function(e){
  if(e.data === "flush"){
    caches.keys().then(function(ks){ return Promise.all(ks.map(function(k){ return caches.delete(k); })); });
  }
});
