// Kamus TUJLC. Entri: [kata, bacaan, kelas kata, arti Inggris, arti Indonesia, level, contoh]
// Wajib masuk sebagai anggota

const $ = (s) => document.querySelector(s);
const esc = TUJ.esc;
const LK = Object.keys(LANGS);
const SAVE_KEY = "tujlc-kamus";
const st = (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; } })();
st.lang ||= "en"; st.saved ||= [];
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(st)); } catch {} };

const DB = {}; // lang -> { inti: [...], full: [...]|null, idx: [...] }
const PAGE = 40;
let results = [], shown = 0;

// Normalisasi: huruf kecil, tanpa aksen/harakat/nada, tanpa spasi & tanda baca
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ًͯ-ٰٟـ]/g, "").replace(/[\s'’·\-.,;:!?()「」]/g, "").normalize("NFC");

// Katakana -> hiragana, dan romaji (Hepburn) -> hiragana untuk pencarian bahasa Jepang
const kata2hira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const ROMA = { kya: "きゃ", kyu: "きゅ", kyo: "きょ", sha: "しゃ", shu: "しゅ", sho: "しょ", cha: "ちゃ", chu: "ちゅ", cho: "ちょ", nya: "にゃ", nyu: "にゅ", nyo: "にょ", hya: "ひゃ", hyu: "ひゅ", hyo: "ひょ", mya: "みゃ", myu: "みゅ", myo: "みょ", rya: "りゃ", ryu: "りゅ", ryo: "りょ", gya: "ぎゃ", gyu: "ぎゅ", gyo: "ぎょ", ja: "じゃ", ju: "じゅ", jo: "じょ", bya: "びゃ", byu: "びゅ", byo: "びょ", pya: "ぴゃ", pyu: "ぴゅ", pyo: "ぴょ", shi: "し", chi: "ち", tsu: "つ", ji: "じ", fu: "ふ",
  ka: "か", ki: "き", ku: "く", ke: "け", ko: "こ", sa: "さ", su: "す", se: "せ", so: "そ", ta: "た", te: "て", to: "と", na: "な", ni: "に", nu: "ぬ", ne: "ね", no: "の", ha: "は", hi: "ひ", he: "へ", ho: "ほ", ma: "ま", mi: "み", mu: "む", me: "め", mo: "も", ya: "や", yu: "ゆ", yo: "よ", ra: "ら", ri: "り", ru: "る", re: "れ", ro: "ろ", wa: "わ", wo: "を",
  ga: "が", gi: "ぎ", gu: "ぐ", ge: "げ", go: "ご", za: "ざ", zu: "ず", ze: "ぜ", zo: "ぞ", da: "だ", de: "で", do: "ど", ba: "ば", bi: "び", bu: "ぶ", be: "べ", bo: "ぼ", pa: "ぱ", pi: "ぴ", pu: "ぷ", pe: "ぺ", po: "ぽ", a: "あ", i: "い", u: "う", e: "え", o: "お" };
function romaji2kana(s) {
  s = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");
  let out = "";
  for (let i = 0; i < s.length;) {
    if (s[i] === s[i + 1] && s[i] !== "n" && !"aiueo".includes(s[i])) { out += "っ"; i++; continue; }
    if (s[i] === "n" && (i + 1 === s.length || !"aiueoy".includes(s[i + 1]))) { out += "ん"; i++; continue; }
    let hit = false;
    for (const l of [3, 2, 1]) { const k = s.slice(i, i + l); if (ROMA[k]) { out += ROMA[k]; i += l; hit = true; break; } }
    if (!hit) return null;
  }
  return out;
}
function index(rows, k) {
  return rows.map((e) => {
    const w = norm(e[0]), r = norm(k === "zh" ? String(e[1]).split(" · ")[0] : e[1]);
    return [k === "ja" ? kata2hira(w) : w, k === "ja" ? kata2hira(r || w) : r, (e[3] || "").toLowerCase(), (e[4] || "").replace(/^=/, "").toLowerCase()];
  });
}
async function load(k, full) {
  DB[k] ||= { inti: null, full: null, idx: [] };
  const d = DB[k];
  if (!d.inti) {
    d.inti = await fetch(`kamus/${k}-inti.json`).then((r) => r.json());
    d.idx = index(d.inti, k);
  }
  if (full && !d.full) {
    $("#kmInfo").textContent = "Memuat kamus lengkap… (bisa beberapa detik)";
    d.full = await fetch(`kamus/${k}-lengkap.json`).then((r) => r.json());
    d.idx = d.idx.concat(index(d.full, k));
  }
  return d;
}
const rows = (d) => (d.full ? d.inti.concat(d.full) : d.inti);

function fillFilters(k) {
  const d = DB[k], all = rows(d);
  const lv = [...new Set(all.map((e) => e[5]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  const pos = [...new Set(all.map((e) => e[2]).filter(Boolean))].sort();
  $("#kmLv").innerHTML = `<option value="">Semua level</option>` + lv.map((x) => `<option>${esc(x)}</option>`).join("");
  $("#kmPos").innerHTML = `<option value="">Semua kelas kata</option>` + pos.map((x) => `<option>${esc(x)}</option>`).join("");
}

function wordMatchesGloss(gloss, q) {
  // cocokkan kata utuh di arti Inggris/Indonesia (bukan potongan kata)
  return new RegExp(`(^|[^a-z])${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(gloss);
}
function search() {
  const k = st.lang, d = DB[k]; if (!d?.inti) return;
  const raw = $("#kmQ").value.trim(), ql = raw.toLowerCase();
  let q = norm(raw);
  if (k === "ja") { q = kata2hira(q); const kana = /^[a-z' -]+$/i.test(raw) ? romaji2kana(raw) : null; if (kana) var qk = kana; }
  const lv = $("#kmLv").value, pos = $("#kmPos").value;
  const all = rows(d);
  const scored = [];
  for (let i = 0; i < all.length; i++) {
    const e = all[i];
    if (lv && e[5] !== lv) continue;
    if (pos && e[2] !== pos) continue;
    if (!raw) { scored.push([i, i]); if (scored.length > 3000) break; continue; }
    const [w, r, en, id] = d.idx[i];
    let s = -1;
    if (w === q || r === q || (qk && (r === qk || w === qk))) s = 0;
    else if (id === ql) s = 0.5;
    else if (id && wordMatchesGloss(id, ql)) s = 1;
    else if (qk && (r.startsWith(qk) || w.startsWith(qk))) s = 1.8;
    else if (en && (en.startsWith(ql + ";") || en === ql || en.startsWith("to " + ql + ";") || en === "to " + ql)) s = 1.5;
    else if (w.startsWith(q) || (r && r.startsWith(q))) s = 2;
    else if (en && wordMatchesGloss(en, ql)) s = 3;
    else if (q.length > 1 && (w.includes(q) || (r && r.includes(q)))) s = 4;
    if (s >= 0) scored.push([s * 1e7 + i, i]);
  }
  scored.sort((a, b) => a[0] - b[0]);
  results = scored.map((x) => all[x[1]]);
  shown = 0; $("#kmList").innerHTML = "";
  more();
  const total = all.length.toLocaleString("id");
  $("#kmInfo").textContent = raw || lv || pos
    ? `${results.length.toLocaleString("id")} hasil dari ${total} entri${d.full ? " (kamus lengkap)" : " (kamus inti)"}.`
    : `${total} entri di kamus ${d.full ? "lengkap" : "inti"} ${LANGS[k].name}. Ketik kata untuk mencari.`;
  if (!d.full && raw && results.length < 5) $("#kmInfo").textContent += " Tidak ketemu? Muat kamus lengkap.";
}
function card(e, k = st.lang) {
  const saved = st.saved.some((s) => s.k === k && s.e[0] === e[0] && s.e[1] === e[1]);
  const rtl = k === "ar" ? ' dir="rtl"' : "";
  const ex = e[6] ? e[6].split(" ⇒ ") : null;
  return `<article class="km-entry">
    <div class="km-entry__head">
      <button class="say-sm km-say" data-say="${esc(e[0])}" aria-label="Dengar ${esc(e[0])}">▶</button>
      <h3 lang="${k}"${rtl}>${esc(e[0])}</h3>
      ${e[1] ? `<span class="km-read">${esc(e[1])}</span>` : ""}
      ${e[2] ? `<span class="pill">${esc(e[2])}</span>` : ""}
      ${e[5] ? `<span class="pill pill--yellow">${esc(e[5])}</span>` : ""}
      <button class="km-star ${saved ? "is-on" : ""}" data-star='${esc(JSON.stringify(e))}' aria-label="${saved ? "Hapus dari" : "Simpan ke"} kata simpanan">${saved ? "★" : "☆"}</button>
    </div>
    ${e[4] ? (e[4][0] === "=" ? `<p class="km-id km-id--ok"><span title="Padanan Indonesia dicek manual">✓</span> ${esc(e[4].slice(1))}</p>` : `<p class="km-id"><span title="Padanan Indonesia otomatis, cek arti Inggris">≈</span> ${esc(e[4])}</p>`) : ""}
    <p class="km-en">${esc(e[3])}</p>
    ${ex ? `<p class="km-ex"><span lang="${k}"${rtl}>${esc(ex[0])}</span><br><i>${esc(ex[1] || "")}</i></p>` : ""}
  </article>`;
}
function more() {
  const chunk = results.slice(shown, shown + PAGE);
  $("#kmList").insertAdjacentHTML("beforeend", chunk.map((e) => card(e)).join(""));
  shown += chunk.length;
  $("#kmMore").hidden = shown >= results.length;
}

// Interaksi kartu: dengar & simpan
document.addEventListener("click", (ev) => {
  const sayB = ev.target.closest("[data-say]");
  if (sayB) TUJ.speak(sayB.dataset.say, LANGS[sayB.dataset.k || st.lang].speech);
  const star = ev.target.closest("[data-star]");
  if (star) {
    const e = JSON.parse(star.dataset.star), k = star.dataset.k || st.lang;
    const i = st.saved.findIndex((s) => s.k === k && s.e[0] === e[0] && s.e[1] === e[1]);
    if (i >= 0) st.saved.splice(i, 1); else st.saved.push({ k, e });
    persist();
    star.classList.toggle("is-on", i < 0); star.textContent = i < 0 ? "★" : "☆";
    $("#kmSavedN").textContent = st.saved.length;
    if (!$("#kmSaved").hidden) renderSaved();
  }
});

// Kata simpanan + kartu bolak-balik
let fi = 0, flip = false;
function renderSaved() {
  const list = st.saved;
  $("#kmSavedList").innerHTML = list.length ? list.map((s) => card(s.e, s.k).replace(/data-say=/, `data-k="${s.k}" data-say=`).replace(/data-star=/, `data-k="${s.k}" data-star=`)).join("") : `<p class="muted">Belum ada. Tekan ☆ di kartu kata untuk menyimpan.</p>`;
  if (!list.length) { $("#kmFlash").innerHTML = ""; return; }
  fi %= list.length;
  const s = list[fi], L = LANGS[s.k];
  $("#kmFlash").innerHTML = `<button class="flash__card flash__card--${L.color} ${flip ? "is-flipped" : ""}" id="kmCard">
    ${flip ? `<span class="flash__r">${esc(s.e[1] || "")}</span><span class="flash__m">${esc((s.e[4] || s.e[3].split(";")[0]).replace(/^=/, ""))}</span><small>${esc(s.e[3].slice(0, 120))}</small>`
           : `<span class="flash__w" lang="${s.k}">${esc(s.e[0])}</span><small>${L.name} · ketuk untuk lihat arti</small>`}
  </button>
  <div class="flash__ctrl"><button class="btn btn--ghost-ink" id="kmPrev">‹ Sebelumnya</button><button class="btn btn--ghost-ink" data-k="${s.k}" data-say="${esc(s.e[0])}">▶ Dengar</button><button class="btn btn--ink" id="kmNext">Berikutnya ›</button></div>
  <p class="muted small">Kartu ${fi + 1} dari ${list.length}</p>`;
  $("#kmCard").onclick = () => { flip = !flip; renderSaved(); };
  $("#kmPrev").onclick = () => { fi = (fi - 1 + list.length) % list.length; flip = false; renderSaved(); };
  $("#kmNext").onclick = () => { fi = (fi + 1) % list.length; flip = false; renderSaved(); };
}
$("#kmSavedBtn").onclick = () => { const h = $("#kmSaved").hidden; $("#kmSaved").hidden = !h; if (h) { renderSaved(); $("#kmSaved").scrollIntoView({ behavior: "smooth" }); } };

// Kata hari ini (berganti tiap hari, dari kata tersering)
function today() {
  const d = DB[st.lang]; const pool = d.inti.filter((e) => e[4]).slice(0, 3000);
  if (!pool.length) return;
  const n = Math.floor(Date.now() / 864e5); const e = pool[n % pool.length];
  $("#kmToday").innerHTML = `<p class="eyebrow">Kata hari ini</p><div class="km-today__w"><button class="say-sm" data-say="${esc(e[0])}">▶</button><b lang="${st.lang}">${esc(e[0])}</b></div>${e[1] ? `<span class="km-read">${esc(e[1])}</span>` : ""}<p>${esc((e[4] || e[3].split(";")[0]).replace(/^=/, ""))}</p>`;
}

async function setLang(k) {
  st.lang = k; persist();
  $("#kmLangs").innerHTML = LK.map((x) => `<button class="langtab langtab--${LANGS[x].color}" data-l="${x}" ${x === k ? 'aria-current="page"' : ""}><span lang="${x}">${LANGS[x].native}</span>${LANGS[x].name}</button>`).join("");
  $("#kmLangs").querySelectorAll("[data-l]").forEach((b) => b.onclick = () => setLang(b.dataset.l));
  $("#kmInfo").textContent = "Memuat kamus…"; $("#kmList").innerHTML = "";
  const d = await load(k, false);
  $("#kmFull").hidden = !!d.full;
  fillFilters(k); today(); search();
}
$("#kmFull").onclick = async () => { await load(st.lang, true); $("#kmFull").hidden = true; fillFilters(st.lang); search(); };
let t; $("#kmQ").addEventListener("input", () => { clearTimeout(t); t = setTimeout(search, 180); });
$("#kmForm").onsubmit = (e) => { e.preventDefault(); search(); };
$("#kmLv").onchange = search; $("#kmPos").onchange = search;
$("#kmMore").onclick = more;
$("#kmSavedN").textContent = st.saved.length;
const qp = new URLSearchParams(location.search);
if (LANGS[qp.get("l")]) st.lang = qp.get("l");
if (qp.get("q")) $("#kmQ").value = qp.get("q");
TUJ.requireMember("kamus.html").then((ok) => { if (ok) setLang(st.lang); });
