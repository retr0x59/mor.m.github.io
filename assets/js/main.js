/* retr0x59 · shared logic for all pages */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k, d) { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

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

  /* ---------- name <-> bytes ---------- */
  const letters = $$(".ident h1 span"), bytes = $$(".ident .bytes span");
  letters.forEach((el, i) => {
    [el, bytes[i]].forEach(n => {
      if (!n) return;
      n.addEventListener("pointerenter", () => { el.classList.add("hot"); bytes[i].classList.add("hot"); });
      n.addEventListener("pointerleave", () => { el.classList.remove("hot"); bytes[i].classList.remove("hot"); });
    });
  });

  /* ---------- hexdump ---------- */
  const hex = n => n.toString(16).padStart(2, "0");
  const ascii = n => (n >= 32 && n < 127 ? String.fromCharCode(n) : ".");
  // plain-text xxd rows, used by the shell
  function xxd(text, cols = 16) {
    const data = new TextEncoder().encode(text), rows = [];
    for (let o = 0; o < data.length; o += cols) {
      const row = [...data.slice(o, o + cols)];
      rows.push(o.toString(16).padStart(8, "0") + "  " + row.map(hex).join(" ").padEnd(cols * 3 - 1) + "  |" + row.map(ascii).join("") + "|");
    }
    return rows;
  }

  const dump = $("#hex");
  if (dump) {
    const data = new TextEncoder().encode(dump.textContent.trim());
    const span = (tag, i, txt) => { const s = document.createElement(tag); s.dataset.i = i; s.textContent = txt; return s; };
    let cols = 0;
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
    };
    const light = e => {
      $$(".hot", dump).forEach(n => n.classList.remove("hot"));
      const i = e.target.dataset && e.target.dataset.i;
      if (e.type === "pointerover" && i !== undefined) $$(`[data-i="${i}"]`, dump).forEach(n => n.classList.add("hot"));
    };
    dump.addEventListener("pointerover", light);
    dump.addEventListener("pointerleave", light);
    addEventListener("resize", render);
    render();
  }

  /* ---------- shell ---------- */
  const term = $("#term"), out = $("#termOut"), input = $("#termIn"), termBtn = $("#termBtn");
  if (term && out && input) {
    const root = document.documentElement;
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

    const CMDS = {
      help() { print("help  whoami  file  skills  roadmap  ls  open <page>  xxd <text>  github  date  clear  exit", "y"); },
      whoami() { print("retr0x59 · learning offensive security: pentesting, low-level development, reverse engineering"); },
      file() { print("retr0x59: ELF 64-bit LSB executable, x86-64, dynamically linked, not stripped", "t"); },
      skills() {
        [
          "recon      Nmap, ffuf, dig, smbclient, Wireshark",
          "web        Burp Suite, sqlmap, curl, OWASP ZAP",
          "reversing  GDB, pwndbg, GEF, Pwntools, Ghidra, IDA",
          "langs      C, Assembly x86/x64, Python, Bash"
        ].forEach(l => print(l));
      },
      roadmap() {
        print("[x] Linux & low-level foundations", "g");
        print("[x] Binary exploitation & reverse engineering", "g");
        print("[x] Hack The Box Academy", "g");
        print("[>] HTB CPTS certification", "y");
        print("[ ] Advanced exploitation & research");
      },
      ls() { print(pages().join("  ")); },
      open(args) {
        const p = args[0];
        if (!p) return print("usage: open <page>", "y");
        const f = pages().find(h => h === p || h === p + ".html");
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
      exit() { close(); }
    };
    CMDS.cd = CMDS.open;

    const run = line => {
      print("$ " + line, "c");
      const [cmd, ...args] = line.trim().split(/\s+/);
      if (!cmd) return;
      hist.push(line);
      hi = hist.length;
      if (Object.prototype.hasOwnProperty.call(CMDS, cmd)) CMDS[cmd](args);
      else print(cmd + ": command not found (try 'help')", "r");
    };

    function open(focus) {
      term.hidden = false;
      document.body.classList.add("term-open");
      if (termBtn) termBtn.setAttribute("aria-expanded", "true");
      store.set("rx-term", 1);
      if (!out.childElementCount) print("Type 'help' to list commands.", "g");
      if (focus) input.focus();
    }
    function close() {
      term.hidden = true;
      document.body.classList.remove("term-open");
      if (termBtn) termBtn.setAttribute("aria-expanded", "false");
      store.set("rx-term", 0);
    }
    const toggle = () => (term.hidden ? open(true) : close());

    setH(store.get("rx-th", 320));
    if (termBtn) termBtn.addEventListener("click", toggle);
    const x = $("#termClose");
    if (x) x.addEventListener("click", close);

    input.addEventListener("keydown", e => {
      if (e.key === "Enter") { run(input.value); input.value = ""; }
      else if (e.key === "ArrowUp" && hi > 0) { input.value = hist[--hi]; e.preventDefault(); }
      else if (e.key === "ArrowDown") { hi = Math.min(hi + 1, hist.length); input.value = hist[hi] || ""; }
      else if (e.key === "Escape") close();
    });
    out.addEventListener("click", () => { if (!String(getSelection())) input.focus(); });
    // backtick toggles the shell from anywhere on the page
    addEventListener("keydown", e => {
      if (e.key !== "`" || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      toggle();
    });

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
})();
