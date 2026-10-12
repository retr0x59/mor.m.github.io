document.addEventListener('DOMContentLoaded', () => {
  const output = document.getElementById('console-output');
  if (!output) return;

  const lines = [
    { type: 'cmd', text: 'init retr0x59' },
    { type: 'ok', text: '[OK] identity core loaded successfully' },
    { type: 'cmd', text: 'scan --visitor' },
    { type: 'out', text: 'target acquired -> your local browser session' },
    { type: 'out', text: `browser  : ${navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Chromium/WebEngine'}` },
    { type: 'out', text: `platform : ${navigator.platform}` },
    { type: 'out', text: `viewport : ${window.innerWidth}x${window.innerHeight}` },
    { type: 'g', text: 'verdict  : secure session verified' },
    { type: 'cmd', text: 'cat focus_areas.txt' },
    { type: 'y', text: '[+] Offensive Security, Network Pentesting, Low-Level Development (C/ASM), Reverse Engineering' }
  ];

  let delay = 300;

  lines.forEach((line) => {
    setTimeout(() => {
      const p = document.createElement('div');
      if (line.type === 'cmd') {
        p.innerHTML = `<span class="p">retr0x59@kali:~$</span> <span class="c">${line.text}</span>`;
      } else if (line.type === 'ok') {
        p.innerHTML = `<span class="g">${line.text}</span>`;
      } else if (line.type === 'g') {
        p.innerHTML = `<span class="g">${line.text}</span>`;
      } else if (line.type === 'y') {
        p.innerHTML = `<span class="y">${line.text}</span>`;
      } else {
        p.innerHTML = `<span class="o">${line.text}</span>`;
      }
      output.appendChild(p);
      output.scrollTop = output.scrollHeight;
    }, delay);
    delay += 400;
  });
});
