/* ═══════════════════════════════════════════════════════════
   SOUSUKE — Calculadora de Batalha
   Janela flutuante: arrastável, redimensionável
   HP/EA · 3 alvos com camadas Fushoku · Log
═══════════════════════════════════════════════════════════ */

/* ── TRANSIÇÃO DE SAÍDA: esporos verdes cobrindo a tela ── */
window.GE_TRANSITION = function(canvas, done) {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const COLORS = ['#6aaa48','#a8c460','#c09030','#4a8830','#8acc40','#507818','#d0b040'];

  // Spores: small circles drifting up and sideways
  const spores = Array.from({length: 160}, () => ({
    x: Math.random() * W,
    y: H + 20 + Math.random() * H * .5,
    r: 1.5 + Math.random() * 5,
    vx: (Math.random() - .5) * 2,
    vy: -(2 + Math.random() * 5),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    alpha: .4 + Math.random() * .5,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpd: .04 + Math.random() * .06
  }));

  let bgAlpha = 0, frame = 0, navigated = false;

  function tick() {
    frame++;
    ctx.clearRect(0, 0, W, H);

    bgAlpha = Math.min(1, bgAlpha + 0.02);
    ctx.fillStyle = `rgba(2,4,1,${bgAlpha})`;
    ctx.fillRect(0, 0, W, H);

    let allDone = true;
    spores.forEach(s => {
      s.wobble += s.wobbleSpd;
      s.x += s.vx + Math.sin(s.wobble) * .8;
      s.y += s.vy;
      s.vy *= .998;
      if (s.y > -s.r * 2) allDone = false;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.globalAlpha = s.alpha * Math.min(1, frame / 10);
      ctx.fillStyle = s.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    if (!navigated && bgAlpha >= 1) { navigated = true; done(); return; }
    if (!navigated) requestAnimationFrame(tick);
  }
  tick();
};

/* ═══════════════════════════════════════════════════════════
   BATTLE CALCULATOR
═══════════════════════════════════════════════════════════ */
(function() {

  /* ── FUSHOKU LAYER DATA ── */
  const FASES = {
    1: { nome: 'Contaminação',  range: [1,3],  cor: 'rgba(168,196,96,.7)' },
    2: { nome: 'Infestação',    range: [4,6],  cor: 'rgba(192,144,48,.7)' },
    3: { nome: 'Dominação',     range: [7,9],  cor: 'rgba(208,100,48,.75)' },
    4: { nome: 'Esporulação',   range: [10,10],cor: 'rgba(208,64,64,.8)' },
  };
  function getFase(c) {
    if (c <= 0)  return null;
    if (c <= 3)  return 1;
    if (c <= 6)  return 2;
    if (c <= 9)  return 3;
    return 4;
  }
  const LAYER_EFFECTS = {
    1:  'Fungo visível · fácil detecção',
    2:  'Leve dano passivo por turno',
    3:  'Dano passivo moderado',
    4:  'Mobilidade reduzida',
    5:  'Dano passivo alto',
    6:  'Área infectada ao redor',
    7:  'Controle parcial disponível',
    8:  'Controle total disponível',
    9:  'Dano passivo severo',
    10: 'Esporulação terminal · shikigami gerados',
  };

  /* ── STATE ── */
  const S = {
    hp: 19, hpMax: 19,
    ea: 26, eaMax: 26,
    targets: [
      { nome: 'Alvo 1', camadas: 0 },
      { nome: 'Alvo 2', camadas: 0 },
      { nome: 'Alvo 3', camadas: 0 },
    ],
    log: []
  };

  /* ── LOG ── */
  function log(msg, type = 'info') {
    S.log.unshift({ msg, type, ts: new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) });
    if (S.log.length > 60) S.log.pop();
    renderLog();
  }

  /* ── STYLES ── */
  const style = document.createElement('style');
  style.textContent = `
    #sou-calc {
      position: fixed; z-index: 9000;
      bottom: 80px; right: 24px;
      width: 380px; min-width: 300px; max-width: 620px;
      min-height: 200px;
      background: rgba(4,8,2,.97);
      border: 1px solid rgba(58,110,42,.4);
      font-family: 'Inconsolata', monospace;
      display: flex; flex-direction: column;
      box-shadow: 0 0 40px rgba(58,110,42,.1), 0 8px 32px rgba(0,0,0,.8);
      resize: both; overflow: hidden;
    }
    #sou-calc.minimized .calc-body { display: none; }

    #sou-calc .calc-titlebar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 12px;
      background: rgba(30,52,14,.4);
      border-bottom: 1px solid rgba(58,110,42,.3);
      cursor: grab; user-select: none; flex-shrink: 0;
    }
    #sou-calc .calc-titlebar:active { cursor: grabbing; }
    #sou-calc .calc-title {
      font-size: .5rem; letter-spacing: .35em; text-transform: uppercase;
      color: rgba(106,170,72,.6);
    }
    #sou-calc .calc-win-btns { display: flex; gap: 6px; }
    #sou-calc .calc-win-btn {
      width: 14px; height: 14px; border-radius: 50%;
      border: none; cursor: pointer; font-size: 9px;
      display: flex; align-items: center; justify-content: center;
      transition: filter .15s;
    }
    #sou-calc .calc-win-btn:hover { filter: brightness(1.4); }
    #sou-calc .calc-win-btn.min   { background: rgba(106,170,72,.5); color: rgba(2,6,1,.9); }
    #sou-calc .calc-win-btn.close { background: rgba(180,40,40,.5);  color: rgba(2,6,1,.9); }

    #sou-calc .calc-body {
      flex: 1; overflow-y: auto; padding: 14px;
      display: flex; flex-direction: column; gap: 12px;
    }
    #sou-calc .calc-body::-webkit-scrollbar { width: 3px; }
    #sou-calc .calc-body::-webkit-scrollbar-thumb { background: rgba(58,110,42,.3); }

    #sou-calc .cs { border: 1px solid rgba(30,52,14,.7); background: rgba(0,0,0,.35); }
    #sou-calc .cs-head {
      padding: 6px 10px;
      border-bottom: 1px solid rgba(30,52,14,.6);
      font-size: .46rem; letter-spacing: .3em; text-transform: uppercase;
      color: rgba(106,170,72,.5);
    }
    #sou-calc .cs-body { padding: 10px; }

    /* resources */
    #sou-calc .res-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    #sou-calc .res-label { font-size: .44rem; letter-spacing: .2em; text-transform: uppercase; color: rgba(120,160,80,.4); width: 28px; }
    #sou-calc .res-track {
      flex: 1; height: 8px;
      background: rgba(255,255,255,.05);
      border: 1px solid rgba(40,70,20,.25); position: relative; overflow: hidden;
    }
    #sou-calc .res-fill { position: absolute; left: 0; top: 0; bottom: 0; transition: width .3s; }
    #sou-calc .res-fill.hp { background: linear-gradient(90deg, #3a6e1a, #6aaa48); }
    #sou-calc .res-fill.ea { background: linear-gradient(90deg, #507818, #a8c460); }
    #sou-calc .res-val { font-size: .7rem; min-width: 60px; text-align: right; color: rgba(168,196,96,.7); }
    #sou-calc .res-val span { color: rgba(80,110,40,.4); font-size: .55rem; }

    /* buttons */
    #sou-calc .btn-row { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 6px; }
    #sou-calc .cbtn {
      flex: 1; min-width: 40px; padding: 5px 4px;
      background: transparent;
      border: 1px solid rgba(40,70,20,.35);
      color: rgba(120,170,70,.5);
      font-family: 'Inconsolata', monospace;
      font-size: .48rem; letter-spacing: .1em; text-transform: uppercase;
      cursor: pointer; transition: all .15s; white-space: nowrap;
    }
    #sou-calc .cbtn:hover        { border-color: rgba(106,170,72,.55); color: rgba(160,220,90,.9); background: rgba(58,110,42,.06); }
    #sou-calc .cbtn.danger:hover { border-color: rgba(200,60,60,.5);   color: rgba(220,100,100,.9); background: rgba(180,40,40,.05); }
    #sou-calc .cbtn.heal:hover   { border-color: rgba(80,184,40,.5);   color: rgba(120,220,70,.9); background: rgba(46,120,18,.06); }
    #sou-calc .cbtn.primary      { border-color: rgba(58,110,42,.45);  color: rgba(106,170,72,.7); }

    #sou-calc .cinput {
      background: rgba(255,255,255,.04);
      border: 1px solid rgba(40,70,20,.3);
      color: rgba(168,196,96,.8);
      font-family: 'Inconsolata', monospace; font-size: .7rem;
      padding: 4px 8px; outline: none; width: 60px; text-align: center;
      transition: border-color .15s;
    }
    #sou-calc .cinput:focus { border-color: rgba(106,170,72,.5); }

    /* target cards */
    .sou-target {
      border: 1px solid rgba(40,70,20,.4);
      background: rgba(0,0,0,.25);
      margin-bottom: 8px;
      transition: border-color .3s;
    }
    .sou-target.phase-1 { border-color: rgba(100,160,60,.35); }
    .sou-target.phase-2 { border-color: rgba(192,144,48,.4); }
    .sou-target.phase-3 { border-color: rgba(208,100,48,.45); }
    .sou-target.phase-4 { border-color: rgba(208,64,64,.55); box-shadow: 0 0 12px rgba(208,64,64,.12); }

    .sou-target-head {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 10px;
      border-bottom: 1px solid rgba(40,70,20,.3);
    }
    .sou-target-name {
      flex: 1; background: transparent; border: none; outline: none;
      font-family: 'Inconsolata', monospace; font-size: .6rem;
      letter-spacing: .15em; color: rgba(168,196,96,.75);
      cursor: text;
    }
    .sou-target-name::placeholder { color: rgba(80,110,40,.3); }
    .sou-target-phase {
      font-size: .42rem; letter-spacing: .15em; text-transform: uppercase;
      padding: 2px 6px; border: 1px solid;
    }

    .sou-target-body { padding: 8px 10px; }

    /* layer bar */
    .layer-track {
      display: flex; gap: 2px; margin-bottom: 6px; align-items: center;
    }
    .layer-pip {
      flex: 1; height: 10px; border: 1px solid rgba(40,60,20,.3);
      background: rgba(255,255,255,.04); transition: background .2s, border-color .2s;
      cursor: default;
    }
    .layer-pip.active-1 { background: rgba(100,160,60,.5);  border-color: rgba(140,200,80,.3); }
    .layer-pip.active-2 { background: rgba(192,144,48,.55); border-color: rgba(220,180,60,.3); }
    .layer-pip.active-3 { background: rgba(208,100,48,.6);  border-color: rgba(240,130,60,.3); }
    .layer-pip.active-4 { background: rgba(208,64,64,.7);   border-color: rgba(240,80,80,.4); }
    .layer-count {
      font-size: .9rem; font-weight: bold; min-width: 26px; text-align: right;
      transition: color .2s;
    }
    .layer-count.p0 { color: rgba(80,100,50,.3); }
    .layer-count.p1 { color: rgba(140,200,80,.7); }
    .layer-count.p2 { color: rgba(220,180,60,.8); }
    .layer-count.p3 { color: rgba(240,130,60,.85); }
    .layer-count.p4 { color: rgba(240,80,80,.9); }

    .layer-effect {
      font-size: .46rem; color: rgba(120,160,80,.45); letter-spacing: .1em;
      margin-bottom: 6px; min-height: 14px; font-style: italic;
    }

    .sou-target-btns { display: flex; gap: 4px; }
    .sou-target-btns .cbtn { font-size: .44rem; padding: 4px 6px; }

    /* log */
    #sou-calc .log-list {
      max-height: 120px; overflow-y: auto;
      display: flex; flex-direction: column; gap: 3px;
    }
    #sou-calc .log-list::-webkit-scrollbar { width: 2px; }
    #sou-calc .log-list::-webkit-scrollbar-thumb { background: rgba(58,110,42,.2); }
    #sou-calc .log-entry {
      font-size: .5rem; line-height: 1.6; padding: 2px 0;
      border-bottom: 1px solid rgba(40,70,20,.08);
      display: flex; gap: 8px;
    }
    #sou-calc .log-ts  { color: rgba(60,90,30,.35); flex-shrink: 0; }
    #sou-calc .log-msg { flex: 1; }
    #sou-calc .log-entry.damage .log-msg { color: rgba(220,100,80,.8); }
    #sou-calc .log-entry.heal   .log-msg { color: rgba(100,200,60,.8); }
    #sou-calc .log-entry.layer  .log-msg { color: rgba(168,196,96,.75); }
    #sou-calc .log-entry.spore  .log-msg { color: rgba(208,64,64,.85); }
    #sou-calc .log-entry.ea     .log-msg { color: rgba(160,210,80,.75); }
    #sou-calc .log-entry.info   .log-msg { color: rgba(100,130,60,.45); }
  `;
  document.head.appendChild(style);

  /* ── BUILD DOM ── */
  const win = document.createElement('div');
  win.id = 'sou-calc';
  win.innerHTML = `
    <div class="calc-titlebar" id="sou-calc-bar">
      <span class="calc-title">🍄 Sousuke · Batalha</span>
      <div class="calc-win-btns">
        <button class="calc-win-btn min"   title="Minimizar">─</button>
        <button class="calc-win-btn close" title="Fechar">✕</button>
      </div>
    </div>
    <div class="calc-body">

      <!-- HP / EA -->
      <div class="cs">
        <div class="cs-head">Recursos</div>
        <div class="cs-body">
          <div class="res-row">
            <div class="res-label">HP</div>
            <div class="res-track"><div class="res-fill hp" id="sou-hp-fill"></div></div>
            <div class="res-val" id="sou-hp-val">19 <span>/ 19</span></div>
          </div>
          <div class="btn-row">
            <input class="cinput" id="sou-hp-amt" value="1" type="number" min="1">
            <button class="cbtn danger" onclick="souBattle.dmg()">− Dano</button>
            <button class="cbtn heal"   onclick="souBattle.heal()">+ Cura</button>
            <button class="cbtn"        onclick="souBattle.setMaxHp()">Def. Máx</button>
          </div>
          <div class="res-row" style="margin-top:10px">
            <div class="res-label">EA</div>
            <div class="res-track"><div class="res-fill ea" id="sou-ea-fill"></div></div>
            <div class="res-val" id="sou-ea-val">26 <span>/ 26</span></div>
          </div>
          <div class="btn-row">
            <input class="cinput" id="sou-ea-amt" value="3" type="number" min="1">
            <button class="cbtn danger" onclick="souBattle.useEa()">− Gastar</button>
            <button class="cbtn heal"   onclick="souBattle.gainEa()">+ Ganhar</button>
            <button class="cbtn"        onclick="souBattle.setMaxEa()">Def. Máx</button>
          </div>
        </div>
      </div>

      <!-- ALVOS / FUSHOKU -->
      <div class="cs">
        <div class="cs-head" style="display:flex;justify-content:space-between;align-items:center">
          <span>Alvos · Camadas Fushoku</span>
          <button class="cbtn" style="flex:0;padding:2px 8px;font-size:.4rem" onclick="souBattle.resetAllTargets()">↺ Reset</button>
        </div>
        <div class="cs-body" id="sou-targets"></div>
      </div>

      <!-- LOG -->
      <div class="cs">
        <div class="cs-head" style="display:flex;justify-content:space-between;align-items:center">
          <span>Log de Ações</span>
          <button class="cbtn" style="flex:0;padding:2px 8px;font-size:.4rem" onclick="souBattle.clearLog()">Limpar</button>
        </div>
        <div class="cs-body">
          <div class="log-list" id="sou-log"></div>
        </div>
      </div>

    </div>
  `;
  document.body.appendChild(win);

  /* ── DRAG ── */
  const bar = win.querySelector('#sou-calc-bar');
  let dragging = false, ox = 0, oy = 0;
  bar.addEventListener('mousedown', e => {
    dragging = true;
    ox = e.clientX - win.offsetLeft;
    oy = e.clientY - win.offsetTop;
    win.style.bottom = 'auto'; win.style.right = 'auto';
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    win.style.left = (e.clientX - ox) + 'px';
    win.style.top  = (e.clientY - oy) + 'px';
  });
  document.addEventListener('mouseup', () => { dragging = false; });

  win.querySelector('.calc-win-btn.min').addEventListener('click', () => win.classList.toggle('minimized'));
  win.querySelector('.calc-win-btn.close').addEventListener('click', () => win.remove());

  /* ── RENDER ── */
  function renderResources() {
    document.getElementById('sou-hp-fill').style.width = Math.max(0, S.hp/S.hpMax*100) + '%';
    document.getElementById('sou-hp-val').innerHTML = `${S.hp} <span>/ ${S.hpMax}</span>`;
    document.getElementById('sou-ea-fill').style.width = Math.max(0, S.ea/S.eaMax*100) + '%';
    document.getElementById('sou-ea-val').innerHTML = `${S.ea} <span>/ ${S.eaMax}</span>`;
  }

  function renderTargets() {
    const container = document.getElementById('sou-targets');
    container.innerHTML = '';
    S.targets.forEach((t, i) => {
      const fase = getFase(t.camadas);
      const faseData = fase ? FASES[fase] : null;
      const phaseClass = fase ? `phase-${fase}` : '';
      const countClass = `p${fase || 0}`;
      const effect = t.camadas > 0 ? (LAYER_EFFECTS[t.camadas] || '') : 'Sem infecção';

      const card = document.createElement('div');
      card.className = `sou-target ${phaseClass}`;
      card.innerHTML = `
        <div class="sou-target-head">
          <input class="sou-target-name" value="${t.nome}" placeholder="Nome do alvo"
            onchange="souBattle.renameTarget(${i}, this.value)">
          ${faseData ? `<span class="sou-target-phase" style="color:${faseData.cor};border-color:${faseData.cor.replace('.7',',.35').replace('.75',',.4').replace('.8',',.45')}">${faseData.nome}</span>` : '<span class="sou-target-phase" style="color:rgba(80,100,50,.3);border-color:rgba(40,60,20,.2)">Limpo</span>'}
        </div>
        <div class="sou-target-body">
          <div class="layer-track">
            ${Array.from({length:10},(_,j)=>{
              const pip = j + 1;
              const f = getFase(pip);
              const active = pip <= t.camadas ? `active-${f}` : '';
              return `<div class="layer-pip ${active}" title="C${pip}"></div>`;
            }).join('')}
            <div class="layer-count ${countClass}">${t.camadas}</div>
          </div>
          <div class="layer-effect">${effect}</div>
          <div class="sou-target-btns">
            <button class="cbtn primary" onclick="souBattle.addLayer(${i}, 1)">+ Camada</button>
            <button class="cbtn danger"  onclick="souBattle.addLayer(${i}, -1)">− Camada</button>
            <button class="cbtn"         onclick="souBattle.setLayer(${i})">Def. N</button>
            <input class="cinput" id="sou-layer-amt-${i}" value="1" type="number" min="0" max="10" style="width:44px">
            <button class="cbtn danger"  onclick="souBattle.clearTarget(${i})">✕</button>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function renderLog() {
    const el = document.getElementById('sou-log');
    el.innerHTML = S.log.map(e =>
      `<div class="log-entry ${e.type}"><span class="log-ts">${e.ts}</span><span class="log-msg">${e.msg}</span></div>`
    ).join('');
  }

  function render() { renderResources(); renderTargets(); }

  function getAmt(id) { return Math.max(1, parseInt(document.getElementById(id)?.value) || 1); }

  /* ── ACTIONS ── */
  window.souBattle = {
    dmg() {
      const v = getAmt('sou-hp-amt');
      S.hp = Math.max(0, S.hp - v);
      log(`Tomou ${v} de dano · HP ${S.hp}/${S.hpMax}`, 'damage');
      render();
    },
    heal() {
      const v = getAmt('sou-hp-amt');
      S.hp = Math.min(S.hpMax, S.hp + v);
      log(`Regeneração Micelial +${v} · HP ${S.hp}/${S.hpMax}`, 'heal');
      render();
    },
    setMaxHp() {
      const v = getAmt('sou-hp-amt');
      S.hpMax = v; S.hp = Math.min(S.hp, v);
      log(`HP máximo definido: ${v}`, 'info');
      render();
    },
    useEa() {
      const v = getAmt('sou-ea-amt');
      const custo = Math.max(0, v - 3); // Origem: todas técnicas –3 EA
      if (S.ea < custo) { log(`EA insuficiente (${S.ea} disponível, custo líquido: ${custo})`, 'info'); return; }
      S.ea -= custo;
      log(`Gastou ${v} EA (–3 origem = ${custo} real) · EA ${S.ea}/${S.eaMax}`, 'ea');
      render();
    },
    gainEa() {
      const v = getAmt('sou-ea-amt');
      S.ea = Math.min(S.eaMax, S.ea + v);
      log(`Recuperou ${v} EA · EA ${S.ea}/${S.eaMax}`, 'heal');
      render();
    },
    setMaxEa() {
      const v = getAmt('sou-ea-amt');
      S.eaMax = v; S.ea = Math.min(S.ea, v);
      log(`EA máxima definida: ${v}`, 'info');
      render();
    },
    renameTarget(i, nome) {
      S.targets[i].nome = nome || `Alvo ${i+1}`;
    },
    addLayer(i, delta) {
      const t = S.targets[i];
      const prev = t.camadas;
      t.camadas = Math.max(0, Math.min(10, t.camadas + delta));
      if (t.camadas === prev) return;
      const tipo = delta > 0 ? 'layer' : 'info';
      if (t.camadas === 10) {
        log(`☣ ${t.nome} atingiu C10 · Esporulação Terminal!`, 'spore');
      } else {
        log(`${t.nome}: C${prev} → C${t.camadas} · ${LAYER_EFFECTS[t.camadas] || ''}`, tipo);
      }
      renderTargets();
    },
    setLayer(i) {
      const v = Math.max(0, Math.min(10, parseInt(document.getElementById(`sou-layer-amt-${i}`)?.value) || 0));
      const t = S.targets[i];
      const prev = t.camadas;
      t.camadas = v;
      if (v === 10) {
        log(`☣ ${t.nome} definido em C10 · Esporulação Terminal!`, 'spore');
      } else {
        log(`${t.nome}: C${prev} → C${v}`, 'layer');
      }
      renderTargets();
    },
    clearTarget(i) {
      const t = S.targets[i];
      log(`${t.nome} curado · camadas zeradas`, 'info');
      t.camadas = 0;
      renderTargets();
    },
    resetAllTargets() {
      S.targets.forEach(t => { t.camadas = 0; });
      log('Todos os alvos resetados', 'info');
      renderTargets();
    },
    clearLog() { S.log = []; renderLog(); }
  };

  render();
  log('Calculadora iniciada · HP 19 · EA 26 · Origem: –3 EA em técnicas', 'info');

  /* ── TOGGLE BUTTON ── */
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'sou-calc-toggle';
  const ts = document.createElement('style');
  ts.textContent = `
    #sou-calc-toggle {
      position: fixed; bottom: 24px; right: 24px; z-index: 8001;
      font-family: 'Inconsolata', monospace; font-size: .48rem;
      letter-spacing: .28em; text-transform: uppercase;
      padding: 8px 16px; border: 1px solid rgba(58,110,42,.35);
      color: rgba(106,170,72,.55); background: rgba(2,5,1,.9);
      cursor: pointer; backdrop-filter: blur(8px); transition: all .2s;
    }
    #sou-calc-toggle:hover {
      border-color: rgba(106,170,72,.6); color: rgba(140,210,90,.9);
      background: rgba(4,10,2,.95);
    }
  `;
  document.head.appendChild(ts);
  toggleBtn.textContent = '🍄 Batalha';
  toggleBtn.addEventListener('click', () => {
    win.style.display = win.style.display === 'none' ? 'flex' : 'none';
  });
  document.body.appendChild(toggleBtn);
  win.style.display = 'none';

})();
