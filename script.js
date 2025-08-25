(() => {
  const audio = document.getElementById('glitch');
  const btn   = document.getElementById('soundToggle');
  if(!audio || !btn) return;

  audio.volume = 0.25; // tweak

  btn.addEventListener('click', async () => {
    if (audio.paused) {
      try { await audio.play(); } catch(e) {}
      btn.setAttribute('aria-pressed','true');
      btn.setAttribute('aria-label','Pause sound');
    } else {
      audio.pause();
      btn.setAttribute('aria-pressed','false');
      btn.setAttribute('aria-label','Play sound');
    }
  });
})();

// ===== Typewriter for the computer-simulated screen =====
// ----- CONFIG (slow version) -----
const COUNT = 48;          // how many tokens at once
const TOKEN_LEN = 5;       // like WEN13
const SPEED_MIN = 6.0;     // seconds (slower)  ⟵ increase to slow
const SPEED_MAX = 12.0;    // seconds (slower)  ⟵ increase to slow
const CHANGE_MS = 1000;    // change all tokens every 1s
// ---------------------------------

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const swarm = document.getElementById("swarm");

function rand(min, max) { return Math.random() * (max - min) + min; }
function randomToken(n = TOKEN_LEN) {
    let s = "";
    for (let i = 0; i < n; i++) s += CHARS[(Math.random() * CHARS.length) | 0];
    return s;
}

function makeParticle() {
    const el = document.createElement("span");
    el.className = "particle";
    el.textContent = randomToken();

    // random vertical lane inside the landing area
    el.style.top = `${Math.random() * 100}%`;

    // fixed width to prevent jitter on swap
    el.style.minWidth = `${TOKEN_LEN}ch`;

    // random duration + negative delay so streams are already in motion
    const dur = rand(SPEED_MIN, SPEED_MAX);
    el.style.animationDuration = `${dur.toFixed(2)}s`;
    el.style.animationDelay = `${(-rand(0, dur)).toFixed(2)}s`;

    return el;
}

// spawn
for (let i = 0; i < COUNT; i++) swarm.appendChild(makeParticle());

// change all tokens every 1s
setInterval(() => {
    swarm.querySelectorAll(".particle").forEach(el => {
        el.textContent = randomToken();
    });
}, CHANGE_MS);

// ===== Binary typewriter -> "SYSTEM BOOTING" =====
(function () {
    const out = document.getElementById("bootText");
    const wrap = document.getElementById("bootScreen");
    const overlay = document.getElementById("bootOverlay");
    if (!out || !wrap) return;

    // ---- CONFIG ----
    const COLS = 56;        // characters per row (width of each binary line)
    const ROWS = 40;        // how many rows to type before showing the message
    const CHAR_MS = 8;      // speed per character (lower = faster)
    const LINE_MS = 80;     // pause at end of each line
    // ----------------

    function randomBinaryRow(n) {
        let s = "";
        for (let i = 0; i < n; i++) s += (Math.random() < 0.5 ? "0" : "1");
        return s;
    }

    function scrollToBottom() { out.scrollTop = out.scrollHeight; }

    function run() {
        // Reduced motion: dump instantly, then show overlay
        if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            let txt = "";
            for (let r = 0; r < ROWS; r++) txt += randomBinaryRow(COLS) + "\n";
            out.textContent = txt;
            overlay.classList.add("on");
            return;
        }

        out.textContent = "";
        out.dataset.typing = "1";
        const caret = document.createElement("span");
        caret.className = "caret";
        out.appendChild(caret);

        let row = 0, col = 0, current = randomBinaryRow(COLS);

        const step = () => {
            if (row >= ROWS) {
                out.dataset.typing = "0";
                caret.remove();
                overlay.classList.add("on");
                return;
            }

            if (col < COLS) {
                caret.before(document.createTextNode(current[col++]));
                scrollToBottom();
                setTimeout(step, CHAR_MS);
            } else {
                // end of line
                caret.before(document.createTextNode("\n"));
                scrollToBottom();
                row++; col = 0;
                current = randomBinaryRow(COLS);
                setTimeout(step, LINE_MS);
            }
        };
        step();
    }

    // start when visible
    let started = false;
    const start = () => { if (!started) { started = true; run(); } };

    if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(es => {
            es.forEach(e => { if (e.isIntersecting) { start(); io.disconnect(); } });
        }, { threshold: 0.2 });
        io.observe(wrap);
    } else {
        start();
    }
})();

//scroll about
(function () {
  const about  = document.getElementById('about');
  const target = document.getElementById('bootOverlay') || document.getElementById('bootRain');
  if (!about || !target) return;

  function goToBooting(){
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // (optional) focus for a11y without jumping the page
    target.setAttribute('tabindex','-1');
    target.focus({ preventScroll: true });
  }

  // click/tap/keyboard trigger
  about.addEventListener('click', goToBooting);
  about.addEventListener('touchstart', goToBooting, { passive: true });
  about.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToBooting(); }
  });
})();

//system booting 
// ===== Classic binary rain
(function () {
    const canvas = document.getElementById("binaryRain");
    const overlay = document.getElementById("bootOverlay");
    const wrap = document.getElementById("bootRain");
    if (!canvas || !overlay || !wrap) return;

    const ctx = canvas.getContext("2d");

    // --- CONFIG ---
    const RUN_MS = 8000;          // show SYSTEM BOOTING after this
    const TRAIL_FADE = 0.10;       // 0.06–0.14
    const ROWS_PER_SEC_MIN = 36;   // faster than before
    const ROWS_PER_SEC_MAX = 72;

    const BASE_FONT_PX = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const FONT_PX = Math.max(12, Math.min(20, BASE_FONT_PX * 0.95)); // smaller => more columns
    const COLOR = getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim() || "#00FF66";
    const BG = getComputedStyle(document.documentElement).getPropertyValue("--screen-bg").trim() || "#06120a";
    // -------------

    let dpr, w, h, cols, drops = [];
    let running = false, rafId = 0, startTime = 0, last = 0;

    function resize() {
        dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
        const rect = wrap.getBoundingClientRect();
        w = Math.max(1, Math.floor(rect.width));
        h = Math.max(1, Math.floor(rect.height));

        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.font = `${FONT_PX}px "JetBrains Mono", monospace`;
        ctx.textBaseline = "top";

        // edge-to-edge (add two extra columns to cover rounding at edges)
        cols = Math.ceil(w / FONT_PX) + 4;

        drops = new Array(cols).fill(0).map(() => ({
            y: Math.random() * (h / FONT_PX),
            speed: ROWS_PER_SEC_MIN + Math.random() * (ROWS_PER_SEC_MAX - ROWS_PER_SEC_MIN) // rows/sec
        }));
    }

    function fade(dtMs) {
        // framerate-independent fade
        const frames = dtMs / (1000 / 60);
        const alpha = 1 - Math.pow(1 - TRAIL_FADE, frames);
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.fillRect(0, 0, w, h);
    }

    function step(now) {
        if (!running) return;

        // robust delta (default to ~16ms if anything weird)
        const dtMs = (now - last) || 16;
        last = now;
        const dtSec = dtMs / 1000;

        fade(dtMs);

        ctx.fillStyle = COLOR;
        for (let i = 0; i < cols; i++) {
            const x = (i - 2) * FONT_PX;  // shift by 2 extra cols to cover edges
            const d = drops[i];

            ctx.fillText(Math.random() < 0.5 ? "0" : "1", x, d.y * FONT_PX);

            d.y += d.speed * dtSec;

            if (d.y * FONT_PX > h + FONT_PX) {
                d.y = -Math.random() * 10;
                d.speed = ROWS_PER_SEC_MIN + Math.random() * (ROWS_PER_SEC_MAX - ROWS_PER_SEC_MIN);
            }
        }

          if (now - startTime >= RUN_MS){
      running = false;
      return;
    }

    rafId = requestAnimationFrame(step);
  }

  function start(){
    ctx.fillStyle = BG;
    ctx.fillRect(0,0,w,h);
    startTime = performance.now();
    last = startTime;
    running = true;

    // 👉 show the box WITH the rain (fades in + blinks 3x via CSS)
    overlay.classList.add("on");

    rafId = requestAnimationFrame(step);
  }

  // init + start immediately
  resize();
  start();
  window.addEventListener("resize", () => {
    cancelAnimationFrame(rafId);
    resize();
    if (running) start();
  });
})();

// Reveal "SYSTEM WENDY BOOTED" when it enters the viewport
(function(){
  const sec = document.getElementById("booted");
  if (!sec) return;

  const show = () => sec.classList.add("on");

  if ("IntersectionObserver" in window){
    const io = new IntersectionObserver(entries => {
      for (const e of entries){
        if (e.isIntersecting){ show(); io.disconnect(); break; }
      }
    }, { threshold: 0.25 });
    io.observe(sec);
  } else {
    show();
  }
})();

//PROPERTIES
(function () {
    const out = document.getElementById("crtText");
    const screen = document.getElementById("propsScreen");
    if (!out || !screen) return;

    const LINES = [
        "Initiated:        2005",
        "Date Created:     13.08.2006",
        "Date Modified:    13.08.2025",
        "File Location:    HCMC Metropolitan Area",
        "Current Version:  v19.0",
        "",
        "ATTRIBUTES:",
        "  Technical:",
        "    - Adobe Illustrator (Ai)",
        "    - Photoshop (Ps)",
        "    - Lightroom (Lr)",
        "    - After Effects (Ae)",
        "    - Figma",
        "    - DaVinci Resolve",
        "    - Blender",
        "  Creative:",
        "    - Storytelling", 
        "    - Visual Concept Development",
        "    - Photography, Graphic Design",
        "    - UI/UX"
    ];

    const CHAR_MS = 16;
    const LINE_MS = 220;

    function scrollToBottom() {
        // push the scroll to the newest line
        out.scrollTop = out.scrollHeight;
    }

    function typeLines(lines) {
        if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            out.textContent = lines.join("\n");
            out.dataset.typing = "0";
            return;
        }

        let i = 0, j = 0;
        out.textContent = "";
        out.dataset.typing = "1";
        const caret = document.createElement("span");
        caret.className = "caret";
        out.appendChild(caret);

        const step = () => {
            if (i >= lines.length) {
                out.dataset.typing = "0";
                caret.remove();
                return;
            }
            const line = lines[i];

            if (j < line.length) {
                caret.before(document.createTextNode(line[j++]));
                scrollToBottom();
                setTimeout(step, CHAR_MS);
            } else {
                caret.before(document.createTextNode("\n"));
                scrollToBottom();
                i++; j = 0;
                setTimeout(step, LINE_MS);
            }
        };
        step();
    }

    let started = false;
    const start = () => { if (!started) { started = true; typeLines(LINES); } };

    if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(es => {
            es.forEach(e => { if (e.isIntersecting) { start(); io.disconnect(); } });
        }, { threshold: 0.2 });
        io.observe(screen);
    } else {
        start();
    }
})();

(() => {
  const worksBtn = document.getElementById('works') 
                || document.getElementById('work'); // accept either id
  const overlay  = document.getElementById('worksOverlay');
  if (!worksBtn || !overlay) return;

  const scrim    = overlay.querySelector('.scrim');
  const closeBtn = overlay.querySelector('.drawer-close');
  const focusablesSel = 'a,button,input,textarea,select,[tabindex]:not([tabindex="-1"])';
  let lastFocused = null;

  function openDrawer(){
    lastFocused = document.activeElement;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden','false');
    worksBtn.setAttribute('aria-expanded','true');
    document.body.style.overflow = 'hidden';        // lock background scroll
    overlay.querySelector(focusablesSel)?.focus({ preventScroll:true });
    document.addEventListener('keydown', onKeydown);
  }
  function closeDrawer(){
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden','true');
    worksBtn.setAttribute('aria-expanded','false');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKeydown);
    lastFocused?.focus({ preventScroll:true });
  }
  function onKeydown(e){
    if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); }
    if (e.key === 'Tab') trapFocus(e);
  }
  function trapFocus(e){
    const nodes = overlay.querySelectorAll(focusablesSel);
    if (!nodes.length) return;
    const first = nodes[0], last = nodes[nodes.length-1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // OPEN on click only
  worksBtn.setAttribute('role','button');
  worksBtn.setAttribute('aria-controls','worksOverlay');
  worksBtn.addEventListener('click', openDrawer);
  worksBtn.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrawer(); }
  });

  // CLOSE
  closeBtn?.addEventListener('click', closeDrawer);
  scrim?.addEventListener('click', closeDrawer);
})();
(() => {
  // Light each project name when it enters the drawer's scroller viewport
  const scroller = document.querySelector('#worksOverlay .mods');
  if (!scroller) return;

  const items = scroller.querySelectorAll('.proj-list li');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('lit');
      else e.target.classList.remove('lit');
    });
  }, { root: scroller, threshold: 0.2 });

  items.forEach(li => io.observe(li));
})();

(() => {
  const scroller = document.querySelector('.mods');
  if (!scroller) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => e.target.classList.toggle('lit', e.isIntersecting));
  }, { root: scroller, threshold: 0.6 });

  document.querySelectorAll('.proj-list li').forEach(li => io.observe(li));
})();

  (() => {
    const btn = document.getElementById('backToTop');
    if (!btn) return;

    const showAt = 300; // px scrolled before showing
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    function onScroll(){
      if (window.scrollY > showAt) btn.classList.add('show');
      else btn.classList.remove('show');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // initial state

    btn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: prefersReduced.matches ? 'auto' : 'smooth'
      });
    });
  })();

  (function () {
  const press = document.getElementById('pressSfx');
  const works = document.getElementById('works');
  const home  = document.getElementById('home'); // <a href="index.html">

  function playPress() {
    if (!press) return;
    try {
      press.currentTime = 0;     // restart so rapid taps always play
      press.volume = 0.9;        // tweak if needed
      press.play();
    } catch (_) {}
  }

  // WORKS — just play before opening the drawer (your existing code opens it)
  works?.addEventListener('click', () => playPress());
  works?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') playPress();
  });

  // HOME — play, then navigate after a tiny delay so the sound is heard
  home?.addEventListener('click', (e) => {
    // If HOME is an <a>, pause the instant nav for ~150ms
    const url = home.getAttribute('href');
    if (url) {
      e.preventDefault();
      playPress();
      setTimeout(() => { window.location.href = url; }, 150);
    } else {
      playPress();
    }
  });
})();

(() => {
  const press = document.getElementById('pressSfx');
  const home  = document.getElementById('home');        // usually an <a>
  const workBtns = document.querySelectorAll('#work, #works'); // handles both ids

  function playPress() {
    if (!press) return;
    try {
      press.currentTime = 0;
      press.volume = 0.9;
      press.play();
    } catch {}
  }

  // WORK / WORKS -> just play (your existing click handler will open the drawer)
  workBtns.forEach(el => {
    el?.addEventListener('click', playPress);
    el?.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') playPress();
    });
  });

  // HOME -> play then navigate (small delay so the sound is audible)
  if (home) {
    home.addEventListener('click', e => {
      const url = home.getAttribute('href');
      if (url) {
        e.preventDefault();
        playPress();
        setTimeout(() => { window.location.href = url; }, 150);
      } else {
        playPress();
      }
    });
    home.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        home.click();
      }
    });
  }

  // Optional: also beep when closing the drawer
  document.querySelector('.drawer-close')?.addEventListener('click', playPress);
  document.querySelector('.scrim')?.addEventListener('click', playPress);
})();

console.log("script.js loaded and #random found");