const main = document.getElementById("main");
const keys = Object.keys(LANGS);

function photosFor(k) {
  const out = [];
  EVENTS.forEach((ev) => {
    if (!ev.langs.includes(k)) return;
    const solo = ev.langs.length === 1;
    (PHOTOS[ev.slug] || []).forEach(([n, w, h]) => {
      const set = n.split("-")[0];
      if (set === k || (solo && set === "gen") || (ev.slug === "eprt" && set === "post"))
        out.push({ p: `${ev.slug}/${n}`, w, h, ev });
    });
  });
  return out;
}

function render(k) {
  const L = LANGS[k];
  const evs = EVENTS.filter((e) => e.langs.includes(k)).sort((a, b) => a.iso.localeCompare(b.iso));
  const photos = photosFor(k);
  const dir = k === "ar" ? ' dir="rtl"' : "";
  document.title = `Kelas ${L.name} · TUJLC`;
  main.className = `theme-${L.color}`;
  main.innerHTML = `
  <nav class="langtabs" aria-label="Pilih bahasa">
    ${keys.map((x) => `<a href="bahasa.html?l=${x}" data-k="${x}" class="langtab langtab--${LANGS[x].color}" ${x === k ? 'aria-current="page"' : ""}><span lang="${x}">${LANGS[x].native}</span>${LANGS[x].name}</a>`).join("")}
  </nav>

  <section class="lhero lhero--${L.color}">
    <div class="lhero__copy">
      <p class="eyebrow">Kelas ${L.name}</p>
      <h1 class="display display--lg"><span lang="${k}"${dir}>${L.hello}</span></h1>
      <p class="lhero__tag">${L.tagline}</p>
      <p class="lead lead--ink">${L.intro}</p>
      <button class="btn btn--ink" id="hearHello">Dengar pelafalan</button>
    </div>
    <img class="lhero__elcy" src="assets/${L.elcy}.webp" alt="" aria-hidden="true">
  </section>

  <section class="section">
    <div class="section__head"><p class="eyebrow">Cara kami mengajar</p><h2 class="display display--md">Begini kelasnya berjalan.</h2></div>
    <ol class="steps">${L.method.map(([t, d], i) => `<li data-reveal><span class="steps__n">${i + 1}</span><h3>${t}</h3><p>${d}</p></li>`).join("")}</ol>
  </section>

  <section class="section lesson">
    <div class="lesson__text" data-reveal>
      <p class="eyebrow">Mini pelajaran</p>
      <h2 class="display display--md">${L.lessonTitle}</h2>
      <p>${L.lesson}</p>
      ${L.script ? `<p class="lesson__label">${L.script.label}</p><div class="glyphs">${L.script.items.map(([g, r, say]) => `<button class="glyph" data-say="${TUJ.esc(say || g)}"><span lang="${k}"${dir}>${g}</span><small>${r}</small></button>`).join("")}</div>` : ""}
      <p class="tip"><b>Tips:</b> ${L.tip}</p>
    </div>
    <div class="phrases" data-reveal>
      <h3>Enam kalimat pertama</h3>
      <p class="muted small">Tekan ▶ untuk mendengar. Suaranya dibuat mesin suara neural, jadi bukan rekaman manusia, tapi pelafalannya sudah standar.</p>
      <ul>${L.phrases.map(([w, r, m]) => `<li><button class="say" data-say="${TUJ.esc(w)}" aria-label="Dengar ${TUJ.esc(w)}">▶</button><span><b lang="${k}"${dir}>${w}</b>${r ? `<i>${r}</i>` : ""}<span>${m}</span></span></li>`).join("")}</ul>
    </div>
  </section>

  <section class="section">
    <div class="section__head"><p class="eyebrow">Event kelas ${L.name}</p><h2 class="display display--md">${evs.length} pertemuan & acara.</h2></div>
    <div class="evlist">${evs.map((e) => `<a class="evrow" href="event.html?e=${e.slug}" data-reveal><img src="${TUJ.photo(e.cover, true)}" alt="" loading="lazy"><span><small>${e.date}</small><b>${e.title}</b><span>${e.summary}</span></span><span class="evrow__go">→</span></a>`).join("")}</div>
  </section>

  <section class="section evgallery">
    <div class="section__head"><p class="eyebrow">Galeri</p><h2 class="display display--md">Foto-foto kelas ${L.name}.</h2><p class="muted">${photos.length} foto dari ${evs.length} event. Klik untuk memperbesar.</p></div>
    <div class="masonry" data-lightbox>
      ${photos.map((x) => `<img src="${TUJ.photo(x.p, true)}" data-full="${TUJ.photo(x.p)}" width="${x.w}" height="${x.h}" alt="Kelas ${L.name}, ${TUJ.esc(x.ev.title)}" data-caption="${TUJ.esc(x.ev.title)} · ${x.ev.date}" loading="lazy" data-reveal>`).join("")}
    </div>
  </section>

  <section class="section cta-mem">
    <div>
      <h2 class="display display--sm">Mau latihan lebih?</h2>
      <p>Anggota TUJLC bisa pakai kartu latihan ${L.name} dan mencatat progres di area anggota.</p>
    </div>
    <a class="btn" href="kamus.html?l=${k}">Buka kamus ${L.name}</a> <a class="btn btn--ink" href="belajar.html">Latihan di Akademi ELCY</a>
  </section>`;

  document.getElementById("hearHello").onclick = () => { if (!TUJ.speak(L.hello, L.speech)) alert("Browser ini belum mendukung suara."); };
  main.querySelectorAll("[data-say]").forEach((b) => b.addEventListener("click", () => TUJ.speak(b.dataset.say, L.speech)));
  revealAll(main);
}

const start = new URLSearchParams(location.search).get("l");
render(LANGS[start] ? start : "en");

// Pindah tab tanpa reload
main.addEventListener("click", (e) => {
  const a = e.target.closest(".langtab");
  if (!a) return;
  e.preventDefault();
  history.pushState(null, "", a.href);
  render(a.dataset.k);
  window.scrollTo({ top: 0 });
});
addEventListener("popstate", () => { const l = new URLSearchParams(location.search).get("l"); render(LANGS[l] ? l : "en"); });
