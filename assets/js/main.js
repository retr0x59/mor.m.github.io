/* retr0x59.sec · shared logic for all pages */
(function(){
"use strict";
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const store={get(k,d){try{const v=sessionStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{sessionStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const fine=matchMedia("(pointer:fine)").matches;
const root=document.documentElement;
let lang=root.dataset.lang||"en";
const t=(es,en)=>lang==="es"?es:en;
window.CDL={t:(es,en)=>t(es,en),get lang(){return lang}};

/* ---------- nav ---------- */
const links=$("#links")||$("#nav-links");
const slug=s=>(s.split("/").pop().replace(/\.html$/,"")||"index").replace(/^index$/,"home");
const page=document.body.dataset.page||slug(location.pathname);
if(links)$$("a",links).forEach(a=>a.classList.toggle("on",(a.dataset.k||slug(a.getAttribute("href")))===page));
const menuBtn=$("#menuBtn");
if(menuBtn&&links){
 menuBtn.addEventListener("click",()=>links.classList.toggle("open"));
 links.addEventListener("click",e=>{if(e.target.closest("a"))links.classList.remove("open")});
}

/* ---------- language ---------- */
const langBtn=$("#langBtn");
function setLang(l){lang=l;root.dataset.lang=l;root.lang=l;try{localStorage.setItem("cdl-lang",l)}catch(e){}if(langBtn)langBtn.textContent=l.toUpperCase()}
if(langBtn){langBtn.textContent=lang.toUpperCase();langBtn.addEventListener("click",()=>setLang(lang==="en"?"es":"en"))}

/* ---------- effects ---------- */
const rvs=$$(".rv");
if(rvs.length&&"IntersectionObserver" in window&&!matchMedia("(prefers-reduced-motion:reduce)").matches){
 const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.remove("pre");io.unobserve(e.target)}}),{rootMargin:"0px 0px -8% 0px"});
 rvs.forEach(el=>{el.classList.add("pre");io.observe(el)});
}
if(fine){
 $$(".spot").forEach(el=>el.addEventListener("pointermove",e=>{const r=el.getBoundingClientRect();el.style.setProperty("--mx",e.clientX-r.left+"px");el.style.setProperty("--my",e.clientY-r.top+"px")}));
 $$(".mag").forEach(b=>{
  b.addEventListener("pointermove",e=>{const r=b.getBoundingClientRect();b.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.2}px,${(e.clientY-r.top-r.height/2)*.3}px)`});
  b.addEventListener("pointerleave",()=>b.style.transform="");
 });
}
$$(".glitch").forEach(g=>{
 const zap=()=>{g.classList.remove("gx");void g.offsetWidth;g.classList.add("gx")};
 g.addEventListener("mouseenter",zap);setTimeout(zap,600);setInterval(zap,6000);
});

/* ---------- feedback form (about) ---------- */
const tBtn=$("#tBtn"),tForm=$("#tForm");
if(tBtn&&tForm){
 tBtn.addEventListener("click",()=>{tForm.hidden=!tForm.hidden;if(!tForm.hidden)$("#tName").focus()});
 tForm.addEventListener("submit",e=>{
  e.preventDefault();tForm.reset();
  const n=$("#tNote");
  if(n)n.textContent=t("Modo vista previa: el mensaje no se envió a ningún servidor.","Preview mode: the message was not sent to any server.");
 });
}

/* ---------- terminal dock ---------- */
const tdock=$("#tdock"),tOut=$("#tOut"),tIn=$("#tIn"),tboot=$("#tboot"),tvBtn=$("#tvBtn");
if(tdock&&tOut&&tIn){
 const print=(txt,cls="o")=>{const d=document.createElement("div");d.className=cls;d.textContent=txt;tOut.appendChild(d);tOut.scrollTop=tOut.scrollHeight};
 const pages=()=>links?$$("a",links).map(a=>a.getAttribute("href")):[];
 const setH=h=>{h=Math.max(180,Math.min(innerHeight-90,h));root.style.setProperty("--th",h+"px");return h};
 const hist=[];let hi=0;
 const CMDS={
  help(){print("help  whoami  skills  ls  open <page>  lang  date  clear  exit","y")},
  whoami(){print("retr0x59 · "+t("seguridad ofensiva, pentesting, desarrollo de bajo nivel y reversing","offensive security, pentesting, low-level development and reversing"))},
  skills(){["Recon     : Nmap, ffuf, dig, smbclient, Wireshark","Web       : Burp Suite, sqlmap, curl, OWASP ZAP","Low-level : GDB, pwndbg, GEF, Pwntools, Ghidra, IDA","Languages : C, Assembly x86/x64, Python, Bash"].forEach(l=>print(l))},
  ls(){print(pages().join("  ")||"index.html")},
  open(p){
   if(!p)return print(t("uso: open <página>","usage: open <page>"),"y");
   const f=pages().find(h=>h===p||h===p+".html");
   if(!f)return print(t("página no encontrada: ","no such page: ")+p,"r");
   location.href=f;
  },
  lang(){setLang(lang==="en"?"es":"en");print("lang = "+lang,"g")},
  date(){print(new Date().toString())},
  clear(){tOut.textContent=""},
  exit(){closeT()}
 };
 CMDS.cd=CMDS.open;
 const run=line=>{
  print("└─$ "+line,"c");
  const [cmd,...args]=line.trim().split(/\s+/);
  if(!cmd)return;
  hist.push(line);hi=hist.length;
  if(Object.prototype.hasOwnProperty.call(CMDS,cmd))CMDS[cmd](args[0]);
  else print(cmd+": "+t("comando no encontrado (prueba 'help')","command not found (try 'help')"),"r");
 };
 function openT(user){
  tdock.hidden=false;document.body.classList.add("tv-open");store.set("cdl-tv",1);
  if(!tOut.childElementCount)print(t("Escribe 'help' para ver los comandos.","Type 'help' to list commands."),"g");
  if(!user)return;
  if(!tboot)return tIn.focus();
  tboot.textContent="[ OK ] mounting /dev/tty0\n[ OK ] session retr0x59@kali\n[ OK ] shell ready";
  tboot.hidden=false;setTimeout(()=>{tboot.hidden=true;tIn.focus()},600);
 }
 function closeT(){tdock.hidden=true;document.body.classList.remove("tv-open");store.set("cdl-tv",0)}
 setH(store.get("cdl-th",320));
 if(tvBtn)tvBtn.addEventListener("click",()=>tdock.hidden?openT(true):closeT());
 tIn.addEventListener("keydown",e=>{
  if(e.key==="Enter"){run(tIn.value);tIn.value=""}
  else if(e.key==="ArrowUp"&&hi>0){tIn.value=hist[--hi];e.preventDefault()}
  else if(e.key==="ArrowDown"){tIn.value=hist[++hi]||"";hi=Math.min(hi,hist.length)}
  else if(e.key==="Escape")closeT();
 });
 tOut.addEventListener("click",()=>{if(!String(getSelection()))tIn.focus()});
 const grip=$("#grip");
 if(grip)grip.addEventListener("pointerdown",e=>{
  e.preventDefault();grip.setPointerCapture(e.pointerId);
  const mv=ev=>store.set("cdl-th",setH(innerHeight-ev.clientY));
  const up=()=>{grip.removeEventListener("pointermove",mv);grip.removeEventListener("pointerup",up)};
  grip.addEventListener("pointermove",mv);grip.addEventListener("pointerup",up);
 });
 if(store.get("cdl-tv",0))openT(false);
}

/* ---------- Selene (portfolio assistant) ---------- */
const bot=$("#bot"),botBtn=$("#botBtn"),botMsgs=$("#botMsgs"),botChips=$("#botChips");
if(bot&&botBtn&&botMsgs&&botChips){
 const QA=[
  {q:["¿Quién es retr0x59?","Who is retr0x59?"],a:["Un practicante de seguridad ofensiva centrado en pentesting, desarrollo de bajo nivel y análisis binario.","An offensive security practitioner focused on penetration testing, low-level development and binary analysis."]},
  {q:["¿Qué herramientas usa?","What tools does he use?"],a:["GDB, GEF, Pwntools, Ghidra, Nmap y Burp Suite, con C, Python y Assembly x86/x64 sobre Linux.","GDB, GEF, Pwntools, Ghidra, Nmap and Burp Suite, with C, Python and Assembly x86/x64 on Linux."]},
  {q:["¿En qué trabaja ahora?","What is he working on?"],a:["Preparando la certificación HTB CPTS y practicando en Hack The Box, pwn.college y OST2.","Preparing the HTB CPTS certification and practicing on Hack The Box, pwn.college and OST2."]}
 ];
 const say=(txt,who)=>{const d=document.createElement("div");d.className="m "+who;d.textContent=txt;botMsgs.appendChild(d);botMsgs.scrollTop=botMsgs.scrollHeight};
 const chips=()=>{
  botChips.textContent="";
  QA.forEach(x=>{
   const b=document.createElement("button");b.type="button";b.textContent=t(x.q[0],x.q[1]);
   b.addEventListener("click",()=>{say(b.textContent,"me");setTimeout(()=>say(t(x.a[0],x.a[1]),"it"),250)});
   botChips.appendChild(b);
  });
 };
 botBtn.addEventListener("click",()=>{
  bot.hidden=!bot.hidden;
  if(bot.hidden)return;
  chips();
  if(!botMsgs.childElementCount)say(t("Hola, soy Selene. Elige una pregunta.","Hi, I'm Selene. Pick a question."),"it");
 });
 const botX=$("#botX");
 if(botX)botX.addEventListener("click",()=>{bot.hidden=true});
}
})();
