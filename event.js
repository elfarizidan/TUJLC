const main = document.getElementById("main");
const slug = new URLSearchParams(location.search).get("e");
const list = [...EVENTS].sort((a, b) => a.iso.localeCompare(b.iso));
const i = list.findIndex((x) => x.slug === slug);
const ev = list[i];

if (!ev) {
  main.innerHTML = `<section class="section notfound"><img src="assets/elcy-raincoat.webp" alt="" width="200"><h1 class="display display--md">Event tidak ditemukan.</h1><a class="btn" href="index.html#event">Kembali ke daftar event</a></section>`;
} else {
  document.title = `${ev.title} · TUJLC`;
  const photos = (PHOTOS[ev.slug] || []).map(([n, w, h]) => ({ p: `${ev.slug}/${n}`, w, h, set: n.split("-")[0] }));
  if (ev.extra) (PHOTOS[ev.extra] || []).forEach(([n, w, h]) => photos.push({ p: `${ev.extra}/${n}`, w, h, set: "post" }));
  const groups = ev.sets.map(([key, label]) => ({ key, label, items: photos.filter((x) => x.set === key) })).filter((g) => g.items.length);
  const prev = list[i - 1], next = list[i + 1];
  const member = TUJ.isMember();
  const langLinks = ev.langs.map((l) => `<a class="pill pill--${LANGS[l].color}" href="bahasa.html?l=${l}">Kelas ${LANGS[l].name} →</a>`).join("");

  main.innerHTML = `
  <section class="evhero">
    <div class="evhero__copy">
      <a class="back" href="index.html#event">← Semua event</a>
      <p class="eyebrow">${ev.kind}</p>
      <h1 class="display display--lg">${ev.title}</h1>
      <ul class="facts">
        <li><b>Tanggal</b>${ev.date}</li>
        <li><b>Bahasa</b>${ev.langs.map((l) => LANGS[l].name).join(", ") || "Semua"}</li>
        <li><b>Foto</b>${photos.length} di halaman ini</li>
      </ul>
    </div>
    <figure class="evhero__img sticker"><img src="${TUJ.photo(ev.cover)}" alt="${TUJ.esc(ev.title)}"></figure>
  </section>

  <section class="section evbody">
    <div class="prose">
      ${ev.body.map((p) => `<p>${p}</p>`).join("")}
      ${langLinks ? `<div class="evbody__langs">${langLinks}</div>` : ""}
    </div>
    <aside class="memberbox ${member ? "is-in" : ""}">
      ${member
        ? `<h2>Album lengkap</h2><p>Semua foto asli pertemuan ini ada di Google Drive TUJLC.</p><a class="btn btn--ink" href="${TUJ.drive(ev.album)}" target="_blank" rel="noopener">Buka album di Drive</a>`
        : `<h2>Khusus anggota</h2><p>Album lengkap dengan semua foto resolusi penuh bisa dibuka anggota TUJLC.</p><a class="btn btn--ghost-ink" href="anggota.html?next=${encodeURIComponent(location.pathname.split("/").pop() + location.search)}">Masuk anggota</a>`}
    </aside>
  </section>

  ${groups.map((g) => `
  <section class="section evgallery">
    <h2 class="display display--sm">${g.label} <span class="muted">· ${g.items.length}</span></h2>
    <div class="masonry ${g.key === "post" ? "masonry--posters" : ""}" data-lightbox>
      ${g.items.map((x) => `<img src="${TUJ.photo(x.p, true)}" data-full="${TUJ.photo(x.p)}" width="${x.w}" height="${x.h}" alt="${TUJ.esc(ev.title)}, ${g.label.toLowerCase()}" data-caption="${TUJ.esc(g.label)}" loading="lazy" data-reveal>`).join("")}
    </div>
  </section>`).join("")}

  <nav class="section pager" aria-label="Event lain">
    ${prev ? `<a class="pager__a" href="event.html?e=${prev.slug}"><span>← Sebelumnya</span><b>${prev.title}</b></a>` : "<span></span>"}
    ${next ? `<a class="pager__a pager__a--next" href="event.html?e=${next.slug}"><span>Berikutnya →</span><b>${next.title}</b></a>` : "<span></span>"}
  </nav>`;
}
revealAll();

// Setelah sesi dicek: anggota yang sudah masuk langsung dapat link album lengkap
TUJ.ready.then(() => {
  const box = document.querySelector(".memberbox");
  if (TUJ.me && box && ev) {
    box.classList.add("is-in");
    box.innerHTML = `<h2>Album lengkap</h2><p>Semua foto asli pertemuan ini ada di Google Drive TUJLC.</p><a class="btn btn--ink" href="${TUJ.drive(ev.album)}" target="_blank" rel="noopener">Buka album di Drive</a>`;
  }
});
