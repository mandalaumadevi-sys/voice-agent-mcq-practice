/* Lost in Orbit: the station's command deck (1600 x 900).
   data-obj = locked object (id matches content.js), data-dec = decoration.
   The engine adds .powered (item used) and .done (questions solved) to each object,
   and pow-<item> / got-<id> / taken-<id> to the <svg>. Motion lives in room.css. */
window.SCENE = (function () {
  /* stars: fixed positions so the scene is the same on every load */
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const stars = Array.from({ length: 70 }, () => `<circle cx="${(560 + rnd() * 480).toFixed(0)}" cy="${(72 + rnd() * 226).toFixed(0)}" r="${(rnd() * 1.6 + .4).toFixed(1)}" fill="#fff" opacity="${(rnd() * .6 + .3).toFixed(2)}"/>`).join('');
  const wallStars = Array.from({ length: 26 }, () => `<circle cx="${(rnd() * 1600).toFixed(0)}" cy="${(rnd() * 40).toFixed(0)}" r=".8" fill="#9fd8ff" opacity=".35"/>`).join('');
  let grate = '';
  for (let x = -1600; x <= 3200; x += 110) {
    const t = (900 - 660) / (900 - 250), top = x + (800 - x) * t;
    grate += `<line x1="${x}" y1="900" x2="${top.toFixed(1)}" y2="660"/>`;
  }
  let rows = '';
  [678, 702, 734, 774, 826, 890].forEach(y => { rows += `<line x1="0" y1="${y}" x2="1600" y2="${y}"/>`; });
  const rivets = (x0, x1, y) => { let s = ''; for (let x = x0; x <= x1; x += 40) s += `<circle cx="${x}" cy="${y}" r="2.2" fill="#2c3b58"/>`; return s; };

  /* small drawings reused for gifts and items in use */
  const fuse = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-9" y="-22" width="18" height="44" rx="4" fill="#d9e3f0" stroke="#5b6b85" stroke-width="2"/><rect x="-6" y="-12" width="12" height="24" rx="2" fill="#ffcf5a"/><path d="M-3 -8 l5 6 h-4 l4 8" stroke="#7a4a00" stroke-width="1.6" fill="none"/></g>`;
  const card = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-30" y="-19" width="60" height="38" rx="5" fill="#3fd6ff"/><rect x="-24" y="-11" width="14" height="11" rx="2" fill="#ffcf5a"/><text x="10" y="13" text-anchor="middle" font-size="9" font-family="JetBrains Mono, monospace" fill="#062033" font-weight="700">rich</text></g>`;
  const lens = (x, y) => `<g transform="translate(${x} ${y})"><circle r="17" fill="#6dff9a" fill-opacity=".85" stroke="#d9e3f0" stroke-width="4"/><ellipse cx="-6" cy="-6" rx="5" ry="3" fill="#fff" opacity=".7"/></g>`;
  const wrench = (x, y) => `<g transform="translate(${x} ${y}) rotate(-35)"><rect x="-4" y="-6" width="8" height="40" rx="3" fill="#c8d3e2"/><path d="M-11 -18 a12 12 0 1 0 22 0 l-6 6 h-10 z" fill="#c8d3e2"/></g>`;
  const chip = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-17" y="-13" width="34" height="26" rx="3" fill="#1d6b45" stroke="#6dff9a" stroke-width="2"/><rect x="-8" y="-6" width="16" height="12" fill="#0b2a1b"/>${[-12, -4, 4, 12].map(d => `<path d="M${d} -13v-5M${d} 13v5" stroke="#ffcf5a" stroke-width="2"/>`).join('')}</g>`;
  const cutter = (x, y) => `<g transform="translate(${x} ${y}) rotate(-20)"><rect x="-26" y="-8" width="40" height="16" rx="5" fill="#ff7a59"/><rect x="14" y="-4" width="16" height="8" rx="2" fill="#c8d3e2"/><circle cx="33" cy="0" r="3" fill="#ff3b3b"/><rect x="-18" y="8" width="10" height="14" rx="3" fill="#5b6b85"/></g>`;
  const plug = (x, y) => `<g transform="translate(${x} ${y})"><path d="M-30 14 C-10 30 10 -10 26 6" fill="none" stroke="#ffcf5a" stroke-width="5" stroke-linecap="round"/><rect x="18" y="-6" width="22" height="18" rx="3" fill="#2a3550" stroke="#ffcf5a" stroke-width="2"/><path d="M40 0h6M40 7h6" stroke="#c8d3e2" stroke-width="2.4"/></g>`;
  const cart = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-26" y="-17" width="52" height="34" rx="4" fill="#24314d" stroke="#b58cff" stroke-width="2"/><circle cx="-8" cy="0" r="8" fill="none" stroke="#b58cff" stroke-width="2"/><circle cx="-8" cy="0" r="2.5" fill="#ffcf5a"/><path d="M6 -6h14M6 0h10M6 6h12" stroke="#b58cff" stroke-width="2"/></g>`;
  const podkey = (x, y, col = '#ffcf5a') => `<g transform="translate(${x} ${y})"><circle r="10" fill="none" stroke="${col}" stroke-width="5"/><path d="M10 0h28M30 0v8M37 0v6" stroke="${col}" stroke-width="5" stroke-linecap="round"/></g>`;
  const glow = (x, y, r = 36) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#giftglow)"/>`;

  return `
<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" font-family="Space Grotesk, system-ui, sans-serif">
<defs>
  <linearGradient id="swall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e1729"/><stop offset="1" stop-color="#18233b"/></linearGradient>
  <linearGradient id="sfloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2640"/><stop offset="1" stop-color="#0a1020"/></linearGradient>
  <linearGradient id="steel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a4864"/><stop offset=".5" stop-color="#5a6b8c"/><stop offset="1" stop-color="#2e3a52"/></linearGradient>
  <linearGradient id="steelv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4d5d7d"/><stop offset="1" stop-color="#27324a"/></linearGradient>
  <linearGradient id="hatchg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3c4a68"/><stop offset=".5" stop-color="#55678c"/><stop offset="1" stop-color="#34405c"/></linearGradient>
  <radialGradient id="space" cx=".5" cy=".3" r=".9"><stop offset="0" stop-color="#1a1f4a"/><stop offset=".6" stop-color="#0a0d24"/><stop offset="1" stop-color="#04050f"/></radialGradient>
  <radialGradient id="earth" cx=".45" cy=".35" r=".7"><stop offset="0" stop-color="#5fd0ff"/><stop offset=".55" stop-color="#2a7bd8"/><stop offset="1" stop-color="#0d2a6b"/></radialGradient>
  <radialGradient id="podlight" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#bfe8ff"/><stop offset="1" stop-color="#5fb8ff"/></radialGradient>
  <radialGradient id="giftglow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#bff6ff" stop-opacity=".9"/><stop offset="1" stop-color="#3fd6ff" stop-opacity="0"/></radialGradient>
  <radialGradient id="beamg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#6dff9a" stop-opacity=".55"/><stop offset="1" stop-color="#6dff9a" stop-opacity="0"/></radialGradient>
  <pattern id="vgrille" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#1a2338"/><rect y="3" width="10" height="4" fill="#0a0f1c"/></pattern>
  <clipPath id="winclip"><rect x="566" y="76" width="468" height="218" rx="34"/></clipPath>
  <clipPath id="hullclip"><rect x="1062" y="332" width="146" height="136"/></clipPath>
  <clipPath id="podclip"><rect x="1352" y="182" width="216" height="466" rx="30"/></clipPath>
</defs>

<!-- walls, ceiling, floor -->
<rect width="1600" height="665" fill="url(#swall)"/>
<g stroke="#000" stroke-opacity=".25">${[140, 440, 1050, 1230].map(x => `<line x1="${x}" y1="46" x2="${x}" y2="655"/>`).join('')}<line x1="0" y1="330" x2="560" y2="330"/></g>
<rect width="1600" height="46" fill="#070b16"/>${wallStars}
${[300, 800, 1300].map(x => `<rect x="${x - 70}" y="38" width="140" height="8" rx="4" fill="#bfe8ff" class="ceil"/>`).join('')}
${rivets(20, 540, 54)}${rivets(1060, 1580, 54)}
<rect y="655" width="1600" height="245" fill="url(#sfloor)"/>
<g stroke="#2c3b58" stroke-width="2">${grate}</g>
<g stroke="#2c3b58" stroke-opacity=".7">${rows}</g>
<rect y="648" width="1600" height="12" fill="#0a1020"/>
<rect y="652" width="1600" height="3" fill="#3fd6ff" opacity=".35" class="floorline"/>

<!-- window: space, stars and Earth -->
<g data-dec="window">
  <rect x="552" y="62" width="496" height="246" rx="44" fill="url(#steel)"/>
  <rect x="566" y="76" width="468" height="218" rx="34" fill="url(#space)"/>
  <g clip-path="url(#winclip)">${stars}
    <circle cx="820" cy="470" r="230" fill="url(#earth)"/>
    <path d="M640 300 C700 250 760 262 810 246 C870 228 930 250 1000 280" fill="none" stroke="#9be8ff" stroke-width="3" opacity=".35"/>
    <g class="sat"><rect x="-14" y="-5" width="28" height="10" fill="#c8d3e2"/><rect x="-44" y="-9" width="26" height="18" fill="#2a7bd8"/><rect x="18" y="-9" width="26" height="18" fill="#2a7bd8"/></g>
  </g>
  <rect x="566" y="76" width="468" height="218" rx="34" fill="none" stroke="#9fd8ff" stroke-opacity=".25" stroke-width="2"/>
  <path d="M600 92 L680 92 L610 160Z" fill="#fff" opacity=".05"/>
</g>

<!-- mission clock -->
<g data-dec="clock">
  <rect x="200" y="80" width="170" height="52" rx="8" fill="#060a14" stroke="#2c3b58" stroke-width="3"/>
  <text x="285" y="115" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="24" fill="#ff5a5a" class="clocktxt">T+03:12</text>
</g>

<!-- mission patch -->
<g data-dec="patch">
  <rect x="1236" y="164" width="86" height="98" rx="10" fill="#141d33" stroke="#2c3b58" stroke-width="3"/>
  <circle cx="1279" cy="202" r="24" fill="#0a1020" stroke="#ffcf5a" stroke-width="3"/>
  <text x="1279" y="210" text-anchor="middle" font-size="20" fill="#ff9f6b">✻</text>
  <text x="1279" y="248" text-anchor="middle" font-size="9" fill="#9fb3d6" letter-spacing="1">ORBIT CLI</text>
</g>

<!-- ============ POWER LEVER (switch) ============ -->
<g data-obj="switch" class="lever">
  <rect x="52" y="296" width="70" height="112" rx="10" fill="#141d33" stroke="#3a4864" stroke-width="3"/>
  <rect x="80" y="312" width="14" height="80" rx="7" fill="#060a14"/>
  <g class="tog"><rect x="66" y="314" width="42" height="22" rx="8" fill="#6dff9a"/><rect x="72" y="320" width="30" height="5" rx="2" fill="#0b2a1b" opacity=".5"/></g>
  <text x="87" y="404" text-anchor="middle" font-size="9" fill="#9fb3d6" letter-spacing="1.5">POWER</text>
</g>

<!-- ============ SUPPLY LOCKER (first lock) ============ -->
<g data-obj="locker" class="locker">
  <rect x="150" y="186" width="176" height="466" rx="8" fill="#0a1020"/>
  <rect x="164" y="210" width="148" height="6" fill="#2c3b58"/><rect x="164" y="470" width="148" height="6" fill="#2c3b58"/>
  <g class="gift">${glow(238, 420)}${fuse(238, 420)}</g>
  <g class="ldoor">
    <rect x="150" y="186" width="176" height="466" rx="8" fill="url(#steelv)" stroke="#1b2640" stroke-width="3"/>
    ${[0, 1, 2, 3, 4, 5].map(i => `<rect x="196" y="${214 + i * 12}" width="84" height="5" rx="2.5" fill="#1b2640"/>`).join('')}
    <rect x="178" y="320" width="120" height="40" rx="4" fill="#ffcf5a"/><text x="238" y="346" text-anchor="middle" font-size="15" font-weight="700" fill="#2a1a00" letter-spacing="2">SUPPLIES</text>
    <rect x="292" y="390" width="10" height="70" rx="5" fill="#9fb3d6"/>
    <g class="pl"><path d="M262 430 v-9 a11 11 0 0 1 22 0 v9" fill="none" stroke="#c8d3e2" stroke-width="5"/><rect x="255" y="428" width="36" height="30" rx="5" fill="#ff7a59"/><circle cx="273" cy="440" r="3.5" fill="#3b1206"/><rect x="271.5" y="441" width="3" height="9" fill="#3b1206"/></g>
  </g>
</g>

<!-- ============ FLOOR VENT (wrench) ============ -->
<g data-obj="vent" class="vent">
  <rect x="340" y="552" width="96" height="92" rx="6" fill="#05080f"/>
  <g class="gift">${glow(388, 598, 30)}${chip(388, 598)}</g>
  <g class="grille"><rect x="340" y="552" width="96" height="92" rx="6" fill="url(#vgrille)" stroke="#3a4864" stroke-width="4"/></g>
  ${[[348, 560, 0], [428, 560, 1], [348, 636, 2], [428, 636, 3]].map(([x, y, k]) => `<g class="bolt b${k}"><circle cx="${x}" cy="${y}" r="5.5" fill="#c8d3e2"/><path d="M${x - 3} ${y}h6M${x} ${y - 3}v6" stroke="#5b6b85" stroke-width="1.5"/></g>`).join('')}
  <g class="uwrench">${wrench(452, 548)}</g>
</g>

<!-- ============ MAIN CONSOLE (fuse) ============ -->
<g data-obj="console" class="console">
  ${[[468, 0], [622, 1], [776, 2]].map(([x, k]) => `<rect x="${x + 62}" y="456" width="16" height="16" fill="#27324a"/>
  <rect x="${x}" y="346" width="140" height="112" rx="8" fill="#141d33" stroke="#3a4864" stroke-width="3"/>
  <rect class="scr s${k}" x="${x + 8}" y="354" width="124" height="96" rx="4" fill="#03060c"/>`).join('')}
  <g class="scrtxt" font-family="JetBrains Mono, monospace" font-size="11">
    <text x="484" y="378" fill="#6dff9a">&gt; claude_code</text><text x="484" y="396" fill="#9fb3d6">.invoke(...)</text><text x="484" y="414" fill="#ffcf5a">Command(resume)</text><text x="484" y="432" fill="#ff7a59">3 cells…</text>
    <text x="638" y="380" fill="#6dff9a">🟢 grep_search</text><text x="638" y="398" fill="#7f8aa3">   /add.py:3</text><text x="638" y="416" fill="#6dff9a">🟢 read_file</text><text x="638" y="434" fill="#7f8aa3">   a = 2</text>
    <text x="792" y="380" fill="#3fd6ff">CARGO CRATE</text><text x="792" y="398" fill="#3fd6ff">→ ACCESS</text><text x="792" y="416" fill="#3fd6ff">  CARD</text><text x="792" y="438" fill="#6dff9a">CLI ▮</text>
  </g>
  <g class="boot" font-family="JetBrains Mono, monospace" font-size="12" fill="#3fd6ff"><text x="538" y="408" text-anchor="middle">BOOT…</text><text x="692" y="408" text-anchor="middle">BOOT…</text><text x="846" y="408" text-anchor="middle">BOOT…</text></g>
  <g class="gift">${glow(700, 448, 34)}${card(700, 448)}</g>
  <path d="M440 488 L920 488 L940 652 L420 652 Z" fill="url(#steelv)" stroke="#1b2640" stroke-width="3"/>
  <rect x="440" y="476" width="480" height="16" rx="6" fill="#5a6b8c"/>
  ${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<rect class="key k${i}" x="${490 + i * 34}" y="516" width="24" height="14" rx="3" fill="${['#3fd6ff', '#ffcf5a', '#ff7a59', '#6dff9a'][i % 4]}" opacity=".35"/>`).join('')}
  <rect x="486" y="548" width="290" height="70" rx="6" fill="#141d33"/>
  <g class="slot"><rect x="852" y="512" width="44" height="70" rx="6" fill="#05080f" stroke="#ffcf5a" stroke-width="2"/><text x="874" y="600" text-anchor="middle" font-size="9" fill="#ffcf5a" letter-spacing="1">FUSE</text></g>
  <g class="ufuse">${fuse(874, 547)}</g>
</g>

<!-- decor: cold coffee + space basil -->
<g data-dec="mug"><rect x="452" y="452" width="22" height="26" rx="4" fill="#ff7a59"/><path d="M474 458 a7 7 0 0 1 0 14" fill="none" stroke="#ff7a59" stroke-width="3"/></g>
<g data-dec="plant">
  <rect x="946" y="560" width="40" height="92" rx="8" fill="#9fd8ff" fill-opacity=".18" stroke="#9fd8ff" stroke-opacity=".5" stroke-width="2"/>
  <path d="M966 640 C966 610 952 600 950 584 M966 630 C970 600 984 594 984 578 M966 616 C962 596 970 586 966 570" stroke="#6dff9a" stroke-width="3" fill="none"/>
  <ellipse cx="950" cy="582" rx="7" ry="4" fill="#6dff9a"/><ellipse cx="984" cy="576" rx="7" ry="4" fill="#6dff9a"/><ellipse cx="966" cy="568" rx="6" ry="4" fill="#6dff9a"/>
</g>

<!-- ============ STATUS BEACON (lens) ============ -->
<g data-obj="beacon" class="beacon">
  <rect x="1132" y="60" width="16" height="30" fill="#3a4864"/>
  <circle class="rays" cx="1140" cy="124" r="70" fill="url(#beamg)"/>
  <circle cx="1140" cy="124" r="40" fill="#141d33" stroke="#5a6b8c" stroke-width="5"/>
  <circle class="bulb" cx="1140" cy="124" r="26" fill="#2a3550"/>
  <g class="ulens">${lens(1140, 124)}</g>
  <g class="gift">${glow(1140, 204, 30)}${wrench(1140, 196)}</g>
</g>

<!-- ============ HULL PANEL (cutter) — the Permission screen hides behind it ============ -->
<g data-obj="hull" class="hull">
  <rect x="1062" y="332" width="146" height="136" fill="#05080f"/>
  <g class="permscr" font-family="JetBrains Mono, monospace">
    <rect x="1072" y="342" width="126" height="76" rx="3" fill="none" stroke="#ffcf5a" stroke-width="2"/>
    <rect x="1102" y="335" width="66" height="14" fill="#05080f"/><text x="1135" y="346" text-anchor="middle" font-size="10" fill="#ffcf5a">Permission</text>
    <text x="1080" y="368" font-size="9" fill="#d9e3f0">edit_file {…}</text><text x="1080" y="386" font-size="8.5" fill="#9fb3d6">Do you want to</text><text x="1080" y="398" font-size="8.5" fill="#9fb3d6">proceed?</text><text x="1080" y="412" font-size="8" fill="#6dff9a">1  2  3</text>
  </g>
  <g class="gift">${glow(1135, 440, 28)}${plug(1122, 440)}</g>
  <g class="plate" clip-path="url(#hullclip)">
    <rect x="1062" y="332" width="146" height="136" fill="url(#steelv)" stroke="#1b2640" stroke-width="3"/>
    <path d="M1074 350 L1196 452 M1196 350 L1074 452" stroke="#ff5a5a" stroke-width="5" opacity=".75"/>
    <text x="1135" y="410" text-anchor="middle" font-size="12" font-weight="700" fill="#ffcf5a" letter-spacing="1.5" stroke="#141d33" stroke-width="4" paint-order="stroke">SEALED</text>
  </g>
  <rect class="seam" x="1062" y="332" width="146" height="136" fill="none" stroke="#ff9f6b" stroke-width="4" pathLength="100"/>
  <circle class="spark" cx="1062" cy="332" r="7" fill="#fff6c9"/>
  <g class="ucutter">${cutter(1040, 320)}</g>
</g>

<!-- ============ AIRLOCK CONTROL PANEL (override cable) ============ -->
<g data-obj="airlock" class="airlock">
  <rect x="1240" y="322" width="76" height="160" rx="8" fill="#141d33" stroke="#3a4864" stroke-width="3"/>
  <rect class="ascr" x="1250" y="334" width="56" height="58" rx="4" fill="#2a0b0b"/>
  <text class="a1" x="1278" y="368" text-anchor="middle" font-size="10" font-family="JetBrains Mono, monospace" fill="#ff5a5a">LOCKED</text>
  <text class="a2" x="1278" y="368" text-anchor="middle" font-size="10" font-family="JetBrains Mono, monospace" fill="#6dff9a">ACCESS</text>
  ${[0, 1, 2].map(i => `<rect x="${1252 + i * 18}" y="402" width="14" height="10" rx="2" fill="#2c3b58"/>`).join('')}
  <circle cx="1278" cy="450" r="13" fill="#05080f" stroke="#ffcf5a" stroke-width="2"/><circle cx="1278" cy="450" r="4" fill="#2c3b58"/>
  <path class="acable" d="M1278 462 C1278 520 1220 560 1200 650" fill="none" stroke="#ffcf5a" stroke-width="5" stroke-linecap="round" pathLength="100"/>
  <g class="uplug"><rect x="1268" y="440" width="20" height="20" rx="4" fill="#2a3550" stroke="#ffcf5a" stroke-width="2"/></g>
  <g class="gift">${glow(1278, 296, 30)}${cart(1278, 296)}</g>
</g>

<!-- ============ NAVIGATION COMPUTER (star-chart cartridge) ============ -->
<g data-obj="nav" class="nav">
  <rect x="1236" y="600" width="38" height="100" fill="#27324a"/>
  <ellipse cx="1255" cy="704" rx="58" ry="12" fill="#141d33"/>
  <path d="M1170 512 L1340 512 L1328 604 L1182 604 Z" fill="#141d33" stroke="#5a6b8c" stroke-width="3"/>
  <rect class="nscr" x="1188" y="522" width="134" height="72" rx="4" fill="#03060c"/>
  <g class="map"><circle cx="1255" cy="558" r="26" fill="none" stroke="#b58cff" stroke-width="1.5" stroke-dasharray="4 4"/><circle cx="1255" cy="558" r="14" fill="none" stroke="#3fd6ff" stroke-width="1.5"/><circle cx="1281" cy="558" r="3.5" fill="#ffcf5a"/><circle cx="1255" cy="544" r="2.5" fill="#6dff9a"/></g>
  <text class="ntxt" x="1255" y="588" text-anchor="middle" font-size="9" font-family="JetBrains Mono, monospace" fill="#6dff9a">COURSE SET</text>
  <rect x="1226" y="614" width="58" height="12" rx="4" fill="#05080f" stroke="#b58cff" stroke-width="2"/>
  <g class="ucart">${cart(1255, 600)}</g>
  <g class="gift">${glow(1200, 488, 30)}${podkey(1186, 488)}</g>
</g>

<!-- ============ ESCAPE POD HATCH (door) ============ -->
<g class="leds">${[0, 1, 2, 3, 4].map(i => `<rect class="led" data-z="${i}" x="${1376 + i * 34}" y="148" width="28" height="9" rx="4" fill="#4a1414"/>`).join('')}</g>
<g data-obj="door" class="hatch">
  <rect x="1338" y="168" width="244" height="494" rx="40" fill="#27324a" stroke="#3a4864" stroke-width="6"/>
  <g clip-path="url(#podclip)">
    <rect class="podin" x="1352" y="182" width="216" height="466" fill="url(#podlight)"/>
    <g class="sunrays" opacity="0">${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<path d="M1460 415 L${1460 + 400 * Math.cos(i * Math.PI / 4)} ${415 + 400 * Math.sin(i * Math.PI / 4)} L${1460 + 400 * Math.cos(i * Math.PI / 4 + .2)} ${415 + 400 * Math.sin(i * Math.PI / 4 + .2)}Z" fill="#fff" opacity=".35"/>`).join('')}</g>
    <g class="leaf lf"><rect x="1352" y="182" width="108" height="466" fill="url(#hatchg)"/><rect x="1440" y="182" width="20" height="466" fill="#ffcf5a" opacity=".9"/>${[0, 1, 2, 3, 4, 5, 6].map(i => `<rect x="1440" y="${196 + i * 66}" width="20" height="30" fill="#141d33"/>`).join('')}</g>
    <g class="leaf rt"><rect x="1460" y="182" width="108" height="466" fill="url(#hatchg)"/><rect x="1460" y="182" width="20" height="466" fill="#ffcf5a" opacity=".9"/>${[0, 1, 2, 3, 4, 5, 6].map(i => `<rect x="1460" y="${229 + i * 66}" width="20" height="30" fill="#141d33"/>`).join('')}</g>
    <g class="port"><circle cx="1460" cy="300" r="42" fill="#03060c" stroke="#9fb3d6" stroke-width="6"/>${stars.split('/>').slice(0, 10).map(s => s ? s.replace(/cx="(\d+)" cy="(\d+)"/, (_, x, y) => `cx="${1430 + (+x % 60)}" cy="${272 + (+y % 56)}"`) + '/>' : '').join('')}</g>
  </g>
  <text class="podtxt" x="1460" y="612" text-anchor="middle" font-size="16" font-weight="700" letter-spacing="3" fill="#ffcf5a" stroke="#141d33" stroke-width="4" paint-order="stroke">ESCAPE POD</text>
  <g><rect x="1350" y="404" width="34" height="56" rx="6" fill="#141d33" stroke="#ffcf5a" stroke-width="2"/><circle cx="1367" cy="424" r="6" fill="#05080f"/><rect x="1364" y="428" width="6" height="14" fill="#05080f"/></g>
  <g class="ukey"><g class="turn">${podkey(1367, 432, '#ffcf5a')}</g></g>
</g>

<!-- ============ REPAIR DRONE (chip) ============ -->
<g data-obj="drone" class="drone" transform="translate(1118 0)">
  <ellipse class="dshadow" cx="282" cy="842" rx="78" ry="12" fill="#000" opacity=".45"/>
  <g class="dbody">
    <path class="thrust" d="M256 812 L282 870 L308 812Z" fill="#3fd6ff" opacity="0"/>
    <rect x="206" y="738" width="152" height="80" rx="38" fill="#d9e3f0" stroke="#5b6b85" stroke-width="3"/>
    <rect x="226" y="752" width="112" height="44" rx="20" fill="#0a1020"/>
    <circle class="eye" cx="260" cy="774" r="9" fill="#2a3550"/><circle class="eye" cx="304" cy="774" r="9" fill="#2a3550"/>
    <rect x="270" y="718" width="24" height="22" rx="4" fill="#5b6b85"/><rect class="cslot" x="275" y="722" width="14" height="10" rx="2" fill="#05080f"/>
    <path d="M206 772 h-26 M358 772 h26" stroke="#5b6b85" stroke-width="6" stroke-linecap="round"/>
    <circle cx="176" cy="772" r="9" fill="#5b6b85"/><circle cx="388" cy="772" r="9" fill="#5b6b85"/>
    <text class="zz" x="350" y="728" font-size="18" fill="#9fb3d6" font-weight="700">z z</text>
  </g>
  <g class="uchip">${chip(282, 690)}</g>
  <g class="gift">${glow(124, 800, 32)}${cutter(124, 800)}</g>
</g>

<!-- decor: a spare helmet on the floor -->
<g data-dec="helmet">
  <ellipse cx="270" cy="836" rx="70" ry="10" fill="#000" opacity=".4"/>
  <path d="M206 830 a64 64 0 0 1 128 0 Z" fill="#d9e3f0" stroke="#5b6b85" stroke-width="3"/>
  <path d="M222 826 a48 44 0 0 1 96 0 Z" fill="#1a2748"/>
  <path d="M236 806 q14 -18 34 -20" stroke="#9fd8ff" stroke-width="4" fill="none" opacity=".5"/>
  <rect x="200" y="826" width="140" height="12" rx="5" fill="#ff7a59"/>
</g>

<!-- ============ CARGO CRATE (access card) ============ -->
<g data-obj="crate" class="crate">
  <rect x="984" y="712" width="196" height="122" rx="6" fill="#4a3a20"/>
  <g class="gift">${glow(1082, 706, 32)}${lens(1082, 706)}</g>
  <rect x="984" y="712" width="196" height="122" rx="6" fill="#ffb547" stroke="#5a3d0a" stroke-width="3"/>
  <path d="M984 742 h196 M984 804 h196" stroke="#5a3d0a" stroke-width="3"/>
  <text x="1062" y="782" text-anchor="middle" font-size="17" font-weight="700" fill="#5a3d0a" letter-spacing="2">LIBRARIES</text>
  <g class="lid"><rect x="976" y="692" width="212" height="26" rx="5" fill="#ffc76b" stroke="#5a3d0a" stroke-width="3"/></g>
  <rect x="1136" y="752" width="34" height="48" rx="4" fill="#141d33"/><rect class="rled" x="1145" y="760" width="16" height="6" rx="2" fill="#ff3b3b"/><rect x="1142" y="774" width="22" height="4" fill="#05080f"/>
  <g class="ucard">${card(1153, 742)}</g>
</g>
</svg>`;
})();
