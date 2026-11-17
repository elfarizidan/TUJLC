"""Bangun peta kota asli untuk game Keliling Dunia ELCY dari OpenStreetMap.

Data © OpenStreetMap contributors, lisensi ODbL (atribusi wajib, tampil di game).
Jalankan: python -X utf8 tools/build_osm.py [en ja zh fr ar]
Data mentah disimpan di D:\\tujlc-osm-raw, hasil di dunia/<kode>.json.
"""
import json, math, os, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = Path(os.environ.get("TUJLC_OSM_RAW", r"D:\tujlc-osm-raw"))
OUT = ROOT / "dunia"
API = "https://overpass-api.de/api/interpreter"

# pusat peta, setengah lebar (meter), landmark (lat, lon) yang dimodel sendiri
CITIES = {
    "en": {"c": (51.5009, -0.1262), "H": 450, "lm": [(51.50073, -0.12463)], "lv": 3.4, "dh": 16},
    "ja": {"c": (35.6573, 139.7468), "H": 450, "lm": [(35.65858, 139.74543)], "lv": 3.3, "dh": 20},
    "zh": {"c": (39.9048, 116.3912), "H": 450, "lm": [(39.90745, 116.39126)], "lv": 3.3, "dh": 12},
    "fr": {"c": (48.8563, 2.2975), "H": 450, "lm": [(48.85837, 2.29448)], "lv": 3.2, "dh": 20},
    "ar": {"c": (29.9768, 31.1365), "H": 520, "lm": [(29.97917, 31.13417), (29.97611, 31.13083), (29.97250, 31.12806), (29.97528, 31.13757)], "lv": 3.0, "dh": 9},
}
ROAD_W = {"motorway": 16, "trunk": 15, "primary": 13, "secondary": 11, "tertiary": 9, "unclassified": 7, "residential": 7,
          "living_street": 6, "service": 4.5, "motorway_link": 8, "trunk_link": 8, "primary_link": 8, "secondary_link": 7, "tertiary_link": 7,
          "pedestrian": 8, "footway": 2.6, "path": 2.2, "cycleway": 2.4, "track": 3.5}
WALK = {"pedestrian", "footway", "path", "cycleway", "track"}


def fetch(k, cfg):
    RAW.mkdir(parents=True, exist_ok=True)
    f = RAW / f"{k}.json"
    if f.exists():
        return json.loads(f.read_text(encoding="utf8"))
    lat, lon = cfg["c"]; H = cfg["H"] + 60
    dl, dn = H / 110540, H / (111320 * math.cos(math.radians(lat)))
    bb = f"{lat - dl},{lon - dn},{lat + dl},{lon + dn}"
    q = f"""[out:json][timeout:240];
(
 way["building"]({bb}); relation["building"]({bb});
 way["highway"]({bb});
 way["natural"="water"]({bb}); relation["natural"="water"]({bb}); way["waterway"="riverbank"]({bb}); relation["waterway"="riverbank"]({bb});
 way["leisure"~"^(park|garden|pitch)$"]({bb}); relation["leisure"="park"]({bb});
 way["landuse"~"^(grass|forest|recreation_ground|village_green|cemetery)$"]({bb});
 way["natural"~"^(wood|scrub|grassland|sand|bare_rock)$"]({bb});
 way["railway"="rail"]({bb});
 node["natural"="tree"]({bb});
 node["amenity"~"^(cafe|marketplace)$"]({bb}); way["amenity"="marketplace"]({bb});
 node["tourism"="hotel"]({bb}); way["tourism"="hotel"]({bb});
 node["shop"~"^(convenience|greengrocer|supermarket|bakery|souvenir|gift|kiosk)$"]({bb});
 node["office"]({bb}); way["office"]({bb});
);
out geom;"""
    for attempt in range(4):
        try:
            req = urllib.request.Request(API, data=urllib.parse.urlencode({"data": q}).encode(), headers={"User-Agent": "tujlc-dunia-builder/1.0 (campus language club game)"})
            data = json.loads(urllib.request.urlopen(req, timeout=300).read())
            f.write_text(json.dumps(data), encoding="utf8")
            return data
        except Exception as e:
            print("  ulang", attempt + 1, e); time.sleep(20 * (attempt + 1))
    raise SystemExit("Gagal mengambil data " + k)


def num(v):
    m = re.match(r"\s*([\d.]+)", str(v or ""))
    return float(m.group(1)) if m else None


def main(keys):
    OUT.mkdir(exist_ok=True)
    for k in keys:
        cfg = CITIES[k]; lat0, lon0 = cfg["c"]; H = cfg["H"]
        kx = 111320 * math.cos(math.radians(lat0)); kz = 110540
        P = lambda la, lo: (round((lo - lon0) * kx, 1), round(-(la - lat0) * kz, 1))
        print(k, "ambil data…"); data = fetch(k, cfg)
        lms = [P(a, b) for a, b in cfg["lm"]]

        def clip(ring):  # Sutherland–Hodgman terhadap kotak peta
            pts = ring
            for axis, sign in ((0, 1), (0, -1), (1, 1), (1, -1)):
                if not pts: break
                lim = H * sign; out = []
                inside = lambda p: p[axis] * sign <= H
                for i in range(len(pts)):
                    a, b = pts[i - 1], pts[i]
                    ia, ib = inside(a), inside(b)
                    if ib:
                        if not ia: out.append(cut(a, b, axis, lim))
                        out.append(b)
                    elif ia: out.append(cut(a, b, axis, lim))
                pts = out
            return pts

        def cut(a, b, axis, lim):
            t = (lim - a[axis]) / ((b[axis] - a[axis]) or 1e-9)
            return (round(a[0] + (b[0] - a[0]) * t, 1), round(a[1] + (b[1] - a[1]) * t, 1))

        def ring_of(geom):
            pts = [P(g["lat"], g["lon"]) for g in geom]
            if len(pts) > 1 and pts[0] == pts[-1]: pts = pts[:-1]
            return pts

        def stitch(ways):  # gabungkan potongan garis jadi cincin tertutup
            ways = [w[:] for w in ways if len(w) > 1]; rings = []
            while ways:
                cur = ways.pop(0)
                changed = True
                while changed and cur[0] != cur[-1]:
                    changed = False
                    for i, w in enumerate(ways):
                        if w[0] == cur[-1]: cur += w[1:]
                        elif w[-1] == cur[-1]: cur += w[::-1][1:]
                        elif w[-1] == cur[0]: cur = w + cur[1:]
                        elif w[0] == cur[0]: cur = w[::-1] + cur[1:]
                        else: continue
                        ways.pop(i); changed = True; break
                if len(cur) > 3: rings.append(cur[:-1] if cur[0] == cur[-1] else cur)
            return rings

        def polys(el):  # -> list of (outer, [holes])
            if el["type"] == "way":
                if "geometry" not in el: return []
                return [(ring_of(el["geometry"]), [])]
            outs = stitch([[P(g["lat"], g["lon"]) for g in m["geometry"]] for m in el.get("members", []) if m.get("role") == "outer" and "geometry" in m])
            ins = stitch([[P(g["lat"], g["lon"]) for g in m["geometry"]] for m in el.get("members", []) if m.get("role") == "inner" and "geometry" in m])
            res = []
            for o in outs:
                xs = [p[0] for p in o]; zs = [p[1] for p in o]
                hs = [i for i in ins if min(xs) <= i[0][0] <= max(xs) and min(zs) <= i[0][1] <= max(zs)]
                res.append((o, hs))
            return res

        flat = lambda r: [v for p in r for v in p]
        area = lambda r: abs(sum(r[i - 1][0] * r[i][1] - r[i][0] * r[i - 1][1] for i in range(len(r)))) / 2
        B, R, W, G, S, T, RAIL = [], [], [], [], [], [], []
        POI = {"cafe": [], "hotel": [], "market": [], "office": [], "shop": []}
        for el in data["elements"]:
            t = el.get("tags", {})
            if "building" in t and el["type"] in ("way", "relation"):
                if t.get("building") in ("roof", "no") or t.get("location") == "underground": continue
                for o, hs in polys(el):
                    o = clip(o)
                    if len(o) < 3 or area(o) < 8: continue
                    cx = sum(p[0] for p in o) / len(o); cz = sum(p[1] for p in o) / len(o)
                    if any(math.hypot(cx - a, cz - b) < (150 if k == "ar" else 40 if k in ("fr", "ja") else 18) for a, b in lms): continue
                    h = num(t.get("height")) or ((num(t.get("building:levels")) or 0) * cfg["lv"] + (2 if t.get("building:levels") else 0)) or None
                    mh = num(t.get("min_height")) or 0
                    typ = 1 if t.get("building") in ("church", "cathedral", "mosque", "temple", "shrine", "palace", "government", "civic", "museum") or t.get("historic") else 0
                    hs = [h_ for h_ in (clip(x) for x in hs) if len(h_) > 2]
                    B.append([round(h, 1) if h else 0, round(mh, 1), typ, flat(o)] + ([[flat(x) for x in hs]] if hs else []))
            if "highway" in t and el["type"] == "way" and "geometry" in el:
                hw = t["highway"]
                if hw not in ROAD_W or t.get("tunnel") in ("yes", "building_passage") or t.get("layer", "0").startswith("-"): continue
                pts = [P(g["lat"], g["lon"]) for g in el["geometry"]]
                if all(abs(x) > H + 40 or abs(z) > H + 40 for x, z in pts): continue
                w = num(t.get("width")) if hw not in WALK else None
                R.append([round(min(w, 30) if w else ROAD_W[hw], 1), 1 if hw in WALK else 0, 1 if t.get("bridge") else 0, flat(pts)])
            if el["type"] in ("way", "relation") and ("geometry" in el or "members" in el):
                water = t.get("natural") == "water" or t.get("waterway") == "riverbank"
                green = t.get("leisure") in ("park", "garden", "pitch") or t.get("landuse") in ("grass", "forest", "recreation_ground", "village_green", "cemetery") or t.get("natural") in ("wood", "scrub", "grassland")
                sand = t.get("natural") in ("sand", "bare_rock")
                if water or green or sand:
                    for o, hs in polys(el):
                        o = clip(o)
                        if len(o) > 2 and area(o) > 30:
                            (W if water else G if green else S).append([flat(o)] + ([[flat(clip(x)) for x in hs if len(clip(x)) > 2]] if hs else []))
                if t.get("railway") == "rail" and el["type"] == "way" and t.get("tunnel") != "yes":
                    RAIL.append(flat([P(g["lat"], g["lon"]) for g in el["geometry"]]))
            if el["type"] == "node":
                x, z = P(el["lat"], el["lon"])
                if abs(x) > H or abs(z) > H: continue
                if t.get("natural") == "tree": T.append([x, z])
                if t.get("amenity") == "cafe": POI["cafe"].append([x, z])
                if t.get("amenity") == "marketplace": POI["market"].append([x, z])
                if t.get("tourism") == "hotel": POI["hotel"].append([x, z])
                if "office" in t: POI["office"].append([x, z])
                if "shop" in t: POI["shop"].append([x, z])
            if el["type"] == "way" and "geometry" in el and (t.get("tourism") == "hotel" or "office" in t or t.get("amenity") == "marketplace"):
                g = el["geometry"]; x, z = P(sum(p["lat"] for p in g) / len(g), sum(p["lon"] for p in g) / len(g))
                if abs(x) < H and abs(z) < H:
                    POI["hotel" if t.get("tourism") == "hotel" else "market" if t.get("amenity") == "marketplace" else "office"].append([x, z])
        if len(T) > 2500: T = T[::math.ceil(len(T) / 2500)]
        out = {"H": H, "lm": lms, "b": B, "r": R, "w": W, "g": G, "s": S, "t": T, "rail": RAIL, "poi": POI, "dh": cfg["dh"]}
        f = OUT / f"{k}.json"
        f.write_text(json.dumps(out, separators=(",", ":")), encoding="utf8")
        print(f"  {k}: {len(B)} gedung, {len(R)} jalan, {len(W)} air, {len(G)} hijau, {len(T)} pohon, POI " + ", ".join(f"{a}={len(b)}" for a, b in POI.items()) + f" → {f.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1:] or list(CITIES))
