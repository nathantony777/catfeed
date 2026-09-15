/* 连接、断开、多年份、改一笔之后自动推上去。 */
const {repoNew,device,ok,done,wait,plain,dec,cfg,D,dt,dty,yj,ys}=require("./gh.js");

(async()=>{
console.log("【A】令牌过期之后，卡片上到底写的是什么");
const r=repoNew(); r.status=401;
const d=device("坏钥匙",r,{"catfeed.v3":D({upd:1,marks:{[dt("09-14")]:{a0:1}},wa:{},wb:{},notes:{}})},cfg());
await wait(250);
ok("顶上写「没连」", d.get("ghm").textContent==="没连", d.get("ghm").textContent);
ok("重新填的表单露出来了", d.get("ghoff").hidden===false);
ok("提示里带了怎么修", /重新粘|重新填|Read and write|勾/.test(plain(d.get("ghstat").innerHTML)),
   plain(d.get("ghstat").innerHTML));

console.log("\n【B】本地攒了 "+ys()+"/"+ys(1)+"/"+ys(2)+" 三年，第一次连接");
const r2=repoNew();
const marks={}; [dt("09-14"),dty(1,"03-02"),dty(2,"11-20")].forEach(k=>marks[k]={a0:1,a1:1});
const seed={"catfeed.v3":D({upd:5000,marks,wa:{},wb:{},notes:{},years:[ys(),ys(1),ys(2)]})};
device("老用户",r2,seed,cfg());
await wait(400);
const want=[yj(),yj(1),yj(2),"settings.json"];
ok("三年全推上去了（只推当年的话，以前那些年在另一台上永远看不见）",
   want.every(k=>r2.files[k]), Object.keys(r2.files).sort().join(", "));

console.log("\n【C】一台全新的设备连同一个仓库");
const fresh=device("新设备",r2,{},cfg());
await wait(400);
const fm=JSON.parse(fresh.store["catfeed.v3"]).marks;
/* 查这三天真的在、内容也对 —— 不数总数：页面还会给"今天"建个空格子，
   数总数就变成了在考日历，不是在考代码。 */
ok("三年都拉下来了",
   [dt("09-14"),dty(1,"03-02"),dty(2,"11-20")].every(k=>fm[k]&&Object.keys(fm[k]).length===2),
   Object.keys(fm).sort().join(" "));

console.log("\n【D】随手记一条，等它自己推上去（不用手点同步）");
fresh.get("ntext").value="换了幼猫粮";
await fresh.fire("nadd","click");
await wait(3200);
const after=dec(r2.files[yj()]);
ok("云端出现了这条记事", Object.keys(after.notes||{}).length>0,
   JSON.stringify(after.notes).slice(0,120));

done("连接与自动推送");
})();
