// Template & ekspor Excel TUJLC, dibuat langsung di browser (ExcelJS).
// Pengganti tools/excel.py supaya tetap jalan di hosting statis + database Supabase.
window.XL = (() => {
  const INK = "FF274045", SUB = "Telkom University Language Club (TUJLC)";
  const RP = '"Rp"#,##0;[Red]-"Rp"#,##0';
  const thin = { style: "thin", color: { argb: "FF999999" } };
  const BOX = { left: thin, right: thin, top: thin, bottom: thin };
  const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
  const col = (n) => { let s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };

  let loading = null;
  function load() {
    if (window.ExcelJS) return Promise.resolve();
    return loading ||= new Promise((ok, fail) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";
      s.onload = ok; s.onerror = () => { loading = null; fail(new Error("Gagal memuat pembuat Excel. Cek internet.")); };
      document.head.appendChild(s);
    });
  }

  function title(ws, t, sub, width) {
    ws.mergeCells(1, 1, 1, width); ws.mergeCells(2, 1, 2, width);
    ws.getCell("A1").value = t; ws.getCell("A1").font = { bold: true, size: 15, color: { argb: INK } };
    ws.getCell("A2").value = sub; ws.getCell("A2").font = { italic: true, size: 10, color: { argb: "FF666666" } };
    ws.getRow(1).height = 24;
  }
  function header(ws, row, cols, widths = {}) {
    cols.forEach((c, i) => {
      const cell = ws.getCell(row, i + 1); cell.value = c;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; cell.border = BOX;
      ws.getColumn(i + 1).width = widths[i + 1] || Math.max(12, c.length + 4);
    });
    ws.views = [{ state: "frozen", ySplit: row }];
  }
  function grid(ws, r1, r2, ncol) { for (let r = r1; r <= r2; r++) for (let c = 1; c <= ncol; c++) ws.getCell(r, c).border = BOX; }
  const f = (formula) => ({ formula });
  function list(ws, range, items) {
    const [a, b] = range.split(":"); const c1 = a.match(/[A-Z]+/)[0], c2 = b.match(/[A-Z]+/)[0];
    const r1 = +a.match(/\d+/)[0], r2 = +b.match(/\d+/)[0];
    const idx = (c) => [...c].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
    for (let c = idx(c1); c <= idx(c2); c++) for (let r = r1; r <= r2; r++)
      ws.getCell(r, c).dataValidation = { type: "list", allowBlank: true, formulae: [`"${items}"`] };
  }
  async function save(wb, name) {
    const buf = await wb.xlsx.writeBuffer();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  // ---------- TEMPLATE ----------
  const T = {
    "buku-kas"(wb) {
      const ws = wb.addWorksheet("Buku Kas Umum");
      title(ws, "BUKU KAS UMUM TUJLC", `${SUB} · Periode: ________ · Bendahara: ________`, 8);
      header(ws, 4, ["No", "Tanggal", "No. Bukti", "Uraian", "Kategori", "Pemasukan", "Pengeluaran", "Saldo"], { 1: 5, 2: 12, 3: 12, 4: 40, 5: 16, 6: 15, 7: 15, 8: 16 });
      ws.getCell("D5").value = "Saldo awal"; ws.getCell("F5").value = 0; ws.getCell("H5").value = f("F5-G5");
      for (let r = 6; r <= 105; r++) {
        ws.getCell(`A${r}`).value = f(`IF(D${r}="","",ROW()-5)`);
        ws.getCell(`H${r}`).value = f(`IF(AND(F${r}="",G${r}=""),"",H${r - 1}+N(F${r})-N(G${r}))`);
      }
      for (let r = 5; r <= 105; r++) for (const c of "FGH") ws.getCell(`${c}${r}`).numFmt = RP;
      list(ws, "E5:E105", "Iuran kas,Sponsor,Penjualan merch,Konsumsi,Transportasi,Peminjaman ruang,Cetak & ATK,Hadiah,Lain-lain");
      grid(ws, 5, 105, 8);
      ws.getCell("D107").value = "TOTAL"; ws.getCell("D107").font = { bold: true };
      ws.getCell("F107").value = f("SUM(F5:F105)"); ws.getCell("G107").value = f("SUM(G5:G105)"); ws.getCell("H107").value = f("F107-G107");
      for (const c of "FGH") { ws.getCell(`${c}107`).numFmt = RP; ws.getCell(`${c}107`).font = { bold: true }; }
    },
    lpj(wb) {
      const ws = wb.addWorksheet("Ringkasan"); title(ws, "LAPORAN PERTANGGUNGJAWABAN (LPJ) KEGIATAN", SUB, 4);
      ["Nama kegiatan", "Tema", "Tanggal pelaksanaan", "Tempat (kampus & ruang)", "Penanggung jawab", "Ketua pelaksana", "Latar belakang", "Tujuan kegiatan",
        "Sasaran peserta", "Jumlah peserta hadir", "Bahasa / kelas", "Ringkasan pelaksanaan"].forEach((x, i) => {
        const r = i + 4; ws.getCell(r, 1).value = x; ws.getCell(r, 1).font = { bold: true }; ws.mergeCells(r, 2, r, 4);
        for (let c = 1; c <= 4; c++) ws.getCell(r, c).border = BOX;
      });
      ws.getColumn(1).width = 28; ws.getColumn(2).width = 60;
      const ra = wb.addWorksheet("Anggaran vs Realisasi"); title(ra, "ANGGARAN vs REALISASI", SUB, 7);
      header(ra, 4, ["No", "Uraian", "Jumlah", "Satuan", "Anggaran (Rp)", "Realisasi (Rp)", "Selisih (Rp)"], { 2: 36 });
      for (let r = 5; r <= 34; r++) {
        ra.getCell(`A${r}`).value = f(`IF(B${r}="","",ROW()-4)`); ra.getCell(`G${r}`).value = f(`IF(B${r}="","",E${r}-F${r})`);
        for (const c of "EFG") ra.getCell(`${c}${r}`).numFmt = RP;
      }
      grid(ra, 5, 34, 7);
      ra.getCell("B36").value = "TOTAL"; ra.getCell("E36").value = f("SUM(E5:E34)"); ra.getCell("F36").value = f("SUM(F5:F34)"); ra.getCell("G36").value = f("E36-F36");
      for (const c of "EFG") { ra.getCell(`${c}36`).numFmt = RP; ra.getCell(`${c}36`).font = { bold: true }; }
      const sp = wb.addWorksheet("Sumber Dana"); title(sp, "SUMBER DANA", SUB, 3);
      header(sp, 4, ["Sumber", "Nominal (Rp)", "Keterangan"], { 1: 30, 3: 40 });
      ["Kas TUJLC", "Iuran peserta", "Sponsor", "Dana kemahasiswaan", "Lain-lain"].forEach((x, i) => { sp.getCell(`A${i + 5}`).value = x; sp.getCell(`B${i + 5}`).numFmt = RP; });
      sp.getCell("A11").value = "TOTAL"; sp.getCell("B11").value = f("SUM(B5:B10)"); sp.getCell("B11").numFmt = RP;
      grid(sp, 5, 10, 3);
      const ev = wb.addWorksheet("Evaluasi"); title(ev, "EVALUASI & REKOMENDASI", SUB, 2);
      ["Hal yang berjalan baik", "Kendala", "Solusi yang sudah dilakukan", "Rekomendasi untuk kegiatan berikutnya", "Lampiran (dokumentasi, daftar hadir, nota)"].forEach((x, i) => {
        const r = i + 4; ev.getCell(r, 1).value = x; ev.getCell(r, 1).font = { bold: true }; ev.getRow(r).height = 60;
        ev.getCell(r, 2).alignment = { wrapText: true, vertical: "top" };
      });
      ev.getColumn(1).width = 34; ev.getColumn(2).width = 70;
      const ttd = wb.addWorksheet("Pengesahan"); title(ttd, "LEMBAR PENGESAHAN", SUB, 3);
      ["Ketua Pelaksana", "Bendahara", "Ketua TUJLC"].forEach((t, i) => { const c = col(i + 1); ttd.getCell(`${c}5`).value = t; ttd.getCell(`${c}10`).value = "(________________)"; ttd.getColumn(i + 1).width = 28; });
    },
    rab(wb) {
      const ws = wb.addWorksheet("RAB"); title(ws, "RENCANA ANGGARAN BIAYA (RAB)", `${SUB} · Kegiatan: ________`, 7);
      header(ws, 4, ["No", "Pos", "Uraian", "Volume", "Satuan", "Harga satuan (Rp)", "Jumlah (Rp)"], { 3: 36, 2: 16 });
      list(ws, "B5:B44", "Konsumsi,Transportasi,Perlengkapan,Publikasi,Hadiah,Honor pemateri,Sewa,Lain-lain");
      for (let r = 5; r <= 44; r++) {
        ws.getCell(`A${r}`).value = f(`IF(C${r}="","",ROW()-4)`); ws.getCell(`G${r}`).value = f(`IF(C${r}="","",D${r}*F${r})`);
        ws.getCell(`F${r}`).numFmt = RP; ws.getCell(`G${r}`).numFmt = RP;
      }
      grid(ws, 5, 44, 7);
      ws.getCell("C46").value = "TOTAL ANGGARAN"; ws.getCell("G46").value = f("SUM(G5:G44)"); ws.getCell("G46").numFmt = RP; ws.getCell("G46").font = { bold: true };
    },
    iuran(wb) {
      const ws = wb.addWorksheet("Rekap Iuran");
      const bulan = ["Sep", "Okt", "Nov", "Des", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu"];
      title(ws, "REKAP IURAN KAS ANGGOTA", `${SUB} · Isi ✓ jika lunas · Nominal per bulan di sel P3`, 16);
      ws.getCell("O3").value = "Nominal/bulan"; ws.getCell("P3").value = 10000; ws.getCell("P3").numFmt = RP;
      header(ws, 4, ["No", "Nama", "NIM", ...bulan, "Lunas (bln)", "Total (Rp)"], { 2: 28, 3: 14 });
      for (let r = 5; r <= 104; r++) {
        ws.getCell(`A${r}`).value = f(`IF(B${r}="","",ROW()-4)`);
        ws.getCell(`O${r}`).value = f(`IF(B${r}="","",COUNTIF(D${r}:N${r},"✓"))`);
        ws.getCell(`P${r}`).value = f(`IF(B${r}="","",O${r}*$P$3)`); ws.getCell(`P${r}`).numFmt = RP;
      }
      list(ws, "D5:N104", "✓");
      grid(ws, 5, 104, 16);
    },
    absensi(wb) {
      const ws = wb.addWorksheet("Absensi");
      title(ws, "DAFTAR HADIR ANGGOTA", `${SUB} · H = hadir, I = izin, S = sakit, A = alpa`, 18);
      header(ws, 4, ["No", "Nama", "NIM", ...Array.from({ length: 12 }, (_, i) => `P${i + 1}`), "Hadir", "% Hadir"], { 2: 28, 3: 14 });
      for (let r = 5; r <= 104; r++) {
        ws.getCell(`A${r}`).value = f(`IF(B${r}="","",ROW()-4)`);
        ws.getCell(`P${r}`).value = f(`IF(B${r}="","",COUNTIF(D${r}:O${r},"H"))`);
        ws.getCell(`Q${r}`).value = f(`IF(B${r}="","",P${r}/MAX(1,COUNTA($D$4:$O$4)))`); ws.getCell(`Q${r}`).numFmt = "0%";
      }
      list(ws, "D5:O104", "H,I,S,A");
      grid(ws, 5, 104, 17);
    },
    "pinjam-ruang"(wb, kampus) {
      const ws = wb.addWorksheet("Peminjaman Ruang"); title(ws, "RENCANA PEMINJAMAN RUANG KELAS", SUB, 10);
      header(ws, 4, ["No", "Kampus", "Gedung/Ruang", "Tanggal", "Jam mulai", "Jam selesai", "Keperluan", "PIC", "Status", "Catatan"], { 2: 18, 3: 18, 7: 30, 10: 30 });
      list(ws, "B5:B104", "SB (Daan Mogot),B (Halimun),C (Minangkabau)");
      list(ws, "I5:I104", "rencana,diajukan,disetujui,ditolak,selesai");
      grid(ws, 5, 104, 10);
      const ka = wb.addWorksheet("Alamat Kampus"); title(ka, "ALAMAT KAMPUS TELKOM UNIVERSITY JAKARTA", "Sumber: jakarta.telkomuniversity.ac.id", 2);
      Object.entries(kampus || {}).forEach(([k, v], i) => { ka.getCell(`A${i + 4}`).value = k; ka.getCell(`B${i + 4}`).value = v; });
      ka.getColumn(2).width = 110;
    },
  };

  // ---------- EKSPOR DATA ----------
  function sheet(wb, t, cols, data, money = []) {
    const ws = wb.addWorksheet(t.slice(0, 30));
    title(ws, t.toUpperCase(), `${SUB} · diekspor ${today()}`, cols.length);
    header(ws, 4, cols);
    data.forEach((row, ri) => row.forEach((v, ci) => {
      const cell = ws.getCell(ri + 5, ci + 1); cell.value = v ?? null; cell.border = BOX;
      if (money.includes(ci + 1)) cell.numFmt = RP;
    }));
  }
  const E = {
    anggota: (wb, d) => sheet(wb, "Daftar Anggota", ["No. anggota", "Nama", "NIM", "Email", "Gender", "Tahun lahir", "Peran", "Terdaftar"],
      d.members.map((m) => [m.no_anggota, m.nama, m.nim, m.email, m.gender, m.tahun_lahir, m.role, m.created])),
    keuangan(wb, d) {
      let saldo = 0;
      sheet(wb, "Buku Kas", ["Tanggal", "Uraian", "Kategori", "Pemasukan", "Pengeluaran", "Saldo"], d.keuangan.map((x) => {
        const n = Number(x.nominal || 0); saldo += x.jenis === "masuk" ? n : -n;
        return [x.tanggal, x.uraian, x.kategori, x.jenis === "masuk" ? n : null, x.jenis === "keluar" ? n : null, saldo];
      }), [4, 5, 6]);
    },
    iuran(wb, d) {
      const bulan = [...new Set(d.iuran.map((r) => r.bulan))].sort(); if (!bulan.length) bulan.push(today().slice(0, 7));
      const paid = new Set(d.iuran.filter((r) => r.status === "lunas").map((r) => `${r.member_id}|${r.bulan}`));
      sheet(wb, "Rekap Iuran", ["Nama", "NIM", ...bulan, "Lunas"], d.members.filter((m) => m.aktif).map((m) => {
        const row = bulan.map((b) => paid.has(`${m.id}|${b}`) ? "✓" : "–");
        return [m.nama, m.nim, ...row, row.filter((x) => x === "✓").length];
      }));
    },
    absensi(wb, d) {
      const st = new Map(d.absensi.map((r) => [`${r.event_id}|${r.member_id}`, r.status]));
      sheet(wb, "Rekap Absensi", ["Nama", "NIM", ...d.events.map((e) => `${e.tanggal} ${e.judul}`.slice(0, 30)), "Total hadir"],
        d.members.filter((m) => m.aktif).map((m) => {
          const row = d.events.map((e) => st.get(`${e.id}|${m.id}`) || "");
          return [m.nama, m.nim, ...row, row.filter((x) => x === "hadir").length];
        }));
    },
    kelas: (wb, d) => sheet(wb, "Pendaftaran Kelas", ["Nama", "NIM", "Bahasa", "Level", "Kampus", "Jadwal", "Status", "Catatan", "Tanggal daftar"],
      d.kelas.map((k) => [k.nama, k.nim, k.bahasa, k.level, k.kampus, k.jadwal, k.status, k.catatan, k.created])),
    pinjam: (wb, d) => sheet(wb, "Peminjaman Ruang", ["Kampus", "Ruang", "Tanggal", "Mulai", "Selesai", "Keperluan", "PIC", "Status", "Catatan"],
      d.pinjam.map((p) => [p.kampus, p.ruang, p.tanggal, p.jam_mulai, p.jam_selesai, p.keperluan, p.pic, p.status, p.catatan])),
    events: (wb, d) => sheet(wb, "Jadwal & Event", ["Tanggal", "Mulai", "Selesai", "Judul", "Bahasa", "Kampus", "Ruang", "Kode absen", "Deskripsi"],
      d.events.map((e) => [e.tanggal, e.jam_mulai, e.jam_selesai, e.judul, e.bahasa, e.kampus, e.ruang, e.kode_absen, e.deskripsi])),
    pengurus: (wb, d) => sheet(wb, "Kepengurusan", ["Periode", "Jabatan", "Divisi", "Nama", "NIM"], d.pengurus.map((p) => [p.periode, p.jabatan, p.divisi, p.nama, p.nim])),
  };

  return {
    async template(key, kampus) {
      if (!T[key]) throw new Error("Template tidak ada.");
      await load(); const wb = new ExcelJS.Workbook(); T[key](wb, kampus);
      await save(wb, `Template-${key}-TUJLC.xlsx`);
    },
    async export(key) {
      if (!E[key]) throw new Error("Ekspor tidak dikenal.");
      const [d] = await Promise.all([TUJ.api("/api/admin/dump"), load()]);
      const wb = new ExcelJS.Workbook(); E[key](wb, d);
      await save(wb, `TUJLC-${key}-${today()}.xlsx`);
    },
  };
})();
