/* 测试台：拿【真的 index.html 里的那段脚本】跑两台假设备 + 一个假 GitHub。
   不是重写一份逻辑来测 —— 重写的那份跟线上跑的不是同一段代码，测了也不算数。

   假 GitHub 实现了真 Contents API 的关键语义：base64、sha、sha 对不上就 409。
   repo.down=true 断网 · repo.status=401 强制某个状态码 · repo.failNextPut 强制一次冲突。 */
const fs=require("fs"), vm=require("vm"), path=require("path");

const HTML=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
const i0=HTML.indexOf("<script>\n(function(){");
const CODE=HTML.slice(i0+8, HTML.indexOf("\n</script>", i0));

/* ── 每条检查都要能让退出码非零，否则这套东西就是个只会打勾的摆设 ── */
const checks=[];
function ok(name,pass,detail){
  checks.push({name,pass:!!pass});
  console.log("   "+(pass?"✓":"✗")+" "+name+(detail!==undefined?"   "+detail:""));
  return !!pass;
}
function done(title){
  const bad=checks.filter(c=>!c.pass);
  console.log("");
  if(bad.length){ console.log("✗ "+title+"："+bad.length+"/"+checks.length+" 项没过 —— "+bad.map(c=>c.name).join("、")); }
  else console.log("✓ "+title+"："+checks.length+" 项全过");
  process.exit(bad.length?1:0);
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));

/* 把"今天"钉死。页面每打开一次就给当天建个空格子，所以"一共几天"这类断言
   会随真实日历变 —— 2026-09-14 写的测试第二天就红了，而代码一个字没改。
   跟代码无关却会红的闸，人两次之后就开始无视它，比没有还坏。
   只冻结 new Date()（决定"今天"），不动 Date.now() —— 那个是时间戳，
   合并要靠它比大小，冻了会把"谁更新"全变成平局。
   想验日期无关性：CATFEED_TEST_TODAY=2027-01-01 node tests/run.js */
const FROZEN=process.env.CATFEED_TEST_TODAY||"2026-09-14";
function frozenDateClass(){
  const T=new Date(FROZEN+"T08:00:00").getTime();
  return new Proxy(Date,{
    construct(Target,args){ return args.length?new Target(...args):new Target(T); }
  });
}
/* 测试里的日期一律从冻结的"今天"推出来，不写死年份 ——
   同步按年分文件、平时只管当年，所以把数据种在别的年份等于在考另一回事。
   dt("09-14")＝今年9月14 · dty(1,"03-02")＝明年3月2 · yj()＝今年那个 json */
const Y=+FROZEN.slice(0,4);
const dt=md=>Y+"-"+md;
const dty=(n,md)=>(Y+n)+"-"+md;
const yj=(n)=>(Y+(n||0))+".json";
const ys=(n)=>String(Y+(n||0));
const plain=s=>String(s).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
const dec=f=>JSON.parse(Buffer.from(f.content,"base64").toString());
/* 一眼假的令牌 —— 测试数据永远不用真值 */
const CFG={repo:"nathan/catfeed-data",tok:"github_pat_TESTONLY_000",on:1,pulled:[]};
const cfg=o=>Object.assign({},CFG,o||{});
const D=o=>JSON.stringify(Object.assign({start:dt("09-14")},o));

/* ── 假 GitHub Contents API ── */
function repoNew(){ return {files:{}, log:[], failNextPut:null, status:null}; }
function sha(s){ return require("crypto").createHash("sha1").update(s).digest("hex"); }
function makeFetch(repo, tag){
  return async function(url, opt){
    opt=opt||{};
    const m=/repos\/([^/]+\/[^/]+)\/contents\/([^?]+)/.exec(url);
    if(!m) throw new TypeError("bad url");
    const p=decodeURIComponent(m[2]);
    if(repo.down) throw new TypeError("Failed to fetch");
    if(repo.status){ const st=repo.status; return {ok:false,status:st,json:async()=>({})}; }
    const auth=(opt.headers||{})["Authorization"]||"";
    if(!/^Bearer .+/.test(auth)) return {ok:false,status:401,json:async()=>({})};
    if(opt.method==="PUT"){
      const body=JSON.parse(opt.body), cur=repo.files[p];
      if(repo.failNextPut===p){ repo.failNextPut=null; return {ok:false,status:409,json:async()=>({})}; }
      if(cur && cur.sha!==body.sha) return {ok:false,status:409,json:async()=>({})};
      if(!cur && body.sha) return {ok:false,status:422,json:async()=>({})};
      const s=sha(body.content+Math.random());
      repo.files[p]={content:body.content, sha:s};
      repo.log.push(tag+" PUT "+p);
      return {ok:true,status:200,json:async()=>({content:{sha:s}})};
    }
    const f=repo.files[p];
    repo.log.push(tag+" GET "+p+(f?"":" (404)"));
    if(!f) return {ok:false,status:404,json:async()=>({})};
    return {ok:true,status:200,json:async()=>({sha:f.sha,content:f.content,encoding:"base64"})};
  };
}

/* ── 一台"设备"：一份独立的 localStorage + 一份独立的假 DOM ── */
function device(name, repo, seed, ghcfg, opt){
  opt=opt||{};
  const store=Object.assign({}, seed||{});
  if(ghcfg) store["catfeed.gh"]=JSON.stringify(ghcfg);
  const bag={};
  function El(id){ const e={id,innerHTML:"",textContent:"",value:"",hidden:true,type:"",
    className:"",style:{},_l:{},
    addEventListener(ev,fn){ (e._l[ev]=e._l[ev]||[]).push(fn); },
    getAttribute(){return null;}, setAttribute(){}, closest(){return null;},
    focus(){}, select(){}, click(){ return fire(id,"click"); },
    get children(){return [];} };
    return e; }
  function get(id){ return bag[id]||(bag[id]=El(id)); }
  function fire(id,ev,arg){ const e=get(id); const ls=e._l[ev]||[];
    return Promise.all(ls.map(f=>f.call(e,arg||{target:e,preventDefault(){}}))); }
  const ctx={
    console, setTimeout, clearTimeout, setInterval:()=>0, clearInterval:()=>0,
    Promise, Date:frozenDateClass(), Math, JSON, Object, Array, String, Number, RegExp, Error,
    isNaN, parseFloat, parseInt,
    TextEncoder, TextDecoder, btoa, atob, URL, Uint8Array,
    fetch: opt.fetch || makeFetch(repo,name),
    localStorage:{ getItem:k=>(k in store?store[k]:null),
                   setItem:(k,v)=>{store[k]=String(v);}, removeItem:k=>{delete store[k];} },
    navigator:{}, location:{origin: opt.origin || "https://x.github.io"},
    document:{ getElementById:get, querySelector:()=>null, querySelectorAll:()=>[],
      addEventListener(){}, visibilityState:"visible", activeElement:null,
      createElement:()=>({style:{},setAttribute(){},click(){},appendChild(){},remove(){}}),
      body:{appendChild(){},removeChild(){}} },
  };
  if(opt.claude) ctx.claude=opt.claude;      /* 有 claude.use ⇒ 代码认为自己在 claude.ai 里 */
  ctx.window=ctx; ctx.globalThis=ctx;
  vm.createContext(ctx);
  let threw=null;
  try{ vm.runInContext(CODE, ctx, {filename:name+".js"}); }catch(e){ threw=e; }
  return {name, store, bag, get, fire, threw, ctx};
}
module.exports={HTML, CODE, FROZEN, Y, dt, dty, yj, ys, repoNew, device, makeFetch, ok, done, wait, plain, dec, CFG, cfg, D};
