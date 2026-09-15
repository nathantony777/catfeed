/* 六种容易出事的情况：离线一周、写冲突、坏令牌、仓库写错、断网、什么都没改。 */
const {repoNew,device,ok,done,wait,plain,dec,CFG,cfg,D,dt,dty,yj,ys}=require("./gh.js");

(async()=>{
console.log("【1】离线一周的电脑回来，会不会把手机这一周抹掉");
const r1=repoNew();
const week={}; for(let i=14;i<=21;i++) week[dt("09-"+i)]={a0:1,a1:1,a2:1};
device("手机",r1,{ "catfeed.v3":D({upd:9000,marks:week,wa:{},wb:{},notes:{}}) },cfg({pulled:[ys()]}));
await wait(250);
const stale=device("旧电脑",r1,{ "catfeed.v3":D({upd:100,marks:{[dt("09-14")]:{a0:9}},wa:{},wb:{},notes:{}}) },cfg({pulled:[ys()]}));
await wait(250);
const eight=[];for(let i=14;i<=21;i++) eight.push(dt("09-"+i));
const sm=JSON.parse(stale.store["catfeed.v3"]).marks;
ok("合并后本地 8 天一天没丢", eight.every(d=>sm[d]&&sm[d].a0===1), Object.keys(sm).sort().join(" "));
const back=dec(r1.files[yj()]).marks;
ok("推回云端也还是 8 天", eight.every(d=>back[d]&&back[d].a0===1), Object.keys(back).sort().join(" "));
ok("09-14 听新的那台的", back[dt("09-14")].a0===1, JSON.stringify(back[dt("09-14")]));

console.log("\n【2】写到一半被另一台抢先（HTTP 409）");
const r2=repoNew();
device("甲",r2,{ "catfeed.v3":D({upd:5000,marks:{[dt("09-14")]:{a0:1}},wa:{},wb:{},notes:{}}) },cfg({pulled:[ys()]}));
await wait(250);
r2.failNextPut=yj();                       /* 下一次写这个文件必冲突 */
const n=r2.log.length;
const d2=device("乙",r2,{ "catfeed.v3":D({upd:6000,marks:{[dt("09-20")]:{b0:1}},wa:{},wb:{},notes:{}}) },cfg({pulled:[ys()]}));
await wait(350);
const f2=dec(r2.files[yj()]).marks;
ok("冲突之后两天都还在", !!(f2[dt("09-14")]&&f2[dt("09-20")]), plain(d2.get("ghstat").innerHTML));
ok("确实重试了一次", r2.log.slice(n).filter(x=>x.indexOf("PUT "+yj())>=0).length>=1,
   r2.log.slice(n).filter(x=>x.indexOf(yj())>=0).join(" | "));

console.log("\n【3】令牌是错的（401）—— 必须老实说，不许还写着开着");
const r3=repoNew(); r3.status=401;
const d3=device("坏钥匙",r3,{ "catfeed.v3":D({upd:1,marks:{[dt("09-14")]:{a0:1}},wa:{},wb:{},notes:{}}) },cfg({pulled:[ys()]}));
await wait(250);
ok("顶上改回了「没连」", d3.get("ghm").textContent==="没连", d3.get("ghm").textContent);
ok("状态栏说人话", /令牌/.test(plain(d3.get("ghstat").innerHTML)), plain(d3.get("ghstat").innerHTML));
ok("坏令牌从本机删掉了", JSON.parse(d3.store["catfeed.gh"]).tok==="");
ok("本地记录没被动", Object.keys(JSON.parse(d3.store["catfeed.v3"]).marks).length===1);

console.log("\n【4】仓库名写错（404）");
const r4=repoNew(); r4.status=404;
const d4=device("找不着",r4,{ "catfeed.v3":D({upd:1,marks:{},wa:{},wb:{},notes:{}}) },cfg({pulled:[ys()]}));
await wait(250);
ok("状态栏点名是仓库的问题", /仓库/.test(plain(d4.get("ghstat").innerHTML)), plain(d4.get("ghstat").innerHTML));

console.log("\n【5】断网 —— 数据不能丢，也不能自动把人踢下线");
const r5=repoNew(); r5.down=true;
const d5=device("断网",r5,{ "catfeed.v3":D({upd:7000,marks:{[dt("09-14")]:{a0:1}},wa:{},wb:{},notes:{}}) },cfg({pulled:[ys()]}));
await wait(250);
ok("本地记录还在", Object.keys(JSON.parse(d5.store["catfeed.v3"]).marks).length===1);
ok("没被自动断开（网络问题过会儿自己就好）", !!JSON.parse(d5.store["catfeed.gh"]).on,
   plain(d5.get("ghstat").innerHTML));

console.log("\n【6】开两次页面、什么都没改 —— 不许白记一次 commit");
const r6=repoNew();
const s6={ "catfeed.v3":D({upd:8000,marks:{[dt("09-14")]:{a0:1}},wa:{},wb:{},notes:{}}) };
const e1=device("第一次",r6,s6,cfg({pulled:[ys()]})); await wait(250);
const puts1=r6.log.filter(x=>x.includes("PUT")).length;
device("第二次",r6,e1.store,JSON.parse(e1.store["catfeed.gh"])); await wait(250);
const puts2=r6.log.filter(x=>x.includes("PUT")).length-puts1;
ok("第一次写了文件", puts1>0, puts1+" 个");
ok("第二次一个都没写", puts2===0, puts2+" 个");

done("六种极端情况");
})();
