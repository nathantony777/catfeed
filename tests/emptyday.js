/* 2026-09-14 真实踩过的坑：render() 里的 mk(cur) 每开一次页面就给当天建个空格子，
   它被同步上去后，另一台设备会把它当成"我这天有数据"，于是按时间戳去抢 ——
   抢赢了就把对方真记的那顿抹掉。这个文件就是那次的复现，别删。 */
const {repoNew,device,ok,done,wait,dec,CFG,cfg,D,dt,dty,yj,ys}=require("./gh.js");

(async()=>{
  const repo=repoNew();

  console.log("【手机】09-20 记了早饭和晚饭");
  device("手机",repo,{ "catfeed.v3":D({
    upd:1000, marks:{[dt("09-20")]:{a0:1,a1:1}}, wa:{}, wb:{}, notes:{}, years:[ys()]
  })}, CFG);
  await wait(300);
  ok("云端存着手机那两顿", JSON.stringify(dec(repo.files[yj()]).marks[dt("09-20")])==='{"a0":1,"a1":1}');

  console.log("\n【电脑】09-20 只是打开看了一眼没点，后来在 09-21 点了一顿（所以时间戳更新）");
  device("电脑",repo,{ "catfeed.v3":D({
    upd:5000,
    marks:{[dt("09-20")]:{}, [dt("09-21")]:{a0:1}},   /* 09-20 就是那个空格子 */
    wa:{}, wb:{}, notes:{}, years:[ys()]
  })}, cfg({pulled:[ys()]}));
  await wait(400);
  ok("空格子没把手机那两顿盖掉",
     JSON.stringify(dec(repo.files[yj()]).marks[dt("09-20")])==='{"a0":1,"a1":1}',
     JSON.stringify(dec(repo.files[yj()]).marks[dt("09-20")]));

  console.log("\n【体重】判空只能对「对象」生效 —— Object.keys(5.02) 也是空的");
  const C=device("秤",repo,{ "catfeed.v3":D({
    upd:9000, marks:{}, wa:{[dt("09-18")]:5.02,[dt("09-25")]:4.96}, wb:{[dt("09-18")]:2.9},
    notes:{}, years:[ys()]
  })}, cfg({pulled:[ys()]}));
  await wait(400);
  const r=dec(repo.files[yj()]);
  ok("三条体重一条没被当成空格子删掉",
     r.wa[dt("09-18")]===5.02&&r.wa[dt("09-25")]===4.96&&r.wb[dt("09-18")]===2.9,
     JSON.stringify(r.wa)+JSON.stringify(r.wb));

  console.log("\n【新设备】全空的机器连上来");
  const F=device("新设备",repo,{"catfeed.v3":D({upd:1,marks:{},wa:{},wb:{},notes:{},years:[ys()]})},cfg());
  await wait(400);
  const f=JSON.parse(F.store["catfeed.v3"]);
  ok("体重拉下来了", f.wa[dt("09-18")]===5.02);
  ok("09-20 那两顿也拉下来了", Object.keys(f.marks[dt("09-20")]||{}).length===2);

  const empties=Object.entries(dec(repo.files[yj()]).marks||{})
    .filter(([,v])=>Object.keys(v).length===0).map(([k])=>k);
  ok("云端一个空格子都没留下", empties.length===0, empties.join(","));

  done("空格子不许吃掉记录");
})();
