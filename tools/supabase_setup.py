"""Pindahkan data lama (SQLite lokal) ke Supabase.

Langkah:
  1) python tools/supabase_setup.py seed
       -> membuat data/supabase-seed.sql (periode, pengurus, kode pengurus).
          Tempel isinya di Supabase > SQL Editor > Run (SETELAH supabase/schema.sql).
          File ini berisi kode pengurus, jadi TIDAK ikut ke GitHub (folder data/ diabaikan).
  2) python tools/supabase_setup.py foto
       -> mengunggah foto pengurus (assets/pengurus) & foto anggota (assets/anggota)
          ke tabel privat lewat tujlc_api. Butuh window.SUPABASE di common.js sudah diisi.
"""
import base64, json, os, re, sqlite3, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, "data", "tujlc.db")


def lit(v):
    if v is None:
        return "null"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def foto_key(path):
    m = re.match(r"assets/pengurus/(p\d+)\.webp$", path or "")
    return f"pengurus/{m.group(1)}" if m else (path or "")


def seed():
    c = sqlite3.connect(DB); c.row_factory = sqlite3.Row
    out = ["-- Data awal TUJLC dari SQLite lokal (jalankan setelah schema.sql)", "begin;"]
    for k, v in c.execute("SELECT k, v FROM settings"):
        out.append(f"insert into tujlc.settings values ({lit(k)}, {lit(v)}) on conflict (k) do update set v = excluded.v;")
    out.append("delete from tujlc.periode; delete from tujlc.pengurus where member_id is null;")
    for r in c.execute("SELECT nama, mulai, selesai, catatan, aktif FROM periode ORDER BY id"):
        out.append("insert into tujlc.periode(nama, mulai, selesai, catatan, aktif) values (%s);" % ", ".join(lit(x) for x in r))
    for r in c.execute("SELECT nama, nim, jabatan, divisi, periode, foto, urut FROM pengurus WHERE member_id IS NULL ORDER BY id"):
        vals = [r["nama"], r["nim"], r["jabatan"], r["divisi"], r["periode"], foto_key(r["foto"]), r["urut"]]
        out.append("insert into tujlc.pengurus(nama, nim, jabatan, divisi, periode, foto, urut) values (%s);" % ", ".join(lit(x) for x in vals))
    out.append("commit;")
    path = os.path.join(ROOT, "data", "supabase-seed.sql")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(out) + "\n")
    print("Dibuat:", path)


def config():
    js = open(os.path.join(ROOT, "common.js"), encoding="utf-8").read()
    m = re.search(r'window\.SUPABASE\s*=\s*\{\s*url:\s*"([^"]*)",\s*key:\s*"([^"]*)"', js)
    if not m or not m.group(1) or not m.group(2):
        sys.exit("Isi dulu window.SUPABASE (url & key) di common.js.")
    return m.group(1).rstrip("/"), m.group(2)


def foto():
    url, key = config()
    kode = sqlite3.connect(DB).execute("SELECT v FROM settings WHERE k='kode_pengurus'").fetchone()[0]
    files = [("pengurus", os.path.join(ROOT, "assets", "pengurus")), ("galeri", os.path.join(ROOT, "assets", "anggota"))]
    headers = {"Content-Type": "application/json", "apikey": key}
    if key.startswith("eyJ"):
        headers["Authorization"] = "Bearer " + key
    n = 0
    for prefix, folder in files:
        for name in sorted(os.listdir(folder)):
            if not name.endswith(".webp"):
                continue
            data = "data:image/webp;base64," + base64.b64encode(open(os.path.join(folder, name), "rb").read()).decode()
            body = {"p_path": "/api/setup/foto", "p_body": {"kode_pengurus": kode, "key": f"{prefix}/{name[:-5]}", "data": data}}
            req = urllib.request.Request(url + "/rest/v1/rpc/tujlc_api", json.dumps(body).encode(), headers, method="POST")
            try:
                urllib.request.urlopen(req, timeout=60).read()
            except urllib.error.HTTPError as e:
                sys.exit(f"Gagal di {prefix}/{name}: {e.read().decode()[:300]}")
            n += 1
            print(f"  {prefix}/{name}")
    print(f"Selesai: {n} foto diunggah.")


if __name__ == "__main__":
    {"seed": seed, "foto": foto}.get(sys.argv[1] if len(sys.argv) > 1 else "", lambda: print(__doc__))()
