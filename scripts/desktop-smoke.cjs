// Launch the real Electron entry point with the production frontend.
const {app, session}=require("electron");
const fs=require("node:fs");
const path=require("node:path");
fs.mkdirSync("desktop-evidence",{recursive:true});
const report={scope:"Source Electron entry with production dist assets; not installed-deb validation",errors:[]};
const timer=setTimeout(()=>{report.errors.push("Window did not render within 30s");finish(1);},30000);
let done=false;
function finish(code){
 if(done)return;done=true;clearTimeout(timer);
 fs.writeFileSync("desktop-evidence/report.json",JSON.stringify(report,null,2));
 app.exit(code);
}
app.on("browser-window-created",(_event,window)=>{
 const wc=window.webContents;
 wc.on("did-fail-load",(_e,code,desc)=>{report.errors.push({code,desc});finish(1);});
 wc.on("render-process-gone",(_e,detail)=>{report.errors.push(detail);finish(1);});
 wc.on("did-finish-load",async()=>{
  try{
   await new Promise(resolve=>setTimeout(resolve,1000));
   report.url=wc.getURL();
   report.body=await wc.executeJavaScript("document.body.innerText");
   report.rootChildren=await wc.executeJavaScript("document.getElementById('root')?.children.length || 0");
   const image=await wc.capturePage();
   fs.writeFileSync("desktop-evidence/window.png",image.toPNG());
   if(!report.rootChildren || !report.body.includes("RepoForge"))throw Error("Expected RepoForge UI did not render");
   report.rendered=true;finish(0);
  }catch(error){report.errors.push(String(error));finish(1);}
 });
});
app.whenReady().then(()=>{
 session.defaultSession.webRequest.onBeforeRequest((details,callback)=>{
  callback({cancel:/^https?:/.test(details.url)});
 });
});
require(path.join(__dirname,"..","electron","main.cjs"));
