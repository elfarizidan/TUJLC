"""Template & ekspor Excel untuk pengurus TUJLC (openpyxl)."""
import io
from datetime import date
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
import db

INK = "274045"; YEL = "FFD315"; PAPER = "FBF7EC"
thin = Side(style="thin", color="999999")
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
RP = '"Rp"#,##0;[Red]-"Rp"#,##0'


def _title(ws, title, sub, width):
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=width)
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=width)
    ws["A1"] = title; ws["A1"].font = Font(bold=True, size=15, color=INK)
    ws["A2"] = sub; ws["A2"].font = Font(italic=True, size=10, color="666666")
    ws.row_dimensions[1].height = 24


def _header(ws, row, cols, widths=None):
    for i, c in enumerate(cols, 1):
        cell = ws.cell(row=row, column=i, value=c)
        cell.font = Font(bold=True, color="FFFFFF"); cell.fill = PatternFill("solid", fgColor=INK)
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True); cell.border = BOX
        ws.column_dimensions[get_column_letter(i)].width = (widths or {}).get(i, max(12, len(c) + 4))
    ws.freeze_panes = ws.cell(row=row + 1, column=1)


def _grid(ws, r1, r2, ncol):
    for r in range(r1, r2 + 1):
        for c in range(1, ncol + 1):
            ws.cell(row=r, column=c).border = BOX


def _out(wb):
    bio = io.BytesIO(); wb.save(bio); return bio.getvalue()


SUB = "Telkom University Language Club (TUJLC)"


# ---------- TEMPLATE ----------
def t_buku_kas():
    wb = Workbook(); ws = wb.active; ws.title = "Buku Kas Umum"
    _title(ws, "BUKU KAS UMUM TUJLC", f"{SUB} · Periode: ________ · Bendahara: ________", 8)
    cols = ["No", "Tanggal", "No. Bukti", "Uraian", "Kategori", "Pemasukan", "Pengeluaran", "Saldo"]
    _header(ws, 4, cols, {1: 5, 2: 12, 3: 12, 4: 40, 5: 16, 6: 15, 7: 15, 8: 16})
    ws["D5"] = "Saldo awal"; ws["F5"] = 0; ws["H5"] = "=F5-G5"
    for r in range(6, 106):
        ws[f"A{r}"] = f'=IF(D{r}="","",ROW()-5)'
        ws[f"H{r}"] = f'=IF(AND(F{r}="",G{r}=""),"",H{r-1}+N(F{r})-N(G{r}))'
    for r in range(5, 106):
        for col in "FGH": ws[f"{col}{r}"].number_format = RP
    dv = DataValidation(type="list", formula1='"Iuran kas,Sponsor,Penjualan merch,Konsumsi,Transportasi,Peminjaman ruang,Cetak & ATK,Hadiah,Lain-lain"', allow_blank=True)
    ws.add_data_validation(dv); dv.add("E5:E105")
    _grid(ws, 5, 105, 8)
    ws["D107"] = "TOTAL"; ws["D107"].font = Font(bold=True)
    ws["F107"] = "=SUM(F5:F105)"; ws["G107"] = "=SUM(G5:G105)"; ws["H107"] = "=F107-G107"
    for col in "FGH": ws[f"{col}107"].number_format = RP; ws[f"{col}107"].font = Font(bold=True)
    return _out(wb)


def t_lpj():
    wb = Workbook(); ws = wb.active; ws.title = "Ringkasan"
    _title(ws, "LAPORAN PERTANGGUNGJAWABAN (LPJ) KEGIATAN", SUB, 4)
    fields = ["Nama kegiatan", "Tema", "Tanggal pelaksanaan", "Tempat (kampus & ruang)", "Penanggung jawab", "Ketua pelaksana",
              "Latar belakang", "Tujuan kegiatan", "Sasaran peserta", "Jumlah peserta hadir", "Bahasa / kelas", "Ringkasan pelaksanaan"]
    for i, f in enumerate(fields, 4):
        ws.cell(row=i, column=1, value=f).font = Font(bold=True)
        ws.merge_cells(start_row=i, start_column=2, end_row=i, end_column=4)
        for c in range(1, 5): ws.cell(row=i, column=c).border = BOX
    ws.column_dimensions["A"].width = 28; ws.column_dimensions["B"].width = 60
    ra = wb.create_sheet("Anggaran vs Realisasi")
    _title(ra, "ANGGARAN vs REALISASI", SUB, 7)
    _header(ra, 4, ["No", "Uraian", "Jumlah", "Satuan", "Anggaran (Rp)", "Realisasi (Rp)", "Selisih (Rp)"], {2: 36})
    for r in range(5, 35):
        ra[f"A{r}"] = f'=IF(B{r}="","",ROW()-4)'; ra[f"G{r}"] = f'=IF(B{r}="","",E{r}-F{r})'
        for col in "EFG": ra[f"{col}{r}"].number_format = RP
    _grid(ra, 5, 34, 7)
    ra["B36"] = "TOTAL"; ra["E36"] = "=SUM(E5:E34)"; ra["F36"] = "=SUM(F5:F34)"; ra["G36"] = "=E36-F36"
    for col in "EFG": ra[f"{col}36"].number_format = RP; ra[f"{col}36"].font = Font(bold=True)
    sp = wb.create_sheet("Sumber Dana"); _title(sp, "SUMBER DANA", SUB, 3)
    _header(sp, 4, ["Sumber", "Nominal (Rp)", "Keterangan"], {1: 30, 3: 40})
    for i, s in enumerate(["Kas TUJLC", "Iuran peserta", "Sponsor", "Dana kemahasiswaan", "Lain-lain"], 5):
        sp[f"A{i}"] = s; sp[f"B{i}"].number_format = RP
    sp["A11"] = "TOTAL"; sp["B11"] = "=SUM(B5:B10)"; sp["B11"].number_format = RP
    _grid(sp, 5, 10, 3)
    ev = wb.create_sheet("Evaluasi"); _title(ev, "EVALUASI & REKOMENDASI", SUB, 2)
    for i, f in enumerate(["Hal yang berjalan baik", "Kendala", "Solusi yang sudah dilakukan", "Rekomendasi untuk kegiatan berikutnya", "Lampiran (dokumentasi, daftar hadir, nota)"], 4):
        ev.cell(row=i, column=1, value=f).font = Font(bold=True); ev.row_dimensions[i].height = 60
        ev.cell(row=i, column=2).alignment = Alignment(wrap_text=True, vertical="top")
    ev.column_dimensions["A"].width = 34; ev.column_dimensions["B"].width = 70
    ttd = wb.create_sheet("Pengesahan"); _title(ttd, "LEMBAR PENGESAHAN", SUB, 3)
    for c, t in zip("ABC", ["Ketua Pelaksana", "Bendahara", "Ketua TUJLC"]):
        ttd[f"{c}5"] = t; ttd[f"{c}10"] = "(________________)"; ttd.column_dimensions[c].width = 28
    return _out(wb)


def t_rab():
    wb = Workbook(); ws = wb.active; ws.title = "RAB"
    _title(ws, "RENCANA ANGGARAN BIAYA (RAB)", f"{SUB} · Kegiatan: ________", 7)
    _header(ws, 4, ["No", "Pos", "Uraian", "Volume", "Satuan", "Harga satuan (Rp)", "Jumlah (Rp)"], {3: 36, 2: 16})
    dv = DataValidation(type="list", formula1='"Konsumsi,Transportasi,Perlengkapan,Publikasi,Hadiah,Honor pemateri,Sewa,Lain-lain"', allow_blank=True)
    ws.add_data_validation(dv); dv.add("B5:B44")
    for r in range(5, 45):
        ws[f"A{r}"] = f'=IF(C{r}="","",ROW()-4)'; ws[f"G{r}"] = f'=IF(C{r}="","",D{r}*F{r})'
        ws[f"F{r}"].number_format = RP; ws[f"G{r}"].number_format = RP
    _grid(ws, 5, 44, 7)
    ws["C46"] = "TOTAL ANGGARAN"; ws["G46"] = "=SUM(G5:G44)"; ws["G46"].number_format = RP; ws["G46"].font = Font(bold=True)
    return _out(wb)


def t_iuran():
    wb = Workbook(); ws = wb.active; ws.title = "Rekap Iuran"
    bulan = ["Sep", "Okt", "Nov", "Des", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu"]
    _title(ws, "REKAP IURAN KAS ANGGOTA", f"{SUB} · Isi ✓ jika lunas · Nominal per bulan di sel P3", 16)
    ws["O3"] = "Nominal/bulan"; ws["P3"] = 10000; ws["P3"].number_format = RP
    _header(ws, 4, ["No", "Nama", "NIM"] + bulan + ["Lunas (bln)", "Total (Rp)"], {2: 28, 3: 14})
    for r in range(5, 105):
        ws[f"A{r}"] = f'=IF(B{r}="","",ROW()-4)'
        ws[f"O{r}"] = f'=IF(B{r}="","",COUNTIF(D{r}:N{r},"✓"))'; ws[f"P{r}"] = f'=IF(B{r}="","",O{r}*$P$3)'; ws[f"P{r}"].number_format = RP
    dv = DataValidation(type="list", formula1='"✓"', allow_blank=True); ws.add_data_validation(dv); dv.add("D5:N104")
    _grid(ws, 5, 104, 16)
    return _out(wb)


def t_absensi():
    wb = Workbook(); ws = wb.active; ws.title = "Absensi"
    _title(ws, "DAFTAR HADIR ANGGOTA", f"{SUB} · H = hadir, I = izin, S = sakit, A = alpa", 18)
    _header(ws, 4, ["No", "Nama", "NIM"] + [f"P{i}" for i in range(1, 13)] + ["Hadir", "% Hadir"], {2: 28, 3: 14})
    for r in range(5, 105):
        ws[f"A{r}"] = f'=IF(B{r}="","",ROW()-4)'
        ws[f"P{r}"] = f'=IF(B{r}="","",COUNTIF(D{r}:O{r},"H"))'
        ws[f"Q{r}"] = f'=IF(B{r}="","",P{r}/MAX(1,COUNTA($D$4:$O$4)))'; ws[f"Q{r}"].number_format = "0%"
    dv = DataValidation(type="list", formula1='"H,I,S,A"', allow_blank=True); ws.add_data_validation(dv); dv.add("D5:O104")
    _grid(ws, 5, 104, 17)
    return _out(wb)


def t_pinjam():
    wb = Workbook(); ws = wb.active; ws.title = "Peminjaman Ruang"
    _title(ws, "RENCANA PEMINJAMAN RUANG KELAS", SUB, 10)
    _header(ws, 4, ["No", "Kampus", "Gedung/Ruang", "Tanggal", "Jam mulai", "Jam selesai", "Keperluan", "PIC", "Status", "Catatan"], {2: 18, 3: 18, 7: 30, 10: 30})
    dv = DataValidation(type="list", formula1='"SB (Daan Mogot),B (Halimun),C (Minangkabau)"', allow_blank=True); ws.add_data_validation(dv); dv.add("B5:B104")
    st = DataValidation(type="list", formula1='"rencana,diajukan,disetujui,ditolak,selesai"', allow_blank=True); ws.add_data_validation(st); st.add("I5:I104")
    _grid(ws, 5, 104, 10)
    ka = wb.create_sheet("Alamat Kampus"); _title(ka, "ALAMAT KAMPUS TELKOM UNIVERSITY JAKARTA", "Sumber: jakarta.telkomuniversity.ac.id", 2)
    for i, (k, v) in enumerate(db.KAMPUS.items(), 4): ka[f"A{i}"] = k; ka[f"B{i}"] = v
    ka.column_dimensions["B"].width = 110
    return _out(wb)


TEMPLATES = {"buku-kas": ("Buku Kas Umum", t_buku_kas), "lpj": ("LPJ Kegiatan", t_lpj), "rab": ("Rencana Anggaran Biaya", t_rab),
             "iuran": ("Rekap Iuran Kas", t_iuran), "absensi": ("Daftar Hadir", t_absensi), "pinjam-ruang": ("Peminjaman Ruang", t_pinjam)}


# ---------- EKSPOR DATA ----------
def _sheet(wb, title, cols, data, money=()):
    ws = wb.create_sheet(title[:30])
    _title(ws, title.upper(), f"{SUB} · diekspor {date.today().isoformat()}", len(cols))
    _header(ws, 4, cols)
    for r, row in enumerate(data, 5):
        for c, v in enumerate(row, 1):
            cell = ws.cell(row=r, column=c, value=v); cell.border = BOX
            if c in money: cell.number_format = RP
    return ws


def export(name):
    wb = Workbook(); wb.remove(wb.active)
    if name == "anggota":
        d = db.rows("SELECT no_anggota,nama,nim,email,gender,tahun_lahir,role,created FROM members WHERE email NOT LIKE '%@demo.tujlc' ORDER BY nama")
        _sheet(wb, "Daftar Anggota", ["No. anggota", "Nama", "NIM", "Email", "Gender", "Tahun lahir", "Peran", "Terdaftar"], [list(x.values()) for x in d])
    elif name == "keuangan":
        d = db.rows("SELECT tanggal,jenis,kategori,uraian,nominal FROM keuangan ORDER BY tanggal,id")
        saldo, out = 0, []
        for x in d:
            saldo += x["nominal"] if x["jenis"] == "masuk" else -x["nominal"]
            out.append([x["tanggal"], x["uraian"], x["kategori"], x["nominal"] if x["jenis"] == "masuk" else None, x["nominal"] if x["jenis"] == "keluar" else None, saldo])
        _sheet(wb, "Buku Kas", ["Tanggal", "Uraian", "Kategori", "Pemasukan", "Pengeluaran", "Saldo"], out, money=(4, 5, 6))
    elif name == "iuran":
        bulan = sorted({r["bulan"] for r in db.rows("SELECT DISTINCT bulan FROM iuran")}) or [date.today().strftime("%Y-%m")]
        mem = db.rows("SELECT id,nama,nim FROM members WHERE aktif=1 AND email NOT LIKE '%@demo.tujlc' ORDER BY nama")
        paid = {(r["member_id"], r["bulan"]) for r in db.rows("SELECT member_id,bulan FROM iuran WHERE status='lunas'")}
        _sheet(wb, "Rekap Iuran", ["Nama", "NIM"] + bulan + ["Lunas"], [[m["nama"], m["nim"]] + ["✓" if (m["id"], b) in paid else "–" for b in bulan] + [sum((m["id"], b) in paid for b in bulan)] for m in mem])
    elif name == "absensi":
        ev = db.rows("SELECT id,judul,tanggal FROM events ORDER BY tanggal")
        mem = db.rows("SELECT id,nama,nim FROM members WHERE aktif=1 AND email NOT LIKE '%@demo.tujlc' ORDER BY nama")
        st = {(r["event_id"], r["member_id"]): r["status"] for r in db.rows("SELECT * FROM absensi")}
        _sheet(wb, "Rekap Absensi", ["Nama", "NIM"] + [f"{e['tanggal']} {e['judul']}"[:30] for e in ev] + ["Total hadir"],
               [[m["nama"], m["nim"]] + [st.get((e["id"], m["id"]), "") for e in ev] + [sum(st.get((e["id"], m["id"])) == "hadir" for e in ev)] for m in mem])
    elif name == "kelas":
        d = db.rows("SELECT m.nama,m.nim,k.bahasa,k.level,k.kampus,k.jadwal,k.status,k.catatan,k.created FROM kelas_daftar k JOIN members m ON m.id=k.member_id ORDER BY k.bahasa,m.nama")
        _sheet(wb, "Pendaftaran Kelas", ["Nama", "NIM", "Bahasa", "Level", "Kampus", "Jadwal", "Status", "Catatan", "Tanggal daftar"], [list(x.values()) for x in d])
    elif name == "pinjam":
        d = db.rows("SELECT kampus,ruang,tanggal,jam_mulai,jam_selesai,keperluan,pic,status,catatan FROM pinjam_ruang ORDER BY tanggal")
        _sheet(wb, "Peminjaman Ruang", ["Kampus", "Ruang", "Tanggal", "Mulai", "Selesai", "Keperluan", "PIC", "Status", "Catatan"], [list(x.values()) for x in d])
    elif name == "events":
        d = db.rows("SELECT tanggal,jam_mulai,jam_selesai,judul,bahasa,kampus,ruang,kode_absen,deskripsi FROM events ORDER BY tanggal")
        _sheet(wb, "Jadwal & Event", ["Tanggal", "Mulai", "Selesai", "Judul", "Bahasa", "Kampus", "Ruang", "Kode absen", "Deskripsi"], [list(x.values()) for x in d])
    elif name == "pengurus":
        d = db.rows("SELECT periode,jabatan,divisi,nama,nim FROM pengurus ORDER BY periode DESC, urut")
        _sheet(wb, "Kepengurusan", ["Periode", "Jabatan", "Divisi", "Nama", "NIM"], [list(x.values()) for x in d])
    else:
        raise db.ApiError("Ekspor tidak dikenal.", 404)
    return _out(wb)
