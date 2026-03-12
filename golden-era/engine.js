/* ═══════════════════════════════════════════════════════════
   GOLDEN ERA — engine.js
   Senha · Reveal on scroll · Accordion de técnicas
   ═══════════════════════════════════════════════════════════

   ── SENHA ──────────────────────────────────────────────────
   Troque PASSWORD abaixo. Deve ser igual ao PASSWORD
   no index.html. Sessões expiram ao fechar o browser.
═══════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────
   ↓↓↓  TROQUE A SENHA AQUI  ↓↓↓
────────────────────────────────────────── */
const PASSWORD = '1223';
/* ──────────────────────────────────────────
   ↑↑↑  só mexa nessa linha  ↑↑↑
────────────────────────────────────────── */

const engine = (() => {

  /* ──────────────────────────────────────────
     PASSWORD GATE
  ────────────────────────────────────────── */
  const SESSION_KEY = 'ge-auth';

  async function hashPassword(pw) {
    const buf = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(pw + 'ge-salt-2025')
    );
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function isAuthenticated() {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return false;
    return stored === await hashPassword(PASSWORD);
  }

  async function authenticate(input) {
    if (input !== PASSWORD) return false;
    sessionStorage.setItem(SESSION_KEY, await hashPassword(input));
    return true;
  }

  function showGate(onSuccess) {
    document.body.classList.add('gate-locked');

    const style = document.createElement('style');
    style.textContent = `
      body.gate-locked > *:not(#ge-gate) { visibility: hidden; }
      #ge-gate {
        position: fixed; inset: 0; z-index: 99999;
        background: #030200;
        display: flex; align-items: center; justify-content: center;
        font-family: 'Inconsolata', monospace;
      }
      #ge-gate .gate-box { width: 320px; text-align: center; }
      #ge-gate .gate-kanji {
        font-family: 'Noto Serif JP', serif;
        font-size: 72px; line-height: 1;
        color: rgba(180,150,60,.08);
        margin-bottom: 32px; user-select: none;
      }
      #ge-gate .gate-title {
        font-size: .5rem; letter-spacing: .6em; text-transform: uppercase;
        color: rgba(160,135,60,.3); margin-bottom: 6px;
      }
      #ge-gate .gate-sub {
        font-size: .48rem; letter-spacing: .3em; text-transform: uppercase;
        color: rgba(100,85,40,.2); margin-bottom: 36px;
      }
      #ge-gate .gate-rule {
        width: 120px; height: 1px; margin: 0 auto 28px;
        background: linear-gradient(90deg, transparent, rgba(140,110,40,.18), transparent);
      }
      #ge-gate input {
        width: 100%; background: rgba(255,255,255,.025);
        border: 1px solid rgba(120,100,40,.25);
        color: rgba(220,195,110,.7);
        font-family: 'Inconsolata', monospace;
        font-size: .85rem; letter-spacing: .15em;
        padding: 13px 18px; outline: none;
        transition: border-color .2s, background .2s;
        text-align: center; margin-bottom: 10px; display: block;
      }
      #ge-gate input:focus {
        border-color: rgba(180,150,60,.5);
        background: rgba(180,150,60,.03);
      }
      #ge-gate input::placeholder { color: rgba(120,100,40,.3); letter-spacing: .3em; }
      #ge-gate button {
        width: 100%; padding: 12px; background: transparent;
        border: 1px solid rgba(120,100,40,.3); color: rgba(180,155,70,.5);
        font-family: 'Inconsolata', monospace; font-size: .5rem;
        letter-spacing: .45em; text-transform: uppercase;
        cursor: pointer; transition: all .2s; margin-bottom: 16px;
      }
      #ge-gate button:hover {
        border-color: rgba(200,170,80,.55); color: rgba(220,195,100,.85);
        background: rgba(160,130,50,.05);
      }
      #ge-gate .gate-error {
        font-size: .48rem; letter-spacing: .25em; text-transform: uppercase;
        color: rgba(200,80,80,.55); opacity: 0; transition: opacity .3s; height: 16px;
      }
      #ge-gate .gate-error.show { opacity: 1; }
    `;
    document.head.appendChild(style);

    const gate = document.createElement('div');
    gate.id = 'ge-gate';
    gate.innerHTML = `
      <div class="gate-box">
        <div class="gate-kanji">⛩</div>
        <div class="gate-title">Golden Era</div>
        <div class="gate-sub">Acesso restrito</div>
        <div class="gate-rule"></div>
        <input id="gate-input" type="password" placeholder="senha"
          autocomplete="off" spellcheck="false">
        <button id="gate-btn">Entrar</button>
        <div class="gate-error" id="gate-error">Senha incorreta</div>
      </div>
    `;
    document.body.appendChild(gate);

    const input = gate.querySelector('#gate-input');
    const err   = gate.querySelector('#gate-error');
    input.focus();

    async function attempt() {
      if (await authenticate(input.value.trim())) {
        gate.style.transition = 'opacity .4s';
        gate.style.opacity = '0';
        document.body.classList.remove('gate-locked');
        setTimeout(() => { gate.remove(); onSuccess(); }, 400);
      } else {
        input.value = '';
        err.classList.add('show');
        input.style.borderColor = 'rgba(200,80,80,.4)';
        setTimeout(() => {
          err.classList.remove('show');
          input.style.borderColor = '';
          input.focus();
        }, 1800);
      }
    }

    gate.querySelector('#gate-btn').addEventListener('click', attempt);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); });
  }

  async function checkAuth(onSuccess) {
    if (await isAuthenticated()) { onSuccess(); return; }
    showGate(onSuccess);
  }

  /* ──────────────────────────────────────────
     REVEAL ON SCROLL
  ────────────────────────────────────────── */
  function initReveals() {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('visible'), i * 45);
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.07 });
    document.querySelectorAll('.reveal').forEach(r => obs.observe(r));
  }

  /* ──────────────────────────────────────────
     TECHNIQUE TOGGLE (accordion)
  ────────────────────────────────────────── */
  function T(header) {
    const body = header.nextElementSibling;
    const hint = header.querySelector('.hint');
    body.classList.toggle('open');
    if (hint) hint.textContent = body.classList.contains('open') ? '[−]' : '[+]';
  }

  /* ──────────────────────────────────────────
     BACK BUTTON + ANIMATED TRANSITION OVERLAY
     Cada ficha define window.GE_TRANSITION com
     uma função que anima o canvas antes de navegar.
  ────────────────────────────────────────── */
  function injectBackButton() {
    const style = document.createElement('style');
    style.textContent = `
      #ge-back {
        position: fixed; bottom: 24px; left: 24px; z-index: 8000;
        font-family: 'Inconsolata', monospace; font-size: .48rem;
        letter-spacing: .3em; text-transform: uppercase;
        padding: 8px 16px; border: 1px solid rgba(80,60,20,.25);
        color: rgba(140,120,50,.4); text-decoration: none;
        background: rgba(4,3,1,.9); backdrop-filter: blur(8px);
        transition: border-color .2s, color .2s, background .2s;
      }
      #ge-back:hover {
        border-color: rgba(160,130,60,.5);
        color: rgba(200,170,80,.8);
        background: rgba(10,8,2,.95);
      }
      #ge-overlay {
        position: fixed; inset: 0; z-index: 99990;
        pointer-events: none;
        display: block;
      }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: .01ms !important;
          transition-duration: .01ms !important;
        }
      }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('canvas');
    overlay.id = 'ge-overlay';
    overlay.width = window.innerWidth;
    overlay.height = window.innerHeight;
    window.addEventListener('resize', () => {
      overlay.width = window.innerWidth;
      overlay.height = window.innerHeight;
    });
    document.body.appendChild(overlay);

    const btn = document.createElement('a');
    btn.id = 'ge-back';
    btn.href = '#';
    btn.textContent = '← Fichas';
    btn.addEventListener('click', e => {
      e.preventDefault();
      const fn = window.GE_TRANSITION || defaultTransition;
      fn(overlay, () => { window.location.href = '../index.html'; });
    });
    document.body.appendChild(btn);
  }

  function defaultTransition(canvas, done) {
    const ctx = canvas.getContext('2d');
    let alpha = 0;
    function step() {
      alpha = Math.min(1, alpha + 0.04);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = `rgba(3,2,0,${alpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (alpha < 1) requestAnimationFrame(step);
      else done();
    }
    step();
  }

  /* ──────────────────────────────────────────
     INIT
  ────────────────────────────────────────── */
  function init() {
    checkAuth(() => {
      injectBackButton();
      initReveals();
    });
  }

  return { init, T };

})();

/* T precisa ser global — chamado via onclick="T(this)" no HTML */
function T(h) { engine.T(h); }
