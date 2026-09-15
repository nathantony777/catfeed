/* 两台设备各记各的，合并之后一条都不能少；令牌一个字节都不许出现在同步出去的东西里。 */
const {repoNew,device,ok,done,wait,CFG,cfg,D,dt,dty,yj,ys}=require("./gh.js");

(async()=>{
  const repo=repoNew();
  console.log("【手机】记了 09-14 三顿 + 一条疫苗");
  const A=device("手机",repo,{ "catfeed.v3":D({
    upd:1000, marks:{[dt("09-14")]:{a0:1,a1:1,b0:1}},
    wa:{[dt("09-14")]:5.0}, wb:{}, notes:{[dt("09-14")]:[{t:"疫苗",c:"b",x:"三联第一针",at:1000}]}
  })}, CFG);
  ok("手机上脚本跑通", !A.threw, A.threw?A.threw.message:"");
  await wait(300);
  ok("两个文件都推上去了", !!(repo.files["settings.json"]&&repo.files[yj()]),
     Object.keys(repo.files).join(", "));

  console.log("\n【电脑】从没同步过，本地只有 09-15 自己那条");
  const B=device("电脑",repo,{ "catfeed.v3":D({
    upd:900, marks:{[dt("09-15")]:{a0:1}}, wa:{}, wb:{},
    notes:{[dt("09-15")]:[{t:"看病",c:"a",x:"复查",at:900}]}
  })}, CFG);
  await wait(300);
  const b=JSON.parse(B.store["catfeed.v3"]);
  ok("手机那天的疫苗拉下来了", (b.notes[dt("09-14")]||[]).length===1);
  ok("电脑自己那条没被冲掉", (b.notes[dt("09-15")]||[]).length===1);
  ok("两天的打勾都在", Object.keys(b.marks).includes(dt("09-14"))&&Object.keys(b.marks).includes(dt("09-15")),
     Object.keys(b.marks).sort().join(" "));

  console.log("\n【手机再开】应该把电脑那天也拉回来");
  const A2=device("手机2",repo,A.store,cfg({pulled:[ys()]}));
  await wait(300);
  const a2=JSON.parse(A2.store["catfeed.v3"]);
  ok("两条记事都在手机上了",
     (a2.notes[dt("09-14")]||[]).length===1&&(a2.notes[dt("09-15")]||[]).length===1);
  ok("体重也跟过来了", a2.wa[dt("09-14")]===5.0, JSON.stringify(a2.wa));

  console.log("\n【令牌】只能待在这台设备上");
  const dump=JSON.stringify(repo.files);
  const decoded=Object.values(repo.files).map(f=>Buffer.from(f.content,"base64").toString()).join("");
  ok("仓库里没有令牌", dump.indexOf("TESTONLY")<0);
  ok("解开 base64 之后也没有", decoded.indexOf("TESTONLY")<0);
  ok("本地那份数据 D 里没有", A2.store["catfeed.v3"].indexOf("TESTONLY")<0);
  ok("令牌只在 catfeed.gh 这个单独的键里", A2.store["catfeed.gh"].indexOf("TESTONLY")>=0);

  done("合并与令牌");
})();
