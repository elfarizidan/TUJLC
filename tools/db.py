"""Database & API TUJLC (SQLite). Dipakai oleh tools/ai_server.py.

Peran: publik (tanpa login), anggota (daftar -> dapat kode), pengurus (anggota + kode pengurus).
Data pribadi (NIM, email, tahun lahir) hanya disimpan di sini, tidak pernah di file web.
"""
import hashlib, hmac, json, os, random, secrets, sqlite3, string, threading, time
from datetime import date, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.environ.get("TUJLC_DATA") or os.path.join(ROOT, "data")  # folder ini TIDAK ikut diunggah ke hosting statis
os.makedirs(DATA, exist_ok=True)
DB_PATH = os.path.join(DATA, "tujlc.db")
UPLOAD = os.path.join(ROOT, "uploads", "pengurus")
os.makedirs(UPLOAD, exist_ok=True)
_lock = threading.Lock()

SCHEMA = """
CREATE TABLE IF NOT EXISTS members(id INTEGER PRIMARY KEY, no_anggota TEXT UNIQUE, nama TEXT, email TEXT UNIQUE, nim TEXT UNIQUE,
  gender TEXT, tahun_lahir INTEGER, kode_salt TEXT, kode_hash TEXT, role TEXT DEFAULT 'anggota', aktif INTEGER DEFAULT 1, created TEXT);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, member_id INTEGER, exp REAL);
CREATE TABLE IF NOT EXISTS settings(k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS periode(id INTEGER PRIMARY KEY, nama TEXT, mulai TEXT, selesai TEXT, catatan TEXT, aktif INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS pengurus(id INTEGER PRIMARY KEY, member_id INTEGER, nama TEXT, nim TEXT, jabatan TEXT, divisi TEXT, periode TEXT, foto TEXT, urut INTEGER DEFAULT 50);
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, judul TEXT, tanggal TEXT, jam_mulai TEXT, jam_selesai TEXT, kampus TEXT, ruang TEXT,
  bahasa TEXT, deskripsi TEXT, kode_absen TEXT, tampil INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS absensi(id INTEGER PRIMARY KEY, event_id INTEGER, member_id INTEGER, status TEXT, waktu TEXT, UNIQUE(event_id, member_id));
CREATE TABLE IF NOT EXISTS keuangan(id INTEGER PRIMARY KEY, tanggal TEXT, jenis TEXT, kategori TEXT, uraian TEXT, nominal INTEGER, bukti TEXT, event_id INTEGER, iuran_id INTEGER);
CREATE TABLE IF NOT EXISTS iuran(id INTEGER PRIMARY KEY, member_id INTEGER, bulan TEXT, nominal INTEGER, status TEXT, tanggal TEXT, UNIQUE(member_id, bulan));
CREATE TABLE IF NOT EXISTS kelas_daftar(id INTEGER PRIMARY KEY, member_id INTEGER, bahasa TEXT, level TEXT, kampus TEXT, jadwal TEXT, catatan TEXT, status TEXT DEFAULT 'menunggu', created TEXT);
CREATE TABLE IF NOT EXISTS pinjam_ruang(id INTEGER PRIMARY KEY, kampus TEXT, ruang TEXT, tanggal TEXT, jam_mulai TEXT, jam_selesai TEXT, keperluan TEXT,
  event_id INTEGER, pic TEXT, status TEXT DEFAULT 'rencana', catatan TEXT);
CREATE TABLE IF NOT EXISTS scores(id INTEGER PRIMARY KEY, member_id INTEGER, game TEXT, lang TEXT, score INTEGER, created TEXT);
"""

KAMPUS = {
    "SB": "Kampus SB – Daan Mogot (Gedung Stasiun Bumi), Jl. Raya Daan Mogot KM.11, Kedaung Kali Angke, Cengkareng, Jakarta Barat 11710",
    "B": "Kampus B – Halimun, Jl. Halimun Raya No.2, Guntur, Setiabudi, Jakarta Selatan 12980",
    "C": "Kampus C – Minangkabau, Jl. Minangkabau Barat No.50, Ps. Manggis, Setiabudi, Jakarta Selatan 12970",
}

# Pengurus periode 2024/2025 dari folder "Buat id card" (foto di assets/pengurus/)
SEED_PENGURUS = [
    (15, "Muhammad Zidan Alfarizi", "Ketua", "Inti", 1), (4, "Allyssa Humayra", "Wakil Ketua", "Inti", 2),
    (17, "Niken Citra Suhisman", "Sekretaris", "Inti", 3), (1, "Aabid Ahmad Zubaid", "Kepala Divisi Mentor & PRP", "Mentor & PRP", 10),
    (8, "Faturrizqi Abhinaya Marhali", "Kepala Divisi Humas", "Humas", 11), (9, "Kayween Joneth", "Mentor", "Mentor & PRP", 20),
    (5, "Brigitta Dwi Indah Lestari", "Staf PRP", "Mentor & PRP", 21), (13, "Muhammad Dimas Eka Prasetya", "Staf PRP", "Mentor & PRP", 22),
    (14, "Muhammad Raia Pratama Putra Wibowo", "Staf PRP", "Mentor & PRP", 23), (6, "Dwi Anugrah Febriansyah", "Staf Humas", "Humas", 30),
    (7, "Fadli Alamsyah", "Staf Humas", "Humas", 31), (10, "Khansa Farah Fitriani", "Staf Humas", "Humas", 32),
    (2, "Adhe Nurul T.", "Staf Media Creative", "Media Creative", 40), (3, "Afif Nur Sena", "Staf Media Creative", "Media Creative", 41),
    (11, "Khansa Fathiyah H.", "Staf Media Creative", "Media Creative", 42), (12, "Mazaya Nur Angelina Kanaiday Nadinney", "Staf Media Creative", "Media Creative", 43),
    (16, "Nailah Khairun Niswah", "Staf Media Creative", "Media Creative", 44), (18, "Rafi Pramudia", "Logistik", "Logistik", 50),
]


def conn():
    c = sqlite3.connect(DB_PATH, check_same_thread=False)
    c.row_factory = sqlite3.Row
    return c


def init():
    with _lock, conn() as c:
        c.executescript(SCHEMA)
        if not c.execute("SELECT 1 FROM periode").fetchone():
            c.execute("INSERT INTO periode(nama, mulai, selesai, catatan, aktif) VALUES('2024/2025','2024-09-01','2025-08-31','Periode awal (data dari folder ID card)',1)")
            for fid, nama, jab, div, urut in SEED_PENGURUS:
                foto = f"assets/pengurus/p{fid:02d}.webp" if os.path.exists(os.path.join(ROOT, "assets", "pengurus", f"p{fid:02d}.webp")) else ""
                c.execute("INSERT INTO pengurus(nama, nim, jabatan, divisi, periode, foto, urut) VALUES(?,?,?,?,?,?,?)", (nama, "", jab, div, "2024/2025", foto, urut))
        if not get_setting(c, "kode_pengurus"):
            set_setting(c, "kode_pengurus", "PGR-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6)))
        if not get_setting(c, "iuran_nominal"):
            set_setting(c, "iuran_nominal", "10000")
    kode = admin_code()
    with open(os.path.join(DATA, "KODE-PENGURUS.txt"), "w", encoding="utf-8") as f:
        f.write(f"Kode pendaftaran pengurus TUJLC: {kode}\nBagikan hanya ke pengurus. Bisa diganti dari Dasbor Pengurus > Pengaturan.\n")


def get_setting(c, k):
    r = c.execute("SELECT v FROM settings WHERE k=?", (k,)).fetchone()
    return r["v"] if r else None


def set_setting(c, k, v):
    c.execute("INSERT INTO settings(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v", (k, v))


def admin_code():
    with conn() as c:
        return get_setting(c, "kode_pengurus")


# ---------- kode & sesi ----------
def _hash(kode, salt):
    return hashlib.pbkdf2_hmac("sha256", kode.strip().upper().encode(), bytes.fromhex(salt), 200_000).hex()


def new_member_code():
    a = "".join(random.choices("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", k=4))
    b = "".join(random.choices("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", k=4))
    return f"TUJ-{a}-{b}"


class ApiError(Exception):
    def __init__(self, msg, code=400):
        super().__init__(msg); self.code = code


def public_member(r):
    return {"id": r["id"], "no_anggota": r["no_anggota"], "nama": r["nama"], "role": r["role"], "gender": r["gender"], "demo": str(r["email"]).endswith("@demo.tujlc")}


def register(b):
    nama = (b.get("nama") or "").strip()
    email = (b.get("email") or "").strip().lower()
    nim = "".join(ch for ch in str(b.get("nim") or "") if ch.isdigit())
    gender = b.get("gender")
    try: tahun = int(b.get("tahun_lahir"))
    except (TypeError, ValueError): tahun = 0
    if len(nama) < 3: raise ApiError("Nama minimal 3 huruf.")
    if "@" not in email or "." not in email.split("@")[-1]: raise ApiError("Email tidak valid.")
    if not 8 <= len(nim) <= 15: raise ApiError("NIM harus 8–15 digit angka.")
    if gender not in ("Laki-laki", "Perempuan"): raise ApiError("Pilih gender.")
    if not 1970 <= tahun <= date.today().year - 14: raise ApiError("Tahun lahir tidak valid.")
    if not b.get("setuju"): raise ApiError("Centang persetujuan penggunaan data.")
    kode = new_member_code(); salt = secrets.token_hex(16)
    with _lock, conn() as c:
        if c.execute("SELECT 1 FROM members WHERE email=? OR nim=?", (email, nim)).fetchone():
            raise ApiError("Email atau NIM sudah terdaftar. Masuk dengan kode yang pernah kamu dapat.", 409)
        n = c.execute("SELECT COUNT(*) FROM members WHERE email NOT LIKE '%@demo.tujlc'").fetchone()[0] + 1
        no = f"TUJLC-{date.today().year}-{n:04d}"
        c.execute("INSERT INTO members(no_anggota,nama,email,nim,gender,tahun_lahir,kode_salt,kode_hash,created) VALUES(?,?,?,?,?,?,?,?,?)",
                  (no, nama, email, nim, gender, tahun, salt, _hash(kode, salt), datetime.now().isoformat(timespec="seconds")))
    return {"kode": kode, "no_anggota": no, "nama": nama}


def login(b):
    who = (b.get("nim") or "").strip().lower()
    kode = (b.get("kode") or "").strip()
    with _lock, conn() as c:
        r = c.execute("SELECT * FROM members WHERE (nim=? OR email=?) AND aktif=1", ("".join(ch for ch in who if ch.isdigit()) or "-", who)).fetchone()
        if not r or not hmac.compare_digest(_hash(kode, r["kode_salt"]), r["kode_hash"]):
            time.sleep(0.6)
            raise ApiError("NIM/email atau kode anggota salah.", 401)
        token = secrets.token_urlsafe(32)
        c.execute("INSERT INTO sessions VALUES(?,?,?)", (token, r["id"], time.time() + 30 * 86400))
        return token, public_member(r)


def session_member(token):
    if not token: return None
    with conn() as c:
        r = c.execute("SELECT m.* FROM sessions s JOIN members m ON m.id=s.member_id WHERE s.token=? AND s.exp>? AND m.aktif=1", (token, time.time())).fetchone()
        return dict(r) if r else None


DEMO = {"anggota": ("Tamu Anggota", "demo-anggota@demo.tujlc", "0000000001"),
        "pengurus": ("Tamu Pengurus", "demo-pengurus@demo.tujlc", "0000000002")}


def demo_login(role, is_local):
    """Masuk tanpa mengisi formulir. Tamu pengurus hanya boleh dari laptop server (localhost)
    supaya data pribadi anggota tidak bisa dibuka dari perangkat lain."""
    if role not in DEMO: raise ApiError("Peran tamu tidak dikenal.")
    if role == "pengurus" and not is_local:
        raise ApiError("Tamu pengurus hanya bisa dipakai di laptop server.", 403)
    nama, email, nim = DEMO[role]
    with _lock, conn() as c:
        r = c.execute("SELECT * FROM members WHERE email=?", (email,)).fetchone()
        if not r:
            salt = secrets.token_hex(16)
            c.execute("INSERT INTO members(no_anggota,nama,email,nim,gender,tahun_lahir,kode_salt,kode_hash,role,created) VALUES(?,?,?,?,?,?,?,?,?,?)",
                      (f"DEMO-{role.upper()}", nama, email, nim, "Laki-laki", 2005, salt, _hash(secrets.token_hex(8), salt), role, datetime.now().isoformat(timespec="seconds")))
            r = c.execute("SELECT * FROM members WHERE email=?", (email,)).fetchone()
        token = secrets.token_urlsafe(32)
        c.execute("INSERT INTO sessions VALUES(?,?,?)", (token, r["id"], time.time() + 86400))
        return token, public_member(r) | {"demo": True}


def logout(token):
    with _lock, conn() as c:
        c.execute("DELETE FROM sessions WHERE token=?", (token,))


def register_pengurus(m, b):
    if (b.get("kode_pengurus") or "").strip().upper() != admin_code():
        raise ApiError("Kode pengurus salah. Minta ke Ketua/Sekretaris.", 403)
    jabatan = (b.get("jabatan") or "").strip(); divisi = (b.get("divisi") or "").strip(); periode = (b.get("periode") or "").strip()
    foto = b.get("foto") or ""
    if not jabatan or not periode: raise ApiError("Isi jabatan dan periode.")
    if not foto.startswith("data:image/"): raise ApiError("Unggah foto formal.")
    raw = __import__("base64").b64decode(foto.split(",", 1)[1])
    if len(raw) > 3 * 1024 * 1024: raise ApiError("Foto maksimal 3 MB.")
    fname = f"m{m['id']}-{secrets.token_hex(4)}.jpg"
    with open(os.path.join(UPLOAD, fname), "wb") as f: f.write(raw)
    with _lock, conn() as c:
        c.execute("UPDATE members SET role='pengurus' WHERE id=?", (m["id"],))
        c.execute("DELETE FROM pengurus WHERE member_id=? AND periode=?", (m["id"], periode))
        c.execute("INSERT INTO pengurus(member_id,nama,nim,jabatan,divisi,periode,foto,urut) VALUES(?,?,?,?,?,?,?,?)",
                  (m["id"], m["nama"], m["nim"], jabatan, divisi, periode, f"uploads/pengurus/{fname}", 5 if "ketua" in jabatan.lower() else 30))
        if not c.execute("SELECT 1 FROM periode WHERE nama=?", (periode,)).fetchone():
            c.execute("INSERT INTO periode(nama, catatan, aktif) VALUES(?, 'Dibuat otomatis saat pendaftaran pengurus', 0)", (periode,))
    return {"ok": True}


# ---------- data untuk anggota ----------
def rows(sql, args=()):
    with conn() as c:
        return [dict(r) for r in c.execute(sql, args).fetchall()]


def member_home(m):
    today = date.today().isoformat()
    per = rows("SELECT nama FROM periode ORDER BY aktif DESC, id DESC LIMIT 1")
    periode = per[0]["nama"] if per else ""
    return {
        "me": public_member(m) | {"nim": m["nim"], "email": m["email"]},
        "jadwal": rows("SELECT id,judul,tanggal,jam_mulai,jam_selesai,kampus,ruang,bahasa,deskripsi FROM events WHERE tampil=1 AND tanggal>=? ORDER BY tanggal, jam_mulai LIMIT 20", (today,)),
        "kampus": KAMPUS,
        "pengurus": rows("SELECT nama, nim, jabatan, divisi, periode, foto FROM pengurus WHERE periode=? ORDER BY urut, nama", (periode,)),
        "periode": periode,
        "periode_list": [r["nama"] for r in rows("SELECT nama FROM periode ORDER BY id DESC")],
        "kelas_saya": rows("SELECT * FROM kelas_daftar WHERE member_id=? ORDER BY id DESC", (m["id"],)),
        "absen_saya": rows("SELECT e.judul, e.tanggal, a.status FROM absensi a JOIN events e ON e.id=a.event_id WHERE a.member_id=? ORDER BY e.tanggal DESC LIMIT 20", (m["id"],)),
        "iuran_saya": rows("SELECT bulan, nominal, status FROM iuran WHERE member_id=? ORDER BY bulan DESC LIMIT 12", (m["id"],)),
    }


def daftar_kelas(m, b):
    bahasa = b.get("bahasa"); level = b.get("level")
    if not bahasa or not level: raise ApiError("Pilih bahasa dan level.")
    with _lock, conn() as c:
        if c.execute("SELECT 1 FROM kelas_daftar WHERE member_id=? AND bahasa=? AND status!='ditolak'", (m["id"], bahasa)).fetchone():
            raise ApiError("Kamu sudah terdaftar di kelas bahasa ini.", 409)
        c.execute("INSERT INTO kelas_daftar(member_id,bahasa,level,kampus,jadwal,catatan,created) VALUES(?,?,?,?,?,?,?)",
                  (m["id"], bahasa, level, b.get("kampus", ""), b.get("jadwal", ""), (b.get("catatan") or "")[:500], datetime.now().isoformat(timespec="seconds")))
    return {"ok": True}


def absen_mandiri(m, b):
    kode = (b.get("kode") or "").strip().upper()
    with _lock, conn() as c:
        e = c.execute("SELECT * FROM events WHERE kode_absen=? AND tanggal=?", (kode, date.today().isoformat())).fetchone()
        if not e: raise ApiError("Kode absen tidak cocok dengan pertemuan hari ini.", 404)
        c.execute("INSERT INTO absensi(event_id,member_id,status,waktu) VALUES(?,?,?,?) ON CONFLICT(event_id,member_id) DO UPDATE SET status='hadir', waktu=excluded.waktu",
                  (e["id"], m["id"], "hadir", datetime.now().isoformat(timespec="seconds")))
    return {"ok": True, "judul": e["judul"]}


# ---------- skor ----------
GAMES = {"lari", "suara", "susun", "memori", "kota", "duel", "mabar", "dunia"}


def add_score(m, b):
    g = b.get("game")
    if g not in GAMES: raise ApiError("Game tidak dikenal.")
    s = max(0, min(int(b.get("score") or 0), 1_000_000))
    with _lock, conn() as c:
        c.execute("INSERT INTO scores(member_id,game,lang,score,created) VALUES(?,?,?,?,?)", (m["id"], g, b.get("lang", ""), s, datetime.now().isoformat(timespec="seconds")))
    return {"ok": True}


def leaderboard(game, lang=""):
    q = "SELECT m.nama, MAX(s.score) AS score FROM scores s JOIN members m ON m.id=s.member_id WHERE s.game=?"
    args = [game]
    if lang: q += " AND s.lang=?"; args.append(lang)
    return rows(q + " GROUP BY s.member_id ORDER BY score DESC LIMIT 10", args)


# ---------- ruang mabar (2–5 pemain, di memori) ----------
ROOMS = {}


def _room_code():
    while True:
        c = "".join(random.choices("ABCDEFGHJKLMNPQRSTUVWXYZ", k=4))
        if c not in ROOMS: return c


def room_create(m, b):
    code = _room_code()
    ROOMS[code] = {"code": code, "host": m["id"], "lang": b.get("lang", "en"), "status": "lobi", "players": {m["id"]: {"nama": m["nama"], "score": 0}},
                   "questions": [], "q": -1, "q_start": 0, "answers": {}, "secs": 15, "created": time.time()}
    return room_state(m, code)


def room_join(m, b):
    r = ROOMS.get((b.get("code") or "").upper())
    if not r: raise ApiError("Kode ruang tidak ditemukan.", 404)
    if m["id"] not in r["players"]:
        if r["status"] != "lobi": raise ApiError("Permainan sudah dimulai.")
        if len(r["players"]) >= 5: raise ApiError("Ruang penuh (maksimal 5 pemain).")
        r["players"][m["id"]] = {"nama": m["nama"], "score": 0}
    return room_state(m, r["code"])


def room_start(m, b):
    r = ROOMS.get((b.get("code") or "").upper())
    if not r or r["host"] != m["id"]: raise ApiError("Hanya pembuat ruang yang bisa memulai.", 403)
    if len(r["players"]) < 2: raise ApiError("Butuh minimal 2 pemain.")
    qs = b.get("questions") or []
    if not 3 <= len(qs) <= 20: raise ApiError("Soal tidak valid.")
    r["questions"] = [{"p": str(q["p"])[:200], "r": str(q.get("r", ""))[:120], "o": [str(x)[:120] for x in q["o"]][:4], "c": int(q["c"])} for q in qs]
    r.update(status="main", q=0, q_start=time.time(), answers={})
    return room_state(m, r["code"])


def _advance(r):
    if r["status"] != "main": return
    over = time.time() - r["q_start"] > r["secs"]
    everyone = len(r["answers"]) >= len(r["players"])
    if (over or everyone) and time.time() - r["q_start"] > 1:
        if not r.get("reveal_at"): r["reveal_at"] = time.time(); return
        if time.time() - r["reveal_at"] > 3:  # tampilkan jawaban 3 detik
            r["q"] += 1; r["answers"] = {}; r["reveal_at"] = None; r["q_start"] = time.time()
            if r["q"] >= len(r["questions"]): r["status"] = "selesai"


def room_answer(m, b):
    r = ROOMS.get((b.get("code") or "").upper())
    if not r or m["id"] not in r["players"] or r["status"] != "main" or r.get("reveal_at"): raise ApiError("Tidak bisa menjawab sekarang.")
    if m["id"] in r["answers"]: return room_state(m, r["code"])
    choice = int(b.get("choice", -1)); q = r["questions"][r["q"]]
    elapsed = time.time() - r["q_start"]
    ok = choice == q["c"]
    pts = int(100 + max(0, r["secs"] - elapsed) * 10) if ok else 0
    r["answers"][m["id"]] = {"choice": choice, "ok": ok, "pts": pts}
    r["players"][m["id"]]["score"] += pts
    return room_state(m, r["code"])


def room_state(m, code):
    r = ROOMS.get((code or "").upper())
    if not r: raise ApiError("Ruang tidak ditemukan.", 404)
    _advance(r)
    out = {"code": r["code"], "status": r["status"], "lang": r["lang"], "host": r["host"] == m["id"], "me": m["id"],
           "players": [{"id": pid, **p, "answered": pid in r["answers"]} for pid, p in r["players"].items()], "total": len(r["questions"]), "i": r["q"]}
    if r["status"] == "main":
        q = r["questions"][r["q"]]
        out["question"] = {"p": q["p"], "r": q["r"], "o": q["o"], "left": max(0, round(r["secs"] - (time.time() - r["q_start"]), 1))}
        if r.get("reveal_at"): out["question"]["c"] = q["c"]; out["reveal"] = {str(k): v for k, v in r["answers"].items()}
        out["my_answer"] = r["answers"].get(m["id"])
    if r["status"] == "selesai" and not r.get("saved"):
        r["saved"] = True
        for pid, p in r["players"].items(): add_score({"id": pid}, {"game": "mabar", "lang": r["lang"], "score": p["score"]})
    for k in [k for k, v in ROOMS.items() if time.time() - v["created"] > 6 * 3600]: ROOMS.pop(k, None)
    return out


# ---------- dasbor pengurus ----------
ADMIN_TABLES = {
    "events": ["judul", "tanggal", "jam_mulai", "jam_selesai", "kampus", "ruang", "bahasa", "deskripsi", "kode_absen", "tampil"],
    "keuangan": ["tanggal", "jenis", "kategori", "uraian", "nominal", "bukti", "event_id"],
    "kelas_daftar": ["status", "level", "kampus", "jadwal", "catatan"],
    "pinjam_ruang": ["kampus", "ruang", "tanggal", "jam_mulai", "jam_selesai", "keperluan", "event_id", "pic", "status", "catatan"],
    "periode": ["nama", "mulai", "selesai", "catatan", "aktif"],
    "pengurus": ["nama", "nim", "jabatan", "divisi", "periode", "urut"],
    "members": ["nama", "role", "aktif"],
}


def admin_list(table, args):
    if table == "members":
        return rows("SELECT id,no_anggota,nama,email,nim,gender,tahun_lahir,role,aktif,created FROM members WHERE email NOT LIKE '%@demo.tujlc' ORDER BY id")
    if table == "kelas_daftar":
        return rows("SELECT k.*, m.nama, m.nim FROM kelas_daftar k JOIN members m ON m.id=k.member_id ORDER BY k.id DESC")
    if table == "keuangan":
        return rows("SELECT * FROM keuangan ORDER BY tanggal, id")
    if table == "events":
        return rows("SELECT e.*, (SELECT COUNT(*) FROM absensi a WHERE a.event_id=e.id AND a.status='hadir') AS hadir FROM events e ORDER BY tanggal DESC")
    if table in ADMIN_TABLES:
        order = "urut, nama" if table == "pengurus" else "id DESC"
        return rows(f"SELECT * FROM {table} ORDER BY {order}")
    raise ApiError("Tabel tidak dikenal.", 404)


def admin_save(table, b):
    if table not in ADMIN_TABLES: raise ApiError("Tabel tidak dikenal.", 404)
    cols = [k for k in ADMIN_TABLES[table] if k in b]
    vals = [b[k] for k in cols]
    if table == "events" and not b.get("id") and not b.get("kode_absen"):
        cols.append("kode_absen"); vals.append("".join(random.choices("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", k=5)))
    if table == "keuangan" and "nominal" in b:
        vals[cols.index("nominal")] = int(b["nominal"] or 0)
    with _lock, conn() as c:
        if table == "periode" and b.get("aktif"):
            c.execute("UPDATE periode SET aktif=0")
        if b.get("id"):
            if not cols: return {"ok": True}
            c.execute(f"UPDATE {table} SET {', '.join(k + '=?' for k in cols)} WHERE id=?", vals + [b["id"]])
            return {"ok": True, "id": b["id"]}
        if table == "members": raise ApiError("Anggota baru harus mendaftar sendiri.")
        cur = c.execute(f"INSERT INTO {table}({', '.join(cols)}) VALUES({', '.join('?' * len(cols))})", vals)
        return {"ok": True, "id": cur.lastrowid}


def admin_delete(table, b):
    if table not in ADMIN_TABLES or table == "members": raise ApiError("Tidak bisa dihapus.", 400)
    with _lock, conn() as c:
        if table == "keuangan":
            c.execute("UPDATE iuran SET status='belum' WHERE id=(SELECT iuran_id FROM keuangan WHERE id=?)", (b["id"],))
        c.execute(f"DELETE FROM {table} WHERE id=?", (b["id"],))
    return {"ok": True}


def iuran_bulan(bulan):
    return rows("""SELECT m.id AS member_id, m.nama, m.nim, m.no_anggota, COALESCE(i.status,'belum') AS status, i.nominal, i.tanggal
                   FROM members m LEFT JOIN iuran i ON i.member_id=m.id AND i.bulan=? WHERE m.aktif=1 AND m.email NOT LIKE '%@demo.tujlc' ORDER BY m.nama""", (bulan,))


def iuran_set(b):
    mid, bulan, lunas = int(b["member_id"]), b["bulan"], bool(b.get("lunas"))
    with _lock, conn() as c:
        nominal = int(b.get("nominal") or get_setting(c, "iuran_nominal") or 10000)
        nama = c.execute("SELECT nama FROM members WHERE id=?", (mid,)).fetchone()["nama"]
        old = c.execute("SELECT * FROM iuran WHERE member_id=? AND bulan=?", (mid, bulan)).fetchone()
        if old: c.execute("DELETE FROM keuangan WHERE iuran_id=?", (old["id"],))
        c.execute("INSERT INTO iuran(member_id,bulan,nominal,status,tanggal) VALUES(?,?,?,?,?) ON CONFLICT(member_id,bulan) DO UPDATE SET status=excluded.status, nominal=excluded.nominal, tanggal=excluded.tanggal",
                  (mid, bulan, nominal, "lunas" if lunas else "belum", date.today().isoformat()))
        iid = c.execute("SELECT id FROM iuran WHERE member_id=? AND bulan=?", (mid, bulan)).fetchone()["id"]
        if lunas:  # otomatis masuk buku kas
            c.execute("INSERT INTO keuangan(tanggal,jenis,kategori,uraian,nominal,iuran_id) VALUES(?,?,?,?,?,?)",
                      (date.today().isoformat(), "masuk", "Iuran kas", f"Iuran kas {bulan} – {nama}", nominal, iid))
    return {"ok": True}


def absensi_event(eid):
    return rows("""SELECT m.id AS member_id, m.nama, m.nim, COALESCE(a.status,'') AS status, a.waktu FROM members m
                   LEFT JOIN absensi a ON a.member_id=m.id AND a.event_id=? WHERE m.aktif=1 AND m.email NOT LIKE '%@demo.tujlc' ORDER BY m.nama""", (eid,))


def absensi_set(b):
    with _lock, conn() as c:
        if not b.get("status"):
            c.execute("DELETE FROM absensi WHERE event_id=? AND member_id=?", (b["event_id"], b["member_id"]))
        else:
            c.execute("INSERT INTO absensi(event_id,member_id,status,waktu) VALUES(?,?,?,?) ON CONFLICT(event_id,member_id) DO UPDATE SET status=excluded.status",
                      (b["event_id"], b["member_id"], b["status"], datetime.now().isoformat(timespec="seconds")))
    return {"ok": True}


def summary():
    with conn() as c:
        masuk = c.execute("SELECT COALESCE(SUM(nominal),0) FROM keuangan WHERE jenis='masuk'").fetchone()[0]
        keluar = c.execute("SELECT COALESCE(SUM(nominal),0) FROM keuangan WHERE jenis='keluar'").fetchone()[0]
        bulan = date.today().strftime("%Y-%m")
        anggota = c.execute("SELECT COUNT(*) FROM members WHERE aktif=1 AND email NOT LIKE '%@demo.tujlc'").fetchone()[0]
        lunas = c.execute("SELECT COUNT(*) FROM iuran WHERE bulan=? AND status='lunas'", (bulan,)).fetchone()[0]
        return {"saldo": masuk - keluar, "masuk": masuk, "keluar": keluar, "anggota": anggota, "pengurus": c.execute("SELECT COUNT(*) FROM members WHERE role='pengurus' AND email NOT LIKE '%@demo.tujlc'").fetchone()[0],
                "bulan": bulan, "iuran_lunas": lunas, "iuran_belum": anggota - lunas,
                "event_mendatang": c.execute("SELECT COUNT(*) FROM events WHERE tanggal>=?", (date.today().isoformat(),)).fetchone()[0],
                "kelas_menunggu": c.execute("SELECT COUNT(*) FROM kelas_daftar WHERE status='menunggu'").fetchone()[0],
                "pinjam_rencana": c.execute("SELECT COUNT(*) FROM pinjam_ruang WHERE status IN ('rencana','diajukan')").fetchone()[0],
                "kode_pengurus": get_setting(c, "kode_pengurus"), "iuran_nominal": int(get_setting(c, "iuran_nominal") or 10000), "kampus": KAMPUS}


def settings_save(b):
    with _lock, conn() as c:
        if b.get("regen_kode"):
            set_setting(c, "kode_pengurus", "PGR-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6)))
        if b.get("iuran_nominal"): set_setting(c, "iuran_nominal", str(int(b["iuran_nominal"])))
    init_code_file()
    return summary()


def init_code_file():
    with open(os.path.join(DATA, "KODE-PENGURUS.txt"), "w", encoding="utf-8") as f:
        f.write(f"Kode pendaftaran pengurus TUJLC: {admin_code()}\n")


def reset_member_code(b):
    """Pengurus membuatkan kode baru untuk anggota yang lupa kodenya."""
    kode = new_member_code(); salt = secrets.token_hex(16)
    with _lock, conn() as c:
        c.execute("UPDATE members SET kode_salt=?, kode_hash=? WHERE id=?", (salt, _hash(kode, salt), int(b["id"])))
        c.execute("DELETE FROM sessions WHERE member_id=?", (int(b["id"]),))
    return {"kode": kode}
