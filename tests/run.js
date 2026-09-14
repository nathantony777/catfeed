/* 一条命令跑完全部：node tests/run.js
   有任何一条没过，整个命令的退出码就是 1 —— 这样它才是道闸，不是打勾机。 */
const {spawnSync}=require("child_process"), path=require("path");
const TESTS=[
  ["merge",    "两台设备合并不丢数据 · 令牌不外泄"],
  ["emptyday", "空格子不许吃掉另一台的记录"],
  ["edge",     "离线一周 / 写冲突 / 坏令牌 / 断网 / 白写"],
  ["connect",  "连接 · 多年份 · 自动推送"],
  ["artifact", "claude.ai 那一版完全不联网"],
];
let bad=[];
for(const [f,desc] of TESTS){
  console.log("\n══════════ "+f+" —— "+desc+" ══════════");
  const r=spawnSync(process.execPath,[path.join(__dirname,f+".js")],{stdio:"inherit"});
  if(r.status!==0) bad.push(f);
}
console.log("\n──────────────────────────────");
if(bad.length){ console.log("✗ 没过："+bad.join("、")); process.exit(1); }
console.log("✓ "+TESTS.length+" 组全过");
