/* The Recording Studio scene (1600 x 900).
   data-obj = locked object (id matches content.js), data-dec = decoration.
   The engine adds .powered (item used) and .done (questions solved) to each object,
   and pow-<id> / got-<id> to the <svg> for effects on other parts of the room. */
window.SCENE = (function () {
  let planks = '';
  for (let x = -1600; x <= 3200; x += 130) {
    const t = (900 - 650) / (900 - 260), top = x + (800 - x) * t;
    planks += `<line x1="${x}" y1="900" x2="${top.toFixed(1)}" y2="650"/>`;
  }
  let rows = '';
  [668, 692, 722, 760, 808, 866].forEach(y => { rows += `<line x1="0" y1="${y}" x2="1600" y2="${y}"/>`; });

  const faders = [0, 1, 2, 3, 4, 5, 6, 7].map(i => {
    const x = 1046 + i * 34;
    return `<line x1="${x}" y1="566" x2="${x - 2}" y2="586" stroke="#0c0c10" stroke-width="3"/><rect class="fader f${i}" x="${x - 7}" y="${570 + (i * 7) % 13}" width="12" height="6" rx="1.5" fill="${i % 3 ? '#d9d9e0' : '#ffb547'}"/>`;
  }).join('');
  const leds = [0, 1, 2, 3, 4, 5].map(i => `<circle class="bl b${i}" cx="${1398 + i * 24}" cy="236" r="4" fill="${['#3fd6c6', '#ffb547', '#3fd6c6', '#ff7a66', '#3fd6c6', '#9be564'][i]}"/>`).join('');

  /* small reusable drawings */
  const key = (x, y, s = 1, col = '#e8c35a') => `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="0" r="7" fill="none" stroke="${col}" stroke-width="3.5"/><path d="M7 0h20M21 0v6M26 0v5" stroke="${col}" stroke-width="3.5" stroke-linecap="round"/></g>`;
  const tape = (x, y, col = '#ffb547', label = '') => `<g transform="translate(${x} ${y})"><rect x="-26" y="-16" width="52" height="32" rx="4" fill="#2b2b31" stroke="${col}" stroke-width="2"/><rect x="-18" y="-10" width="36" height="10" rx="2" fill="${col}"/><circle cx="-9" cy="6" r="4" fill="#e5e1d8"/><circle cx="9" cy="6" r="4" fill="#e5e1d8"/>${label ? `<text x="0" y="-2.5" text-anchor="middle" font-size="7" font-family="JetBrains Mono, monospace" fill="#1b1108">${label}</text>` : ''}</g>`;

  return `
<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" font-family="Space Grotesk, system-ui, sans-serif">
<defs>
  <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1e1a"/><stop offset="1" stop-color="#3a2a22"/></linearGradient>
  <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a3122"/><stop offset="1" stop-color="#2a1a11"/></linearGradient>
  <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a06a43"/><stop offset="1" stop-color="#6b4229"/></linearGradient>
  <linearGradient id="doorwood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5c3a25"/><stop offset=".5" stop-color="#7a4d31"/><stop offset="1" stop-color="#4c2f1e"/></linearGradient>
  <linearGradient id="metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6b7280"/><stop offset=".45" stop-color="#e5e7eb"/><stop offset="1" stop-color="#6b7280"/></linearGradient>
  <linearGradient id="machine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1c232b"/><stop offset=".5" stop-color="#2b3540"/><stop offset="1" stop-color="#171d24"/></linearGradient>
  <radialGradient id="outside" cx=".5" cy=".55" r=".7"><stop offset="0" stop-color="#fffbe8"/><stop offset=".6" stop-color="#ffe3a3"/><stop offset="1" stop-color="#f2b25c"/></radialGradient>
  <radialGradient id="lampglow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".55"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/></radialGradient>
  <radialGradient id="giftglow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe29a" stop-opacity=".9"/><stop offset="1" stop-color="#ffb547" stop-opacity="0"/></radialGradient>
  <pattern id="foam" width="38" height="38" patternUnits="userSpaceOnUse">
    <rect width="38" height="38" fill="#2a2133"/><path d="M0 0L19 19L0 38Z" fill="#33293f"/><path d="M38 0L19 19L38 38Z" fill="#1d1625"/><path d="M0 0H38L19 19Z" fill="#3b3049"/>
  </pattern>
  <pattern id="grille" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".9" fill="#2a2f36"/></pattern>
  <clipPath id="cardclip"><rect x="1380" y="250" width="160" height="94"/></clipPath>
  <clipPath id="tapeclip"><rect x="1380" y="380" width="160" height="60"/></clipPath>
  <clipPath id="stripclip"><rect x="1020" y="440" width="120" height="168"/></clipPath>
</defs>

<!-- wall, ceiling, floor -->
<rect width="1600" height="660" fill="url(#wall)"/>
<g stroke="#000" stroke-opacity=".12">${[200, 400, 1000, 1200, 1400].map(x => `<line x1="${x}" y1="40" x2="${x}" y2="645"/>`).join('')}</g>
<rect width="1600" height="42" fill="#140d0a"/>
${[300, 800, 1300].map(x => `<polygon points="${x - 26},42 ${x + 26},42 ${x + 150},420 ${x - 150},420" fill="#ffd9a0" opacity=".05"/><ellipse cx="${x}" cy="42" rx="26" ry="6" fill="#ffe6bd"/>`).join('')}
<rect y="650" width="1600" height="250" fill="url(#floor)"/>
<g stroke="#1a0f09" stroke-opacity=".55" stroke-width="2">${planks}</g>
<g stroke="#1a0f09" stroke-opacity=".35">${rows}</g>
<rect y="640" width="1600" height="14" fill="#24170f"/>
<ellipse cx="660" cy="812" rx="230" ry="46" fill="#5a1f24" opacity=".85"/>
<ellipse cx="660" cy="812" rx="200" ry="36" fill="none" stroke="#b5563c" stroke-opacity=".5" stroke-width="3"/>

<g data-dec="foam"><rect x="470" y="92" width="170" height="400" fill="url(#foam)" stroke="#120d10" stroke-width="6"/>
<rect x="985" y="80" width="345" height="190" fill="url(#foam)" stroke="#120d10" stroke-width="6"/></g>

<g data-dec="clock"><circle cx="1460" cy="112" r="38" fill="#efe6d6" stroke="#2b1c12" stroke-width="6"/>
${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => { const a = i * Math.PI / 6; return `<line x1="${1460 + 28 * Math.sin(a)}" y1="${112 - 28 * Math.cos(a)}" x2="${1460 + 32 * Math.sin(a)}" y2="${112 - 32 * Math.cos(a)}" stroke="#2b1c12" stroke-width="2"/>`; }).join('')}
<line x1="1460" y1="112" x2="1455" y2="90" stroke="#2b1c12" stroke-width="4" stroke-linecap="round"/>
<line class="minute" x1="1460" y1="112" x2="1450" y2="82" stroke="#2b1c12" stroke-width="2.5" stroke-linecap="round"/>
<circle cx="1460" cy="112" r="3" fill="#c0392b"/></g>

<!-- ============ POSTER (screwdriver) — the key card hides behind it ============ -->
<rect x="232" y="178" width="96" height="60" rx="4" fill="#0d0907"/>
<g class="hidcard"><rect x="244" y="192" width="72" height="34" rx="3" fill="#3fd6c6"/><rect x="250" y="200" width="22" height="14" rx="2" fill="#e8c35a"/><text x="296" y="222" text-anchor="middle" font-size="6" font-family="JetBrains Mono, monospace" fill="#06302b">API KEY</text></g>
<g data-obj="poster" class="poster">
  <g class="pframe">
    <rect x="150" y="118" width="260" height="190" rx="4" fill="url(#wood)"/>
    <rect x="162" y="130" width="236" height="166" fill="#14203a"/>
    <path d="M172 228 q10 -30 20 0 t20 0 q10 -55 20 0 t20 0 q10 -80 20 0 t20 0 q10 -40 20 0 t20 0 q10 -18 20 0 t20 0" fill="none" stroke="#3fd6c6" stroke-width="3"/>
    <text x="280" y="176" text-anchor="middle" fill="#ffb547" font-size="34" font-weight="700" letter-spacing="4">SPEAK.</text>
    <text x="280" y="276" text-anchor="middle" fill="#d8c8b8" font-size="13" letter-spacing="3">THE AGENT LISTENS</text>
    ${[[160, 126, 0], [400, 126, 1], [160, 300, 3], [400, 300, 2]].map(([x, y, k]) => `<g class="screw s${k}"><circle cx="${x}" cy="${y}" r="5" fill="#c9c9c9"/><line x1="${x - 3.5}" y1="${y}" x2="${x + 3.5}" y2="${y}" stroke="#555" stroke-width="1.5"/></g>`).join('')}
  </g>
  <g class="udrv"><g transform="translate(404 126) rotate(40)"><rect x="-3" y="0" width="6" height="26" fill="#c9c9c9"/><rect x="-8" y="24" width="16" height="40" rx="6" fill="#e0443a"/><rect x="-8" y="34" width="16" height="4" fill="#ffb547"/></g></g>
</g>

<!-- ============ DESK ============ -->
<g data-dec="lamp">
  <polygon points="545,462 485,540 640,540 590,462" fill="url(#lampglow)"/>
  <ellipse cx="560" cy="537" rx="30" ry="6" fill="#1c1c1c"/>
  <path d="M560 535 L585 480 L560 440" fill="none" stroke="#1c1c1c" stroke-width="5"/>
  <path d="M532 448 L560 428 L600 468 L575 482 Z" fill="#c0392b"/>
  <ellipse cx="588" cy="474" rx="16" ry="5" fill="#ffe6bd" transform="rotate(-36 588 474)"/>
</g>
<rect x="80" y="540" width="530" height="22" rx="4" fill="url(#wood)"/>
<rect x="96" y="562" width="498" height="104" fill="#4a2f1f"/>
<rect x="110" y="575" width="220" height="80" rx="4" fill="#553522" stroke="#2d1b10" stroke-width="2"/>
<rect x="104" y="666" width="20" height="120" fill="#3b2416"/><rect x="566" y="666" width="20" height="120" fill="#3b2416"/>

<!-- wall socket for the charger -->
<rect x="124" y="452" width="32" height="40" rx="4" fill="#e7ddd0" stroke="#9a8e80" stroke-width="1.5"/>
<circle cx="135" cy="468" r="2.6" fill="#5a5048"/><circle cx="145" cy="468" r="2.6" fill="#5a5048"/>

<!-- ============ DRAWER (first lock) ============ -->
<rect x="352" y="575" width="226" height="78" rx="4" fill="#120a06"/>
<g data-obj="drawer" class="drawer">
  <g class="gift"><circle cx="465" cy="600" r="34" fill="url(#giftglow)"/>
    <rect x="452" y="590" width="20" height="16" rx="3" fill="#2c2f36"/><path d="M456 590v-7M466 590v-7" stroke="#c9c9c9" stroke-width="3"/><path d="M462 606 C462 622 490 620 494 604" fill="none" stroke="#2c2f36" stroke-width="4"/></g>
  <g class="front">
    <rect x="352" y="575" width="226" height="78" rx="4" fill="#6b4329" stroke="#2d1b10" stroke-width="2"/>
    <rect x="435" y="598" width="60" height="9" rx="4" fill="#c9a26a"/>
    <g class="pl"><path d="M456 616 v-6 a9 9 0 0 1 18 0 v6" fill="none" stroke="#9aa0a8" stroke-width="4"/><rect x="450" y="615" width="30" height="24" rx="4" fill="#d4a017"/><circle cx="465" cy="625" r="3" fill="#3b2a0a"/><rect x="464" y="626" width="2" height="7" fill="#3b2a0a"/></g>
  </g>
</g>

<!-- ============ LAPTOP (charger) ============ -->
<g data-obj="laptop" class="laptop">
  <path class="chg" d="M140 478 C140 520 150 548 200 540 L214 534" fill="none" stroke="#15171b" stroke-width="5" stroke-linecap="round" pathLength="100"/>
  <g class="plugw"><rect x="130" y="463" width="20" height="16" rx="3" fill="#2c2f36"/></g>
  <g class="gift">${key(286, 552, 1.1)}</g>
  <rect x="212" y="400" width="206" height="128" rx="7" fill="#1d1f24" stroke="#4a4e57" stroke-width="2"/>
  <rect class="scr" x="221" y="409" width="188" height="110" rx="3" fill="#0a0b0e"/>
  <g class="batt"><rect x="294" y="452" width="40" height="20" rx="3" fill="none" stroke="#ff5a4a" stroke-width="2.5"/><rect x="334" y="458" width="4" height="8" fill="#ff5a4a"/>
    <rect class="bfill" x="298" y="456" width="32" height="12" fill="#9be564"/><rect class="bempty" x="298" y="456" width="6" height="12" fill="#ff5a4a"/></g>
  <g class="bolt"><path d="M318 440 l-8 14 h7 l-4 12 l12 -16 h-7 l5 -10 z" fill="#ffe16b"/></g>
  <g class="bootlogo" font-family="JetBrains Mono, monospace" text-anchor="middle"><text x="315" y="458" font-size="14" fill="#ff9f6b">✻ Claude Code</text><rect x="265" y="472" width="100" height="5" rx="2.5" fill="#2a2d33"/><rect class="bootbar" x="265" y="472" width="100" height="5" rx="2.5" fill="#ff9f6b"/></g>
  <g class="scrtxt" font-family="JetBrains Mono, monospace" font-size="11" fill="#9be564">
    <text x="230" y="430">&gt; /voice</text>
    <text x="230" y="450" fill="#ff7a66">● Recording...</text>
    <text x="230" y="470" fill="#d8c8b8">You said: fix add.py</text>
    <text x="230" y="490" fill="#3fd6c6">Searching...</text>
  </g>
  <path d="M188 542 L442 542 L428 528 L202 528 Z" fill="#2c2f36"/>
  <rect x="290" y="534" width="50" height="4" rx="2" fill="#15171b"/>
</g>

<!-- ============ BIG ENTER KEY (stops the recording) ============ -->
<g data-obj="enter" class="enter">
  <rect x="452" y="514" width="64" height="28" rx="6" fill="#5a1414"/><rect x="474" y="504" width="20" height="14" rx="2" fill="#2a2a30"/>
  <g class="cap"><rect x="452" y="498" width="64" height="34" rx="7" fill="#e0443a" stroke="#7a1d16" stroke-width="2"/>
  <text x="484" y="520" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" letter-spacing="1">ENTER</text></g>
</g>

<!-- light switch -->
<g data-obj="switch" class="switch">
  <rect x="434" y="372" width="30" height="46" rx="4" fill="#e7ddd0" stroke="#9be564" stroke-width="2.5" class="glowsticker"/>
  <rect class="tog" x="443" y="380" width="12" height="14" rx="2" fill="#bfb3a3"/>
</g>

<!-- ============ DOOR (door key) ============ -->
<rect x="676" y="196" width="248" height="458" fill="#20140d"/>
<rect x="694" y="214" width="212" height="436" fill="url(#outside)"/>
<g class="sunrays" opacity="0"><polygon points="694,650 906,650 1120,900 480,900" fill="#ffe6a8" opacity=".35"/></g>
<g data-obj="door" class="door">
  <g class="leaf">
    <rect x="694" y="214" width="212" height="436" fill="url(#doorwood)"/>
    <rect x="716" y="240" width="168" height="160" rx="4" fill="none" stroke="#3b2416" stroke-width="5"/>
    <rect x="716" y="430" width="168" height="196" rx="4" fill="none" stroke="#3b2416" stroke-width="5"/>
    <rect x="852" y="418" width="30" height="64" rx="5" fill="#c9a26a"/>
    <rect x="860" y="440" width="22" height="7" rx="3" fill="#e8c88c"/>
    <circle cx="867" cy="465" r="5" fill="#2b1c12"/><rect x="865" y="465" width="4" height="10" fill="#2b1c12"/>
    <g class="ukey"><g class="turn">${key(867, 468, 1, '#ffd36b')}</g></g>
  </g>
</g>
</g>
<g class="onair"><rect x="740" y="136" width="120" height="42" rx="6" fill="#2a0b0b" stroke="#0a0a0a" stroke-width="3"/>
<text class="onairtxt" x="800" y="165" text-anchor="middle" font-size="22" font-weight="700" letter-spacing="3" fill="#ff3b3b">ON AIR</text></g>
<g class="leds">${[0, 1, 2, 3].map(i => `<rect class="led" data-z="${i}" x="${718 + i * 43}" y="186" width="36" height="8" rx="3" fill="#5a1414"/>`).join('')}</g>

<!-- ============ SHELF + TAPE DECK (blank tape) ============ -->
<rect x="985" y="378" width="345" height="13" fill="url(#wood)"/>
<path d="M1005 391 v18 h14 M1310 391 v18 h-14" stroke="#24170f" stroke-width="5" fill="none"/>
<g data-dec="records"><rect x="1262" y="296" width="12" height="82" fill="#c0392b"/><rect x="1276" y="300" width="12" height="78" fill="#2b5876"/><rect x="1290" y="292" width="12" height="86" fill="#e0b84a" transform="rotate(8 1296 378)"/></g>
<g data-obj="deck" class="deck">
  <g class="tapein">${tape(1128, 312, '#cfcfcf', 'BLANK')}</g>
  <rect x="1010" y="296" width="236" height="82" rx="6" fill="#2b2b31" stroke="#56565f" stroke-width="2"/>
  <rect x="1030" y="306" width="196" height="50" rx="4" fill="#121216"/>
  ${[1078, 1178].map(cx => `<g class="reel"><circle cx="${cx}" cy="331" r="20" fill="#e5e1d8"/><circle cx="${cx}" cy="331" r="6" fill="#2b2b31"/>${[0, 1, 2].map(k => `<rect x="${cx - 2}" y="314" width="4" height="10" fill="#2b2b31" transform="rotate(${k * 120} ${cx} 331)"/>`).join('')}</g>`).join('')}
  <g class="intape">${tape(1128, 331, '#cfcfcf', 'voice.wav')}</g>
  <g class="vu">${[0, 1, 2, 3, 4, 5, 6].map(i => `<rect class="vb v${i}" x="${1104 + i * 7}" y="346" width="4" height="8" fill="${i > 4 ? '#ff5a4a' : '#9be564'}"/>`).join('')}</g>
  ${[0, 1, 2, 3, 4].map(i => `<rect class="${i === 1 ? 'recbtn' : ''}" x="${1040 + i * 26}" y="362" width="20" height="9" rx="2" fill="${i === 1 ? '#7a2018' : '#8a8a94'}"/>`).join('')}
  <text class="rec" x="1214" y="322" font-size="10" font-weight="700" fill="#ff3b3b">● REC</text>
  <g class="gift"><circle cx="1128" cy="300" r="30" fill="url(#giftglow)"/><rect x="1106" y="288" width="44" height="24" rx="5" fill="#e0443a" stroke="#7a1d16" stroke-width="2"/><text x="1128" y="304" text-anchor="middle" font-size="8" font-weight="700" fill="#fff">ENTER</text></g>
  <g class="ejtape">${tape(1128, 280, '#ffb547', 'voice.wav')}</g>
</g>

<!-- ============ SPEAKERS (voice.wav tape) ============ -->
<g data-obj="speakers" class="speakers">
  <g class="bub bub1"><rect x="1040" y="410" width="170" height="40" rx="10" fill="#fff3d6"/><path d="M1060 450 l-6 14 l18 -14z" fill="#fff3d6"/><text x="1125" y="435" text-anchor="middle" font-size="14" font-weight="700" fill="#c0392b">♪ squeeek! too fast ♪</text></g>
  <g class="bub bub2"><rect x="1012" y="404" width="316" height="44" rx="10" fill="#fff3d6"/><path d="M1040 448 l-6 14 l18 -14z" fill="#fff3d6"/><text x="1170" y="431" text-anchor="middle" font-size="14" font-style="italic" fill="#2a1c12">“…the key is behind the poster…”</text></g>
  ${[1041, 1299].map(cx => `<g><rect x="${cx - 29}" y="476" width="58" height="84" rx="6" fill="#18181c"/><circle cx="${cx}" cy="502" r="10" fill="#2e2e35"/><g class="cone"><circle cx="${cx}" cy="535" r="17" fill="#2e2e35"/><circle cx="${cx}" cy="535" r="7" fill="#111"/></g></g>`).join('')}
  <g class="gift"><circle cx="1090" cy="545" r="30" fill="url(#giftglow)"/><g transform="translate(1070 548) rotate(-90)"><rect x="-3" y="0" width="6" height="22" fill="#c9c9c9"/><rect x="-7" y="20" width="14" height="30" rx="5" fill="#e0443a"/></g></g>
</g>

<!-- ============ MIXING DESK (transcript) ============ -->
<rect x="1022" y="660" width="14" height="128" fill="#16161a"/><rect x="1306" y="660" width="14" height="128" fill="#16161a"/>
<g data-obj="mixer" class="mixer">
  <path d="M1000 596 L1342 596 L1322 560 L1020 560 Z" fill="#2c2c34"/>
  ${faders}
  <g clip-path="url(#stripclip)"><g class="ustrip"><rect x="1048" y="520" width="56" height="80" fill="#f4efe4"/><path d="M1054 532 h42 M1054 544 h36 M1054 556 h42 M1054 568 h28" stroke="#6b6b76" stroke-width="2"/></g></g>
  <rect x="1000" y="596" width="342" height="66" fill="#1c1c22"/>
  <rect x="1040" y="604" width="72" height="8" rx="3" fill="#050608"/>
  <text x="1076" y="628" text-anchor="middle" font-size="9" letter-spacing="1.5" fill="#8a8a94">TEXT IN</text>
  <rect x="1132" y="603" width="80" height="52" rx="3" fill="#0c0c0f"/>
  <g class="gift"><circle cx="1172" cy="629" r="30" fill="url(#giftglow)"/>${key(1158, 629, 1.1, '#ffcf6b')}</g>
  <g class="sdoor"><rect x="1132" y="603" width="80" height="52" rx="3" fill="#3a3a44" stroke="#6b6b76" stroke-width="2"/><circle cx="1172" cy="629" r="14" fill="#55555f" stroke="#9aa0a8" stroke-width="2"/><line class="dial" x1="1172" y1="629" x2="1172" y2="618" stroke="#ddd" stroke-width="2"/></g>
  <rect x="1222" y="612" width="96" height="30" rx="3" fill="#0b1f14"/>
  <text class="m1" x="1270" y="631" text-anchor="middle" font-size="9" fill="#9be564" font-family="JetBrains Mono, monospace">FEED ME TEXT</text>
  <text class="m2" x="1270" y="631" text-anchor="middle" font-size="9" fill="#ffb547" font-family="JetBrains Mono, monospace">RUNNING TASK…</text>
</g>

<!-- ============ TRANSCRIBER: body + two slots (key card, audio) ============ -->
<g data-obj="transcriber" class="transcriber">
<g>
  <rect x="1366" y="190" width="186" height="462" rx="10" fill="url(#machine)" stroke="#0d1116" stroke-width="3"/>
  <text x="1459" y="212" text-anchor="middle" font-size="12" letter-spacing="3" fill="#8a96a3" font-weight="700">TRANSCRIBER</text>
  ${leds}
  <rect x="1386" y="480" width="146" height="66" rx="6" fill="url(#grille)" stroke="#2b3540" stroke-width="2"/>
  <rect x="1406" y="560" width="106" height="8" rx="3" fill="#050608"/>
</g>
<g class="tscreen" font-family="JetBrains Mono, monospace" font-size="11" text-anchor="middle" pointer-events="none">
  <rect x="1386" y="246" width="146" height="70" rx="5" fill="#06110f" stroke="#2b3540" stroke-width="2"/>
  <text class="ts0" x="1459" y="285" fill="#ff7a66">NO KEY · OFFLINE</text>
  <text class="ts1" x="1459" y="276" fill="#3fd6c6">ONLINE ✓</text><text class="ts1" x="1459" y="294" fill="#3fd6c6">INSERT AUDIO</text>
  <text class="ts2" x="1459" y="272" fill="#ffb547">TRANSCRIBING</text>
  <rect class="ts2" x="1404" y="284" width="110" height="8" rx="4" fill="#1a2a26"/><rect class="ts2 tbar" x="1404" y="284" width="110" height="8" rx="4" fill="#ffb547"/>
  <text class="ts3" x="1459" y="276" fill="#9be564">voice.wav</text><text class="ts3" x="1459" y="294" fill="#9be564">→ text ✓</text>
</g>
<g class="cardslot">
  <rect x="1398" y="326" width="122" height="44" rx="6" fill="#141a20" stroke="#3a4652" stroke-width="2"/>
  <text x="1459" y="342" text-anchor="middle" font-size="9" letter-spacing="2" fill="#8a96a3">KEY CARD</text>
  <rect x="1418" y="350" width="82" height="8" rx="3" fill="#050608"/><rect class="slotlight" x="1418" y="361" width="82" height="3" fill="#ff7a66"/>
  <g clip-path="url(#cardclip)"><g class="ucard"><rect x="1426" y="300" width="66" height="50" rx="3" fill="#3fd6c6"/><rect x="1432" y="308" width="18" height="12" rx="2" fill="#e8c35a"/></g></g>
</g>
<g class="tapeslot">
  <rect x="1398" y="386" width="122" height="80" rx="6" fill="#141a20" stroke="#3a4652" stroke-width="2"/>
  <text x="1459" y="402" text-anchor="middle" font-size="9" letter-spacing="2" fill="#8a96a3">AUDIO IN</text>
  <rect x="1424" y="432" width="70" height="8" rx="3" fill="#050608"/>
  <g clip-path="url(#tapeclip)"><g class="utape">${tape(1459, 410, '#ffb547', 'voice.wav')}</g></g>
  <rect class="slotlight" x="1424" y="444" width="70" height="3" fill="#ff7a66"/>
  <g class="strip"><rect x="1420" y="566" width="78" height="70" fill="#f4efe4"/><path d="M1428 580 h56 M1428 592 h50 M1428 604 h58 M1428 616 h36" stroke="#6b6b76" stroke-width="2"/></g>
</g>
</g>

<!-- ============ MICROPHONE (XLR cable) ============ -->
<g data-obj="mic" class="mic">
  <path d="M620 700 L575 800 M620 700 L668 800 M620 700 L624 820" stroke="#1a1a1e" stroke-width="7" stroke-linecap="round"/>
  <line x1="620" y1="702" x2="620" y2="470" stroke="#2a2a30" stroke-width="8"/>
  <line x1="620" y1="478" x2="706" y2="436" stroke="#2a2a30" stroke-width="7"/>
  <circle cx="676" cy="438" r="30" fill="#0a0a0a" fill-opacity=".35" stroke="#1a1a1e" stroke-width="4"/>
  <rect x="694" y="388" width="30" height="70" rx="15" fill="url(#metal)" transform="rotate(14 709 423)"/>
  <g transform="rotate(14 709 423)" stroke="#7b8190" stroke-width="1.5">${[0, 1, 2, 3, 4].map(i => `<line x1="697" y1="${398 + i * 8}" x2="721" y2="${398 + i * 8}"/>`).join('')}</g>
  <circle class="mled" cx="704" cy="468" r="5" fill="#4a1010"/>
  <path class="cable-on" d="M702 470 C712 520 660 600 700 700 C730 760 900 770 1010 700" fill="none" stroke="#111" stroke-width="5" pathLength="100"/>
  <g class="waves" fill="none" stroke="#ff7a66" stroke-width="3" stroke-linecap="round"><path d="M748 400 q12 22 0 44"/><path d="M764 390 q20 32 0 64"/><path d="M780 380 q28 42 0 84"/></g>
  <g class="gift"><circle cx="660" cy="690" r="34" fill="url(#giftglow)"/>${tape(660, 690, '#cfcfcf', 'BLANK')}</g>
</g>

<!-- ============ FLIGHT CASE (brass key) ============ -->
<g data-obj="case" class="case">
  <rect x="872" y="752" width="276" height="104" rx="10" fill="#1f2024" stroke="#a7adb5" stroke-width="6"/>
  <rect x="884" y="758" width="252" height="30" fill="#2f2a3b"/>
  <g class="gift"><circle cx="1010" cy="770" r="40" fill="url(#giftglow)"/><g fill="none" stroke="#111" stroke-width="5"><ellipse cx="1000" cy="772" rx="26" ry="10"/><ellipse cx="1000" cy="768" rx="22" ry="8"/></g><rect x="1028" y="760" width="16" height="16" rx="7" fill="url(#metal)"/></g>
  <g class="lid">
    <rect x="872" y="724" width="276" height="34" rx="9" fill="#26272c" stroke="#a7adb5" stroke-width="6"/>
    <g class="latch"><rect x="994" y="744" width="32" height="22" rx="3" fill="#d4a017"/><circle cx="1010" cy="754" r="3" fill="#3b2a0a"/></g>
    <g class="ukey"><g class="turn">${key(1010, 755, .9, '#ffd36b')}</g></g>
  </g>
  ${[[872, 840], [1132, 840]].map(([x, y]) => `<rect x="${x - 2}" y="${y - 2}" width="20" height="20" rx="4" fill="#cfd3d8"/>`).join('')}
</g>

<g data-dec="plant"><path d="M36 700 h70 l-8 92 h-54 z" fill="#8a4b2e"/>
<g fill="#3f7d4a"><path d="M70 700 C40 650 20 640 10 600 C50 620 66 650 70 700"/><path d="M72 700 C80 640 110 610 130 590 C120 640 100 670 72 700"/><path d="M70 700 C66 640 60 610 70 560 C84 610 80 650 70 700"/></g></g>
</svg>`;
})();
