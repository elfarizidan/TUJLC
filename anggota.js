// Area anggota: daftar -> dapat kode -> masuk -> dasbor. Data dari server TUJLC (tools/ai_server.py).
const main = document.getElementById("main");
const esc = TUJ.esc;
const params = new URLSearchParams(location.search);
const DRIVE = { media: "1PbV5kTpeEUlRULe0soPS0qqQ51Iu8lOB", docs: "1-0JuhDrXCQcbQIYiD_Gyle9wsXM-SJ8P", medkref: "1BoYmBk1PNESnnYhmz0psrMmdD63yQNdB" };
const PALETTE = [["Ink", "#274045"], ["Kuning ELCY", "#FFD315"], ["Biru langit", "#00A5FF"], ["Teal", "#76AFBE"], ["Hijau", "#28E143"], ["Merah", "#E9212C"], ["Kertas", "#FBF7EC"]];
const JABATAN = ["Ketua", "Wakil Ketua", "Sekretaris", "Bendahara", "Kepala Divisi Mentor & PRP", "Kepala Divisi Humas", "Kepala Divisi Media Creative", "Kepala Divisi Logistik", "Mentor", "Staf PRP", "Staf Humas", "Staf Media Creative", "Logistik"];
const LV = ["A1", "A2", "B1", "B2", "C1", "C2"];
const tgl = (s) => s ? new Date(s + "T00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";

// ---------- Masuk / daftar ----------
function gate(tab = "masuk") {
  main.innerHTML = `
  <section class="gate">
    <div class="gate__card sticker">
      <img src="assets/elcy-window.webp" alt="" width="140">
      <h1 class="display display--sm">Area anggota TUJLC</h1>
      <div class="gate__tabs" role="tablist">
        <button role="tab" data-g="masuk" aria-selected="${tab === "masuk"}">Masuk</button>
        <button role="tab" data-g="daftar" aria-selected="${tab === "daftar"}">Daftar anggota</button>
      </div>
      <div id="gBody"></div>
    </div>
  </section>`;
  main.querySelectorAll("[data-g]").forEach((b) => b.onclick = () => gate(b.dataset.g));
  const gb = document.getElementById("gBody");
  if (tab === "masuk") {
    gb.innerHTML = `<form id="fLogin" class="gate__form">
      <label for="lNim">NIM atau email</label><input id="lNim" autocomplete="username" required>
      <label for="lKode">Kode anggota</label><input id="lKode" autocomplete="current-password" autocapitalize="characters" placeholder="TUJ-XXXX-XXXX" required>
      <button class="btn btn--ink" type="submit">Masuk</button>
      <p class="gate__err" id="err" role="alert"></p>
      <p class="muted small">Lupa kode? Minta pengurus membuatkan kode baru dari Dasbor Pengurus.</p></form>
      <div class="guest"><span>atau coba dulu tanpa mengisi</span>
        <button class="btn btn--small" id="gAng" type="button">Masuk sebagai tamu</button>
        <button class="btn btn--small btn--ghost-ink" id="gPgr" type="button">Lihat dasbor pengurus (tamu)</button>
        <p class="muted small">Akun tamu tidak ikut dihitung di data anggota. Tamu pengurus hanya bisa di laptop server.</p></div>`;
    const guest = async (role) => {
      try { await TUJ.api("/api/demo", { role }); location.href = role === "pengurus" ? "pengurus.html" : "anggota.html"; }
      catch (er) { err.textContent = er.message; }
    };
    gAng.onclick = () => guest("anggota");
    gPgr.onclick = () => guest("pengurus");
    document.getElementById("fLogin").onsubmit = async (e) => {
      e.preventDefault();
      try {
        await TUJ.api("/api/login", { nim: lNim.value, kode: lKode.value });
        const next = params.get("next");
        location.href = next && /^[a-z]+\.html/.test(next) ? next : "anggota.html";
      } catch (er) { err.textContent = er.message; }
    };
  } else {
    gb.innerHTML = `<form id="fReg" class="gate__form">
      <label for="rNama">Nama lengkap</label><input id="rNama" autocomplete="name" required minlength="3">
      <label for="rEmail">Email</label><input id="rEmail" type="email" autocomplete="email" required>
      <label for="rNim">NIM</label><input id="rNim" inputmode="numeric" pattern="[0-9]{8,15}" required>
      <div class="gate__row"><label>Gender<select id="rGender" required><option value="">Pilih</option><option>Laki-laki</option><option>Perempuan</option></select></label>
      <label>Tahun lahir<input id="rTahun" type="number" min="1970" max="${new Date().getFullYear() - 14}" required></label></div>
      <label class="chk"><input type="checkbox" id="rSetuju" required> Saya setuju data ini disimpan pengurus TUJLC untuk administrasi keanggotaan (sesuai UU Pelindungan Data Pribadi) dan tidak dibagikan ke pihak lain.</label>
      <button class="btn btn--ink" type="submit">Daftar & dapatkan kode</button>
      <p class="gate__err" id="err" role="alert"></p></form>`;
    document.getElementById("fReg").onsubmit = async (e) => {
      e.preventDefault();
      try {
        const d = await TUJ.api("/api/register", { nama: rNama.value, email: rEmail.value, nim: rNim.value, gender: rGender.value, tahun_lahir: rTahun.value, setuju: rSetuju.checked });
        const nim = rNim.value;
        gb.innerHTML = `<div class="kode-box">
          <p>Selamat bergabung, <b>${esc(d.nama)}</b>! Nomor anggotamu <b>${esc(d.no_anggota)}</b>.</p>
          <p>Ini <b>kode anggotamu</b>. Simpan baik-baik, kode ini hanya ditampilkan sekali:</p>
          <p class="kode-box__code" id="kode">${esc(d.kode)}</p>
          <div class="kode-box__btns"><button class="btn btn--small" id="cp">Salin kode</button><button class="btn btn--small" id="dl">Simpan sebagai file</button></div>
          <button class="btn btn--ink" id="go">Masuk sekarang</button></div>`;
        cp.onclick = () => navigator.clipboard?.writeText(d.kode).then(() => cp.textContent = "Tersalin!");
        dl.onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([`Kode anggota TUJLC\nNama: ${d.nama}\nNo. anggota: ${d.no_anggota}\nNIM: ${nim}\nKode: ${d.kode}\n`], { type: "text/plain" })); a.download = `kode-anggota-TUJLC-${d.no_anggota}.txt`; a.click(); };
        go.onclick = async () => { await TUJ.api("/api/login", { nim, kode: d.kode }); location.href = "anggota.html"; };
      } catch (er) { err.textContent = er.message; }
    };
  }
}

// ---------- Dasbor ----------
// Foto anggota bersifat privat: dari database online (Supabase) atau dari server lokal.
async function galeri() {
  const box = document.getElementById("faces"); if (!box) return;
  let src = [];
  try { src = TUJ.sb ? (await TUJ.api("/api/galeri")).fotos : Array.from({ length: 34 }, (_, i) => `assets/anggota/a${String(i + 1).padStart(2, "0")}.webp`); } catch {}
  box.innerHTML = src.length ? src.map((s) => `<img src="${s}" alt="Anggota TUJLC" loading="lazy" data-caption="Anggota TUJLC">`).join("") : `<p class="muted">Foto belum tersedia.</p>`;
}
async function dash() {
  const H = await TUJ.api("/api/home");
  const me = H.me, pengurus = TUJ.isPengurus();
  const jam = new Date().getHours();
  const hari = jam < 11 ? "pagi" : jam < 15 ? "siang" : jam < 18 ? "sore" : "malam";
  main.innerHTML = `${me.demo ? `<div class="demo-bar">Mode tamu: kamu masuk tanpa akun. <a href="#" id="toReg">Daftar jadi anggota</a> untuk mendapat kode sendiri dan menyimpan progres.</div>` : ""}
  <section class="dash-hero">
    <div>
      <p class="eyebrow">${pengurus ? "Pengurus" : "Anggota"} · ${esc(me.no_anggota)}</p>
      <h1 class="display display--lg">Selamat ${hari}, ${esc(me.nama.split(" ")[0])}!</h1>
      <p class="lead">${esc(me.nama)} · NIM ${esc(me.nim)}</p>
      <div class="hero__cta">
        <a class="btn" href="belajar.html">Akademi ELCY</a><a class="btn" href="arena.html">Arena Game</a><a class="btn" href="kamus.html">Kamus</a>
        ${pengurus ? `<a class="btn btn--ink-y" href="pengurus.html">Dasbor Pengurus</a>` : ""}
        <button class="btn btn--ghost" id="logout">Keluar</button>
      </div>
    </div>
    <img src="assets/elcy-motoran.webp" alt="" aria-hidden="true">
  </section>
  <nav class="dashnav" aria-label="Bagian area anggota">
    <a href="#jadwal">Jadwal</a><a href="#kelas">Daftar kelas</a><a href="#status">Iuran & absensi</a><a href="#kepengurusan">Kepengurusan</a><a href="#wajah">Foto anggota</a><a href="#album">Album</a><a href="#brand">Brand kit</a>${pengurus ? "" : `<a href="#pengurus-daftar">Daftar pengurus</a>`}
  </nav>

  <section class="section" id="jadwal">
    <div class="section__head"><p class="eyebrow">Jadwal pertemuan</p><h2 class="display display--md">Sampai jumpa di kelas.</h2></div>
    <div class="jadwal">${H.jadwal.length ? H.jadwal.map((e) => `<article class="jd">
      <div class="jd__date"><b>${new Date(e.tanggal + "T00:00").getDate()}</b><span>${new Date(e.tanggal + "T00:00").toLocaleDateString("id-ID", { month: "short" })}</span></div>
      <div><h3>${esc(e.judul)}</h3><p>${tgl(e.tanggal)} · ${esc(e.jam_mulai || "")}${e.jam_selesai ? "–" + esc(e.jam_selesai) : ""}</p>
      <p class="muted small">${esc(H.kampus[e.kampus] || e.kampus || "")}${e.ruang ? " · Ruang " + esc(e.ruang) : ""}</p>${e.deskripsi ? `<p>${esc(e.deskripsi)}</p>` : ""}</div></article>`).join("") : `<p class="muted">Belum ada jadwal dari pengurus.</p>`}</div>
    <form class="absen sticker" id="fAbsen"><h3>Absen pertemuan hari ini</h3><p class="muted small">Masukkan kode absen yang ditampilkan pengurus di kelas.</p>
      <div class="absen__row"><input id="aKode" placeholder="Kode absen" autocapitalize="characters" required><button class="btn btn--ink btn--small">Absen</button></div><p id="aMsg" role="status"></p></form>
  </section>

  <section class="section" id="kelas">
    <div class="section__head"><p class="eyebrow">Pendaftaran kelas</p><h2 class="display display--md">Pilih kelas bahasamu.</h2><p class="muted">Pendaftaranmu langsung masuk ke rekap pengurus.</p></div>
    <div class="kelas-grid">
      <form class="sticker gate__form" id="fKelas">
        <label>Bahasa<select id="kB" required>${Object.entries(LANGS).map(([k, L]) => `<option value="${k}">${L.name} (${L.native})</option>`).join("")}</select></label>
        <label>Level saat ini<select id="kL" required>${LV.map((x) => `<option>${x}</option>`).join("")}</select></label>
        <label>Kampus pilihan<select id="kK">${Object.entries(H.kampus).map(([k, v]) => `<option value="${k}">${esc(v.split(",")[0])}</option>`).join("")}</select></label>
        <label>Waktu yang bisa<input id="kJ" placeholder="misal: Sabtu pagi"></label>
        <label>Catatan<input id="kC" maxlength="200"></label>
        <button class="btn btn--ink">Daftar kelas</button><p id="kMsg" role="status"></p>
      </form>
      <div><h3>Kelas saya</h3>${H.kelas_saya.length ? `<ul class="list">${H.kelas_saya.map((k) => `<li><b>${esc(LANGS[k.bahasa]?.name || k.bahasa)}</b> · ${esc(k.level)} · <span class="pill">${esc(k.status)}</span></li>`).join("")}</ul>` : `<p class="muted">Belum mendaftar kelas.</p>`}</div>
    </div>
  </section>

  <section class="section" id="status">
    <div class="section__head"><p class="eyebrow">Status saya</p><h2 class="display display--md">Iuran kas & absensi.</h2></div>
    <div class="kelas-grid">
      <div><h3>Iuran kas</h3>${H.iuran_saya.length ? `<ul class="list">${H.iuran_saya.map((i) => `<li>${esc(i.bulan)} · <span class="pill ${i.status === "lunas" ? "pill--green" : "pill--red"}">${esc(i.status)}</span></li>`).join("")}</ul>` : `<p class="muted">Belum ada catatan iuran.</p>`}</div>
      <div><h3>Kehadiran</h3>${H.absen_saya.length ? `<ul class="list">${H.absen_saya.map((a) => `<li>${esc(a.tanggal)} · ${esc(a.judul)} · <span class="pill">${esc(a.status)}</span></li>`).join("")}</ul>` : `<p class="muted">Belum ada catatan kehadiran.</p>`}</div>
    </div>
  </section>

  <section class="section" id="kepengurusan">
    <div class="section__head"><p class="eyebrow">Kepengurusan ${esc(H.periode)}</p><h2 class="display display--md">Kenalan dengan pengurus.</h2></div>
    <div class="pgr">${H.pengurus.map((p) => `<figure class="pgr__card">${p.foto ? `<img src="${esc(p.foto)}" alt="${esc(p.nama)}" loading="lazy">` : `<div class="pgr__ph" aria-hidden="true">${esc(p.nama[0])}</div>`}
      <figcaption><b>${esc(p.nama)}</b><span class="pill pill--yellow">${esc(p.jabatan)}</span>${p.nim ? `<small>NIM ${esc(p.nim)}</small>` : ""}</figcaption></figure>`).join("")}</div>
  </section>

  <section class="section" id="wajah">
    <div class="section__head"><p class="eyebrow">Wajah-wajah TUJLC</p><h2 class="display display--md">Foto anggota.</h2><p class="muted">Dari sesi foto anggota, 22 Februari 2025. Hanya tampil untuk anggota yang sudah masuk.</p></div>
    <div class="faces" data-lightbox id="faces"><p class="muted">Memuat foto…</p></div>
  </section>

  <section class="section" id="album">
    <div class="section__head"><p class="eyebrow">Album lengkap</p><h2 class="display display--md">Semua foto asli, per event.</h2></div>
    <div class="albums">${[...EVENTS].sort((a, b) => b.iso.localeCompare(a.iso)).map((e) => `<a class="album" href="${TUJ.drive(e.album)}" target="_blank" rel="noopener"><img src="${TUJ.photo(e.cover, true)}" alt="" loading="lazy"><span><small>${e.date}</small><b>${e.title}</b></span><span class="album__go">Drive ↗</span></a>`).join("")}</div>
  </section>

  <section class="section brand" id="brand">
    <div class="section__head"><p class="eyebrow">Brand kit</p><h2 class="display display--md">Bikin konten yang tetap “TUJLC banget”.</h2></div>
    <div class="brand__grid">
      <div class="brand__card sticker"><h3>Logo</h3><img src="assets/logo-primary.webp" alt="Logo TUJLC" class="brand__logo">
        <div class="brand__dl"><a class="btn btn--small" href="downloads/logo-primary.png" download>Logo primary</a><a class="btn btn--small" href="downloads/logo-secondary.png" download>Logo secondary</a></div></div>
      <div class="brand__card sticker"><h3>Palet warna</h3><div class="swatches">${PALETTE.map(([n, h]) => `<button class="swatch" data-hex="${h}" style="--c:${h}"><span></span><b>${n}</b><code>${h}</code></button>`).join("")}</div></div>
      <div class="brand__card sticker"><h3>Font & panduan</h3><p><b>Franxuarter Totally</b> untuk judul, <b>Fredoka</b> untuk teks.</p><a class="btn btn--small" href="downloads/brand-guidelines-tujlc.pdf" target="_blank" rel="noopener">Brand guideline (PDF)</a></div>
    </div>
    <div class="tools" style="margin-top:20px">
      <a class="tool" href="${TUJ.drive(DRIVE.media)}" target="_blank" rel="noopener"><b>Media Creative</b><span>Aset, ilustrasi ELCY, template.</span></a>
      <a class="tool" href="${TUJ.drive(DRIVE.docs)}" target="_blank" rel="noopener"><b>Dokumentasi</b><span>Foto mentah per pertemuan.</span></a>
      <a class="tool" href="${TUJ.drive(DRIVE.medkref)}" target="_blank" rel="noopener"><b>Medkref 25/26</b><span>Folder Media Creative Next Gen.</span></a>
    </div>
  </section>

  ${pengurus ? "" : `<section class="section" id="pengurus-daftar">
    <div class="section__head"><p class="eyebrow">Khusus pengurus</p><h2 class="display display--md">Daftar sebagai pengurus.</h2><p class="muted">Butuh kode pengurus dari Ketua/Sekretaris. Nama dan NIM diambil otomatis dari akunmu; foto dan jabatan tampil di halaman Kepengurusan.</p></div>
    <form class="sticker gate__form pgr-form" id="fPgr">
      <div class="pgr-form__grid">
        <div>
          <label>Nama<input value="${esc(me.nama)}" disabled></label>
          <label>NIM<input value="${esc(me.nim)}" disabled></label>
          <label>Kode pengurus<input id="pKode" autocapitalize="characters" placeholder="PGR-XXXXXX" required></label>
          <label>Jabatan<select id="pJab" required>${JABATAN.map((j) => `<option>${j}</option>`).join("")}</select></label>
          <label>Divisi<select id="pDiv"><option>Inti</option><option>Mentor & PRP</option><option>Humas</option><option>Media Creative</option><option>Logistik</option></select></label>
          <label>Periode kepengurusan<input id="pPer" value="${new Date().getFullYear()}/${new Date().getFullYear() + 1}" pattern="\\d{4}/\\d{4}" required></label>
        </div>
        <div><label class="drop">Foto formal (wajah jelas)<input type="file" id="pFoto" accept="image/*" required></label><img id="pPrev" class="pgr-form__prev" alt="" hidden></div>
      </div>
      <button class="btn btn--ink">Daftar sebagai pengurus</button><p class="gate__err" id="pErr" role="alert"></p>
    </form>
  </section>`}`;
  galeri();

  document.getElementById("logout").onclick = () => TUJ.logout();
  document.getElementById("toReg")?.addEventListener("click", async (e) => { e.preventDefault(); try { await TUJ.api("/api/logout", {}); } catch {} location.href = "anggota.html?daftar"; });
  document.querySelectorAll(".swatch").forEach((s) => s.onclick = () => navigator.clipboard?.writeText(s.dataset.hex));
  document.getElementById("fAbsen").onsubmit = async (e) => {
    e.preventDefault();
    try { const d = await TUJ.api("/api/absen", { kode: aKode.value }); aMsg.textContent = `Tercatat hadir di “${d.judul}”.`; aMsg.className = "ok"; }
    catch (er) { aMsg.textContent = er.message; aMsg.className = "gate__err"; }
  };
  document.getElementById("fKelas").onsubmit = async (e) => {
    e.preventDefault();
    try { await TUJ.api("/api/kelas", { bahasa: kB.value, level: kL.value, kampus: kK.value, jadwal: kJ.value, catatan: kC.value }); dash(); }
    catch (er) { kMsg.textContent = er.message; kMsg.className = "gate__err"; }
  };
  const fp = document.getElementById("fPgr");
  if (fp) {
    let foto = "";
    pFoto.onchange = async () => { foto = await shrink(pFoto.files[0], 700); pPrev.src = foto; pPrev.hidden = false; };
    fp.onsubmit = async (e) => {
      e.preventDefault();
      try { await TUJ.api("/api/pengurus/daftar", { kode_pengurus: pKode.value, jabatan: pJab.value, divisi: pDiv.value, periode: pPer.value, foto }); location.reload(); }
      catch (er) { pErr.textContent = er.message; }
    };
  }
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
}

function shrink(file, max) {
  return new Promise((res) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = img.width * s; c.height = img.height * s; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", 0.85)); };
    img.src = url;
  });
}

TUJ.ready.then(() => {
  if (!TUJ.server) return TUJ.requireMember("anggota.html");
  TUJ.me ? dash() : gate(params.get("daftar") !== null ? "daftar" : "masuk");
});
