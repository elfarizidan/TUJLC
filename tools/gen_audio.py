"""Buat MP3 untuk semua teks Akademi ELCY (akademi-data.js) dan gabungkan ke audio.js.
Jalankan dari mana saja:  python tools/gen_audio.py   (butuh: pip install edge-tts json5)
"""
import asyncio, hashlib, json, os, re
import edge_tts, json5

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE = {"en": "en-US-JennyNeural", "ja": "ja-JP-NanamiNeural", "zh": "zh-CN-XiaoxiaoNeural", "fr": "fr-FR-DeniseNeural", "ar": "ar-SA-ZariyahNeural"}
NOSPACE = {"ja", "zh"}

src = open(os.path.join(ROOT, "akademi-data.js"), encoding="utf-8").read()
def block(name):
    m = re.search(rf"AK\.{name} = (\{{.*?\n\}});", src, re.S)
    return json5.loads(m.group(1))

texts = {k: set() for k in VOICE}
for k, cats in block("VOCAB").items():
    for s in cats.values():
        for e in s.split(";"):
            texts[k].add(e.split("|")[0])
for k, arr in block("SENT").items():
    for s in arr:
        tiles = s.split("|")[0].split("/")
        texts[k].add(("" if k in NOSPACE else " ").join(tiles))
for k, arr in block("IDIOM").items():
    for s in arr: texts[k].add(s.split("|")[0])
for k, arr in block("REG").items():
    for s in arr: texts[k].add(s.split("|")[1])
for k, scs in block("SIM").items():
    for sc in scs:
        for npc, opts in sc["turns"]:
            texts[k].add(npc.split("|")[0])
            for o in opts: texts[k].add(o[0])

aj = os.path.join(ROOT, "audio.js")
raw = open(aj, encoding="utf-8").read()
mapping = json.loads(raw[raw.index("{"): raw.rindex("}") + 1])

sem = asyncio.Semaphore(8)
async def one(k, t):
    name = hashlib.sha1(f"{k}|{t}".encode()).hexdigest()[:12] + ".mp3"
    rel = f"audio/{k}/{name}"; path = os.path.join(ROOT, rel)
    if not os.path.exists(path):
        async with sem:
            for attempt in range(3):
                try:
                    await edge_tts.Communicate(t.replace("…", ""), VOICE[k], rate="-12%").save(path); break
                except Exception:
                    await asyncio.sleep(2)
    if os.path.exists(path): mapping.setdefault(k, {})[t] = rel

async def main():
    for k in VOICE: os.makedirs(os.path.join(ROOT, "audio", k), exist_ok=True)
    await asyncio.gather(*(one(k, t) for k, ts in texts.items() for t in ts))
    with open(aj, "w", encoding="utf-8") as f:
        f.write("// Dibuat otomatis (edge-tts). teks -> file mp3\nwindow.AUDIO=" + json.dumps(mapping, ensure_ascii=False) + ";\n")
    print("total", sum(len(v) for v in mapping.values()), {k: len(v) for k, v in mapping.items()})

asyncio.run(main())
