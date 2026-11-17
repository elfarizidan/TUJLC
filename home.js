const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Sapaan bergantian
const hello = document.getElementById("hello");
const greets = [["Halo!", "id"], ["Hello!", "en"], ["こんにちは!", "ja"], ["你好!", "zh"], ["Bonjour !", "fr"], ["!مرحبا", "ar"]];
let gi = 0;
if (!reduce) setInterval(() => {
  hello.classList.add("out");
  setTimeout(() => { gi = (gi + 1) % greets.length; hello.textContent = greets[gi][0]; hello.lang = greets[gi][1]; hello.classList.remove("out"); }, 250);
}, 2200);

// Marquee
const words = [["Halo"], ["Hello", "en"], ["こんにちは", "ja"], ["你好", "zh"], ["Bonjour", "fr"], ["مرحبا", "ar"], ["Thank you", "en"], ["ありがとう", "ja"], ["谢谢", "zh"], ["Merci", "fr"], ["شكرا", "ar"]];
const mq = words.map(([w, l]) => `<span${l ? ` lang="${l}"` : ""}>${w}</span>`).join("");
document.getElementById("marquee").innerHTML = mq + mq;

// Grid bahasa
document.getElementById("langgrid").innerHTML = Object.entries(LANGS).map(([k, L]) => {
  const count = EVENTS.filter((e) => e.langs.includes(k)).length;
  return `<a class="lang lang--${L.color}" href="bahasa.html?l=${k}" data-reveal>
    <span class="lang__native" lang="${k}">${L.native}</span>
    <span class="lang__name">${L.name}</span>
    <span class="lang__tag">${L.tagline}</span>
    <span class="lang__meta">${count} event · lihat kelas →</span>
    <img src="assets/${L.elcy}.webp" alt="" loading="lazy">
  </a>`;
}).join("");

// Grid event
const evgrid = document.getElementById("evgrid");
const sorted = [...EVENTS].sort((a, b) => a.iso.localeCompare(b.iso));
evgrid.innerHTML = sorted.map((e) => {
  const n = (PHOTOS[e.slug] || []).length + (e.extra ? (PHOTOS[e.extra] || []).length : 0);
  const tags = e.langs.map((l) => `<span class="pill">${LANGS[l].name}</span>`).join("") || `<span class="pill">${e.kind}</span>`;
  return `<a class="evcard ${e.star ? "is-star" : ""}" href="event.html?e=${e.slug}" data-langs="${e.langs.join(" ") || "other"}" data-reveal>
    <span class="evcard__img"><img src="${TUJ.photo(e.cover, true)}" alt="" loading="lazy"><span class="evcard__count">${n} foto</span></span>
    <span class="evcard__body">
      <span class="evcard__date">${e.date} · ${e.kind}</span>
      <span class="evcard__title">${e.title}</span>
      <span class="evcard__sum">${e.summary}</span>
      <span class="evcard__tags">${tags}</span>
    </span>
  </a>`;
}).join("");

document.querySelectorAll(".filters .chip").forEach((c) => c.addEventListener("click", () => {
  document.querySelectorAll(".filters .chip").forEach((x) => x.classList.toggle("is-on", x === c));
  const f = c.dataset.f;
  evgrid.querySelectorAll(".evcard").forEach((card) => { card.hidden = f !== "all" && !card.dataset.langs.split(" ").includes(f); });
}));

// Merch
document.getElementById("merchgrid").innerHTML = ["photo-session/gen-05", "photo-session/gen-02", "aurafest/post-02", "photo-session/gen-07"]
  .map((p, i) => `<img class="m${i}" src="${TUJ.photo(p, true)}" data-full="${TUJ.photo(p)}" alt="Merchandise ELCY" data-caption="ELCY Shop" loading="lazy">`).join("");

// Game tebak bahasa
const pool = [];
Object.entries(LANGS).forEach(([k, L]) => L.phrases.forEach(([w, r]) => { if (k !== "en") pool.push({ w, r, k }); }));
pool.push({ w: "Could you say that again, please?", r: "", k: "en" }, { w: "Nice to meet you.", r: "", k: "en" });
let score = 0, total = 0, cur;
const $ = (id) => document.getElementById(id);
function nextQ() {
  cur = pool[Math.floor(Math.random() * pool.length)];
  $("gword").textContent = cur.w; $("gword").lang = cur.k; $("gword").dir = cur.k === "ar" ? "rtl" : "ltr";
  $("ghint").textContent = cur.r ? `dibaca: ${cur.r}` : "";
  $("gmsg").textContent = "";
  $("gopts").innerHTML = Object.entries(LANGS).map(([k, L]) => `<button class="chip" data-k="${k}">${L.name}</button>`).join("");
}
$("gopts").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b || $("gopts").dataset.lock) return;
  total++; const ok = b.dataset.k === cur.k; if (ok) score++;
  b.classList.add(ok ? "is-right" : "is-wrong");
  if (!ok) $("gopts").querySelector(`[data-k="${cur.k}"]`).classList.add("is-right");
  $("gmsg").textContent = ok ? "Betul! Lanjut…" : `Itu bahasa ${LANGS[cur.k].name}. Lanjut…`;
  $("score").textContent = score; $("total").textContent = total;
  TUJ.speak(cur.w, LANGS[cur.k].speech);
  $("gopts").dataset.lock = 1;
  setTimeout(() => { delete $("gopts").dataset.lock; nextQ(); }, 1600);
});
nextQ();

revealAll();
