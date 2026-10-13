/* retr0x59 · shared logic for all pages */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const storage = area => ({
    get(k, d) { try { const v = area().getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { area().setItem(k, JSON.stringify(v)); } catch (e) {} }
  });
  const store = storage(() => sessionStorage);   // per tab
  const disk = storage(() => localStorage);      // survives visits
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  const NAME = "retr0x59";

  const hex = n => n.toString(16).padStart(2, "0");
  const ascii = n => (n >= 32 && n < 127 ? String.fromCharCode(n) : ".");

  /* ---------- accent theme (unlocked from the shell) ---------- */
  const THEMES = ["amber", "green", "red", "ice"];
  const setTheme = t => {
    if (t === "amber") delete root.dataset.theme; else root.dataset.theme = t;
    disk.set("rx-theme", t);
    dispatchEvent(new Event("rx-theme"));
  };
  if (THEMES.includes(disk.get("rx-theme", "amber"))) setTheme(disk.get("rx-theme", "amber"));

  /* ---------- status bar ---------- */
  const wins = $("#wins");
  const page = document.body.dataset.page;
  if (wins) $$("a", wins).forEach(a => a.classList.toggle("on", a.dataset.k === page));

  const clock = $("#clock");
  if (clock) {
    const tick = () => { clock.textContent = new Date().toTimeString().slice(0, 5); };
    tick();
    setInterval(tick, 20000);
  }

  // instruction pointer: follows the scroll position
  const rip = $("#rip");
  if (rip) {
    const step = () => { rip.textContent = "rip 0x" + (0x401000 + Math.round(scrollY)).toString(16); };
    step();
    addEventListener("scroll", step, { passive: true });
  }

  /* ---------- memory field: the pointer reads and rewrites the bytes behind the page ---------- */
  {
    const CW = 30, CH = 20, R = 130, FONT = '11px "IBM Plex Mono", ui-monospace, monospace';
    const base = document.createElement("canvas"), hot = document.createElement("canvas");
    base.className = hot.className = "memfx";
    base.setAttribute("aria-hidden", "true");
    hot.setAttribute("aria-hidden", "true");
    document.body.prepend(base, hot);
    const bg = base.getContext("2d"), fg = hot.getContext("2d");
    const acc = () => getComputedStyle(root).getPropertyValue("--acc").trim() || "255, 176, 0";
    let W = 0, H = 0, dpr = 1, cols = 0, rows = 0, val, en, raf = 0, waves = [];

    const prep = g => { g.setTransform(dpr, 0, 0, dpr, 0, 0); g.font = FONT; g.textBaseline = "top"; };
    const paintBase = i => {
      const x = (i % cols) * CW, y = Math.floor(i / cols) * CH;
      bg.clearRect(x, y, CW, CH);
      bg.fillText(hex(val[i]), x + 7, y + 4);
    };
    const drawBase = () => {
      prep(bg);
      bg.clearRect(0, 0, W, H);
      bg.fillStyle = "rgba(" + acc() + ", .05)";
      for (let i = 0; i < val.length; i++) bg.fillText(hex(val[i]), (i % cols) * CW + 7, Math.floor(i / cols) * CH + 4);
    };
    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth;
      H = innerHeight;
      [base, hot].forEach(cv => { cv.width = W * dpr; cv.height = H * dpr; });
      cols = Math.ceil(W / CW);
      rows = Math.ceil(H / CH);
      val = new Uint8Array(cols * rows).map(() => Math.random() * 256 | 0);
      en = new Float32Array(cols * rows);
      drawBase();
    };

    const frame = () => {
      raf = 0;
      prep(fg);
      fg.clearRect(0, 0, W, H);
      const a = acc();
      // a click sends a wave that overwrites what it crosses with 0x90 (NOP)
      waves = waves.filter(w => (w.r += 10) < w.max);
      for (const w of waves) {
        for (let i = 0; i < val.length; i++) {
          const d = Math.hypot((i % cols) * CW + CW / 2 - w.x, Math.floor(i / cols) * CH + CH / 2 - w.y);
          if (Math.abs(d - w.r) < CW / 2) { en[i] = .7; val[i] = 0x90; paintBase(i); }
        }
      }
      let live = waves.length > 0;
      for (let i = 0; i < en.length; i++) {
        const e = en[i];
        if (e < .02) { en[i] = 0; continue; }
        live = true;
        fg.fillStyle = e > .85 ? "rgba(79, 214, 196, " + e * .8 + ")" : "rgba(" + a + ", " + (.05 + e * e * .45) + ")";
        fg.fillText(hex(val[i]), (i % cols) * CW + 7, Math.floor(i / cols) * CH + 4);
        en[i] = e * .94;
      }
      if (live) raf = requestAnimationFrame(frame);
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };

    // address + value under the pointer, shown in the status bar
    const mem = document.createElement("span");
    mem.className = "rip mem";
    mem.setAttribute("aria-hidden", "true");
    if (rip) rip.before(mem);

    const read = (x, y) => {
      const c0 = Math.max(0, Math.floor((x - R) / CW)), c1 = Math.min(cols - 1, Math.floor((x + R) / CW));
      const r0 = Math.max(0, Math.floor((y - R) / CH)), r1 = Math.min(rows - 1, Math.floor((y + R) / CH));
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const i = r * cols + c, k = 1 - Math.hypot(c * CW + CW / 2 - x, r * CH + CH / 2 - y) / R;
        if (k <= 0) continue;
        if (k > en[i]) en[i] = k;
        if (Math.random() < .06) { val[i] = Math.random() * 256 | 0; paintBase(i); }
      }
      const at = Math.min(rows - 1, Math.floor(y / CH)) * cols + Math.min(cols - 1, Math.floor(x / CW));
      mem.textContent = "mem 0x" + (0x7ffd0000 + at).toString(16) + ": " + hex(val[at]);
      wake();
    };

    size();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawBase);
    addEventListener("resize", size);
    addEventListener("rx-theme", drawBase);
    if (!reduce) {
      addEventListener("pointermove", e => read(e.clientX, e.clientY), { passive: true });
      addEventListener("pointerdown", e => {
        waves.push({ x: e.clientX, y: e.clientY, r: 0, max: 260 });
        wake();
      }, { passive: true });
    }
  }

  /* ---------- scroll reveal ---------- */
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.remove("pre");
      io.unobserve(e.target);
    }), { rootMargin: "0px 0px -6% 0px" });
    $$(".panel").forEach(el => { el.classList.add("rv", "pre"); io.observe(el); });
  }

  /* ---------- name: decodes on load, letters map to their bytes ---------- */
  const letters = $$(".ident h1 span"), bytes = $$(".ident .bytes span");
  const scramble = (el, final, ms) => {
    if (reduce) { el.textContent = final; return; }
    const end = performance.now() + ms;
    (function spin() {
      if (performance.now() >= end) { el.textContent = final; return; }
      el.textContent = "0123456789abcdef"[Math.random() * 16 | 0];
      setTimeout(spin, 45);
    })();
  };
  letters.forEach((el, i) => {
    const by = bytes[i];
    if (!by) return;
    const ch = el.textContent, code = by.textContent, delay = 350 + i * 110;
    scramble(el, ch, delay);
    if (!reduce) { by.textContent = "??"; setTimeout(() => { by.textContent = code; }, delay); }
    el.addEventListener("pointerenter", () => scramble(el, ch, 220));
    [el, by].forEach(n => {
      n.addEventListener("pointerenter", () => { el.classList.add("hot"); by.classList.add("hot"); });
      n.addEventListener("pointerleave", () => { el.classList.remove("hot"); by.classList.remove("hot"); });
    });
  });

  /* ---------- hexdump ---------- */
  // plain-text xxd rows, used by the shell
  function xxd(text, cols = 16) {
    const data = new TextEncoder().encode(text), rows = [];
    for (let o = 0; o < data.length; o += cols) {
      const row = [...data.slice(o, o + cols)];
      rows.push(o.toString(16).padStart(8, "0") + "  " + row.map(hex).join(" ").padEnd(cols * 3 - 1) + "  |" + row.map(ascii).join("") + "|");
    }
    return rows;
  }

  // the memory panel is a small hex editor: click a cell, then type
  const dump = $("#hex");
  if (dump) {
    // the text, padded to a full row with garbage like the uninitialized bytes after a string
    const text = new TextEncoder().encode(dump.textContent.trim());
    const orig = new Uint8Array(Math.ceil(text.length / 16) * 16).map((_, i) => (i < text.length ? text[i] : Math.random() * 256 | 0));
    let data = orig.slice(), cols = 0, sel = -1, side = "b", nib = 0;
    const cell = (tag, i) => $(`${tag}[data-i="${i}"]`, dump);
    const span = (tag, i, txt) => { const s = document.createElement(tag); s.dataset.i = i; s.textContent = txt; return s; };

    const paint = () => {
      $$(".sel, .pair", dump).forEach(n => n.classList.remove("sel", "pair"));
      if (sel < 0) return;
      cell(side, sel).classList.add("sel");
      cell(side === "b" ? "i" : "b", sel).classList.add("pair");
    };
    const render = () => {
      const want = innerWidth < 700 ? 8 : 16;
      if (want === cols) return;
      cols = want;
      dump.textContent = "";
      for (let o = 0; o < data.length; o += cols) {
        const row = [...data.slice(o, o + cols)];
        const off = document.createElement("span");
        off.className = "off";
        off.textContent = o.toString(16).padStart(cols === 8 ? 4 : 8, "0");
        dump.append(off, "  ");
        row.forEach((b, j) => dump.append(span("b", o + j, hex(b)), " "));
        dump.append(" ".repeat((cols - row.length) * 3) + " |");
        row.forEach((b, j) => dump.append(span("i", o + j, ascii(b))));
        dump.append("|\n");
      }
      paint();
    };
    const select = (i, s) => {
      sel = Math.max(0, Math.min(data.length - 1, i));
      if (s) side = s;
      nib = 0;
      paint();
    };
    const write = (i, v) => {
      data[i] = v;
      cell("b", i).textContent = hex(v);
      cell("i", i).textContent = ascii(v);
    };

    dump.tabIndex = 0;
    dump.addEventListener("click", e => {
      const i = e.target.dataset && e.target.dataset.i;
      if (i !== undefined) select(+i, e.target.tagName === "B" ? "b" : "i");
    });
    dump.addEventListener("keydown", e => {
      if (sel < 0 || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (k === "ArrowRight") select(sel + 1);
      else if (k === "ArrowLeft") select(sel - 1);
      else if (k === "ArrowDown") select(sel + cols);
      else if (k === "ArrowUp") select(sel - cols);
      else if (k === "Escape") { sel = -1; paint(); }
      else if (side === "b" && /^[0-9a-f]$/i.test(k)) {
        const d = parseInt(k, 16);
        if (!nib) { write(sel, (d << 4) | (data[sel] & 15)); nib = 1; }
        else { write(sel, (data[sel] & 240) | d); select(sel + 1); }
      }
      else if (side === "i" && k.length === 1 && k.charCodeAt(0) < 127) { write(sel, k.charCodeAt(0)); select(sel + 1); }
      else return;
      e.preventDefault();
      e.stopPropagation();
    });

    const light = e => {
      $$(".hot", dump).forEach(n => n.classList.remove("hot"));
      const i = e.target.dataset && e.target.dataset.i;
      if (e.type === "pointerover" && i !== undefined) $$(`[data-i="${i}"]`, dump).forEach(n => n.classList.add("hot"));
    };
    dump.addEventListener("pointerover", light);
    dump.addEventListener("pointerleave", light);

    const reset = $("#hexReset");
    if (reset) reset.addEventListener("click", () => { data = orig.slice(); sel = -1; cols = 0; render(); });
    addEventListener("resize", render);
    render();
  }

  /* ---------- whatis: one-line description of each tool (about) ---------- */
  const whatis = $("#whatis");
  if (whatis) {
    const MAN = {
      "routing": "moving traffic between networks (routers)",
      "switching": "connecting the machines inside a network (switches, VLANs)",
      "network administration": "running, monitoring and troubleshooting a network day to day",
      "active directory": "Microsoft directory service: the users, machines and permissions of an organization",
      "exchange": "Microsoft mail and calendar server",
      "system administration": "installing, running and maintaining servers",
      "nmap": "network exploration tool and port scanner",
      "ffuf": "fast web fuzzer for directories, vhosts and parameters",
      "dig": "DNS lookup utility",
      "smbclient": "ftp-like client to access SMB/CIFS shares",
      "wireshark": "network protocol analyzer",
      "burp suite": "intercepting proxy for web application testing",
      "sqlmap": "automatic SQL injection detection and exploitation tool",
      "curl": "transfer data from or to a server",
      "owasp zap": "open-source web application scanner and proxy",
      "gdb": "the GNU debugger",
      "pwndbg": "GDB plugin for exploit development and reversing",
      "gef": "GDB Enhanced Features for exploit developers and reversers",
      "pwntools": "CTF framework and exploit development library for Python",
      "ghidra": "software reverse engineering suite with a decompiler",
      "ida": "interactive disassembler and decompiler",
      "gtfobins": "list of Unix binaries that can bypass local restrictions",
      "metasploit": "penetration testing framework",
      "impacket": "Python classes for network protocols (SMB, Kerberos, ...)",
      "hydra": "parallelized network login cracker",
      "john": "John the Ripper password cracker",
      "c": "systems programming language",
      "assembly x86/x64": "what the CPU actually runs",
      "python": "scripting and exploit automation",
      "bash": "GNU Bourne-Again SHell",
      "kali linux": "Debian-based distribution for penetration testing",
      "debian / pop!_os": "daily-driver Linux",
      "vs code": "code editor",
      "obsidian": "markdown notes and knowledge base"
    };
    $$(".ls dd span").forEach(el => {
      const name = el.textContent.trim(), desc = MAN[name.toLowerCase()];
      if (!desc) return;
      el.tabIndex = 0;
      const show = () => {
        $$(".ls dd span.on").forEach(n => n.classList.remove("on"));
        el.classList.add("on");
        whatis.textContent = "$ whatis ";
        const b = document.createElement("b");
        b.textContent = name;
        whatis.append(b, document.createElement("br"), name + " - " + desc);
      };
      ["pointerenter", "focus", "click"].forEach(ev => el.addEventListener(ev, show));
    });
  }

  /* ---------- journey: step through the stages ---------- */
  const dbg = $("#dbg");
  if (dbg) {
    const frames = $$("#frames li"), stages = $$(".stage", dbg);
    const ripAt = Math.max(0, frames.findIndex(li => li.classList.contains("now")));
    let at = -1;
    const go = i => {
      at = Math.max(0, Math.min(frames.length - 1, i));
      frames.forEach((li, j) => {
        li.classList.toggle("on", j === at);
        $("button", li).setAttribute("aria-current", j === at ? "step" : "false");
      });
      stages.forEach((st, j) => st.classList.toggle("on", j === at));
    };
    const GO = { prev: () => go(at - 1), next: () => go(at + 1), rip: () => go(ripAt) };
    dbg.classList.add("js");
    frames.forEach((li, i) => $("button", li).addEventListener("click", () => go(i)));
    const ctl = $("#ctl");
    if (ctl) {
      ctl.hidden = false;
      ctl.addEventListener("click", e => { const b = e.target.closest("[data-go]"); if (b) GO[b.dataset.go](); });
    }
    addEventListener("keydown", e => {
      if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      const k = { p: "prev", n: "next", c: "rip", ArrowUp: "prev", ArrowDown: "next" }[e.key];
      if (!k || (e.key.startsWith("Arrow") && !e.target.closest("#frames"))) return;
      e.preventDefault();
      GO[k]();
      if (e.key.startsWith("Arrow")) $("button", frames[at]).focus();
    });
    const done = frames.filter(li => li.classList.contains("done")).length;
    const bar = $("#progress");
    if (bar) {
      const w = Math.round(done / frames.length * 10);
      bar.textContent = "[" + "=".repeat(w) + "·".repeat(10 - w) + "] " + done + "/" + frames.length + " steps done";
    }
    go(ripAt);
  }

  /* ---------- shell ---------- */
  const term = $("#term"), out = $("#termOut"), input = $("#termIn"), termBtn = $("#termBtn"), ps = $("#termPs");
  if (term && out && input) {
    const inline = term.classList.contains("inline");
    const print = (txt, cls) => {
      const d = document.createElement("div");
      if (cls) d.className = cls;
      d.textContent = txt;
      out.appendChild(d);
      out.scrollTop = out.scrollHeight;
    };
    const pages = () => (wins ? $$("a", wins).map(a => a.getAttribute("href")) : []);
    const setH = h => { h = Math.max(180, Math.min(innerHeight - 90, h)); root.style.setProperty("--th", h + "px"); return h; };
    const hist = [];
    let hi = 0;

    let isRoot = disk.get("rx-root", 0) === 1;
    const prompt = () => (isRoot ? "#" : "$");
    const syncPrompt = () => { if (ps) ps.textContent = prompt(); };
    syncPrompt();

    // the crackme: the key is the name as memory stores it, the flag is xored with 0x59
    const KEY = [...new TextEncoder().encode(NAME)].map(hex).join("");
    const FLAG = [63, 53, 56, 62, 34, 55, 105, 45, 6, 42, 45, 43, 104, 41, 41, 106, 61, 36];
    const FILES = {
      "about.md": () => { CMDS.whoami(); print("more: open about", "y"); },
      "roadmap.txt": () => { CMDS.roadmap(); print("more: open journey", "y"); },
      "crackme": () => print("cat: crackme: binary file (try: strings crackme)", "r"),
      ".hint": () => print("the key is my name, the way memory stores it: 8 bytes, hex, no spaces.", "t")
    };

    const CMDS = {
      help() {
        print("help  whoami  file  skills  roadmap  ls [-a]  cat <file>  strings <file>", "y");
        print("open <page>  xxd <text>  theme  github  date  clear" + (inline ? "" : "  exit"), "y");
      },
      whoami() { print(isRoot ? "root (you earned it)" : NAME + " · learning offensive security: pentesting, low-level development, reverse engineering"); },
      file() { print(NAME + ": ELF 64-bit LSB executable, x86-64, dynamically linked, not stripped", "t"); },
      skills() {
        [
          "network    routing & switching (CCNA-level), network administration",
          "sysadmin   Active Directory, Exchange, system administration",
          "recon      Nmap, ffuf, dig, smbclient, Wireshark",
          "web        Burp Suite, sqlmap, curl, OWASP ZAP",
          "reversing  GDB, pwndbg, GEF, Pwntools, Ghidra, IDA",
          "langs      C, Assembly x86/x64, Python, Bash"
        ].forEach(l => print(l));
      },
      roadmap() {
        print("[x] Linux & low-level foundations", "g");
        print("[x] Windows foundations", "g");
        print("[x] Network administration", "g");
        print("[x] System administration", "g");
        print("[x] Binary exploitation & reverse engineering", "g");
        print("[x] Hack The Box Academy", "g");
        print("[>] HTB CPTS certification", "y");
        print("[ ] Advanced exploitation & research");
      },
      ls(args) {
        const all = args.some(a => /^-\w*a/.test(a));
        print((all ? ".hint  " : "") + "about.md  roadmap.txt  crackme*");
      },
      cat(args) {
        if (!args[0]) return print("usage: cat <file>", "y");
        const f = args[0].replace(/^\.\//, "");
        if (!Object.prototype.hasOwnProperty.call(FILES, f)) return print("cat: " + args[0] + ": no such file", "r");
        FILES[f]();
      },
      strings(args) {
        if ((args[0] || "").replace(/^\.\//, "") !== "crackme") return print("usage: strings crackme", "y");
        ["/lib64/ld-linux-x86-64.so.2", "usage: ./crackme <key>", "wrong key", "access granted", "have you tried ls -a ?"].forEach(l => print(l));
      },
      "./crackme"(args) {
        const k = (args[0] || "").toLowerCase();
        if (!k) return print("usage: ./crackme <key>", "y");
        if (k === NAME) return print("close: that is how you read it, not how memory stores it.", "y");
        if (k !== KEY) return print("wrong key", "r");
        print("access granted", "g");
        print(FLAG.map(c => String.fromCharCode(c ^ 0x59)).join(""), "t");
        print("you are root now. new command unlocked: theme", "g");
        isRoot = true;
        disk.set("rx-root", 1);
        syncPrompt();
      },
      crackme() { print("crackme: command not found (did you mean ./crackme ?)", "r"); },
      sudo() { print("visitor is not in the sudoers file. find the flag instead.", "r"); },
      theme(args) {
        if (!isRoot) return print("theme: permission denied (are you root? try ./crackme)", "r");
        if (!THEMES.includes(args[0])) return print("usage: theme <" + THEMES.join("|") + ">", "y");
        setTheme(args[0]);
        print("theme = " + args[0], "g");
      },
      open(args) {
        const p = args[0];
        if (!p) return print("usage: open <page>   pages: " + pages().join("  "), "y");
        const f = pages().find(h => h === p || h === p + ".html" || (p === "home" && h === "index.html"));
        if (!f) return print("no such page: " + p, "r");
        location.href = f;
      },
      xxd(args) {
        if (!args.length) return print("usage: xxd <text>", "y");
        xxd(args.join(" ")).forEach(l => print(l));
      },
      github() { print("https://github.com/retr0x59", "t"); },
      date() { print(new Date().toString()); },
      clear() { out.textContent = ""; },
      exit() { if (inline) print("this shell stays open.", "y"); else close(); }
    };
    CMDS.cd = CMDS.open;

    const run = line => {
      print(prompt() + " " + line, "c");
      const [cmd, ...args] = line.trim().split(/\s+/);
      if (!cmd) return;
      hist.push(line);
      hi = hist.length;
      if (Object.prototype.hasOwnProperty.call(CMDS, cmd)) CMDS[cmd](args);
      else print(cmd + ": command not found (try 'help')", "r");
    };

    function open(focus) {
      if (inline) {
        term.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
        input.focus({ preventScroll: true });
        return;
      }
      term.hidden = false;
      document.body.classList.add("term-open");
      if (termBtn) termBtn.setAttribute("aria-expanded", "true");
      store.set("rx-term", 1);
      if (focus) input.focus();
    }
    function close() {
      if (inline) return;
      term.hidden = true;
      document.body.classList.remove("term-open");
      if (termBtn) termBtn.setAttribute("aria-expanded", "false");
      store.set("rx-term", 0);
    }
    const toggle = () => (inline || term.hidden ? open(true) : close());

    print("Type 'help' to list commands. A flag is hidden here: start with ls -a", "g");
    if (termBtn) termBtn.addEventListener("click", toggle);
    const x = $("#termClose");
    if (x) x.addEventListener("click", close);

    // home: the shell types a short demo the first time it scrolls into view
    let demo = null;
    const stopDemo = () => { if (demo) { clearTimeout(demo); demo = null; input.value = ""; } };
    const playDemo = cmds => {
      const next = () => {
        const line = cmds.shift();
        if (line === undefined) { demo = null; return; }
        let i = 0;
        (function key() {
          if (i < line.length) { input.value = line.slice(0, ++i); demo = setTimeout(key, 70); }
          else demo = setTimeout(() => { input.value = ""; run(line); demo = setTimeout(next, 500); }, 350);
        })();
      };
      demo = setTimeout(next, 500);
    };
    if (inline && !reduce && !store.get("rx-demo", 0) && "IntersectionObserver" in window) {
      const seen = new IntersectionObserver(es => {
        if (!es[0].isIntersecting) return;
        seen.disconnect();
        store.set("rx-demo", 1);
        playDemo(["whoami", "file"]);
      }, { threshold: .5 });
      seen.observe(term);
      ["pointerdown", "keydown"].forEach(ev => term.addEventListener(ev, stopDemo, true));
    }

    input.addEventListener("keydown", e => {
      if (e.key === "Enter") { run(input.value); input.value = ""; }
      else if (e.key === "ArrowUp" && hi > 0) { input.value = hist[--hi]; e.preventDefault(); }
      else if (e.key === "ArrowDown") { hi = Math.min(hi + 1, hist.length); input.value = hist[hi] || ""; }
      else if (e.key === "Escape") close();
    });
    term.addEventListener("click", () => { if (!String(getSelection())) input.focus({ preventScroll: true }); });
    // backtick jumps to the shell from anywhere on the page
    addEventListener("keydown", e => {
      if (e.key !== "`" || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      toggle();
    });

    if (!inline) {
      setH(store.get("rx-th", 320));
      const grip = $("#termGrip");
      if (grip) grip.addEventListener("pointerdown", e => {
        e.preventDefault();
        grip.setPointerCapture(e.pointerId);
        const move = ev => store.set("rx-th", setH(innerHeight - ev.clientY));
        const up = () => { grip.removeEventListener("pointermove", move); grip.removeEventListener("pointerup", up); };
        grip.addEventListener("pointermove", move);
        grip.addEventListener("pointerup", up);
      });
      if (store.get("rx-term", 0)) open(false);
    }
  }
})();
