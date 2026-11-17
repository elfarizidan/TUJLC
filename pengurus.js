// Dasbor Pengurus TUJLC: administrasi, keuangan, event, absensi, kelas, peminjaman ruang, kepengurusan, Excel.
const main = document.getElementById("main");
const esc = (s) => TUJ.esc(s ?? "");
const rp = (n) => "Rp" + Number(n || 0).toLocaleString("id-ID");
const today = () => new Date().toISOString().slice(0, 10);
const api = (p, b) => TUJ.api(p, b);
const LANG_OPT = () => Object.entries(LANGS).map(([k, L]) => `<option value="${k}">${L.name}</option>`).join("");
let SUM = null, TAB = location.hash.slice(1) || "ringkasan";

const TABS = [["ringkasan", "Ringkasan"], ["anggota", "Anggota"], ["iuran", "Kas & iuran"], ["keuangan", "Keuangan"], ["event", "Event & jadwal"],
  ["absensi", "Absensi"], ["kelas", "Pendaftaran kelas"], ["ruang", "Peminjaman ruang"], ["periode", "Kepengurusan"], ["excel", "Template & Excel"]];

function shell() {
  main.innerHTML = `<section class="ak-hero adm-hero"><div><p class="eyebrow">Dasbor Pengurus</p><h1 class="display display--lg">Administrasi TUJLC</h1>
    <p class="lead">Masuk sebagai ${esc(TUJ.me.nama)}. Semua perubahan langsung tersimpan di database server.</p></div><div class="ak-stats" id="admStats"></div></section>
  <nav class="ak-tabs adm-tabs" role="tablist">${TABS.map(([k, n]) => `<button role="tab" data-t="${k}" aria-selected="${k === TAB}">${n}</button>`).join("")}</nav>
  <section class="ak-panel" id="pnl"></section>`;
  main.querySelectorAll("[data-t]").forEach((b) => b.onclick = () => go(b.dataset.t));
}
async function stats() {
  SUM = await api("/api/admin/summary");
  document.getElementById("admStats").innerHTML = `<div><b>${rp(SUM.saldo)}</b><span>saldo kas</span></div><div><b>${SUM.anggota}</b><span>anggota</span></div>
    <div><b>${SUM.iuran_lunas}/${SUM.anggota}</b><span>iuran ${SUM.bulan}</span></div><div><b>${SUM.event_mendatang}</b><span>event mendatang</span></div>`;
}
async function go(t) {
  TAB = t; history.replaceState(null, "", "#" + t);
  main.querySelectorAll("[data-t]").forEach((b) => b.setAttribute("aria-selected", b.dataset.t === t));
  const p = document.getElementById("pnl"); p.innerHTML = `<p class="muted">Memuat…</p>`;
  try { await stats(); await VIEWS[t](p); } catch (e) { p.innerHTML = `<p class="gate__err">${esc(e.message)}</p>`; }
}
const table = (cols, rows, rowFn) => `<div class="tbl-wrap"><table class="tbl"><thead><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.map(rowFn).join("") : `<tr><td colspan="${cols.length}" class="muted">Belum ada data.</td></tr>`}</tbody></table></div>`;
const head = (title, sub, extra = "") => `<div class="adm-head"><div><h2 class="display display--sm">${title}</h2>${sub ? `<p class="muted">${sub}</p>` : ""}</div><div class="adm-head__btns">${extra}</div></div>`;
const xls = (key, label) => `<a class="btn btn--small" href="/api/admin/export/${key}.xlsx">${label || "Ekspor Excel"}</a>`;
const tpl = (key, label) => `<a class="btn btn--small btn--ghost-ink" href="/api/admin/template/${key}.xlsx">${label}</a>`;
function formData(f) { const o = {}; new FormData(f).forEach((v, k) => o[k] = v); f.querySelectorAll("input[type=checkbox]").forEach((c) => o[c.name] = c.checked ? 1 : 0); return o; }

const VIEWS = {
  async ringkasan(p) {
    p.innerHTML = head("Ringkasan", `Bulan ${SUM.bulan}`) + `<div class="adm-cards">
      <div class="adm-card"><span>Pemasukan</span><b>${rp(SUM.masuk)}</b></div><div class="adm-card"><span>Pengeluaran</span><b>${rp(SUM.keluar)}</b></div>
      <div class="adm-card adm-card--y"><span>Saldo kas</span><b>${rp(SUM.saldo)}</b></div><div class="adm-card"><span>Belum bayar iuran bulan ini</span><b>${SUM.iuran_belum} orang</b></div>
      <div class="adm-card"><span>Pendaftar kelas menunggu</span><b>${SUM.kelas_menunggu}</b></div><div class="adm-card"><span>Rencana peminjaman ruang</span><b>${SUM.pinjam_rencana}</b></div></div>
      <div class="kelas-grid" style="margin-top:24px">
        <form class="sticker gate__form" id="fSet"><h3>Pengaturan</h3>
          <label>Kode pendaftaran pengurus<input value="${esc(SUM.kode_pengurus)}" readonly></label>
          <label class="chk"><input type="checkbox" name="regen_kode"> Buat kode pengurus baru (kode lama tidak berlaku)</label>
          <label>Nominal iuran kas per bulan (Rp)<input name="iuran_nominal" type="number" min="0" step="1000" value="${SUM.iuran_nominal}"></label>
          <button class="btn btn--ink btn--small">Simpan pengaturan</button></form>
        <div class="sticker"><h3>Pintasan</h3><p>Bagikan kode pengurus hanya ke pengurus baru. Anggota mendaftar sendiri di halaman Area Anggota → Daftar.</p>
          <p class="muted small">Database tersimpan di folder <code>data/</code> server. Cadangkan folder itu secara berkala.</p></div></div>`;
    fSet.onsubmit = async (e) => { e.preventDefault(); await api("/api/admin/settings", formData(fSet)); go("ringkasan"); };
  },

  async anggota(p) {
    const { rows } = await api("/api/admin/members");
    p.innerHTML = head("Data anggota", `${rows.length} terdaftar. Data pribadi hanya untuk administrasi.`, xls("anggota")) +
      `<input class="adm-search" id="q" placeholder="Cari nama, NIM, email…">` +
      table(["No. anggota", "Nama", "NIM", "Email", "Gender", "Lahir", "Peran", "Aktif", ""], rows, (m) => `<tr data-q="${esc((m.nama + m.nim + m.email).toLowerCase())}">
        <td>${esc(m.no_anggota)}</td><td><b>${esc(m.nama)}</b></td><td>${esc(m.nim)}</td><td>${esc(m.email)}</td><td>${esc(m.gender)}</td><td>${m.tahun_lahir}</td>
        <td><select data-role="${m.id}"><option ${m.role === "anggota" ? "selected" : ""}>anggota</option><option ${m.role === "pengurus" ? "selected" : ""}>pengurus</option></select></td>
        <td><input type="checkbox" data-aktif="${m.id}" ${m.aktif ? "checked" : ""}></td><td><button class="btn btn--small btn--ghost-ink" data-reset="${m.id}">Kode baru</button></td></tr>`);
    q.oninput = () => p.querySelectorAll("tr[data-q]").forEach((r) => r.hidden = !r.dataset.q.includes(q.value.toLowerCase()));
    p.querySelectorAll("[data-role]").forEach((s) => s.onchange = () => api("/api/admin/members", { id: s.dataset.role, role: s.value }));
    p.querySelectorAll("[data-aktif]").forEach((c) => c.onchange = () => api("/api/admin/members", { id: c.dataset.aktif, aktif: c.checked ? 1 : 0 }));
    p.querySelectorAll("[data-reset]").forEach((b) => b.onclick = async () => {
      if (!confirm("Buat kode anggota baru? Kode lama langsung tidak berlaku.")) return;
      const d = await api("/api/admin/reset-kode", { id: b.dataset.reset }); b.outerHTML = `<code class="kode-new">${esc(d.kode)}</code>`;
    });
  },

  async iuran(p) {
    const bulan = p.dataset.bulan || SUM.bulan;
    const { rows } = await api("/api/admin/iuran?bulan=" + bulan);
    const lunas = rows.filter((r) => r.status === "lunas");
    p.innerHTML = head("Kas & iuran anggota", `Nominal ${rp(SUM.iuran_nominal)}/bulan. Centang = lunas, otomatis tercatat di buku kas.`, xls("iuran", "Rekap Excel") + tpl("iuran", "Template rekap iuran")) +
      `<div class="adm-bar"><label>Bulan <input type="month" id="bln" value="${bulan}"></label><span class="pill pill--green">${lunas.length} lunas · ${rp(lunas.length * SUM.iuran_nominal)}</span><span class="pill pill--red">${rows.length - lunas.length} belum bayar</span>
      <label class="chk"><input type="checkbox" id="onlyBelum"> Tampilkan yang belum bayar saja</label></div>` +
      table(["Nama", "NIM", "No. anggota", "Lunas", "Tanggal"], rows, (r) => `<tr data-st="${r.status}"><td><b>${esc(r.nama)}</b></td><td>${esc(r.nim)}</td><td>${esc(r.no_anggota)}</td>
        <td><input type="checkbox" data-m="${r.member_id}" ${r.status === "lunas" ? "checked" : ""}></td><td>${r.status === "lunas" ? esc(r.tanggal) : "–"}</td></tr>`);
    bln.onchange = () => { p.dataset.bulan = bln.value; go("iuran"); };
    onlyBelum.onchange = () => p.querySelectorAll("tr[data-st]").forEach((r) => r.hidden = onlyBelum.checked && r.dataset.st === "lunas");
    p.querySelectorAll("[data-m]").forEach((c) => c.onchange = async () => { await api("/api/admin/iuran", { member_id: c.dataset.m, bulan, lunas: c.checked }); stats(); });
  },

  async keuangan(p) {
    const { rows } = await api("/api/admin/keuangan");
    let saldo = 0;
    const withSaldo = rows.map((r) => ({ ...r, saldo: (saldo += r.jenis === "masuk" ? r.nominal : -r.nominal) }));
    p.innerHTML = head("Buku kas", `Saldo ${rp(SUM.saldo)}`, xls("keuangan") + tpl("buku-kas", "Template buku kas") + tpl("rab", "Template RAB") + tpl("lpj", "Template LPJ")) +
      `<form class="adm-form" id="fK"><input type="date" name="tanggal" value="${today()}" required>
        <select name="jenis"><option value="masuk">Pemasukan</option><option value="keluar">Pengeluaran</option></select>
        <select name="kategori">${["Iuran kas", "Sponsor", "Penjualan merch", "Konsumsi", "Transportasi", "Peminjaman ruang", "Cetak & ATK", "Hadiah", "Lain-lain"].map((k) => `<option>${k}</option>`).join("")}</select>
        <input name="uraian" placeholder="Uraian" required><input name="nominal" type="number" min="1" placeholder="Nominal (Rp)" required><input name="bukti" placeholder="No. bukti / nota">
        <button class="btn btn--ink btn--small">Tambah</button></form>` +
      table(["Tanggal", "Uraian", "Kategori", "Masuk", "Keluar", "Saldo", ""], withSaldo.reverse(), (r) => `<tr><td>${esc(r.tanggal)}</td><td>${esc(r.uraian)}${r.bukti ? `<small class="muted"> · ${esc(r.bukti)}</small>` : ""}</td><td>${esc(r.kategori)}</td>
        <td class="num">${r.jenis === "masuk" ? rp(r.nominal) : ""}</td><td class="num neg">${r.jenis === "keluar" ? rp(r.nominal) : ""}</td><td class="num"><b>${rp(r.saldo)}</b></td>
        <td><button class="x" data-del="${r.id}" aria-label="Hapus">×</button></td></tr>`);
    fK.onsubmit = async (e) => { e.preventDefault(); await api("/api/admin/keuangan", formData(fK)); go("keuangan"); };
    p.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => { if (confirm("Hapus transaksi ini?")) { await api("/api/admin/keuangan/delete", { id: b.dataset.del }); go("keuangan"); } });
  },

  async event(p) {
    const { rows } = await api("/api/admin/events");
    const edit = rows.find((r) => r.id == p.dataset.edit) || {};
    p.innerHTML = head("Event & jadwal pertemuan", "Event yang “tampil” muncul di jadwal Area Anggota. Kode absen dipakai anggota untuk absen mandiri.", xls("events")) +
      `<form class="adm-form adm-form--wide" id="fE"><input type="hidden" name="id" value="${edit.id || ""}">
        <input name="judul" placeholder="Judul (mis. Kelas Jepang A1)" value="${esc(edit.judul)}" required><input type="date" name="tanggal" value="${edit.tanggal || today()}" required>
        <input type="time" name="jam_mulai" value="${edit.jam_mulai || "10:00"}"><input type="time" name="jam_selesai" value="${edit.jam_selesai || "12:00"}">
        <select name="kampus">${Object.entries(SUM.kampus).map(([k, v]) => `<option value="${k}" ${edit.kampus === k ? "selected" : ""}>${esc(v.split(",")[0])}</option>`).join("")}</select>
        <input name="ruang" placeholder="Ruang" value="${esc(edit.ruang)}"><select name="bahasa"><option value="">Semua bahasa</option>${LANG_OPT()}</select>
        <input name="deskripsi" placeholder="Deskripsi singkat" value="${esc(edit.deskripsi)}"><label class="chk"><input type="checkbox" name="tampil" ${edit.id ? (edit.tampil ? "checked" : "") : "checked"}> Tampil di anggota</label>
        <button class="btn btn--ink btn--small">${edit.id ? "Simpan perubahan" : "Tambah event"}</button></form>` +
      table(["Tanggal", "Jam", "Judul", "Bahasa", "Kampus/ruang", "Kode absen", "Hadir", ""], rows, (r) => `<tr><td>${esc(r.tanggal)}</td><td>${esc(r.jam_mulai)}–${esc(r.jam_selesai)}</td>
        <td><b>${esc(r.judul)}</b>${r.tampil ? "" : ' <span class="pill">disembunyikan</span>'}</td><td>${esc(LANGS[r.bahasa]?.name || "Semua")}</td><td>${esc(r.kampus)} ${esc(r.ruang)}</td>
        <td><code class="kode-new">${esc(r.kode_absen)}</code></td><td>${r.hadir}</td>
        <td><button class="btn btn--small btn--ghost-ink" data-ed="${r.id}">Ubah</button> <button class="btn btn--small" data-ab="${r.id}">Absensi</button> <button class="x" data-del="${r.id}">×</button></td></tr>`);
    if (edit.bahasa) fE.bahasa.value = edit.bahasa;
    fE.onsubmit = async (e) => { e.preventDefault(); const d = formData(fE); if (!d.id) delete d.id; await api("/api/admin/events", d); delete p.dataset.edit; go("event"); };
    p.querySelectorAll("[data-ed]").forEach((b) => b.onclick = () => { p.dataset.edit = b.dataset.ed; go("event"); });
    p.querySelectorAll("[data-ab]").forEach((b) => b.onclick = () => { document.getElementById("pnl").dataset.ev = b.dataset.ab; go("absensi"); });
    p.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => { if (confirm("Hapus event ini?")) { await api("/api/admin/events/delete", { id: b.dataset.del }); go("event"); } });
  },

  async absensi(p) {
    const { rows: evs } = await api("/api/admin/events");
    if (!evs.length) { p.innerHTML = head("Absensi", "") + `<p class="muted">Buat event dulu di tab Event & jadwal.</p>`; return; }
    const ev = evs.find((e) => e.id == p.dataset.ev) || evs[0];
    const { rows } = await api("/api/admin/absensi?event=" + ev.id);
    const n = (s) => rows.filter((r) => r.status === s).length;
    p.innerHTML = head("Absensi anggota", "Anggota bisa absen sendiri dengan kode absen, atau isi manual di sini.", xls("absensi", "Rekap absensi Excel") + tpl("absensi", "Template daftar hadir")) +
      `<div class="adm-bar"><label>Pertemuan <select id="evSel">${evs.map((e) => `<option value="${e.id}" ${e.id === ev.id ? "selected" : ""}>${esc(e.tanggal)} · ${esc(e.judul)}</option>`).join("")}</select></label>
       <span>Kode absen: <code class="kode-new kode-big">${esc(ev.kode_absen)}</code></span>
       <span class="pill pill--green">${n("hadir")} hadir</span><span class="pill">${n("izin")} izin</span><span class="pill">${n("sakit")} sakit</span><span class="pill pill--red">${n("alpa")} alpa</span></div>` +
      table(["Nama", "NIM", "Status", "Waktu"], rows, (r) => `<tr><td><b>${esc(r.nama)}</b></td><td>${esc(r.nim)}</td>
        <td><select data-m="${r.member_id}">${["", "hadir", "izin", "sakit", "alpa"].map((s) => `<option value="${s}" ${r.status === s ? "selected" : ""}>${s || "–"}</option>`).join("")}</select></td><td>${esc(r.waktu || "")}</td></tr>`);
    evSel.onchange = () => { p.dataset.ev = evSel.value; go("absensi"); };
    p.querySelectorAll("[data-m]").forEach((s) => s.onchange = () => api("/api/admin/absensi", { event_id: ev.id, member_id: s.dataset.m, status: s.value }));
  },

  async kelas(p) {
    const { rows } = await api("/api/admin/kelas_daftar");
    const by = Object.keys(LANGS).map((k) => [k, rows.filter((r) => r.bahasa === k).length]);
    p.innerHTML = head("Pendaftaran kelas", "Masuk dari formulir “Daftar kelas” di Area Anggota.", xls("kelas")) +
      `<div class="adm-bar">${by.map(([k, n]) => `<span class="pill pill--${LANGS[k].color}">${LANGS[k].name}: ${n}</span>`).join("")}<select id="fl"><option value="">Semua bahasa</option>${LANG_OPT()}</select></div>` +
      table(["Tanggal", "Nama", "NIM", "Bahasa", "Level", "Kampus", "Waktu", "Catatan", "Status"], rows, (r) => `<tr data-b="${r.bahasa}"><td>${esc(r.created?.slice(0, 10))}</td><td><b>${esc(r.nama)}</b></td><td>${esc(r.nim)}</td>
        <td>${esc(LANGS[r.bahasa]?.name)}</td><td>${esc(r.level)}</td><td>${esc(r.kampus)}</td><td>${esc(r.jadwal)}</td><td>${esc(r.catatan)}</td>
        <td><select data-id="${r.id}">${["menunggu", "diterima", "ditolak"].map((s) => `<option ${r.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></td></tr>`);
    fl.onchange = () => p.querySelectorAll("tr[data-b]").forEach((r) => r.hidden = fl.value && r.dataset.b !== fl.value);
    p.querySelectorAll("[data-id]").forEach((s) => s.onchange = () => api("/api/admin/kelas_daftar", { id: s.dataset.id, status: s.value }));
  },

  async ruang(p) {
    const { rows } = await api("/api/admin/pinjam_ruang");
    const map = (addr) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Telkom University Jakarta " + addr.split("–")[1]);
    p.innerHTML = head("Rencana peminjaman ruang", "Tiga kampus Telkom University Jakarta. Alamat dari jakarta.telkomuniversity.ac.id.", xls("pinjam") + tpl("pinjam-ruang", "Template peminjaman")) +
      `<div class="kampus">${Object.entries(SUM.kampus).map(([k, v]) => `<div class="kampus__card"><b class="kampus__k">${k}</b><p>${esc(v)}</p><a href="${map(v)}" target="_blank" rel="noopener">Buka di Google Maps ↗</a>
        <small>${rows.filter((r) => r.kampus === k && r.status !== "selesai").length} rencana aktif</small></div>`).join("")}</div>
      <form class="adm-form adm-form--wide" id="fR"><select name="kampus">${Object.keys(SUM.kampus).map((k) => `<option>${k}</option>`).join("")}</select><input name="ruang" placeholder="Gedung / ruang" required>
        <input type="date" name="tanggal" value="${today()}" required><input type="time" name="jam_mulai" value="09:00"><input type="time" name="jam_selesai" value="12:00">
        <input name="keperluan" placeholder="Keperluan (mis. Kelas Mandarin)" required><input name="pic" placeholder="PIC" value="${esc(TUJ.me.nama)}">
        <select name="status">${["rencana", "diajukan", "disetujui", "ditolak", "selesai"].map((s) => `<option>${s}</option>`).join("")}</select>
        <input name="catatan" placeholder="Catatan"><button class="btn btn--ink btn--small">Tambah rencana</button></form>` +
      table(["Tanggal", "Jam", "Kampus", "Ruang", "Keperluan", "PIC", "Status", ""], rows, (r) => `<tr><td>${esc(r.tanggal)}</td><td>${esc(r.jam_mulai)}–${esc(r.jam_selesai)}</td><td><b>${esc(r.kampus)}</b></td>
        <td>${esc(r.ruang)}</td><td>${esc(r.keperluan)}</td><td>${esc(r.pic)}</td>
        <td><select data-id="${r.id}">${["rencana", "diajukan", "disetujui", "ditolak", "selesai"].map((s) => `<option ${r.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></td>
        <td><button class="x" data-del="${r.id}">×</button></td></tr>`);
    fR.onsubmit = async (e) => { e.preventDefault(); await api("/api/admin/pinjam_ruang", formData(fR)); go("ruang"); };
    p.querySelectorAll("[data-id]").forEach((s) => s.onchange = () => api("/api/admin/pinjam_ruang", { id: s.dataset.id, status: s.value }));
    p.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => { if (confirm("Hapus rencana ini?")) { await api("/api/admin/pinjam_ruang/delete", { id: b.dataset.del }); go("ruang"); } });
  },

  async periode(p) {
    const [{ rows: per }, { rows: pg }] = await Promise.all([api("/api/admin/periode"), api("/api/admin/pengurus")]);
    p.innerHTML = head("Kepengurusan per tahun", "Pengurus baru mendaftar sendiri lewat Area Anggota (butuh kode pengurus). Periode aktif tampil di Area Anggota.", xls("pengurus")) +
      `<form class="adm-form" id="fP"><input name="nama" placeholder="Periode (mis. 2026/2027)" pattern="\\d{4}/\\d{4}" required><input type="date" name="mulai"><input type="date" name="selesai">
        <input name="catatan" placeholder="Catatan"><label class="chk"><input type="checkbox" name="aktif"> Jadikan aktif</label><button class="btn btn--ink btn--small">Tambah periode</button></form>` +
      table(["Periode", "Mulai", "Selesai", "Catatan", "Aktif"], per, (r) => `<tr><td><b>${esc(r.nama)}</b></td><td>${esc(r.mulai)}</td><td>${esc(r.selesai)}</td><td>${esc(r.catatan)}</td>
        <td>${r.aktif ? '<span class="pill pill--green">aktif</span>' : `<button class="btn btn--small btn--ghost-ink" data-akt="${r.id}">Aktifkan</button>`}</td></tr>`) +
      `<h3 style="margin-top:28px">Daftar pengurus</h3>` +
      table(["Foto", "Periode", "Nama", "NIM", "Jabatan", "Divisi", "Urutan", ""], pg, (r) => `<tr><td>${r.foto ? `<img class="tbl-foto" src="${esc(r.foto)}" alt="">` : ""}</td><td>${esc(r.periode)}</td>
        <td><b>${esc(r.nama)}</b></td><td><input data-f="nim" data-id="${r.id}" value="${esc(r.nim)}" size="11"></td><td><input data-f="jabatan" data-id="${r.id}" value="${esc(r.jabatan)}"></td>
        <td><input data-f="divisi" data-id="${r.id}" value="${esc(r.divisi)}" size="12"></td><td><input data-f="urut" data-id="${r.id}" value="${r.urut}" size="3"></td><td><button class="x" data-del="${r.id}">×</button></td></tr>`);
    fP.onsubmit = async (e) => { e.preventDefault(); await api("/api/admin/periode", formData(fP)); go("periode"); };
    p.querySelectorAll("[data-akt]").forEach((b) => b.onclick = async () => { await api("/api/admin/periode", { id: b.dataset.akt, aktif: 1 }); go("periode"); });
    p.querySelectorAll("input[data-f]").forEach((i) => i.onchange = () => api("/api/admin/pengurus", { id: i.dataset.id, [i.dataset.f]: i.value }));
    p.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => { if (confirm("Hapus pengurus ini dari daftar?")) { await api("/api/admin/pengurus/delete", { id: b.dataset.del }); go("periode"); } });
  },

  async excel(p) {
    const T = [["buku-kas", "Buku Kas Umum", "Pemasukan, pengeluaran, saldo berjalan otomatis, pilihan kategori."], ["lpj", "LPJ Kegiatan", "Ringkasan, anggaran vs realisasi, sumber dana, evaluasi, lembar pengesahan."],
      ["rab", "Rencana Anggaran Biaya", "Pos anggaran, volume × harga otomatis, total."], ["iuran", "Rekap Iuran Kas", "12 bulan, centang lunas, total per anggota."],
      ["absensi", "Daftar Hadir", "12 pertemuan, H/I/S/A, persentase hadir."], ["pinjam-ruang", "Peminjaman Ruang", "3 kampus + alamat, status pengajuan."]];
    const E = [["anggota", "Daftar anggota"], ["keuangan", "Buku kas (data asli)"], ["iuran", "Rekap iuran"], ["absensi", "Rekap absensi"], ["kelas", "Pendaftaran kelas"], ["events", "Jadwal & event"], ["pinjam", "Peminjaman ruang"], ["pengurus", "Kepengurusan"]];
    p.innerHTML = head("Template & ekspor Excel", "Template kosong siap isi (rumus sudah jadi), atau ekspor data asli dari database.") +
      `<h3>Template</h3><div class="xl-grid">${T.map(([k, n, d]) => `<a class="xl" href="/api/admin/template/${k}.xlsx"><b>${n}</b><span>${d}</span><i>Unduh .xlsx</i></a>`).join("")}</div>
       <h3 style="margin-top:28px">Ekspor data</h3><div class="xl-grid">${E.map(([k, n]) => `<a class="xl xl--data" href="/api/admin/export/${k}.xlsx"><b>${n}</b><i>Unduh .xlsx</i></a>`).join("")}</div>`;
  },
};

TUJ.requireMember("pengurus.html", true).then((ok) => { if (ok) { shell(); go(TAB); } });
