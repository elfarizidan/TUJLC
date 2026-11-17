"""Bangun kamus TUJLC dari database terbuka.

Sumber (semua lisensi terbuka, wajib atribusi):
  - JMdict (EDRDG, CC BY-SA 4.0) lewat jmdict-simplified           -> Jepang
  - CC-CEDICT (MDBG, CC BY-SA 4.0) + daftar HSK (drkameleon, MIT)  -> Mandarin
  - Wiktionary lewat kaikki.org (CC BY-SA 4.0 / GFDL)             -> Prancis, Arab, Indonesia (untuk arti Indonesia)
  - Open English WordNet (CC BY 4.0)                              -> Inggris
  - FrequencyWords (Hermit Dave, CC BY-SA 4.0)                    -> peringkat frekuensi

Hasil: kamus/<lang>-inti.json (kata tersering) dan kamus/<lang>-lengkap.json (sisanya).
Format entri: [kata, bacaan, kelas kata, arti Inggris, arti Indonesia, level, contoh]
Jalankan:  python tools/build_kamus.py   (butuh internet, ~1,6 GB data dibaca sambil diunduh)
"""
import gzip, io, json, os, re, sys, unicodedata, urllib.request, zipfile
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.environ.get("KAMUS_RAW", "D:/tujlc-kamus-raw")
OUT = os.path.join(ROOT, "kamus")
os.makedirs(RAW, exist_ok=True); os.makedirs(OUT, exist_ok=True)
UA = {"User-Agent": "tujlc-kamus-builder/1.0"}

def get(url, name):
    path = os.path.join(RAW, name)
    if not os.path.exists(path):
        print("unduh", name, flush=True)
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r, open(path, "wb") as f:
            while chunk := r.read(1 << 20): f.write(chunk)
    return path

def stream_jsonl(url, cache_name):
    """Baca JSONL baris demi baris; hasil saringan disimpan sebagai cache kecil."""
    print("baca", url, flush=True)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=300) as r:
        for line in io.TextIOWrapper(r, encoding="utf-8"):
            try: yield json.loads(line)
            except Exception: continue

def strip_marks(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if not unicodedata.combining(c))

POS_ID = {"noun": "nomina", "verb": "verba", "adj": "adjektiva", "adv": "adverbia", "pron": "pronomina", "prep": "preposisi",
          "conj": "konjungsi", "intj": "interjeksi", "num": "numeralia", "phrase": "frasa", "name": "nama", "particle": "partikel",
          "det": "determiner", "article": "artikel", "suffix": "sufiks", "prefix": "prefiks", "proverb": "peribahasa", "abbrev": "singkatan"}

def level_from_rank(rank):
    if rank is None: return ""
    for lim, lv in ((1000, "A1"), (2000, "A2"), (4000, "B1"), (8000, "B2"), (16000, "C1"), (30000, "C2")):
        if rank <= lim: return lv
    return ""

def freq(lang):
    base = f"https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/{lang}/{lang}"
    try: p = get(base + "_50k.txt", f"freq_{lang}.txt")
    except Exception: p = get(base + "_full.txt", f"freq_{lang}.txt")  # Jepang hanya punya daftar penuh
    ranks = {}
    for i, line in enumerate(open(p, encoding="utf-8"), 1):
        if i > 60000: break
        w = line.split(" ")[0].strip().lower()
        if w and w not in ranks: ranks[w] = i
    return ranks

# ---------- arti Indonesia lewat Wiktionary Indonesia (kata Indonesia -> arti Inggris, dibalik) ----------
def build_en2id():
    """Balik kamus Indonesia->Inggris dari Wiktionary. Tiap padanan diberi skor:
    arti pertama & bagian pertama glos lebih kuat, lalu kata Indonesia yang lebih sering dipakai."""
    cache = os.path.join(RAW, "en2id_v2.json")
    if os.path.exists(cache): return json.load(open(cache, encoding="utf-8"))
    idrank = freq("id")
    cand = defaultdict(dict)
    for e in stream_jsonl("https://kaikki.org/dictionary/Indonesian/kaikki.org-dictionary-Indonesian.jsonl", "id"):
        w = e.get("word", "")
        if not w or len(w.split()) > 2 or e.get("pos") == "name": continue
        for si, s in enumerate(e.get("senses", [])[:3]):
            tags = set(s.get("tags", []))
            if tags & {"archaic", "obsolete", "rare", "dialectal", "slang", "vulgar", "form-of", "alt-of", "regional", "colloquial"}: continue
            for g in s.get("glosses", [])[:1]:
                for pi, part in enumerate(re.split(r"[;,]", g)[:3]):
                    k = re.sub(r"\(.*?\)", "", part).strip().lower()
                    k = re.sub(r"^(to|a|an|the) ", "", k)
                    if not k or len(k.split()) > 3: continue
                    r = idrank.get(w.lower())
                    if r is None and si + pi > 0: continue  # kata jarang hanya diterima bila arti utamanya persis
                    # kata yang sering dipakai menang; kata di luar daftar frekuensi diberi penalti
                    score = si * 3 + pi * 2 + (8 if r is None else min(r, 50000) / 10000)
                    if w not in cand[k] or score < cand[k][w]: cand[k][w] = score
    en2id = {k: [w for w, _ in sorted(v.items(), key=lambda x: x[1])[:3]] for k, v in cand.items()}
    json.dump(en2id, open(cache, "w", encoding="utf-8"), ensure_ascii=False)
    return en2id

OVR = json.load(open(os.path.join(ROOT, "tools", "id_overrides.json"), encoding="utf-8"))  # padanan dicek manual

def id_for(glosses, en2id):
    """Ambil padanan dari arti pertama yang punya padanan, maksimal 2 kata."""
    for g in glosses[:2]:
        g = re.sub(r"\(.*?\)", "", g)
        for part in re.split(r"[;,/]", g)[:2]:
            k = re.sub(r"\(.*?\)", "", part).strip().lower()
            k = re.sub(r"^(to|a|an|the) ", "", k)
            if k in OVR: return "=" + OVR[k]  # "=" menandai padanan yang dicek manual
            if en2id.get(k): return en2id[k][0]
    return ""

def write(lang, entries, inti_keys):
    inti = [e for e in entries if e[0] in inti_keys]
    rest = [e for e in entries if e[0] not in inti_keys]
    for name, data in (("inti", inti), ("lengkap", rest)):
        with open(os.path.join(OUT, f"{lang}-{name}.json"), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(lang, "inti", len(inti), "lengkap", len(rest), flush=True)
    return len(inti), len(rest)

# ---------- Wiktionary (Prancis, Arab) ----------
def from_kaikki(lang_name, code, en2id):
    ranks = freq(code)
    best = {}
    for e in stream_jsonl(f"https://kaikki.org/dictionary/{lang_name}/kaikki.org-dictionary-{lang_name}.jsonl", code):
        w = e.get("word", "")
        if not w: continue
        senses = [s for s in e.get("senses", []) if s.get("glosses") and not ({"form-of", "alt-of"} & set(s.get("tags", [])))]
        if not senses or e.get("pos") in ("punct", "character", "symbol"): continue
        glosses = [s["glosses"][-1] for s in senses[:4]]
        rom = ""
        for f in e.get("forms", []):
            if "romanization" in f.get("tags", []): rom = f.get("form", ""); break
        if not rom and code == "fr":
            ipa = next((s.get("ipa") for s in e.get("sounds", []) if s.get("ipa")), "")
            rom = ipa
        ex = ""
        for s in senses[:3]:
            for x in s.get("examples", []):
                t, tr = x.get("text", ""), x.get("english") or x.get("translation", "")
                if t and tr and len(t) < 90: ex = f"{t} ⇒ {tr}"; break
            if ex: break
        key = strip_marks(w).lower() if code == "ar" else w.lower()
        rank = ranks.get(key) or ranks.get(w.lower())
        pos = POS_ID.get(e.get("pos", ""), e.get("pos", ""))
        entry = [w, rom, pos, "; ".join(glosses), id_for(glosses, en2id), level_from_rank(rank), ex, rank or 999999]
        prev = best.get((w, pos))
        if not prev: best[(w, pos)] = entry
    entries = sorted(best.values(), key=lambda x: (x[7], x[0]))
    inti = {e[0] for e in entries if e[7] <= 20000}
    for e in entries: e.pop()
    return write(code, entries, inti)

# ---------- JMdict (Jepang) ----------
def japanese(en2id):
    api = json.load(urllib.request.urlopen(urllib.request.Request("https://api.github.com/repos/scriptin/jmdict-simplified/releases/latest", headers=UA)))
    asset = next(a for a in api["assets"] if re.match(r"jmdict-eng-\d.*\.json\.zip$", a["name"]))
    p = get(asset["browser_download_url"], asset["name"])
    data = json.loads(zipfile.ZipFile(p).read(zipfile.ZipFile(p).namelist()[0]))
    ranks = freq("ja")
    POSJ = {"n": "nomina", "v1": "verba", "v5": "verba", "vs": "verba", "adj-i": "adjektiva", "adj-na": "adjektiva", "adv": "adverbia", "int": "interjeksi", "prt": "partikel", "pn": "pronomina", "num": "numeralia", "exp": "ungkapan"}
    entries, inti = [], set()
    for w in data["words"]:
        kanji = [k["text"] for k in w["kanji"]]
        kana = [k["text"] for k in w["kana"]]
        common = any(k.get("common") for k in w["kanji"] + w["kana"])
        head = kanji[0] if kanji else kana[0]
        senses = w["sense"][:4]
        glosses = ["/".join(g["text"] for g in s["gloss"][:3]) for s in senses if s["gloss"]]
        if not glosses: continue
        pos = ""
        for t in senses[0]["partOfSpeech"]:
            for k, v in POSJ.items():
                if t == k or t.startswith(k): pos = v; break
            if pos: break
        forms = kanji[:2] + kana[:2]
        if pos == "verba": forms += [x[:-1] for x in forms if len(x) > 1]  # subtitel memecah kata kerja: 食べる -> 食べ
        rank = min([ranks.get(x, 999999) for x in forms] or [999999])
        e = [head, kana[0] if kanji else "", pos, "; ".join(glosses), id_for(glosses, en2id), "umum" if common else "", "", rank]
        entries.append(e)
        if common: inti.add(head)
    entries.sort(key=lambda e: e[7])  # kata tersering dulu
    for e in entries: e.pop()
    return write("ja", entries, inti)

# ---------- CC-CEDICT + HSK (Mandarin) ----------
TONE = {"a": "āáǎà", "e": "ēéěè", "i": "īíǐì", "o": "ōóǒò", "u": "ūúǔù", "ü": "ǖǘǚǜ"}
def pinyin_mark(syl):
    syl = syl.replace("u:", "ü").replace("v", "ü")
    m = re.match(r"([a-zü]+)([1-5])$", syl, re.I)
    if not m: return syl
    s, t = m.group(1), int(m.group(2))
    if t == 5: return s
    low = s.lower()
    for v in ("a", "e"):
        if v in low: i = low.index(v); break
    else:
        i = low.index("o") if "ou" in low else max((low.rfind(v) for v in "iouü"), default=-1)
    if i < 0: return s
    return s[:i] + TONE[low[i]][t - 1] + s[i + 1:]

def chinese(en2id):
    hsk_p = get("https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.min.json", "hsk.json")
    hsk = {}
    for x in json.load(open(hsk_p, encoding="utf-8")):
        ls = x.get("l", [])
        n = [l[1:] for l in ls if l.startswith("n")]; o = [l[1:] for l in ls if l.startswith("o")]
        if n: hsk[x["s"]] = "HSK " + ("7–9" if n[0] == "7" else n[0])
        elif o: hsk[x["s"]] = "HSK " + o[0] + " (lama)"
    p = get("https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz", "cedict.txt.gz")
    best = {}
    for line in gzip.open(p, "rt", encoding="utf-8"):
        if line.startswith("#"): continue
        m = re.match(r"(\S+) (\S+) \[(.+?)\] /(.+)/", line)
        if not m: continue
        trad, simp, py, defs = m.groups()
        glosses = [d for d in defs.split("/") if d and not d.startswith(("variant of", "old variant", "see ", "CL:"))][:4]
        if not glosses: continue
        pinyin = " ".join(pinyin_mark(s) for s in py.split())
        if simp in best:
            old = best[simp]
            if old[1][:1].isupper() and py[:1].islower():  # entri lama nama/marga, ganti dengan kata umum
                old[1] = pinyin + (f" · {trad}" if trad != simp else "")
                old[3] = "; ".join(glosses) + "; " + old[3]
                old[4] = id_for(glosses, en2id)
            else:
                old[3] += "; " + "; ".join(glosses[:2])
            continue
        best[simp] = [simp, pinyin + (f" · {trad}" if trad != simp else ""), "", "; ".join(glosses), id_for(glosses, en2id), hsk.get(simp, ""), ""]
    zr = freq("zh_cn")
    entries = sorted(best.values(), key=lambda e: (zr.get(e[0], 999999), len(e[0])))
    return write("zh", entries, set(hsk))

# ---------- Open English WordNet (Inggris) ----------
def english(en2id):
    import wn
    try: en = wn.Wordnet("oewn")
    except Exception:
        wn.download("oewn"); en = wn.Wordnet("oewn")
    ranks = freq("en")
    POSE = {"n": "nomina", "v": "verba", "a": "adjektiva", "s": "adjektiva", "r": "adverbia"}
    best = {}
    for w in en.words():
        lemma = w.lemma()
        if not re.match(r"^[A-Za-z][A-Za-z' -]*$", lemma): continue
        syns = w.synsets()[:3]
        defs = [s.definition() for s in syns if s.definition()]
        if not defs: continue
        ex = next((x for s in syns for x in s.examples() if len(x) < 90), "")
        rank = ranks.get(lemma.lower())
        key = (lemma, w.pos)
        if key in best: continue
        best[key] = [lemma, "", POSE.get(w.pos, w.pos), "; ".join(defs), ("=" + OVR[lemma.lower()]) if lemma.lower() in OVR else (en2id.get(lemma.lower()) or [""])[0], level_from_rank(rank), ex, rank or 999999]
    entries = sorted(best.values(), key=lambda x: (x[7], x[0]))
    inti = {e[0] for e in entries if e[7] <= 20000}
    for e in entries: e.pop()
    return write("en", entries, inti)

if __name__ == "__main__":
    which = sys.argv[1:] or ["ja", "zh", "en", "fr", "ar"]
    en2id = build_en2id()
    print("en2id", len(en2id), flush=True)
    stats = {}
    for k in which:
        stats[k] = {"ja": japanese, "zh": chinese, "en": english, "fr": lambda m: from_kaikki("French", "fr", m), "ar": lambda m: from_kaikki("Arabic", "ar", m)}[k](en2id)
    print("SELESAI", stats)
