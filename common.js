// Kode bersama semua halaman: header, footer, lightbox, suara, sesi anggota.

// Ganti link di sini begitu akun resmi sudah dipastikan.
window.LINKS = {
  instagram: "#",
  tiktok: "#",
  linkedin: "#",
  spotify: "#",
  form: "#",
};

// Keanggotaan memakai akun di server (tools/ai_server.py + database). Daftar -> dapat kode -> masuk.
window.TUJ = {
  gate: true,
  me: null,        // {id, no_anggota, nama, role} setelah masuk
  server: false,   // true kalau server TUJLC aktif (bukan hosting statis)
  isMember() { return !!this.me; },
  isPengurus() { return this.me?.role === "pengurus"; },
  async api(path, body) {
    const r = await fetch(path, body === undefined ? { cache: "no-store" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    let d = {}; try { d = await r.json(); } catch {}
    if (!r.ok) { const e = new Error(d.error || `Gagal (${r.status})`); e.status = r.status; throw e; }
    return d;
  },
  async logout() { try { await this.api("/api/logout", {}); } catch {} location.href = "index.html"; },
  photo(path, thumb) { const [s, n] = path.split("/"); return `assets/events/${s}/${thumb ? "t/" : ""}${n}.webp`; },
  esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); },
  speak(text, lang) {
    // 1) Rekaman MP3 (audio.js) supaya suara sama di semua perangkat, termasuk bahasa Arab
    const file = window.AUDIO?.[lang.slice(0, 2)]?.[text];
    if (file) {
      if (window._tujAudio) window._tujAudio.pause();
      window._tujAudio = new Audio(file);
      window._tujAudio.play().catch(() => {});
      return true;
    }
    // 2) Server Akademi (tools/ai_server.py) membuat MP3 neural untuk teks apa pun
    if (window.TUJ_TTS) {
      if (window._tujAudio) window._tujAudio.pause();
      window._tujAudio = new Audio(`/api/tts?lang=${lang.slice(0, 2)}&text=${encodeURIComponent(text)}`);
      window._tujAudio.play().catch(() => {});
      return true;
    }
    // 3) Cadangan: mesin baca browser
    if (!("speechSynthesis" in window)) return false;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = 0.85;
    const v = speechSynthesis.getVoices().find((x) => x.lang.replace("_", "-").startsWith(lang.slice(0, 2)));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
    return true;
  },
  drive(id) { return "https://drive.google.com/drive/folders/" + id; },
};

// Header & footer
const page = document.body.dataset.page || "";
const member = false; // diperbarui setelah sesi dicek (TUJ.ready)
const header = document.createElement("header");
header.className = "nav";
header.innerHTML = `
  <a class="nav__logo" href="index.html" aria-label="TUJLC, beranda"><img src="assets/logo-primary.webp" alt="TUJLC" width="190" height="40"></a>
  <button class="nav__toggle" aria-expanded="false" aria-controls="menu">Menu</button>
  <nav id="menu" class="nav__menu" aria-label="Navigasi utama">
    <a href="index.html#tentang">Tentang</a>
    <a href="bahasa.html" ${page === "bahasa" ? 'aria-current="page"' : ""}>Bahasa</a>
    <a href="index.html#event" ${page === "event" ? 'aria-current="page"' : ""}>Event</a>
    <a href="index.html#merch">ELCY Shop</a>
    <a class="nav__member ${member ? "is-in" : ""}" href="anggota.html" ${page === "anggota" ? 'aria-current="page"' : ""}>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="${member ? "M12 2a5 5 0 0 0-5 5v1h2V7a3 3 0 1 1 6 0v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Z" : "M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z"}"/></svg>
      ${member ? "Area Anggota" : "Masuk Anggota"}
    </a>
    <a class="btn btn--small" href="index.html#gabung">Gabung</a>
  </nav>`;
document.body.prepend(header);
const skip = document.createElement("a");
skip.className = "skip"; skip.href = "#main"; skip.textContent = "Lewati ke konten";
document.body.prepend(skip);

const footer = document.createElement("footer");
footer.className = "footer";
footer.innerHTML = `
  <img src="assets/logo-secondary.webp" alt="TUJLC" width="120" height="106" loading="lazy">
  <div>
    <p><b>Telkom University Language Club</b><br>Telkom University Jakarta</p>
    <nav class="footer__links" aria-label="Halaman">
      <a href="bahasa.html">Kelas bahasa</a> · <a href="index.html#event">Event</a> · <a href="anggota.html">Area anggota</a>
    </nav>
  </div>
  <nav class="footer__social" aria-label="Media sosial">
    <a data-link="instagram" href="#">Instagram</a>
    <a data-link="tiktok" href="#">TikTok</a>
    <a data-link="linkedin" href="#">LinkedIn</a>
    <a data-link="spotify" href="#">Spotify</a>
  </nav>
  <p class="muted small">© ${new Date().getFullYear()} TUJLC. Ilustrasi ELCY dan dokumentasi oleh tim Media Creative TUJLC.</p>`;
document.body.append(footer);

document.querySelectorAll("[data-link]").forEach((a) => {
  const url = LINKS[a.dataset.link];
  if (url && url !== "#") { a.href = url; a.target = "_blank"; a.rel = "noopener"; }
  else a.href = "index.html#gabung";
});

// Menu mobile
const toggle = header.querySelector(".nav__toggle");
const menu = header.querySelector("#menu");
toggle.addEventListener("click", () => {
  const open = menu.classList.toggle("open");
  toggle.setAttribute("aria-expanded", open);
  toggle.textContent = open ? "Tutup" : "Menu";
});
menu.addEventListener("click", (e) => { if (e.target.closest("a")) { menu.classList.remove("open"); toggle.setAttribute("aria-expanded", false); toggle.textContent = "Menu"; } });

// Lightbox dengan navigasi panah
const dlg = document.createElement("dialog");
dlg.className = "lightbox";
dlg.innerHTML = `<button class="lb-btn lb-close" aria-label="Tutup">×</button>
  <button class="lb-btn lb-prev" aria-label="Foto sebelumnya">‹</button>
  <figure><img alt=""><figcaption></figcaption></figure>
  <button class="lb-btn lb-next" aria-label="Foto berikutnya">›</button>`;
document.body.appendChild(dlg);
let lbList = [], lbI = 0;
function lbShow() {
  const el = lbList[lbI];
  dlg.querySelector("img").src = el.dataset.full || el.src;
  dlg.querySelector("img").alt = el.alt;
  dlg.querySelector("figcaption").textContent = `${el.dataset.caption || el.alt} · ${lbI + 1}/${lbList.length}`;
}
document.addEventListener("click", (e) => {
  const img = e.target.closest("[data-lightbox] img");
  if (!img) return;
  lbList = [...img.closest("[data-lightbox]").querySelectorAll("img")];
  lbI = lbList.indexOf(img); lbShow(); dlg.showModal();
});
dlg.querySelector(".lb-prev").onclick = () => { lbI = (lbI - 1 + lbList.length) % lbList.length; lbShow(); };
dlg.querySelector(".lb-next").onclick = () => { lbI = (lbI + 1) % lbList.length; lbShow(); };
dlg.querySelector(".lb-close").onclick = () => dlg.close();
dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
dlg.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") dlg.querySelector(".lb-prev").click();
  if (e.key === "ArrowRight") dlg.querySelector(".lb-next").click();
});

// Animasi muncul saat scroll (dipanggil ulang setelah konten dirender)
window.revealAll = function (root = document) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { threshold: 0, rootMargin: "0px 0px -40px 0px" });
  const els = [...root.querySelectorAll("[data-reveal]:not(.reveal)")];
  els.forEach((el, i) => { el.classList.add("reveal"); el.style.transitionDelay = (i % 4) * 60 + "ms"; io.observe(el); });
  // Pengaman: kalau observer tidak jalan (tab latar, browser lama), konten tetap tampil.
  const showAll = () => els.forEach((el) => el.classList.add("in"));
  setTimeout(showAll, 2500);
  addEventListener("scroll", () => els.forEach((el) => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add("in"); }), { passive: true });
};

// Deteksi server TUJLC + sesi anggota. Di hosting statis biasa: server=false, me=null.
TUJ.ready = (async () => {
  try {
    const st = await TUJ.api("/api/status");
    TUJ.server = !!st.db; if (st.tts) window.TUJ_TTS = true;
    if (TUJ.server) TUJ.me = (await TUJ.api("/api/me")).me;
  } catch {}
  const link = header.querySelector(".nav__member");
  if (TUJ.me) {
    link.classList.add("is-in");
    link.lastChild.textContent = " " + TUJ.me.nama.split(" ")[0] + (TUJ.isPengurus() ? " · Pengurus" : "");
    if (TUJ.isPengurus() && !menu.querySelector('[href="pengurus.html"]')) link.insertAdjacentHTML("afterend", `<a href="pengurus.html" ${page === "pengurus" ? 'aria-current="page"' : ""}>Dasbor Pengurus</a>`);
  }
  return TUJ.me;
})();

// Halaman khusus anggota: arahkan ke halaman masuk bila belum login
TUJ.requireMember = async (next, pengurusOnly) => {
  await TUJ.ready;
  if (!TUJ.server) {
    document.getElementById("main").innerHTML = `<section class="section notfound"><img src="assets/elcy-raincoat.webp" alt="" width="180"><h1 class="display display--md">Area anggota butuh server TUJLC</h1><p>Jalankan <code>python tools/ai_server.py</code> lalu buka lewat alamat server tersebut.</p><a class="btn" href="index.html">Kembali ke beranda</a></section>`;
    return false;
  }
  if (!TUJ.me) { location.replace("anggota.html?next=" + encodeURIComponent(next)); return false; }
  if (pengurusOnly && !TUJ.isPengurus()) { location.replace("anggota.html#pengurus-daftar"); return false; }
  return true;
};
