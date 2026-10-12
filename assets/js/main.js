/* retr0x59.sec · shared logic for all pages */
(function(){
"use strict";
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const store={get(k,d){try{const v=sessionStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{sessionStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const WA="18492591279"; // À ajuster si besoin selon ton canal de contact sécurisé
const fine=matchMedia("(pointer:fine)").matches;
const root=document.documentElement;
let lang=root.dataset.lang||"en";
const t=(es,en)=>lang==="es"?es:en;
window.CDL={t:(es,en)=>t(es,en),get lang(){return lang}};

/* ---------- services (shared across home, services, and terminal) ---------- */
const SERVICES=[
 {id:"vulnerability-scanning",es:"Escaneo de vulnerabilidades",en:"Vulnerability Scanning",
  ses:"Reviso puertos, servicios y versiones expuestas de tu infraestructura y te entrego un reporte de riesgos priorizado.",sen:"Reviewing exposed ports, services, and versions across infrastructure to deliver a prioritized risk report.",
  des:"External and internal vulnerability assessments to identify potential entry points, combining automated tools with rigorous manual verification.",
  den:"External and internal vulnerability assessments to identify potential entry points, combining automated tools with rigorous manual verification.",
  inc:[["Port and service discovery"],["Version and known CVE detection"],["Manual verification of findings"],["Severity rating"]],
  ent:[["PDF report with findings"],["Prioritized action list"],["Short walkthrough of results"]],
  ideal:[["SMBs with their own servers"],["Pre-launch security assessments"]]},
 {id:"web-audit",es:"Auditoría de seguridad web",en:"Web Security Audit",
  ses:"Sitios WordPress y a medida: plugins vulnerables, archivos expuestos, enumeración de usuarios y configuraciones débiles.",sen:"WordPress and custom sites: vulnerable plugins, exposed files, user enumeration and weak configurations.",
  des:"Security assessment simulating real-world attacker techniques to uncover application flaws, misconfigurations, and sensitive data exposure.",
  den:"Security assessment simulating real-world attacker techniques to uncover application flaws, misconfigurations, and sensitive data exposure.",
  inc:[["Plugin, theme, and user enumeration"],["Exposed file and backup discovery"],["Header and TLS security review"],["Weak configuration testing"]],
  ent:[["Detailed report with proof-of-concept"],["Remediation steps for developers"],["Retest included"]],
  ideal:[["Web applications"],["Online platforms"]]},
 {id:"web-pentest",es:"Pentesting web autorizado",en:"Authorized Web Pentest",
  ses:"Pruebas manuales sobre tu aplicación: inyecciones, control de acceso, autenticación y lógica de negocio.",sen:"Manual testing of your application: injections, access control, authentication and business logic.",
  des:"In-depth penetration testing focused on uncovering deep logic flaws, authorization bypasses, and injection vulnerabilities.",
  den:"In-depth penetration testing focused on uncovering deep logic flaws, authorization bypasses, and injection vulnerabilities.",
  inc:[["Attack surface mapping"],["Injection testing (SQLi, Command, XSS)"],["Access control and IDOR validation"],["Safe impact validation"]],
  ent:[["Technical and executive report"],["Proof of concept for each finding"],["Remediation re-test"]],
  ideal:[["Startups and SaaS platforms"],["Applications handling sensitive data"]]},
 {id:"binary-analysis",es:"Análisis binario y reversing",en:"Binary Analysis & Reversing",
  ses:"Análisis de binarios y engeniería inversa de bajo nivel.",sen:"Low-level binary analysis and reverse engineering.",
  des:"Low-level analysis of compiled binaries, custom protocol evaluation, and identifying structural vulnerabilities using GDB, Pwntools, and Ghidra.",
  den:"Low-level analysis of compiled binaries, custom protocol evaluation, and identifying structural vulnerabilities using GDB, Pwntools, and Ghidra.",
  inc:[["Assembly and disassembly review"],["Static and dynamic analysis"],["Memory corruption assessment"],["Custom tooling evaluation"]],
  ent:[["Technical analysis report"],["Exploit path documentation"],["Hardening recommendations"]],
  ideal:[["Custom software developers"],["Security research projects"]]},
 {id:"hardening",es:"Hardening",en:"Server Hardening",
  ses:"Recomendaciones concretas para cerrar lo encontrado y endurecer servidores y sitios.",sen:"Concrete fixes to close findings and harden servers and sites.",
  des:"Systematic hardening of Linux environments, closing unnecessary attack vectors, and applying secure baseline configurations.",
  den:"Systematic hardening of Linux environments, closing unnecessary attack vectors, and applying secure baseline configurations.",
  inc:[["Disabling unnecessary services"],["Permission and user privilege auditing"],["Security headers and TLS tuning"],["Access control best practices"]],
  ent:[["Tailored hardening checklist"],["Implementation guidance"]],
  ideal:[["Newly deployed servers"],["Post-audit remediation"]]},
 {id:"reports",es:"Reportes de seguridad",en:"Security Reports",
  ses:"Hallazgos con evidencia, severidad y pasos de remediación que tu equipo pueda seguir.",sen:"Findings with evidence, severity and remediation steps your team can follow.",
  des:"Clear, structured reporting tailored for both technical development teams and executive leadership.",
  den:"Clear, structured reporting tailored for both technical development teams and executive leadership.",
  inc:[["Executive summary"],["Technical evidence and reproduction steps"],["Severity ranking"],["Remediation roadmaps"]],
  ent:[["Professional PDF report"],["Editable format upon request"]],
  ideal:[["Internal security reviews"],["Compliance preparation"]]},
 {id:"low-level-dev",es:"Desarrollo bajo nivel",en:"Low-Level Development",
  ses:"Desarrollo en C, Python y Assembly para herramientas de seguridad.",sen:"Development in C, Python and Assembly for security tools.",
  des:"Custom script and tool development in C, Python, and Assembly to automate tasks, analyze data, and build utility exploits.",
  den:"Custom script and tool development in C, Python, and Assembly to automate tasks, analyze data, and build utility exploits.",
  inc:[["Custom exploit scripts (Python/Pwntools)"],["Low-level C utilities"],["Assembly routines"],["Automation scripts"]],
  ent:[["Source code repository"],["Documentation and usage guide"]],
  ideal:[["Custom automation needs"],["Tooling research"]]},
 {id:"systems",es:"Sistemas a
