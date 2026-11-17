// Akademi ELCY: jalur 40 tes, latihan kategori, simulator, chat AI, tugas tulis.
// Wajib masuk sebagai anggota (dicek di akhir file sebelum render)

const $ = (s, r = document) => r.querySelector(s);
const esc = TUJ.esc;
const LK = Object.keys(LANGS);
const SKEY = "tujlc-akademi";
const RTL = (k) => k === "ar";
const NOSPACE = (k) => k === "ja" || k === "zh";

// ---------- Penyimpanan ----------
function load() { try { return JSON.parse(localStorage.getItem(SKEY)) || {}; } catch { return {}; } }
function save() { try { localStorage.setItem(SKEY, JSON.stringify(S)); } catch {} }
const S = Object.assign({ lang: "en", xp: 0, streak: { d: "", n: 0 }, L: {}, writes: [] }, load());
const P = (k = S.lang) => (S.L[k] ||= { done: {}, unlocked: 1, xp: 0 });
const today = () => new Date().toISOString().slice(0, 10);
function bumpStreak() {
  const t = today();
  if (S.streak.d === t) return;
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  S.streak = { d: t, n: S.streak.d === y ? S.streak.n + 1 : 1 };
}

// ---------- Bank materi ----------
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function vocab(k, cat) {
  const c = AK.CATS.find((x) => x.id === cat);
  const ms = c.id_.split(";");
  return AK.VOCAB[k][cat].split(";").map((s, i) => { const [w, r = ""] = s.split("|"); return { kind: "v", w, r, m: ms[i], cat }; });
}
const allVocab = (k) => AK.CATS.flatMap((c) => vocab(k, c.id));
function range(spec, arr) { const [a, b] = spec.split("-").map(Number); return arr.slice(a, (b ?? a) + 1); }
function sentences(k) { return AK.SENT[k].map((s) => { const [t, r, m] = s.split("|"); const tiles = t.split("/"); return { kind: "s", tiles, w: tiles.join(NOSPACE(k) ? "" : " "), r, m }; }); }
function regs(k) { return AK.REG[k].map((s) => { const [b, g, gr, m, note] = s.split("|"); return { kind: "r", b, g, gr, m, note }; }); }
function dials(k) { return AK.DIAL[k].map((s) => { const [dial, e, r, std, m] = s.split("|"); return { kind: "d", dial, e, r, std, m }; }); }
function idioms(k) { return AK.IDIOM[k].map((s) => { const [e, r, m] = s.split("|"); return { kind: "i", e, r, m }; }); }
function simTurns(k, i) { const sc = AK.SIM[k][i]; return sc.turns.map(([npc, opts], t) => { const [w, r, m] = npc.split("|"); return { kind: "x", sc: sc.title, t, w, r, m, opts }; }); }

function poolFor(k, pools) {
  const P = { v: [], s: [], r: [], d: [], i: [], x: [] };
  pools.forEach((p) => {
    if (p.startsWith("s:")) P.s.push(...range(p.slice(2), sentences(k)));
    else if (p.startsWith("r:")) P.r.push(...range(p.slice(2), regs(k)));
    else if (p.startsWith("d:")) P.d.push(...range(p.slice(2), dials(k)));
    else if (p.startsWith("i:")) P.i.push(...range(p.slice(2), idioms(k)));
    else if (p.startsWith("x:")) P.x.push(...simTurns(k, +p.slice(2)));
    else P.v.push(...vocab(k, p));
  });
  return P;
}
const TYPE_POOL = { m: "v", w: "v", l: "v", p: "v", t: "v", s: "s", r: "r", d: "d", i: "i", x: "x" };

function buildQuiz(k, types, pools, n = 10) {
  const pool = poolFor(k, pools);
  // Tes khusus simulator: semua giliran berurutan
  if (types === "x") return pool.x.map((it) => ({ type: "x", it }));
  const used = new Set(); const qs = [];
  const avail = [...types].filter((t) => pool[TYPE_POOL[t]].length);
  if (!avail.length) return [];
  // giliran simulator tetap berurutan dan utuh
  const simQ = avail.includes("x") ? pool.x.map((it) => ({ type: "x", it })) : [];
  const rest = avail.filter((t) => t !== "x");
  let i = 0, guard = 0;
  while (qs.length < Math.max(0, n - simQ.length) && rest.length && guard++ < 400) {
    const t = rest[i++ % rest.length];
    const src = pool[TYPE_POOL[t]];
    const cand = src.filter((it) => !used.has(t + it.w + it.e + it.b));
    const it = pick(cand.length ? cand : src);
    used.add(t + it.w + it.e + it.b);
    if (t === "p" && pool.v.length < 4) continue;
    qs.push({ type: t, it, pool });
  }
  return shuffle(qs).concat(simQ);
}

// ---------- Normalisasi jawaban ketik ----------
function norm(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")
    .replace(/^(to |the |a |an |le |la |les |l'|un |une )/, "")
    .replace(/[\s'’`ʿʾ\-.,!?¿¡。、？！«»"“”]/g, "");
}
const sameAns = (input, it) => [it.w, it.r].filter(Boolean).some((x) => norm(x) === norm(input));

// ---------- Suara ----------
const SPEECH = (k) => LANGS[k].speech;
const say = (text, k = S.lang) => TUJ.speak(text, SPEECH(k));

// ---------- Player ----------
const PL = { qs: [], i: 0, ok: 0, hearts: 3, onEnd: null, cur: null, answered: false };
const elP = $("#player"), elBody = $("#pBody"), elMsg = $("#pMsg"), elCheck = $("#pCheck"), elFoot = $("#pFoot");

function startQuiz({ title, qs, hearts = 3, pass = 80, onEnd }) {
  if (!qs.length) { alert("Materi untuk tes ini belum tersedia."); return; }
  Object.assign(PL, { title, qs, i: 0, ok: 0, hearts, maxH: hearts, pass, onEnd, answered: false, finished: null });
  elP.hidden = false; document.body.style.overflow = "hidden";
  showQ();
}
function closeQuiz() { elP.hidden = true; document.body.style.overflow = ""; speechSynthesis?.cancel?.(); }
$("#pClose").onclick = () => { if (confirm("Keluar dari tes? Progres tes ini tidak disimpan.")) closeQuiz(); };

function hearts() { $("#pHearts").innerHTML = Array.from({ length: PL.maxH }, (_, i) => `<span class="${i < PL.hearts ? "on" : ""}">♥</span>`).join(""); }
function bar() { $("#pBar").style.width = (PL.i / PL.qs.length) * 100 + "%"; }

function optButtons(opts, render) {
  return `<div class="opts">${opts.map((o, i) => `<button class="opt" data-i="${i}">${render(o)}</button>`).join("")}</div>`;
}
function wordHTML(it, k = S.lang, big) {
  return `<span class="${big ? "q-word" : "o-word"}" lang="${k}"${RTL(k) ? ' dir="rtl"' : ""}>${esc(it.w ?? it.e)}</span>${it.r ? `<small class="o-read">${esc(it.r)}</small>` : ""}`;
}
function distract(correct, list, key, n = 3) {
  const uniq = [...new Map(list.filter((x) => x[key] !== correct[key]).map((x) => [x[key], x])).values()];
  return shuffle([correct, ...shuffle(uniq).slice(0, n)]);
}

function showQ() {
  hearts(); bar();
  PL.answered = false; elMsg.textContent = ""; elFoot.className = "player__foot";
  elCheck.textContent = "Periksa"; elCheck.disabled = true;
  const q = PL.qs[PL.i]; PL.cur = q; const it = q.it; const k = S.lang; const Ln = LANGS[k].name;
  const allV = allVocab(k);
  let html = `<p class="q-title">${esc(PL.title)} · soal ${PL.i + 1}/${PL.qs.length}</p>`;
  q.answer = null;

  if (q.type === "m") {
    q.opts = distract(it, q.pool.v.length >= 4 ? q.pool.v : allV, "m");
    html += `<h2 class="q-ask">Apa arti kata ini?</h2><div class="q-show"><button class="spk" data-say="${esc(it.w)}">▶</button>${wordHTML(it, k, true)}</div>` + optButtons(q.opts, (o) => esc(o.m));
    q.correct = q.opts.indexOf(it);
  } else if (q.type === "w" || q.type === "l") {
    q.opts = distract(it, q.pool.v.length >= 4 ? q.pool.v : allV, "w");
    html += q.type === "w"
      ? `<h2 class="q-ask">Pilih ${Ln} untuk: <mark>${esc(it.m)}</mark></h2>`
      : `<h2 class="q-ask">Dengarkan, lalu pilih yang kamu dengar</h2><div class="q-show"><button class="spk spk--big" data-say="${esc(it.w)}">▶ Putar</button></div>`;
    html += optButtons(q.opts, (o) => wordHTML(o, k));
    q.correct = q.opts.indexOf(it);
    if (q.type === "l") setTimeout(() => say(it.w), 300);
  } else if (q.type === "p") {
    const four = shuffle(q.pool.v.length >= 4 ? q.pool.v : allV).slice(0, 4);
    q.pairs = four; q.left = shuffle(four); q.right = shuffle(four); q.matched = 0; q.miss = 0;
    html += `<h2 class="q-ask">Pasangkan kata dengan artinya</h2><div class="pairs"><div>${q.left.map((o, i) => `<button class="pair" data-side="l" data-i="${i}">${wordHTML(o, k)}</button>`).join("")}</div><div>${q.right.map((o, i) => `<button class="pair" data-side="r" data-i="${i}">${esc(o.m)}</button>`).join("")}</div></div>`;
  } else if (q.type === "t") {
    html += `<h2 class="q-ask">Ketik dalam ${Ln}: <mark>${esc(it.m)}</mark></h2><input class="q-input" id="qIn" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${["ja", "zh", "ar"].includes(k) ? "Huruf asli atau latin (romaji/pinyin)" : "Jawabanmu"}"${RTL(k) ? ' dir="auto"' : ""}><p class="muted small">Tanda baca dan aksen boleh diabaikan.</p>`;
  } else if (q.type === "s") {
    q.bank = shuffle(it.tiles.map((t, i) => ({ t, i }))); q.built = [];
    html += `<h2 class="q-ask">Susun kalimat: <mark>${esc(it.m)}</mark></h2><div class="tiles-ans" id="tAns"${RTL(k) ? ' dir="rtl"' : ""}></div><div class="tiles-bank" id="tBank"${RTL(k) ? ' dir="rtl"' : ""}></div>`;
  } else if (q.type === "r") {
    const all = q.pool.r;
    if (Math.random() < 0.5) {
      q.opts = distract(it, all, "g");
      html += `<h2 class="q-ask">Versi santai/gaul dari:</h2><div class="q-show"><span class="q-word" lang="${k}">${esc(it.b)}</span></div>` + optButtons(q.opts, (o) => `<span lang="${k}">${esc(o.g)}</span>${o.gr ? `<small class="o-read">${esc(o.gr)}</small>` : ""}`);
    } else {
      q.opts = distract(it, all, "m");
      html += `<h2 class="q-ask">Ungkapan gaul ini artinya?</h2><div class="q-show"><button class="spk" data-say="${esc(it.g)}">▶</button><span class="q-word" lang="${k}">${esc(it.g)}</span>${it.gr ? `<small class="o-read">${esc(it.gr)}</small>` : ""}</div>` + optButtons(q.opts, (o) => esc(o.m));
    }
    q.correct = q.opts.indexOf(it); q.note = it.note;
  } else if (q.type === "d") {
    const all = q.pool.d;
    if (Math.random() < 0.5 && new Set(all.map((x) => x.dial)).size >= 2) {
      q.opts = distract(it, all, "dial");
      html += `<h2 class="q-ask">Ungkapan ini berasal dari logat mana?</h2><div class="q-show"><span class="q-word" lang="${k}">${esc(it.e)}</span>${it.r ? `<small class="o-read">${esc(it.r)}</small>` : ""}<small class="o-read">artinya: ${esc(it.m)}</small></div>` + optButtons(q.opts, (o) => esc(o.dial));
    } else {
      q.opts = distract(it, all, "m");
      html += `<h2 class="q-ask">Logat ${esc(it.dial)}: apa artinya?</h2><div class="q-show"><span class="q-word" lang="${k}">${esc(it.e)}</span>${it.r ? `<small class="o-read">${esc(it.r)}</small>` : ""}</div>` + optButtons(q.opts, (o) => esc(o.m));
    }
    q.correct = q.opts.indexOf(it); q.note = `Bentuk baku: ${it.std}`;
  } else if (q.type === "i") {
    q.opts = distract(it, q.pool.i.length >= 3 ? q.pool.i : idioms(k), "m");
    html += `<h2 class="q-ask">Apa arti peribahasa ini?</h2><div class="q-show"><button class="spk" data-say="${esc(it.e)}">▶</button><span class="q-word" lang="${k}"${RTL(k) ? ' dir="rtl"' : ""}>${esc(it.e)}</span>${it.r ? `<small class="o-read">${esc(it.r)}</small>` : ""}</div>` + optButtons(q.opts, (o) => esc(o.m));
    q.correct = q.opts.indexOf(it);
  } else if (q.type === "x") {
    q.opts = shuffle(it.opts);
    html += `<p class="sim-sc">Simulator · ${esc(it.sc)}</p><div class="bubble-npc"><img src="assets/elcy-picture.webp" alt=""><div><button class="spk" data-say="${esc(it.w)}">▶</button><span lang="${k}"${RTL(k) ? ' dir="rtl"' : ""}>${esc(it.w)}</span>${it.r ? `<small class="o-read">${esc(it.r)}</small>` : ""}<details><summary>Lihat arti</summary>${esc(it.m)}</details></div></div><h2 class="q-ask">Balasan terbaik?</h2>` + optButtons(q.opts, (o) => `<span lang="${k}"${RTL(k) ? ' dir="rtl"' : ""}>${esc(o[0])}</span>${o[1] ? `<small class="o-read">${esc(o[1])}</small>` : ""}`);
    setTimeout(() => say(it.w), 300);
  }
  elBody.innerHTML = html;
  bindQ(q);
}

function bindQ(q) {
  elBody.querySelectorAll("[data-say]").forEach((b) => b.onclick = () => say(b.dataset.say));
  elBody.querySelectorAll(".opt").forEach((b) => b.onclick = () => {
    if (PL.answered) return;
    elBody.querySelectorAll(".opt").forEach((x) => x.classList.toggle("is-sel", x === b));
    q.answer = +b.dataset.i; elCheck.disabled = false;
  });
  if (q.type === "t") { const inp = $("#qIn"); inp.focus(); inp.oninput = () => elCheck.disabled = !inp.value.trim(); inp.onkeydown = (e) => { if (e.key === "Enter" && inp.value.trim()) elCheck.click(); }; }
  if (q.type === "s") drawTiles(q);
  if (q.type === "p") {
    let selL = null, selR = null;
    elBody.querySelectorAll(".pair").forEach((b) => b.onclick = () => {
      if (b.classList.contains("is-done")) return;
      const side = b.dataset.side;
      elBody.querySelectorAll(`.pair[data-side="${side}"]`).forEach((x) => x.classList.toggle("is-sel", x === b));
      if (side === "l") selL = b; else selR = b;
      if (selL && selR) {
        const a = q.left[+selL.dataset.i], c = q.right[+selR.dataset.i];
        if (a === c) { [selL, selR].forEach((x) => { x.classList.remove("is-sel"); x.classList.add("is-done"); }); q.matched++; say(a.w); }
        else { q.miss++; [selL, selR].forEach((x) => { x.classList.add("is-bad"); setTimeout(() => x.classList.remove("is-bad", "is-sel"), 500); }); }
        selL = selR = null;
        if (q.matched === 4) { elCheck.disabled = false; elCheck.click(); }
      }
    });
  }
}
function drawTiles(q) {
  const k = S.lang;
  $("#tAns").innerHTML = q.built.map((o, i) => `<button class="tile" data-a="${i}" lang="${k}">${esc(o.t)}</button>`).join("") || `<span class="muted small">Ketuk potongan di bawah</span>`;
  $("#tBank").innerHTML = q.bank.map((o, i) => `<button class="tile" data-b="${i}" lang="${k}" ${q.built.includes(o) ? "disabled" : ""}>${esc(o.t)}</button>`).join("");
  elBody.querySelectorAll("[data-b]").forEach((b) => b.onclick = () => { if (PL.answered) return; q.built.push(q.bank[+b.dataset.b]); drawTiles(q); });
  elBody.querySelectorAll("[data-a]").forEach((b) => b.onclick = () => { if (PL.answered) return; q.built.splice(+b.dataset.a, 1); drawTiles(q); });
  elCheck.disabled = q.built.length !== q.bank.length;
}

elCheck.onclick = () => {
  if (PL.finished) {
    const r = PL.finished, cb = PL.onEnd; PL.finished = null; PL.onEnd = null;
    closeQuiz(); if (cb) cb(r); renderAll(); return;
  }
  if (PL.answered) return next();
  const q = PL.cur, it = q.it, k = S.lang;
  let ok = false, credit = 0, msg = "";
  if (["m", "w", "l", "r", "d", "i"].includes(q.type)) {
    ok = q.answer === q.correct;
    elBody.querySelectorAll(".opt").forEach((b, i) => { if (i === q.correct) b.classList.add("is-right"); else if (i === q.answer) b.classList.add("is-wrong"); });
    const c = q.opts[q.correct];
    msg = ok ? "Betul!" : `Jawaban benar: ${c.m && q.type !== "w" && q.type !== "l" ? c.m : c.w || c.g || c.dial || c.m}`;
    if (q.note) msg += ` · ${q.note}`;
    if (q.type !== "w" && q.type !== "l" && it.w) say(it.w);
  } else if (q.type === "p") {
    ok = q.miss === 0; msg = ok ? "Semua cocok tanpa salah!" : `Selesai, tapi ada ${q.miss} salah pasang.`;
  } else if (q.type === "t") {
    const v = $("#qIn").value; ok = sameAns(v, it); $("#qIn").disabled = true;
    msg = ok ? "Betul!" : `Jawaban benar: ${it.w}${it.r ? ` (${it.r})` : ""}`; say(it.w);
  } else if (q.type === "s") {
    ok = q.built.map((o) => o.t).join("|") === it.tiles.join("|");
    msg = ok ? "Kalimatnya pas!" : `Urutan benar: ${it.w}`; say(it.w);
  } else if (q.type === "x") {
    const o = q.opts[q.answer]; credit = o[2] / 2; ok = o[2] === 2;
    elBody.querySelectorAll(".opt").forEach((b, i) => b.classList.add(q.opts[i][2] === 2 ? "is-right" : i === q.answer ? (o[2] === 1 ? "is-meh" : "is-wrong") : "x"));
    msg = (o[2] === 2 ? "Pas! " : o[2] === 1 ? "Kurang tepat. " : "Belum tepat. ") + o[3];
    say(o[0]);
  }
  if (q.type !== "x") credit = ok ? 1 : 0;
  PL.ok += credit;
  if (!ok && q.type !== "x") PL.hearts--;
  if (q.type === "x" && credit === 0) PL.hearts--;
  PL.answered = true;
  elFoot.className = "player__foot " + (ok ? "is-ok" : credit > 0 ? "is-meh" : "is-bad");
  elMsg.textContent = msg; elCheck.textContent = "Lanjut"; elCheck.disabled = false; hearts();
};
function next() {
  if (PL.hearts <= 0) return finish(true);
  PL.i++;
  if (PL.i >= PL.qs.length) return finish(false);
  showQ();
}
function finish(outOfHearts) {
  const pct = Math.round((PL.ok / PL.qs.length) * 100);
  const passed = !outOfHearts && pct >= PL.pass;
  const stars = passed ? (pct >= 95 ? 3 : pct >= 88 ? 2 : 1) : 0;
  const xp = Math.round(PL.ok * 10) + (passed ? 20 : 0);
  S.xp += xp; P().xp += xp; bumpStreak(); save();
  $("#pBar").style.width = "100%";
  elBody.innerHTML = `<div class="result ${passed ? "is-pass" : "is-fail"}">
    <img src="assets/${passed ? "elcy-motoran" : "elcy-raincoat"}.webp" alt="" width="200">
    <h2 class="display display--md">${passed ? "Lulus!" : outOfHearts ? "Nyawa habis" : "Belum lulus"}</h2>
    <p class="result__score">${pct}% · ${"★".repeat(stars)}${"☆".repeat(3 - stars)} · +${xp} XP</p>
    <p>${passed ? "Tes berikutnya sudah terbuka." : `Butuh minimal ${PL.pass}% dan nyawa tersisa. Coba lagi, soalnya diacak ulang.`}</p>
  </div>`;
  elFoot.className = "player__foot"; elMsg.textContent = "";
  elCheck.textContent = "Selesai"; elCheck.disabled = false;
  PL.finished = { passed, pct, stars };
}

// ---------- Jalur ----------
function modeOf(n) { return AK.MODES.find((m) => n >= m.from && n <= m.to); }
function canPlay(n) { const p = P(); return n === 1 || p.done[n - 1] || n <= p.unlocked; }
function currentMode(k = S.lang) { const p = P(k); let n = 1; while (n <= 40 && (p.done[n])) n++; return modeOf(Math.min(n, 40)); }

function runTest(n, jump) {
  const [title, types, pools, len] = AK.TESTS[n - 1];
  const exam = AK.EXAMS.includes(n);
  const q = buildQuiz(S.lang, types, pools, jump ? 15 : len || 10);
  startQuiz({
    title: jump ? `Tes lompat: ${title}` : `Tes ${n}: ${title}`, qs: q,
    hearts: jump ? 4 : exam ? 3 : 3, pass: n === 40 ? 85 : 80,
    onEnd: ({ passed, stars }) => {
      if (!passed) return;
      const p = P();
      if (jump) { for (let i = 1; i <= n; i++) p.done[i] ||= 1; p.unlocked = Math.max(p.unlocked, n + 1); }
      else { p.done[n] = Math.max(p.done[n] || 0, stars); p.unlocked = Math.max(p.unlocked, n + 1); }
      save();
    },
  });
}

function renderPath() {
  const p = P(), k = S.lang;
  $("#tab-path").innerHTML = AK.MODES.map((m, mi) => {
    const doneN = Array.from({ length: m.to - m.from + 1 }, (_, i) => m.from + i).filter((n) => p.done[n]).length;
    const total = m.to - m.from + 1;
    const locked = !canPlay(m.from);
    const prevExam = AK.EXAMS[mi - 1];
    return `<section class="mode mode--${m.color}">
      <header class="mode__head">
        <div><p class="mode__cefr">${m.cefr}</p><h2>${m.name}</h2><p>${m.desc}</p></div>
        <div class="mode__side"><span class="mode__count">${doneN}/${total}</span>
        ${mi > 0 && locked ? `<button class="btn btn--small" data-jump="${prevExam}">Tes lompat ke ${m.name}</button>` : ""}</div>
      </header>
      <ol class="nodes">${Array.from({ length: total }, (_, i) => {
        const n = m.from + i, [t] = AK.TESTS[n - 1], st = p.done[n] || 0, can = canPlay(n), exam = AK.EXAMS.includes(n);
        return `<li style="--x:${Math.round(Math.sin(i * 0.9) * 60)}px"><button class="node ${st ? "is-done" : ""} ${can ? "" : "is-locked"} ${exam ? "is-exam" : ""}" data-test="${n}" ${can ? "" : 'aria-disabled="true"'}>
          <b>${can ? (exam ? "★" : n) : "🔒"}</b></button><span class="node__label">${n}. ${t}${st ? ` <em>${"★".repeat(st)}</em>` : ""}</span></li>`;
      }).join("")}</ol>
    </section>`;
  }).join("");
  $("#tab-path").querySelectorAll("[data-test]").forEach((b) => b.onclick = () => {
    const n = +b.dataset.test;
    if (!canPlay(n)) { alert("Selesaikan tes sebelumnya, atau ambil tes lompat di kepala mode ini."); return; }
    runTest(n);
  });
  $("#tab-path").querySelectorAll("[data-jump]").forEach((b) => b.onclick = () => {
    if (confirm("Tes lompat berisi 15 soal dari ujian mode sebelumnya. Lulus 80% = semua tes sebelumnya terbuka. Mulai?")) runTest(+b.dataset.jump, true);
  });
}

// ---------- Latihan kategori ----------
function renderFree() {
  const k = S.lang;
  const extra = [["Kalimat", "s", ["s:0-11"]], ["Bahasa gaul", "r", ["r:0-5"]], ["Dialek & logat", "d", ["d:0-5"]], ["Peribahasa", "i", ["i:0-4"]]];
  $("#tab-free").innerHTML = `<div class="section__head"><h2 class="display display--md">Latihan bebas per kategori</h2><p class="muted">Tidak memengaruhi jalur, tapi tetap dapat XP. Pilih kategori, lalu jenis latihannya.</p></div>
  <div class="cats">${AK.CATS.map((c) => { const v = vocab(k, c.id); return `<div class="cat"><h3>${c.name}</h3><p lang="${k}" class="cat__ex"${RTL(k) ? ' dir="rtl"' : ""}>${v.slice(0, 3).map((x) => esc(x.w)).join(" · ")}</p>
    <div class="cat__btns"><button class="chip" data-free="${c.id}" data-t="mwlp">Pilihan ganda</button><button class="chip" data-free="${c.id}" data-t="t">Ketik</button><button class="chip" data-free="${c.id}" data-t="l">Dengar</button></div>
    <details><summary>Lihat 10 kata</summary><ul class="wordlist">${v.map((x) => `<li><button class="say-sm" data-say="${esc(x.w)}">▶</button><b lang="${k}">${esc(x.w)}</b>${x.r ? ` <i>${esc(x.r)}</i>` : ""} — ${esc(x.m)}</li>`).join("")}</ul></details></div>`; }).join("")}
  ${extra.map(([n, t, p]) => `<div class="cat cat--alt"><h3>${n}</h3><p class="muted small">${t === "s" ? "Susun 12 kalimat dari mudah ke sulit." : t === "r" ? "Bedakan bentuk baku dan santai." : t === "d" ? "Kenali logat daerah." : "Pahami ungkapan khas."}</p><div class="cat__btns"><button class="chip" data-xfree="${p[0]}" data-t="${t}">Mulai</button></div></div>`).join("")}</div>`;
  $("#tab-free").querySelectorAll("[data-say]").forEach((b) => b.onclick = () => say(b.dataset.say));
  $("#tab-free").querySelectorAll("[data-free]").forEach((b) => b.onclick = () => startQuiz({ title: `Latihan ${AK.CATS.find((c) => c.id === b.dataset.free).name}`, qs: buildQuiz(k, b.dataset.t, [b.dataset.free], 10), hearts: 5, pass: 70 }));
  $("#tab-free").querySelectorAll("[data-xfree]").forEach((b) => b.onclick = () => startQuiz({ title: "Latihan bebas", qs: buildQuiz(k, b.dataset.t, [b.dataset.xfree], 10), hearts: 5, pass: 70 }));
}

// ---------- Simulator ----------
function renderSim() {
  const k = S.lang;
  $("#tab-sim").innerHTML = `<div class="section__head"><h2 class="display display--md">Simulator percakapan</h2><p class="muted">ELCY memerankan lawan bicara. Pilih balasan paling pas; tiap pilihan dinilai dari ketepatan bahasa dan kesopanan (register).</p></div>
  <div class="simgrid">${AK.SIM[k].map((s, i) => `<div class="simcard"><span class="pill">${i === 0 ? "Menengah · B1" : "Mahir · C1"}</span><h3>${esc(s.title)}</h3><p lang="${k}"${RTL(k) ? ' dir="rtl"' : ""}>“${esc(s.turns[0][0].split("|")[0])}”</p><button class="btn btn--small" data-sim="${i}">Mainkan</button></div>`).join("")}
  <div class="simcard simcard--ai"><span class="pill">Semua level</span><h3>Simulator bebas dengan AI</h3><p>Kamu mengetik atau bicara sendiri, AI membalas sesuai level dan skenario.</p><button class="btn btn--small" data-goto="ai">Buka chat AI</button></div></div>`;
  $("#tab-sim").querySelectorAll("[data-sim]").forEach((b) => b.onclick = () => startQuiz({ title: AK.SIM[k][+b.dataset.sim].title, qs: buildQuiz(k, "x", ["x:" + b.dataset.sim]), hearts: 3, pass: 67 }));
  $("#tab-sim").querySelector("[data-goto]").onclick = () => tab("ai");
}

// ---------- Chat AI ----------
const SERVER = { checked: false, ai: false, tts: false };
async function checkServer() {
  if (SERVER.checked) return SERVER;
  try { const r = await fetch("/api/status", { cache: "no-store" }); if (r.ok) Object.assign(SERVER, await r.json()); } catch {}
  SERVER.checked = true; return SERVER;
}
const CHAT = { msgs: [], busy: false, auto: true };
const SCEN = ["Ngobrol bebas", "Kenalan dengan teman baru", "Pesan makanan di restoran", "Tanya arah di kota", "Belanja dan tawar-menawar", "Wawancara kerja", "Presentasi di kelas", "Debat ringan", "Liburan dan hotel", "Ke dokter"];
function aiOffline(el) {
  el.innerHTML = `<div class="ai-off sticker"><img src="assets/elcy-podcast.webp" alt="" width="220"><div>
    <h2 class="display display--sm">AI belum aktif di komputer ini</h2>
    <p>Chat AI dan penilaian tugas tulis memakai Claude lewat server kecil di <code>tools/ai_server.py</code>. Situs biasa (tanpa server) tidak bisa memanggil AI dengan aman karena API key tidak boleh ditaruh di halaman web.</p>
    <ol class="steps-plain">
      <li>Buat API key di console.anthropic.com (berbayar per pemakaian).</li>
      <li>Simpan key sebagai environment variable <code>ANTHROPIC_API_KEY</code> di Windows.</li>
      <li>Jalankan <code>python tools/ai_server.py</code> dari folder web ini, lalu buka <code>http://localhost:5517</code>.</li>
    </ol>
    <p class="muted small">Sambil menunggu, simulator bawaan di tab Simulator tetap bisa dipakai tanpa AI.</p></div></div>`;
}
async function renderAI() {
  const el = $("#tab-ai"); const k = S.lang;
  const st = await checkServer();
  if (!st.ai) return aiOffline(el);
  const m = currentMode(k);
  el.innerHTML = `<div class="chat">
    <aside class="chat__cfg">
      <h2 class="display display--sm">Ngobrol dengan ELCY</h2>
      <label>Level<select id="cLevel">${AK.MODES.map((x) => `<option value="${x.cefr}" ${x === m ? "selected" : ""}>${x.name} (${x.cefr})</option>`).join("")}</select></label>
      <label>Gaya bahasa<select id="cStyle"><option value="baku">Baku / formal</option><option value="santai">Santai / gaul</option><option value="dialek">Pakai logat daerah</option><option value="campur">Campur</option></select></label>
      <label>Skenario<select id="cScen">${SCEN.map((s) => `<option>${s}</option>`).join("")}</select></label>
      <label class="chk"><input type="checkbox" id="cAuto" checked> Bacakan balasan</label>
      <button class="btn btn--small btn--ghost-ink" id="cReset">Mulai ulang</button>
      <p class="muted small">Pakai Claude Opus 5.5. Tiap pesan ada biaya API kecil.</p>
    </aside>
    <div class="chat__main">
      <div class="chat__log" id="cLog" aria-live="polite"></div>
      <form class="chat__form" id="cForm">
        <button type="button" class="mic" id="cMic" aria-label="Bicara">🎤</button>
        <input id="cIn" autocomplete="off" placeholder="Tulis dalam ${LANGS[k].name}…"${RTL(k) ? ' dir="auto"' : ""}>
        <button class="btn btn--ink btn--small" id="cSend">Kirim</button>
      </form>
    </div></div>`;
  CHAT.msgs = [];
  const log = $("#cLog");
  const draw = () => {
    log.innerHTML = CHAT.msgs.map((x) => x.role === "user"
      ? `<div class="msg msg--me" lang="${k}">${esc(x.content)}</div>`
      : `<div class="msg msg--ai"><div lang="${k}"${RTL(k) ? ' dir="rtl"' : ""}><button class="say-sm" data-say="${esc(x.content)}">▶</button>${esc(x.content)}</div>${x.reading ? `<small class="o-read">${esc(x.reading)}</small>` : ""}${x.tr ? `<details><summary>Arti</summary>${esc(x.tr)}</details>` : ""}${x.fix ? `<p class="msg__fix"><b>Koreksi:</b> ${esc(x.fix)}</p>` : ""}${x.tip ? `<p class="msg__tip"><b>Tips:</b> ${esc(x.tip)}</p>` : ""}</div>`).join("") + (CHAT.busy ? `<div class="msg msg--ai msg--typing">ELCY sedang mengetik…</div>` : "");
    log.querySelectorAll("[data-say]").forEach((b) => b.onclick = () => say(b.dataset.say));
    log.scrollTop = log.scrollHeight;
  };
  const send = async (text) => {
    if (CHAT.busy) return;
    if (text) CHAT.msgs.push({ role: "user", content: text });
    CHAT.busy = true; draw();
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        lang: k, langName: LANGS[k].native, level: $("#cLevel").value, style: $("#cStyle").value, scenario: $("#cScen").value,
        messages: CHAT.msgs.slice(-20).map((x) => ({ role: x.role, content: x.content })),
      }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Server error");
      CHAT.msgs.push({ role: "assistant", content: d.reply, reading: d.reading, tr: d.translation_id, fix: d.correction_id, tip: d.tip_id });
      if ($("#cAuto").checked) say(d.reply);
      S.xp += 2; bumpStreak(); save(); renderStats();
    } catch (e) { CHAT.msgs.push({ role: "assistant", content: "⚠ " + e.message }); }
    CHAT.busy = false; draw();
  };
  $("#cForm").onsubmit = (e) => { e.preventDefault(); const v = $("#cIn").value.trim(); if (!v) return; $("#cIn").value = ""; send(v); };
  $("#cReset").onclick = () => { CHAT.msgs = []; draw(); send(""); };
  ["cLevel", "cStyle", "cScen"].forEach((id) => $("#" + id).onchange = () => { CHAT.msgs = []; draw(); send(""); });
  // Mikrofon: pengenalan suara bawaan browser (Chrome/Edge)
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const mic = $("#cMic");
  if (!SR) { mic.disabled = true; mic.title = "Browser ini belum mendukung input suara"; }
  else mic.onclick = () => {
    const rec = new SR(); rec.lang = SPEECH(k); rec.interimResults = false;
    mic.classList.add("is-on");
    rec.onresult = (e) => { $("#cIn").value = e.results[0][0].transcript; };
    rec.onend = () => { mic.classList.remove("is-on"); if ($("#cIn").value.trim()) $("#cForm").requestSubmit(); };
    rec.onerror = () => mic.classList.remove("is-on");
    rec.start();
  };
  send("");
}

// ---------- Tugas tulis (buku) ----------
async function renderWrite() {
  const k = S.lang; const el = $("#tab-write");
  const m = currentMode(k);
  const st = await checkServer();
  const hist = (S.writes || []).filter((w) => w.lang === k).slice(-5).reverse();
  el.innerHTML = `<div class="section__head"><h2 class="display display--md">Tugas tulis di buku</h2>
    <p class="muted">Kerjakan di buku tulis dengan tangan, foto halamannya, lalu unggah. AI membaca tulisanmu dan menilai sesuai level yang kamu pilih: pemula dinilai lebih longgar soal tata bahasa, expert dinilai ketat sampai nuansa dan register.</p></div>
  <div class="write">
    <div class="sheet sticker" id="sheet">
      <div class="sheet__head"><img src="assets/logo-primary.webp" alt="TUJLC" width="150"><div><b>Lembar Tugas Akademi ELCY</b><br><span id="wInfo"></span></div></div>
      <label class="sheet__lv">Level tugas<select id="wMode">${AK.MODES.map((x) => `<option value="${x.id}" ${x === m ? "selected" : ""}>${x.name} (${x.cefr})</option>`).join("")}</select></label>
      <h3 id="wTitle"></h3>
      <ol id="wTasks" class="sheet__tasks"></ol>
      <p class="sheet__foot">Nama: ______________________ &nbsp; Tanggal: ____________ &nbsp; Bahasa: ${LANGS[k].name}</p>
      <div class="sheet__btns"><button class="btn btn--small" id="wPrint">Cetak lembar</button></div>
    </div>
    <div class="upload sticker">
      <h3>Kumpulkan</h3>
      <label>Nama anggota<input id="wName" placeholder="Nama kamu" autocomplete="name"></label>
      <label class="drop" id="wDrop">Pilih atau seret foto halaman buku (maks. 4)<input type="file" id="wFiles" accept="image/*" multiple capture="environment"></label>
      <div class="thumbs" id="wThumbs"></div>
      <button class="btn btn--ink" id="wSend" ${st.ai ? "" : "disabled"}>Kirim untuk dinilai AI</button>
      ${st.ai ? "" : `<p class="muted small">Penilaian AI butuh server AI aktif (lihat tab “Ngobrol dengan AI”). Lembar tetap bisa dicetak dan dikerjakan.</p>`}
      <div id="wResult"></div>
    </div>
  </div>
  ${hist.length ? `<div class="section__head" style="margin-top:2rem"><h3>Riwayat nilai ${LANGS[k].name}</h3></div><div class="hist">${hist.map((h) => `<div class="hist__row"><b>${h.score}</b><span>${esc(h.title)} · ${esc(h.level)}<small>${h.date} · perkiraan level ${esc(h.cefr)}</small></span></div>`).join("")}</div>` : ""}`;
  const files = [];
  const drawSheet = () => {
    const w = AK.WRITE[$("#wMode").value]; const md = AK.MODES.find((x) => x.id === $("#wMode").value);
    $("#wTitle").textContent = w.title;
    $("#wInfo").textContent = `${LANGS[k].name} · ${md.name} (${md.cefr})`;
    $("#wTasks").innerHTML = w.tasks.map((t) => `<li>${esc(t.replaceAll("{L}", "bahasa " + LANGS[k].name))}</li>`).join("");
  };
  drawSheet();
  $("#wMode").onchange = drawSheet;
  $("#wPrint").onclick = () => window.print();
  const drawThumbs = () => { $("#wThumbs").innerHTML = files.map((f, i) => `<figure><img src="${f}" alt="Halaman ${i + 1}"><button data-rm="${i}" aria-label="Hapus">×</button></figure>`).join(""); $("#wThumbs").querySelectorAll("[data-rm]").forEach((b) => b.onclick = () => { files.splice(+b.dataset.rm, 1); drawThumbs(); }); };
  $("#wFiles").onchange = async (e) => {
    for (const f of [...e.target.files].slice(0, 4 - files.length)) files.push(await shrink(f));
    drawThumbs(); e.target.value = "";
  };
  $("#wSend").onclick = async () => {
    if (!files.length) return alert("Unggah minimal satu foto halaman buku.");
    const md = AK.MODES.find((x) => x.id === $("#wMode").value);
    const tasks = [...$("#wTasks").children].map((li) => li.textContent);
    $("#wSend").disabled = true; $("#wResult").innerHTML = `<p class="muted">AI sedang membaca dan menilai… (bisa 20–60 detik)</p>`;
    try {
      const r = await fetch("/api/grade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang: k, langName: LANGS[k].name, level: md.cefr, levelName: md.name, title: $("#wTitle").textContent, tasks, member: $("#wName").value.trim(), images: files }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Server error");
      $("#wResult").innerHTML = `<div class="grade">
        <div class="grade__top"><b class="grade__score">${d.overall_score}</b><div><p>${esc(d.verdict)}</p><small>Perkiraan level: <b>${esc(d.cefr_estimate)}</b></small></div></div>
        ${d.items.map((it) => `<div class="grade__item"><div><b>${it.score}</b></div><div><p class="grade__task">${esc(it.task)}</p><p>${esc(it.feedback)}</p>${it.corrections ? `<p class="msg__fix"><b>Koreksi:</b> ${esc(it.corrections)}</p>` : ""}</div></div>`).join("")}
        <p class="tip"><b>Langkah berikutnya:</b> ${esc(d.next_steps)}</p>
        <details><summary>Teks yang dibaca AI dari bukumu</summary><pre class="trans">${esc(d.transcription)}</pre></details></div>`;
      S.writes.push({ lang: k, title: $("#wTitle").textContent, level: md.name, score: d.overall_score, cefr: d.cefr_estimate, date: today() });
      S.xp += Math.round(d.overall_score / 2); bumpStreak(); save(); renderStats();
    } catch (e) { $("#wResult").innerHTML = `<p class="gate__err">Gagal menilai: ${esc(e.message)}</p>`; }
    $("#wSend").disabled = false;
  };
}
function shrink(file) {
  return new Promise((res) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = img.width * s; c.height = img.height * s;
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", 0.85));
    };
    img.src = url;
  });
}

// ---------- Kerangka halaman ----------
function renderStats() {
  const p = P(); const done = Object.keys(p.done).length; const m = currentMode();
  $("#akStats").innerHTML = `<div><b>${S.xp}</b><span>XP total</span></div><div><b>${S.streak.n || 0}</b><span>hari beruntun</span></div><div><b>${done}/40</b><span>tes ${LANGS[S.lang].name}</span></div><div><b>${m.cefr}</b><span>${m.name}</span></div>`;
}
function renderLangs() {
  $("#akLangs").innerHTML = LK.map((k) => `<button class="langtab langtab--${LANGS[k].color}" data-k="${k}" ${k === S.lang ? 'aria-current="page"' : ""}><span lang="${k}">${LANGS[k].native}</span>${LANGS[k].name} <small>${Object.keys(P(k).done).length}/40</small></button>`).join("");
  $("#akLangs").querySelectorAll("[data-k]").forEach((b) => b.onclick = () => { S.lang = b.dataset.k; save(); renderAll(); });
}
let TAB = "path";
function tab(t) {
  TAB = t;
  document.querySelectorAll(".ak-tabs [data-tab]").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === t));
  document.querySelectorAll(".ak-panel").forEach((p) => p.hidden = p.id !== "tab-" + t);
  ({ path: renderPath, free: renderFree, sim: renderSim, ai: renderAI, write: renderWrite })[t]();
  history.replaceState(null, "", "#" + t);
}
document.querySelectorAll(".ak-tabs [data-tab]").forEach((b) => b.onclick = () => tab(b.dataset.tab));
function renderAll() { renderStats(); renderLangs(); tab(TAB); }
const h = location.hash.slice(1);
if (["path", "free", "sim", "ai", "write"].includes(h)) TAB = h;
TUJ.requireMember("belajar.html").then((ok) => { if (ok) renderAll(); });
