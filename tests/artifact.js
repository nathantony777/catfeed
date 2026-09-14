/* claude.ai 里的那一版：平台挡住所有外部请求，所以同步那张卡必须是关着的、
   而且脚本压根不能去碰它。这里用同一份 index.html，只是把环境换成"有 claude.use"。 */
const {HTML,device,ok,done,wait}=require("./gh.js");

(async()=>{
  const boom=async()=>{ throw new Error("在 claude.ai 里不该发任何外部请求！"); };
  const A=device("artifact",null,{},null,{
    fetch:boom, origin:"https://claude.ai",
    claude:{use:async()=>null},          /* 有 claude.use ⇒ 代码认定自己不是自己托管的 */
  });
  await wait(400);
  ok("脚本跑通（发了请求就会抛异常）", !A.threw, A.threw?A.threw.message:"");
  ok("静态 HTML 里同步卡就是 hidden", /<section class="card" id="ghcard" hidden>/.test(HTML));
  ok("脚本压根没碰过同步卡", A.bag.ghcard===undefined,
     A.bag.ghcard?("碰了，hidden="+A.bag.ghcard.hidden):"");
  ok("连接钮没被绑事件", A.bag.ghgo===undefined);
  ok("首页照常渲染", !!(A.bag.wkno&&A.bag.wkno.textContent), A.bag.wkno&&A.bag.wkno.textContent);
  done("claude.ai 那一版必须完全不联网");
})();
