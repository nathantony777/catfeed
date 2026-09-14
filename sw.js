/* 离线用。先走网络（这样你改了就能看到新版），断网再回缓存。 */
var C="catfeed-v3";   /* 换了图标 —— 缓存名必须跟着变，不然装过的设备还是旧图 */
var CORE=["./","./index.html","./icon-180.png","./icon-512.png","./manifest.webmanifest"];
self.addEventListener("install",function(e){
  e.waitUntil(caches.open(C).then(function(c){return c.addAll(CORE);})
    .then(function(){return self.skipWaiting();}).catch(function(){}));
});
self.addEventListener("activate",function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.map(function(k){ return k===C?null:caches.delete(k); }));
  }).then(function(){return self.clients.claim();}));
});
self.addEventListener("fetch",function(e){
  if(e.request.method!=="GET") return;
  /* 只管本站自己的文件。GitHub 那些接口绝不能缓存 ——
     缓存一份旧的回来，同步就会拿着过期数据去合并，而且【一声不吭】。 */
  if(new URL(e.request.url).origin!==self.location.origin) return;
  e.respondWith(
    fetch(e.request).then(function(r){
      var cp=r.clone();
      caches.open(C).then(function(c){ c.put(e.request,cp); }).catch(function(){});
      return r;
    }).catch(function(){
      return caches.match(e.request).then(function(m){ return m||caches.match("./index.html"); });
    })
  );
});
