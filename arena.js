// Arena Game TUJLC: 7 permainan dari kosakata Akademi ELCY.
const $ = (s, r = document) => r.querySelector(s);
const esc = TUJ.esc;
const LK = Object.keys(LANGS);
let LANG = (() => { try { return localStorage.getItem("tujlc-arena-lang") || "en"; } catch { return "en"; } })();
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const say = (t, k = LANG) => TUJ.speak(t, LANGS[k].speech);
const RTL = () => LANG === "ar";

function vocab(k, cats) {
  return (cats || AK.CATS.map((c) => c.id)).flatMap((cat) => {
    const c = AK.CATS.find((x) => x.id === cat), ms = c.id_.split(";");
    return AK.VOCAB[k][cat].split(";").map((s, i) => { const [w, r = ""] = s.split("|"); return { w, r, m: ms[i], cat }; });
  });
}
function mcq(k, n, cats) {
  const pool = vocab(k, cats);
  return shuffle(pool).slice(0, n).map((it) => {
    const opts = shuffle([it, ...shuffle(pool.filter((x) => x.m !== it.m)).slice(0, 3)]);
    return { it, p: it.w, r: it.r, o: opts.map((x) => x.m), c: opts.indexOf(it) };
  });
}

// ---------- kerangka panggung ----------
const stage = $("#stage"), body = $("#sBody"), hud = $("#hud");
let STOP = null;
function open(title) { stage.hidden = false; document.body.style.overflow = "hidden"; $("#sTitle").textContent = title; body.innerHTML = ""; hud.innerHTML = ""; }
function close() { if (STOP) STOP(); STOP = null; stage.hidden = true; document.body.style.overflow = ""; }
$("#sClose").onclick = close;
addEventListener("keydown", (e) => { if (e.key === "Escape" && !stage.hidden) close(); });
const setHud = (o) => hud.innerHTML = Object.entries(o).map(([k, v]) => `<span>${k} ${v}</span>`).join("");

async function gameOver(game, score, note = "", again) {
  if (STOP) STOP(); STOP = null;
  try { await TUJ.api("/api/score", { game, lang: LANG, score }); } catch {}
  let top = [];
  try { top = (await TUJ.api(`/api/leaderboard?game=${game}&lang=${LANG}`)).top; } catch {}
  body.innerHTML = `<div class="g-over"><img src="assets/elcy-motoran.webp" alt="" width="180"><h2 class="display display--md">Skor: ${score}</h2>${note ? `<p>${note}</p>` : ""}
    <h3>Papan peringkat ${LANGS[LANG].name}</h3><ol class="lb">${top.map((t) => `<li><span>${esc(t.nama)}</span><b>${t.score}</b></li>`).join("") || "<li>Belum ada skor</li>"}</ol>
    <div class="hero__cta"><button class="btn btn--ink" id="again">Main lagi</button><button class="btn btn--ghost-ink" id="back">Pilih game lain</button></div></div>`;
  $("#again").onclick = again; $("#back").onclick = close;
}

// ---------- 1. ELCY Lari Kata ----------
function lari() {
  open("ELCY Lari Kata");
  const W = 900, H = 420, G = 340;
  body.innerHTML = `<div style="width:min(900px,100%)"><p class="g-prompt" id="pr"></p><canvas id="cv" width="${W}" height="${H}" aria-label="Arena lari"></canvas>
    <p class="muted small" style="text-align:center">Lompat: Spasi / ketuk layar. Tabrak kata yang <b>artinya cocok</b>, hindari kotak.</p></div>`;
  const cv = $("#cv"), ctx = cv.getContext("2d");
  const img = new Image(); img.src = "assets/elcy-motoran.webp";
  const pool = vocab(LANG);
  let p = { y: G, vy: 0 }, speed = 5, t = 0, score = 0, lives = 3, objs = [], target, run = true, inv = 0;
  const newTarget = () => { target = pick(pool); $("#pr").innerHTML = `Cari kata yang artinya: <mark>${esc(target.m)}</mark>`; };
  newTarget();
  const jump = () => { if (p.y >= G) p.vy = -15; };
  const key = (e) => { if (e.code === "Space" || e.key === "ArrowUp") { e.preventDefault(); jump(); } };
  addEventListener("keydown", key); cv.onpointerdown = jump;
  function spawn() {
    if (Math.random() < 0.45) objs.push({ type: "box", x: W + 20, y: G + 20, w: 40, h: 40 });
    else {
      const good = Math.random() < 0.45, it = good ? target : pick(pool.filter((x) => x.m !== target.m));
      ctx.font = "bold 22px Fredoka, sans-serif";
      const w = Math.max(70, ctx.measureText(it.w).width + 28);
      objs.push({ type: "word", it, x: W + 20, y: Math.random() < 0.5 ? G - 10 : G - 110, w, h: 46 });
    }
  }
  function loop() {
    if (!run) return;
    t++; speed += 0.0025; inv = Math.max(0, inv - 1);
    p.vy += 0.8; p.y = Math.min(G, p.y + p.vy);
    if (t % Math.max(38, Math.round(95 - speed * 4)) === 0) spawn();
    objs.forEach((o) => o.x -= speed);
    objs = objs.filter((o) => o.x + o.w > -20);
    const px = 90, pw = 84, ph = 80, py = p.y - ph + 30;
    for (const o of objs) {
      if (o.hit) continue;
      const oy = o.type === "box" ? o.y - o.h : o.y - o.h / 2;
      if (px < o.x + o.w && px + pw > o.x && py < oy + o.h && py + ph > oy) {
        o.hit = true;
        if (o.type === "box") { if (!inv) { lives--; inv = 50; } }
        else if (o.it.m === target.m) { score += 10 + Math.round(speed); say(o.it.w); newTarget(); }
        else if (!inv) { lives--; inv = 50; }
      }
    }
    objs = objs.filter((o) => !o.hit || o.type === "box");
    // gambar
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#bfe7f5"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff"; for (let i = 0; i < 4; i++) { const cx = ((i * 260 - t * speed * 0.2) % (W + 200) + W + 200) % (W + 200) - 100; ctx.beginPath(); ctx.ellipse(cx, 60 + (i % 2) * 40, 60, 22, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = "#FFD315"; ctx.fillRect(0, G + 30, W, H - G); ctx.fillStyle = "#274045"; ctx.fillRect(0, G + 30, W, 4);
    for (const o of objs) {
      if (o.type === "box") { ctx.fillStyle = "#E9212C"; ctx.fillRect(o.x, o.y - o.h + 10, o.w, o.h); ctx.strokeStyle = "#274045"; ctx.lineWidth = 3; ctx.strokeRect(o.x, o.y - o.h + 10, o.w, o.h); }
      else { ctx.fillStyle = "#fff"; ctx.strokeStyle = "#274045"; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(o.x, o.y - o.h / 2, o.w, o.h, 14); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#274045"; ctx.font = "bold 22px Fredoka, 'Noto Sans JP', 'Noto Sans SC', 'Noto Naskh Arabic', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(o.it.w, o.x + o.w / 2, o.y + 1); }
    }
    if (!(inv && t % 6 < 3) && img.complete) ctx.drawImage(img, px - 10, py - 10, pw + 20, ph + 20);
    setHud({ "♥": lives, Skor: score, Kecepatan: speed.toFixed(1) });
    if (lives <= 0) { run = false; return gameOver("lari", score, "ELCY kehabisan nyawa.", lari); }
    requestAnimationFrame(loop);
  }
  STOP = () => { run = false; removeEventListener("keydown", key); };
  requestAnimationFrame(loop);
}

// ---------- 2. Tangkap Suara ----------
function suara() {
  open("Tangkap Suara");
  body.innerHTML = `<div style="width:min(760px,100%);display:grid;gap:8px"><div class="hero__cta" style="justify-content:center"><button class="btn btn--ink" id="rep">▶ Dengar lagi</button></div>
    <div id="field" style="position:relative;height:min(64vh,520px);border:3px solid var(--ink);border-radius:18px;background:linear-gradient(#bfe7f5,#fff);overflow:hidden"></div></div>`;
  const field = $("#field"), pool = vocab(LANG);
  let score = 0, lives = 3, run = true, target, items = [], speed = 0.6, last = 0;
  const round = () => {
    items.forEach((x) => x.el.remove()); items = [];
    const set = shuffle([pick(pool), ...shuffle(pool).slice(0, 3)]).filter((v, i, a) => a.findIndex((x) => x.w === v.w) === i).slice(0, 4);
    target = pick(set);
    set.forEach((it, i) => {
      const el = document.createElement("button"); el.className = "tile"; el.lang = LANG; el.textContent = it.w;
      el.style.cssText = `position:absolute;left:${6 + i * 24}%;top:-60px;font-size:1.3rem`;
      el.onclick = () => { if (!run) return; if (it.w === target.w) { score += 10 + Math.round(speed * 10); speed += 0.05; round(); } else { el.classList.add("is-wrong"); lives--; el.disabled = true; check(); } };
      field.appendChild(el); items.push({ el, it, y: -60 - Math.random() * 80 });
    });
    setTimeout(() => say(target.w), 250);
  };
  const check = () => { setHud({ "♥": lives, Skor: score }); if (lives <= 0) { run = false; gameOver("suara", score, "Latihan mendengar yang bagus!", suara); } };
  $("#rep").onclick = () => say(target.w);
  const loop = (ts) => {
    if (!run) return;
    const dt = Math.min(50, ts - (last || ts)); last = ts;
    for (const x of items) { x.y += speed * dt * 0.12; x.el.style.top = x.y + "px"; }
    if (items.some((x) => x.it.w === target.w && x.y > field.clientHeight - 40)) { lives--; check(); if (run) round(); }
    requestAnimationFrame(loop);
  };
  STOP = () => { run = false; };
  round(); check(); requestAnimationFrame(loop);
}

// ---------- 3. Susun Kata Kilat ----------
function susun() {
  open("Susun Kata Kilat");
  const pool = vocab(LANG).filter((x) => [...x.w.replace(/\s/g, "")].length >= 2 && [...x.w].length <= 10);
  let score = 0, left = 60, run = true, it, built = [], bank = [];
  const seg = (w) => typeof Intl.Segmenter === "function" ? [...new Intl.Segmenter(LANG, { granularity: "grapheme" }).segment(w)].map((s) => s.segment) : [...w];
  const next = () => {
    it = pick(pool); built = [];
    bank = shuffle(seg(it.w).map((t, i) => ({ t, i })).filter((x) => x.t.trim()));
    if (bank.map((b) => b.t).join("") === seg(it.w).filter((t) => t.trim()).join("") && bank.length > 1) bank.reverse();
    draw();
  };
  const draw = () => {
    body.innerHTML = `<div style="width:min(720px,100%);text-align:center"><p class="g-prompt">Susun kata yang artinya: <mark>${esc(it.m)}</mark></p>${it.r ? `<p class="muted">bacaan: ${esc(it.r)}</p>` : ""}
      <div class="slots" ${RTL() ? 'dir="rtl"' : ""} lang="${LANG}">${built.map((b) => `<span>${esc(b.t)}</span>`).join("")}</div>
      <div class="letters" ${RTL() ? 'dir="rtl"' : ""} lang="${LANG}">${bank.map((b, i) => `<button class="letter" data-i="${i}" ${built.includes(b) ? "disabled" : ""}>${esc(b.t)}</button>`).join("")}</div>
      <div class="hero__cta" style="justify-content:center"><button class="btn btn--ghost-ink" id="undo">Hapus</button><button class="btn btn--ghost-ink" id="skip">Lewati</button></div></div>`;
    body.querySelectorAll("[data-i]").forEach((b) => b.onclick = () => {
      built.push(bank[+b.dataset.i]);
      if (built.length === bank.length) {
        const ok = built.map((x) => x.t).join("") === seg(it.w).filter((t) => t.trim()).join("");
        if (ok) { score += 10 * bank.length; say(it.w); next(); } else { built = []; draw(); body.querySelector(".slots").style.background = "#ffd3d5"; }
      } else draw();
    });
    $("#undo").onclick = () => { built.pop(); draw(); };
    $("#skip").onclick = () => { left = Math.max(0, left - 5); next(); };
    setHud({ Waktu: left + "s", Skor: score });
  };
  const timer = setInterval(() => { if (!run) return; left--; setHud({ Waktu: left + "s", Skor: score }); if (left <= 0) { run = false; clearInterval(timer); gameOver("susun", score, "Waktu habis!", susun); } }, 1000);
  STOP = () => { run = false; clearInterval(timer); };
  next();
}

// ---------- 4. Memori Pasangan ----------
function memori() {
  open("Memori Pasangan");
  const set = shuffle(vocab(LANG)).slice(0, 8);
  const cards = shuffle(set.flatMap((it, i) => [{ k: i, t: it.w, word: true, it }, { k: i, t: it.m }]));
  let first = null, lock = false, moves = 0, done = 0, t0 = Date.now();
  body.innerHTML = `<div class="mem" id="mem">${cards.map((c, i) => `<button data-i="${i}" ${c.word ? `lang="${LANG}"` : ""} aria-label="Kartu tertutup">${esc(c.t)}</button>`).join("")}</div>`;
  const tick = setInterval(() => setHud({ Langkah: moves, Waktu: Math.round((Date.now() - t0) / 1000) + "s" }), 500);
  STOP = () => clearInterval(tick);
  body.querySelectorAll("[data-i]").forEach((b) => b.onclick = () => {
    const c = cards[+b.dataset.i];
    if (lock || b.classList.contains("open") || b.classList.contains("done")) return;
    b.classList.add("open"); b.setAttribute("aria-label", c.t); if (c.word) say(c.t);
    if (!first) { first = { b, c }; return; }
    moves++;
    if (first.c.k === c.k) { b.classList.add("done"); first.b.classList.add("done"); first = null; if (++done === 8) { clearInterval(tick); const sec = Math.round((Date.now() - t0) / 1000); gameOver("memori", Math.max(10, 1000 - moves * 20 - sec * 3), `${moves} langkah, ${sec} detik.`, memori); } }
    else { lock = true; setTimeout(() => { b.classList.remove("open"); first.b.classList.remove("open"); first = null; lock = false; }, 800); }
  });
}

// ---------- 5. Petualangan Kota ELCY (keliling dunia) ----------
const CITY = { en: "London", ja: "Tokyo", zh: "Beijing", fr: "Paris", ar: "Kairo" };
const PLACES = [
  { id: "kafe", name: "Kafe", color: "#c98b4a", cats: ["makanan"], ask: "Pelayan: “Mau pesan apa?” Pilih kata untuk", sim: 0 },
  { id: "stasiun", name: "Stasiun", color: "#00A5FF", cats: ["transport", "waktu"], ask: "Petugas stasiun bertanya. Pilih kata untuk" },
  { id: "pasar", name: "Pasar", color: "#28E143", cats: ["makanan", "angka", "warna"], ask: "Pedagang menunjuk barang. Pilih kata untuk" },
  { id: "kampus", name: "Kampus", color: "#FFD315", cats: ["salam", "benda", "kerja"], ask: "Teman kelas mengajak bicara. Pilih kata untuk" },
  { id: "kantor", name: "Kantor", color: "#E9212C", cats: ["keluarga", "sifat", "tempat"], ask: "Wawancara kerja dimulai.", sim: 1 },
];
function kota() {
  open(`Petualangan Kota ELCY · ${CITY[LANG]}`);
  const W = 900, H = 560;
  const save = (() => { try { return JSON.parse(localStorage.getItem("tujlc-kota")) || {}; } catch { return {}; } })();
  const done = new Set(save[LANG] || []);
  body.innerHTML = `<div style="width:min(900px,100%);display:grid;gap:8px"><canvas id="cv" width="${W}" height="${H}"></canvas>
    <p class="muted small" style="text-align:center">Gerak: panah / WASD / seret di layar. Masuk ke pintu gedung untuk menjalankan misi. Selesaikan 5 gedung untuk dapat cap paspor ${CITY[LANG]}.</p><div id="dlg"></div></div>`;
  const cv = $("#cv"), ctx = cv.getContext("2d"), me = new Image(); me.src = "assets/elcy-raincoat.webp";
  const B = PLACES.map((pl, i) => ({ ...pl, x: 60 + (i % 3) * 290, y: i < 3 ? 40 : 320, w: 200, h: 150 }));
  const P = { x: 430, y: 270, s: 4 }, keys = {}; let inDlg = false, run = true, score = 0;
  const kd = (e) => { keys[e.key.toLowerCase()] = true; if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) e.preventDefault(); };
  const ku = (e) => keys[e.key.toLowerCase()] = false;
  addEventListener("keydown", kd); addEventListener("keyup", ku);
  let drag = null; cv.onpointerdown = (e) => { const r = cv.getBoundingClientRect(); drag = { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
  cv.onpointermove = (e) => { if (drag) { const r = cv.getBoundingClientRect(); drag = { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; } };
  cv.onpointerup = () => drag = null;
  function mission(b) {
    inDlg = true; drag = null;
    let qs;
    if (b.sim !== undefined && AK.SIM[LANG][b.sim]) {
      qs = AK.SIM[LANG][b.sim].turns.map(([npc, opts]) => { const [w, r, m] = npc.split("|"); const o = shuffle(opts); return { npc: w, r, m, o: o.map((x) => x[0]), c: o.findIndex((x) => x[2] === 2), fb: o }; });
    } else qs = mcq(LANG, 3, b.cats).map((q) => ({ npc: null, ...q, o: shuffle(vocab(LANG, b.cats).filter((x) => x.w !== q.it.w)).slice(0, 3).map((x) => x.w).concat(q.it.w).sort(() => Math.random() - .5) })).map((q) => ({ ...q, c: q.o.indexOf(q.it.w), ask: `${b.ask} <mark>${esc(q.it.m)}</mark>` }));
    let i = 0, ok = 0;
    const show = () => {
      const q = qs[i];
      $("#dlg").innerHTML = `<div class="dlg"><div class="npc"><img src="assets/${pick(["elcy-picture", "elcy-podcast", "elcy-window", "elcy1"])}.webp" alt=""><div><h3>${b.name} · misi ${i + 1}/${qs.length}</h3>
        ${q.npc ? `<p lang="${LANG}" style="font-size:1.2rem;font-weight:700">${esc(q.npc)} <button class="say-sm" id="sp">▶</button></p>${q.r ? `<small class="o-read">${esc(q.r)}</small>` : ""}<details><summary>Arti</summary>${esc(q.m)}</details><p>Balasan terbaik?</p>` : `<p>${q.ask}</p>`}</div></div>
        <div class="opts" style="margin-top:10px">${q.o.map((o, j) => `<button class="opt" data-j="${j}" lang="${LANG}">${esc(o)}</button>`).join("")}</div><p id="fb"></p></div>`;
      if (q.npc) { say(q.npc); $("#sp").onclick = () => say(q.npc); }
      $("#dlg").scrollIntoView({ behavior: "smooth", block: "nearest" });
      $("#dlg").querySelectorAll("[data-j]").forEach((x) => x.onclick = () => {
        const j = +x.dataset.j, right = j === q.c;
        $("#dlg").querySelectorAll("[data-j]").forEach((y, k) => { y.disabled = true; if (k === q.c) y.classList.add("is-right"); else if (k === j) y.classList.add("is-wrong"); });
        if (right) ok++;
        $("#fb").textContent = q.fb ? q.fb[j][3] : right ? "Betul!" : `Yang benar: ${q.o[q.c]}`;
        say(q.o[q.c]);
        setTimeout(() => { i++; if (i < qs.length) show(); else finish(); }, 1300);
      });
    };
    const finish = () => {
      const pass = ok * 3 >= qs.length * 2; // minimal 2/3 benar
      score += ok * 50;
      if (pass) { done.add(b.id); save[LANG] = [...done]; try { localStorage.setItem("tujlc-kota", JSON.stringify(save)); } catch {} }
      $("#dlg").innerHTML = `<div class="dlg"><h3>${pass ? "Misi selesai!" : "Belum berhasil"}</h3><p>${ok}/${qs.length} benar.${pass ? "" : " Coba masuk lagi ke gedung ini."}</p>
        ${done.size === PLACES.length ? `<p><b>Cap paspor ${CITY[LANG]} didapat!</b> Pilih bahasa lain di atas untuk terbang ke kota berikutnya.</p><button class="btn btn--ink" id="fin">Simpan skor</button>` : ""}</div>`;
      if ($("#fin")) $("#fin").onclick = () => gameOver("kota", score + 200, `Semua misi di ${CITY[LANG]} selesai.`, kota);
      inDlg = false; P.y = b.y + b.h + 30;
    };
    show();
  }
  function loop() {
    if (!run) return;
    if (!inDlg) {
      let dx = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0), dy = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0);
      if (drag) { const vx = drag.x - P.x, vy = drag.y - P.y, d = Math.hypot(vx, vy); if (d > 6) { dx = vx / d; dy = vy / d; } }
      // Gerak per sumbu + tabrakan: gedung padat, hanya pintu (tengah bawah) yang bisa dimasuki
      const solid = (x, y) => B.some((b) => x > b.x - 8 && x < b.x + b.w + 8 && y > b.y - 8 && y < b.y + b.h - 4 && !(Math.abs(x - (b.x + b.w / 2)) < 22 && y > b.y + b.h - 40));
      const nx = Math.max(20, Math.min(W - 20, P.x + dx * P.s)), ny = Math.max(20, Math.min(H - 20, P.y + dy * P.s));
      if (!solid(nx, P.y)) P.x = nx;
      if (!solid(P.x, ny)) P.y = ny;
      for (const b of B) { if (Math.abs(P.x - (b.x + b.w / 2)) < 22 && P.y > b.y + b.h - 40 && P.y < b.y + b.h + 4) { mission(b); break; } }
    }
    ctx.fillStyle = "#cfe9c4"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#e8e2d2"; ctx.fillRect(0, 230, W, 70); ctx.fillRect(400, 0, 80, H);
    ctx.strokeStyle = "#fff"; ctx.setLineDash([18, 14]); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 265); ctx.lineTo(W, 265); ctx.moveTo(440, 0); ctx.lineTo(440, H); ctx.stroke(); ctx.setLineDash([]);
    for (const b of B) {
      ctx.fillStyle = b.color; ctx.strokeStyle = "#274045"; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.fillRect(b.x + 20, b.y + 22, 46, 34); ctx.fillRect(b.x + b.w - 66, b.y + 22, 46, 34);
      ctx.fillStyle = "#274045"; ctx.fillRect(b.x + b.w / 2 - 22, b.y + b.h - 50, 44, 50);
      ctx.fillStyle = "#274045"; ctx.font = "bold 22px Fredoka, sans-serif"; ctx.textAlign = "center"; ctx.fillText(b.name + (done.has(b.id) ? " ✓" : ""), b.x + b.w / 2, b.y + b.h - 62);
    }
    ctx.fillStyle = "#274045"; ctx.font = "bold 20px Fredoka, sans-serif"; ctx.textAlign = "left"; ctx.fillText(`${CITY[LANG]} · ${done.size}/5 misi`, 14, H - 14);
    if (me.complete) ctx.drawImage(me, P.x - 22, P.y - 50, 44, 84);
    setHud({ Kota: CITY[LANG], Misi: `${done.size}/5`, Skor: score });
    requestAnimationFrame(loop);
  }
  STOP = () => { run = false; removeEventListener("keydown", kd); removeEventListener("keyup", ku); };
  requestAnimationFrame(loop);
}

// ---------- 6. Duel Kuis (2 orang, 1 layar) ----------
function duel() {
  open("Duel Kuis · 2 pemain");
  const qs = mcq(LANG, 10); let i = 0, sa = 0, sb = 0, lock = false;
  const draw = () => {
    const q = qs[i];
    const side = (who) => `<div class="duel__side duel__side--${who}"><p class="g-prompt" lang="${LANG}">${esc(q.p)}${q.r ? ` <small>(${esc(q.r)})</small>` : ""}</p><div class="duel__opts">${q.o.map((o, j) => `<button class="opt" data-w="${who}" data-j="${j}">${esc(o)}</button>`).join("")}</div></div>`;
    body.innerHTML = `<div class="duel" style="height:min(80vh,720px);width:min(720px,100%)">${side("a")}<div class="duel__mid">Pemain A ${sa} : ${sb} Pemain B · soal ${i + 1}/10</div>${side("b")}</div>`;
    body.querySelectorAll("[data-j]").forEach((b) => b.onclick = () => {
      if (lock) return; lock = true;
      const ok = +b.dataset.j === q.c, w = b.dataset.w;
      if (ok) { w === "a" ? sa++ : sb++; } else { w === "a" ? sb++ : sa++; }
      b.classList.add(ok ? "is-right" : "is-wrong"); say(q.p);
      setTimeout(() => { lock = false; i++; i < qs.length ? draw() : end(); }, 900);
    });
    setHud({ A: sa, B: sb });
  };
  const end = () => gameOver("duel", Math.max(sa, sb) * 100, sa === sb ? "Seri!" : `Pemain ${sa > sb ? "A" : "B"} menang ${Math.max(sa, sb)}–${Math.min(sa, sb)}. (Skor dicatat ke akun yang sedang masuk.)`, duel);
  draw();
}

// ---------- 7. Mabar Kuis (2–5 pemain, online) ----------
function mabar() {
  open("Mabar Kuis · 2–5 pemain");
  body.innerHTML = `<div class="room"><p>Main bareng dari HP/laptop masing-masing. Semua pemain harus membuka web TUJLC dari <b>server yang sama</b> (misalnya WiFi kampus, server dijalankan dengan <code>--lan</code>).</p>
    <div class="hero__cta"><button class="btn btn--ink" id="mk">Buat ruang</button></div>
    <form class="absen__row" id="jf"><input id="jc" placeholder="Kode ruang (4 huruf)" maxlength="4" autocapitalize="characters" required><button class="btn btn--small">Gabung</button></form><p class="gate__err" id="er"></p></div>`;
  let code = null, poll = null, lastI = -2;
  const start = async (fn) => { try { const s = await fn(); code = s.code; loop(); } catch (e) { $("#er").textContent = e.message; } };
  $("#mk").onclick = () => start(() => TUJ.api("/api/room/create", { lang: LANG }));
  $("#jf").onsubmit = (e) => { e.preventDefault(); start(() => TUJ.api("/api/room/join", { code: $("#jc").value })); };
  async function loop() {
    clearInterval(poll);
    const tick = async () => {
      let s; try { s = await TUJ.api("/api/room/state?code=" + code); } catch (e) { body.innerHTML = `<p class="gate__err">${esc(e.message)}</p>`; return clearInterval(poll); }
      render(s);
    };
    poll = setInterval(tick, 700); tick();
  }
  STOP = () => clearInterval(poll);
  function render(s) {
    const players = `<div class="room__players">${s.players.map((p) => `<span class="${p.answered ? "ok" : ""}">${esc(p.nama.split(" ")[0])} · ${p.score}</span>`).join("")}</div>`;
    setHud({ Ruang: s.code, Pemain: `${s.players.length}/5` });
    if (s.status === "lobi") {
      body.innerHTML = `<div class="room"><p>Bagikan kode ini ke teman (2–5 pemain):</p><div class="room__code">${s.code}</div>${players}
        ${s.host ? `<button class="btn btn--ink" id="go" ${s.players.length < 2 ? "disabled" : ""}>Mulai (${LANGS[s.lang].name}, 10 soal)</button>` : `<p class="muted">Menunggu pembuat ruang memulai…</p>`}</div>`;
      if (s.host) $("#go").onclick = async () => { const qs = mcq(s.lang, 10).map((q) => ({ p: q.p, r: q.r, o: q.o, c: q.c })); try { await TUJ.api("/api/room/start", { code: s.code, questions: qs }); } catch (e) { alert(e.message); } };
    } else if (s.status === "main") {
      const q = s.question, mine = s.my_answer, reveal = q.c !== undefined;
      if (s.i !== lastI) { lastI = s.i; say(q.p, s.lang); }
      body.innerHTML = `<div class="room">${players}<p class="muted">Soal ${s.i + 1}/${s.total} · sisa ${Math.ceil(q.left)} detik</p>
        <p class="g-prompt" lang="${s.lang}">${esc(q.p)}${q.r ? ` <small>(${esc(q.r)})</small>` : ""}</p>
        <div class="opts">${q.o.map((o, j) => `<button class="opt ${reveal && j === q.c ? "is-right" : ""} ${mine && mine.choice === j && !mine.ok ? "is-wrong" : ""} ${mine && mine.choice === j ? "is-sel" : ""}" data-j="${j}" ${mine || reveal ? "disabled" : ""}>${esc(o)}</button>`).join("")}</div>
        ${mine ? `<p>${mine.ok ? `Betul! +${mine.pts}` : "Kurang tepat."}</p>` : ""}</div>`;
      body.querySelectorAll("[data-j]").forEach((b) => b.onclick = () => TUJ.api("/api/room/answer", { code: s.code, choice: +b.dataset.j }).then(render).catch(() => {}));
    } else {
      clearInterval(poll);
      const rank = [...s.players].sort((a, b) => b.score - a.score);
      body.innerHTML = `<div class="g-over"><h2 class="display display--md">Hasil mabar</h2><ol class="lb">${rank.map((p, i) => `<li><span>${i === 0 ? "🏆 " : ""}${esc(p.nama)}</span><b>${p.score}</b></li>`).join("")}</ol>
        <div class="hero__cta"><button class="btn btn--ink" id="again">Ruang baru</button><button class="btn btn--ghost-ink" id="back">Pilih game lain</button></div></div>`;
      $("#again").onclick = mabar; $("#back").onclick = close;
    }
  }
}

// ---------- menu ----------
const GAMES = [
  ["lari", "ELCY Lari Kata", "Arcade. Lompati rintangan, tabrak kata yang artinya cocok. Makin lama makin cepat.", "elcy-motoran", "sky", lari, "1 pemain"],
  ["suara", "Tangkap Suara", "Kata berjatuhan, ELCY membacakan satu. Tangkap yang terdengar sebelum menyentuh tanah.", "elcy-podcast", "red", suara, "1 pemain"],
  ["susun", "Susun Kata Kilat", "Huruf, kana, atau hanzi diacak. Susun jadi kata sebelum 60 detik habis.", "elcy-umbrella", "yellow", susun, "1 pemain"],
  ["memori", "Memori Pasangan", "Balik kartu, cocokkan kata dengan artinya. Cocok untuk pemula.", "elcy-window", "teal", memori, "1 pemain"],
  ["kota", "Petualangan Kota ELCY", "Keliling London, Tokyo, Beijing, Paris, Kairo. Jalankan misi di kafe, stasiun, pasar, kampus, kantor.", "elcy-raincoat", "green", kota, "RPG mini"],
  ["dunia", "Keliling Dunia ELCY 3D", "Naik skuter ELCY keliling London, Tokyo, Beijing, Paris, Kairo. Ngobrol dengan warga, kumpulkan cap paspor.", "elcy-motoran", "sky", () => { location.href = "dunia.html#" + LANG; }, "Petualangan 3D"],
  ["duel", "Duel Kuis", "Dua orang di satu HP, berhadapan. Siapa paling cepat menjawab?", "elcy-picture", "ink", duel, "2 pemain · 1 layar"],
  ["mabar", "Mabar Kuis", "Buat ruang, bagikan kode, main bareng 2–5 anggota dari HP masing-masing.", "elcy1", "yellow", mabar, "2–5 pemain · online"],
];
function renderMenu() {
  $("#langs").innerHTML = LK.map((k) => `<button class="langtab langtab--${LANGS[k].color}" data-k="${k}" ${k === LANG ? 'aria-current="page"' : ""}><span lang="${k}">${LANGS[k].native}</span>${LANGS[k].name}</button>`).join("");
  $("#langs").querySelectorAll("[data-k]").forEach((b) => b.onclick = () => { LANG = b.dataset.k; try { localStorage.setItem("tujlc-arena-lang", LANG); } catch {} renderMenu(); });
  $("#games").innerHTML = GAMES.map(([id, n, d, img, c, , tag]) => `<button class="gcard gcard--${c}" data-g="${id}"><span class="pill">${tag}</span><h3>${n}</h3><p>${d}</p><img src="assets/${img}.webp" alt=""></button>`).join("");
  $("#games").querySelectorAll("[data-g]").forEach((b) => b.onclick = () => GAMES.find((g) => g[0] === b.dataset.g)[5]());
}
TUJ.requireMember("arena.html").then((ok) => { if (ok) { renderMenu(); const g = location.hash.slice(1); if (GAMES.some((x) => x[0] === g)) GAMES.find((x) => x[0] === g)[5](); } });
