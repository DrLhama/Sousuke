/* ═══════════════════════════════════════════════════════════
   FOO — Calculadora de Batalha
   Janela flutuante: arrastável, redimensionável
   HP/EA · Campo de sementes com juros · Kakashi · Log
═══════════════════════════════════════════════════════════ */

/* ── TRANSIÇÃO DE SAÍDA: folhas douradas cobrindo a tela ── */
window.GE_TRANSITION = function(canvas, done) {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const COLORS = ['#f8a830','#e87010','#82dc30','#50b812','#ffd050','#b4f060','#c86010'];
  const leaves = Array.from({length: 120}, () => ({
    x: Math.random() * W * 1.4 - W * 0.2,
    y: -20 - Math.random() * H * 0.5,
    w: 8 + Math.random() * 18,
    h: 10 + Math.random() * 22,
    rot: Math.random() * Math.PI * 2,
    rotSpd: (Math.random() - .5) * .12,
    vx: (Math.random() - .4) * 3,
    vy: 4 + Math.random() * 7,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    alpha: .7 + Math.random() * .3,
    shape: Math.floor(Math.random() * 3),
    landed: false, landY: H * (.3 + Math.random() * .8)
  }));

  let bgAlpha = 0;
  let frame = 0;
  let navigated = false;

  function drawLeaf(l) {
    ctx.save();
    ctx.translate(l.x, l.y); ctx.rotate(l.rot);
    ctx.globalAlpha = l.alpha * Math.min(1, frame / 8);
    ctx.fillStyle = l.color; ctx.beginPath();
    if (l.shape === 0) {
      ctx.ellipse(0, 0, l.w/2, l.h/2, 0, 0, Math.PI*2);
    } else if (l.shape === 1) {
      ctx.moveTo(0,-l.h/2);ctx.lineTo(l.w/2,0);ctx.lineTo(0,l.h/2);ctx.lineTo(-l.w/2,0);ctx.closePath();
    } else {
      ctx.moveTo(0,-l.h/2);
      ctx.bezierCurveTo(l.w/2,-l.h/4,l.w/2,l.h/4,0,l.h/2);
      ctx.bezierCurveTo(-l.w/2,l.h/4,-l.w/2,-l.h/4,0,-l.h/2);
    }
    ctx.fill(); ctx.restore();
  }

  function tick() {
    frame++;
    ctx.clearRect(0, 0, W, H);

    // dark bg grows in
    bgAlpha = Math.min(1, bgAlpha + 0.025);
    ctx.fillStyle = `rgba(6,4,0,${bgAlpha})`;
    ctx.fillRect(0, 0, W, H);

    let allLanded = true;
    leaves.forEach(l => {
      if (!l.landed) {
        l.x += l.vx + Math.sin(l.y * .015) * 1.2;
        l.y += l.vy; l.rot += l.rotSpd;
        l.vy *= .995;
        if (l.y >= l.landY) { l.landed = true; l.y = l.landY; }
        else allLanded = false;
      }
      drawLeaf(l);
    });

    if (!navigated && bgAlpha >= 1 && allLanded) {
      navigated = true; done(); return;
    }
    if (!navigated) requestAnimationFrame(tick);
  }
  tick();
};

/* ═══════════════════════════════════════════════════════════
   BATTLE CALCULATOR
═══════════════════════════════════════════════════════════ */
(function() {

  /* ── STATE ── */
  const S = {
    hp: 15, hpMax: 15,
    ea: 20, eaMax: 20,
    field: [],        // [{id, turno, juros}]
    kakashiActive: false,
    kakashiHp: 0,
    log: [],
    nextSeedId: 1
  };

  /* juros table: turno → valor base acumulado */
  const JUROS = [0, 8, 12, 18, 26, 32, 40, 48];
  function jurosValue(t) { return JUROS[Math.min(t, JUROS.length-1)]; }

  /* ── LOG ── */
  function log(msg, type='info') {
    S.log.unshift({ msg, type, ts: new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) });
    if (S.log.length > 60) S.log.pop();
    renderLog();
  }

  /* ── STYLES ── */
  const style = document.createElement('style');
  style.textContent = `
    #foo-calc {
      position: fixed; z-index: 9000;
      bottom: 80px; right: 24px;
      width: 360px; min-width: 280px; max-width: 600px;
      min-height: 200px;
      background: rgba(10,7,0,.97);
      border: 1px solid rgba(184,72,0,.4);
      font-family: 'Inconsolata', monospace;
      display: flex; flex-direction: column;
      box-shadow: 0 0 40px rgba(232,112,16,.12), 0 8px 32px rgba(0,0,0,.8);
      resize: both; overflow: hidden;
    }
    #foo-calc.minimized .calc-body { display: none; }

    .calc-titlebar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 12px;
      background: rgba(110,34,0,.35);
      border-bottom: 1px solid rgba(184,72,0,.3);
      cursor: grab; user-select: none; flex-shrink: 0;
    }
    .calc-titlebar:active { cursor: grabbing; }
    .calc-title {
      font-size: .5rem; letter-spacing: .35em; text-transform: uppercase;
      color: rgba(248,168,48,.6);
    }
    .calc-win-btns { display: flex; gap: 6px; }
    .calc-win-btn {
      width: 14px; height: 14px; border-radius: 50%;
      border: none; cursor: pointer; font-size: 9px;
      display: flex; align-items: center; justify-content: center;
      transition: filter .15s;
    }
    .calc-win-btn:hover { filter: brightness(1.4); }
    .calc-win-btn.min { background: rgba(232,112,16,.5); color: rgba(6,4,0,.8); }
    .calc-win-btn.close { background: rgba(180,40,40,.5); color: rgba(6,4,0,.8); }

    .calc-body {
      flex: 1; overflow-y: auto; padding: 14px;
      display: flex; flex-direction: column; gap: 12px;
    }
    .calc-body::-webkit-scrollbar { width: 3px; }
    .calc-body::-webkit-scrollbar-track { background: rgba(0,0,0,.3); }
    .calc-body::-webkit-scrollbar-thumb { background: rgba(184,72,0,.3); }

    /* ── SECTION ── */
    .cs { border: 1px solid rgba(46,34,0,.6); background: rgba(0,0,0,.3); }
    .cs-head {
      padding: 6px 10px;
      border-bottom: 1px solid rgba(46,34,0,.5);
      font-size: .46rem; letter-spacing: .3em; text-transform: uppercase;
      color: rgba(232,112,16,.5);
    }
    .cs-body { padding: 10px; }

    /* ── RESOURCE BAR ── */
    .res-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .res-label { font-size: .44rem; letter-spacing: .2em; text-transform: uppercase; color: rgba(180,140,60,.45); width: 28px; }
    .res-track {
      flex: 1; height: 8px;
      background: rgba(255,255,255,.06);
      border: 1px solid rgba(80,60,20,.2);
      position: relative; overflow: hidden;
    }
    .res-fill {
      position: absolute; left: 0; top: 0; bottom: 0;
      transition: width .3s;
    }
    .res-fill.hp  { background: linear-gradient(90deg, #50b812, #82dc30); }
    .res-fill.ea  { background: linear-gradient(90deg, #e87010, #f8a830); }
    .res-val {
      font-size: .7rem; min-width: 60px; text-align: right;
      color: rgba(220,180,80,.7);
    }
    .res-val span { color: rgba(130,110,50,.4); font-size: .55rem; }

    /* ── BUTTONS ── */
    .btn-row { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 6px; }
    .cbtn {
      flex: 1; min-width: 40px; padding: 5px 4px;
      background: transparent;
      border: 1px solid rgba(80,60,20,.3);
      color: rgba(180,150,60,.5);
      font-family: 'Inconsolata', monospace;
      font-size: .48rem; letter-spacing: .1em; text-transform: uppercase;
      cursor: pointer; transition: all .15s; white-space: nowrap;
    }
    .cbtn:hover { border-color: rgba(232,112,16,.5); color: rgba(248,168,48,.9); background: rgba(232,112,16,.06); }
    .cbtn.danger:hover { border-color: rgba(200,60,60,.5); color: rgba(220,100,100,.9); background: rgba(200,60,60,.05); }
    .cbtn.heal:hover   { border-color: rgba(80,184,18,.5); color: rgba(120,220,50,.9); background: rgba(46,138,8,.06); }
    .cbtn.primary { border-color: rgba(232,112,16,.4); color: rgba(248,168,48,.7); }

    /* ── INPUT ── */
    .cinput {
      background: rgba(255,255,255,.04);
      border: 1px solid rgba(80,60,20,.3);
      color: rgba(220,190,100,.8);
      font-family: 'Inconsolata', monospace; font-size: .7rem;
      padding: 4px 8px; outline: none; width: 60px; text-align: center;
      transition: border-color .15s;
    }
    .cinput:focus { border-color: rgba(232,112,16,.5); }

    /* ── SEEDS ── */
    .seed-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; min-height: 20px; }
    .seed-row {
      display: flex; align-items: center; gap: 6px;
      padding: 5px 8px;
      background: rgba(232,112,16,.04);
      border: 1px solid rgba(184,72,0,.2);
    }
    .seed-id { font-size: .44rem; color: rgba(180,130,50,.4); width: 18px; }
    .seed-turno { font-size: .6rem; color: rgba(248,168,48,.7); }
    .seed-juros { font-size: .55rem; color: rgba(80,184,18,.6); flex: 1; }
    .seed-det {
      font-size: .44rem; letter-spacing: .1em; text-transform: uppercase;
      padding: 3px 7px; border: 1px solid rgba(232,112,16,.3);
      color: rgba(232,112,16,.6); cursor: pointer; background: transparent;
      transition: all .15s; font-family: 'Inconsolata', monospace;
    }
    .seed-det:hover { border-color: rgba(248,168,48,.6); color: rgba(248,168,48,.9); background: rgba(232,112,16,.08); }
    .seed-rem {
      font-size: .44rem; padding: 3px 6px;
      border: 1px solid rgba(140,40,40,.25); color: rgba(180,80,80,.4);
      cursor: pointer; background: transparent; transition: all .15s;
      font-family: 'Inconsolata', monospace;
    }
    .seed-rem:hover { border-color: rgba(200,80,80,.5); color: rgba(220,110,110,.8); }

    /* ── KAKASHI ── */
    .kakashi-row {
      display: flex; align-items: center; gap: 8px;
      padding: 8px;
      background: rgba(110,34,0,.12);
      border: 1px solid rgba(184,72,0,.2);
    }
    .kakashi-status {
      font-size: .44rem; letter-spacing: .2em; text-transform: uppercase;
      flex: 1;
    }
    .kakashi-status.active { color: rgba(248,168,48,.8); }
    .kakashi-status.inactive { color: rgba(100,80,30,.35); }

    /* ── LOG ── */
    .log-list {
      max-height: 120px; overflow-y: auto;
      display: flex; flex-direction: column; gap: 3px;
    }
    .log-list::-webkit-scrollbar { width: 2px; }
    .log-list::-webkit-scrollbar-thumb { background: rgba(184,72,0,.2); }
    .log-entry {
      font-size: .5rem; line-height: 1.6; padding: 2px 0;
      border-bottom: 1px solid rgba(80,60,20,.08);
      display: flex; gap: 8px;
    }
    .log-ts { color: rgba(100,80,30,.35); flex-shrink: 0; }
    .log-msg { flex: 1; }
    .log-entry.damage .log-msg { color: rgba(220,100,80,.8); }
    .log-entry.heal   .log-msg { color: rgba(100,200,60,.8); }
    .log-entry.seed   .log-msg { color: rgba(248,168,48,.75); }
    .log-entry.ea     .log-msg { color: rgba(232,112,16,.8); }
    .log-entry.info   .log-msg { color: rgba(150,130,70,.5); }
  `;
  document.head.appendChild(style);

  /* ── BUILD DOM ── */
  const win = document.createElement('div');
  win.id = 'foo-calc';
  win.innerHTML = `
    <div class="calc-titlebar" id="foo-calc-bar">
      <span class="calc-title">⚔ Foo · Batalha</span>
      <div class="calc-win-btns">
        <button class="calc-win-btn min" title="Minimizar">─</button>
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
            <div class="res-track"><div class="res-fill hp" id="hp-fill"></div></div>
            <div class="res-val" id="hp-val">15 <span>/ 15</span></div>
          </div>
          <div class="btn-row">
            <input class="cinput" id="hp-amt" value="1" type="number" min="1" max="999">
            <button class="cbtn danger" onclick="fooBattle.dmg()">− Dano</button>
            <button class="cbtn heal"   onclick="fooBattle.heal()">+ Cura</button>
            <button class="cbtn"        onclick="fooBattle.setMaxHp()">Def. Máx</button>
          </div>
          <div class="res-row" style="margin-top:10px">
            <div class="res-label">EA</div>
            <div class="res-track"><div class="res-fill ea" id="ea-fill"></div></div>
            <div class="res-val" id="ea-val">20 <span>/ 20</span></div>
          </div>
          <div class="btn-row">
            <input class="cinput" id="ea-amt" value="1" type="number" min="1" max="999">
            <button class="cbtn danger" onclick="fooBattle.useEa()">− Gastar</button>
            <button class="cbtn heal"   onclick="fooBattle.gainEa()">+ Ganhar</button>
            <button class="cbtn"        onclick="fooBattle.setMaxEa()">Def. Máx</button>
          </div>
        </div>
      </div>

      <!-- CAMPO -->
      <div class="cs">
        <div class="cs-head">Campo · Sementes</div>
        <div class="cs-body">
          <div class="seed-list" id="seed-list"></div>
          <div class="btn-row">
            <button class="cbtn primary" onclick="fooBattle.addSeed()">+ Plantar Semente</button>
            <button class="cbtn" onclick="fooBattle.advTurn()">▶ Turno (+juros)</button>
          </div>
          <div class="btn-row" style="margin-top:4px">
            <button class="cbtn" onclick="fooBattle.detonateAll()">💥 Detonar Todas</button>
            <button class="cbtn danger" onclick="fooBattle.clearField()">✕ Limpar Campo</button>
          </div>
        </div>
      </div>

      <!-- KAKASHI -->
      <div class="cs">
        <div class="cs-head">Kakashi · 案山子</div>
        <div class="cs-body">
          <div class="kakashi-row">
            <div class="kakashi-status inactive" id="kakashi-status">● Não invocado</div>
            <div class="res-val" id="kakashi-hp-val" style="display:none">HP: 0</div>
          </div>
          <div class="btn-row" style="margin-top:8px">
            <button class="cbtn primary" onclick="fooBattle.kakashiSummon()">Invocar</button>
            <button class="cbtn danger"  onclick="fooBattle.kakashiDmg()">− Dano</button>
            <button class="cbtn heal"    onclick="fooBattle.kakashiHeal()">+ HP</button>
            <button class="cbtn"         onclick="fooBattle.kakashiDismiss()">Dispensar</button>
          </div>
          <div class="btn-row">
            <input class="cinput" id="kk-amt" value="1" type="number" min="1" max="999">
            <span style="font-size:.44rem;color:rgba(130,100,40,.35);letter-spacing:.15em"> ← quantidade</span>
          </div>
        </div>
      </div>

      <!-- LOG -->
      <div class="cs">
        <div class="cs-head" style="display:flex;justify-content:space-between;align-items:center">
          <span>Log de Ações</span>
          <button class="cbtn" style="flex:0;padding:2px 8px;font-size:.4rem" onclick="fooBattle.clearLog()">Limpar</button>
        </div>
        <div class="cs-body">
          <div class="log-list" id="foo-log"></div>
        </div>
      </div>

    </div>
  `;
  document.body.appendChild(win);

  /* ── DRAG ── */
  const bar = win.querySelector('#foo-calc-bar');
  let dragging = false, ox = 0, oy = 0;
  bar.addEventListener('mousedown', e => {
    dragging = true;
    ox = e.clientX - win.offsetLeft;
    oy = e.clientY - win.offsetTop;
    win.style.bottom = 'auto';
    win.style.right  = 'auto';
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    win.style.left = (e.clientX - ox) + 'px';
    win.style.top  = (e.clientY - oy) + 'px';
  });
  document.addEventListener('mouseup', () => { dragging = false; });

  /* ── MIN / CLOSE ── */
  win.querySelector('.calc-win-btn.min').addEventListener('click', () => win.classList.toggle('minimized'));
  win.querySelector('.calc-win-btn.close').addEventListener('click', () => win.remove());

  /* ── RENDER ── */
  function render() {
    // HP bar
    const hpPct = Math.max(0, S.hp / S.hpMax * 100);
    document.getElementById('hp-fill').style.width = hpPct + '%';
    document.getElementById('hp-val').innerHTML = `${S.hp} <span>/ ${S.hpMax}</span>`;

    // EA bar
    const eaPct = Math.max(0, S.ea / S.eaMax * 100);
    document.getElementById('ea-fill').style.width = eaPct + '%';
    document.getElementById('ea-val').innerHTML = `${S.ea} <span>/ ${S.eaMax}</span>`;

    // Seeds
    const list = document.getElementById('seed-list');
    if (S.field.length === 0) {
      list.innerHTML = '<div style="font-size:.48rem;color:rgba(100,80,30,.3);padding:4px 0;text-align:center">— campo vazio —</div>';
    } else {
      list.innerHTML = S.field.map(s => `
        <div class="seed-row">
          <span class="seed-id">#${s.id}</span>
          <span class="seed-turno">T+${s.turno}</span>
          <span class="seed-juros">→ ${jurosValue(s.turno)} base</span>
          ${s.turno >= 4 ? '<span style="font-size:.42rem;color:rgba(248,168,48,.6);letter-spacing:.1em">AUTO</span>' : ''}
          <button class="seed-det" onclick="fooBattle.detonate(${s.id})">Detonar</button>
          <button class="seed-rem" onclick="fooBattle.removeSeed(${s.id})">✕</button>
        </div>`).join('');
    }

    // Kakashi
    const ks = document.getElementById('kakashi-status');
    const khv = document.getElementById('kakashi-hp-val');
    if (S.kakashiActive) {
      ks.textContent = '● Ativo';
      ks.className = 'kakashi-status active';
      khv.style.display = 'block';
      khv.textContent = `HP: ${S.kakashiHp}`;
    } else {
      ks.textContent = '● Não invocado';
      ks.className = 'kakashi-status inactive';
      khv.style.display = 'none';
    }
  }

  function renderLog() {
    const el = document.getElementById('foo-log');
    el.innerHTML = S.log.map(e =>
      `<div class="log-entry ${e.type}"><span class="log-ts">${e.ts}</span><span class="log-msg">${e.msg}</span></div>`
    ).join('');
  }

  /* ── ACTIONS ── */
  function getAmt(id) { return Math.max(1, parseInt(document.getElementById(id)?.value) || 1); }

  window.fooBattle = {
    dmg() {
      const v = getAmt('hp-amt');
      S.hp = Math.max(0, S.hp - v);
      log(`Tomou ${v} de dano · HP ${S.hp}/${S.hpMax}`, 'damage');
      render();
    },
    heal() {
      const v = getAmt('hp-amt');
      S.hp = Math.min(S.hpMax, S.hp + v);
      log(`Curou ${v} · HP ${S.hp}/${S.hpMax}`, 'heal');
      render();
    },
    setMaxHp() {
      const v = getAmt('hp-amt');
      S.hpMax = v; S.hp = Math.min(S.hp, v);
      log(`HP máximo definido: ${v}`, 'info');
      render();
    },
    useEa() {
      const v = getAmt('ea-amt');
      if (S.ea < v) { log(`EA insuficiente (${S.ea} disponível)`, 'info'); return; }
      S.ea -= v;
      log(`Gastou ${v} EA · EA ${S.ea}/${S.eaMax}`, 'ea');
      render();
    },
    gainEa() {
      const v = getAmt('ea-amt');
      S.ea = Math.min(S.eaMax, S.ea + v);
      log(`Recuperou ${v} EA · EA ${S.ea}/${S.eaMax}`, 'heal');
      render();
    },
    setMaxEa() {
      const v = getAmt('ea-amt');
      S.eaMax = v; S.ea = Math.min(S.ea, v);
      log(`EA máxima definida: ${v}`, 'info');
      render();
    },
    addSeed() {
      const id = S.nextSeedId++;
      S.field.push({ id, turno: 0 });
      log(`Semente #${id} plantada (T+0)`, 'seed');
      render();
    },
    advTurn() {
      if (S.field.length === 0) { log('Campo vazio — nenhuma semente para avançar', 'info'); return; }
      const auto = [];
      S.field.forEach(s => {
        s.turno = Math.min(s.turno + 1, 7);
        if (s.turno >= 4) auto.push(s.id);
      });
      log(`Turno avançado · ${S.field.length} semente(s)` + (auto.length ? ` · #${auto.join(',')} prontas para detonação auto` : ''), 'seed');
      render();
    },
    detonate(id) {
      const idx = S.field.findIndex(s => s.id === id);
      if (idx === -1) return;
      const s = S.field[idx];
      const v = jurosValue(s.turno);
      log(`💥 Semente #${id} detonada (T+${s.turno}) · ${v} base + 8d6 bônus`, 'seed');
      S.field.splice(idx, 1);
      render();
    },
    detonateAll() {
      if (S.field.length === 0) { log('Campo vazio', 'info'); return; }
      const total = S.field.reduce((a, s) => a + jurosValue(s.turno), 0);
      log(`💥💥 Detonação total · ${S.field.length} sementes · ${total} base total + 8d6 cada`, 'seed');
      S.field = [];
      S.nextSeedId = 1;
      render();
    },
    removeSeed(id) {
      S.field = S.field.filter(s => s.id !== id);
      log(`Semente #${id} removida do campo`, 'info');
      render();
    },
    clearField() {
      S.field = []; S.nextSeedId = 1;
      log('Campo limpo', 'info');
      render();
    },
    kakashiSummon() {
      S.kakashiActive = true;
      S.kakashiHp = parseInt(document.getElementById('kk-amt')?.value) || 30;
      log(`🪆 Kakashi invocado · HP ${S.kakashiHp}`, 'heal');
      render();
    },
    kakashiDmg() {
      if (!S.kakashiActive) { log('Kakashi não está ativo', 'info'); return; }
      const v = getAmt('kk-amt');
      S.kakashiHp = Math.max(0, S.kakashiHp - v);
      log(`Kakashi tomou ${v} de dano · HP ${S.kakashiHp}`, 'damage');
      if (S.kakashiHp <= 0) { S.kakashiActive = false; log('Kakashi foi derrotado', 'damage'); }
      render();
    },
    kakashiHeal() {
      if (!S.kakashiActive) { log('Kakashi não está ativo', 'info'); return; }
      const v = getAmt('kk-amt');
      S.kakashiHp += v;
      log(`Kakashi curou ${v} · HP ${S.kakashiHp}`, 'heal');
      render();
    },
    kakashiDismiss() {
      S.kakashiActive = false; S.kakashiHp = 0;
      log('Kakashi dispensado', 'info');
      render();
    },
    clearLog() { S.log = []; renderLog(); }
  };

  render();
  log('Calculadora iniciada · HP 15 · EA 20', 'info');

  /* ── TOGGLE BUTTON ── */
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'foo-calc-toggle';
  const ts = document.createElement('style');
  ts.textContent = `
    #foo-calc-toggle {
      position: fixed; bottom: 24px; right: 24px; z-index: 8001;
      font-family: 'Inconsolata', monospace; font-size: .48rem;
      letter-spacing: .28em; text-transform: uppercase;
      padding: 8px 16px; border: 1px solid rgba(184,72,0,.35);
      color: rgba(232,112,16,.55); background: rgba(6,4,0,.9);
      cursor: pointer; backdrop-filter: blur(8px); transition: all .2s;
    }
    #foo-calc-toggle:hover {
      border-color: rgba(248,168,48,.6); color: rgba(248,168,48,.9);
      background: rgba(10,6,0,.95);
    }
  `;
  document.head.appendChild(ts);
  toggleBtn.textContent = '⚔ Batalha';
  toggleBtn.addEventListener('click', () => {
    win.style.display = win.style.display === 'none' ? 'flex' : 'none';
  });
  document.body.appendChild(toggleBtn);
  win.style.display = 'none';

})();
