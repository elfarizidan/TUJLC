"""Server lokal Akademi ELCY.

Menyajikan situs TUJLC + endpoint AI:
  GET  /api/status          -> {"ai": bool, "tts": bool}
  POST /api/chat            -> tutor percakapan (Claude)
  POST /api/grade           -> menilai foto tugas tulis di buku (Claude vision)
  GET  /api/tts?lang=&text= -> MP3 suara neural (edge-tts), di-cache

Jalankan dari folder web:  python tools/ai_server.py  [--port 5517]
API key dibaca dari environment variable ANTHROPIC_API_KEY (jangan ditulis di file).
"""
import argparse
import asyncio
import base64
import hashlib
import json
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "tools" / ".tts-cache"
MODEL = "claude-opus-5-5"
VOICE = {"en": "en-US-JennyNeural", "ja": "ja-JP-NanamiNeural", "zh": "zh-CN-XiaoxiaoNeural",
         "fr": "fr-FR-DeniseNeural", "ar": "ar-SA-ZariyahNeural", "id": "id-ID-GadisNeural"}

try:
    import anthropic
except Exception as e:  # SDK belum terpasang
    anthropic = None
    print("[AI] Anthropic SDK belum terpasang:", e)

try:
    import edge_tts
except Exception:
    edge_tts = None

_CLIENT = {"key": None, "client": None}


def read_key() -> str:
    """Key dari environment; kalau tidak ada, dari pengaturan Windows (HKCU\\Environment),
    jadi key yang baru dipasang lewat tools/pasang-key-ai.ps1 langsung terbaca tanpa restart."""
    key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not key and sys.platform == "win32":
        try:
            import winreg
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as k:
                key = winreg.QueryValueEx(k, "ANTHROPIC_API_KEY")[0]
        except OSError:
            key = ""
    return key.strip()


def get_client():
    if anthropic is None:
        return None
    key = read_key()
    if not key:
        return None
    if _CLIENT["key"] != key:  # key baru atau berganti
        _CLIENT.update(key=key, client=anthropic.Anthropic(api_key=key))
    return _CLIENT["client"]


def has_credentials() -> bool:
    return get_client() is not None


CHAT_SCHEMA = {
    "type": "object",
    "properties": {
        "reply": {"type": "string", "description": "Balasan ELCY dalam bahasa target"},
        "reading": {"type": "string", "description": "Romanisasi (romaji/pinyin/transliterasi) atau string kosong"},
        "translation_id": {"type": "string", "description": "Terjemahan balasan ke bahasa Indonesia"},
        "correction_id": {"type": "string", "description": "Koreksi pesan terakhir pengguna dalam bahasa Indonesia, kosong jika tidak ada kesalahan"},
        "tip_id": {"type": "string", "description": "Satu tips singkat dalam bahasa Indonesia, boleh kosong"},
    },
    "required": ["reply", "reading", "translation_id", "correction_id", "tip_id"],
    "additionalProperties": False,
}

GRADE_SCHEMA = {
    "type": "object",
    "properties": {
        "transcription": {"type": "string"},
        "items": {"type": "array", "items": {
            "type": "object",
            "properties": {
                "task": {"type": "string"},
                "score": {"type": "integer"},
                "feedback": {"type": "string"},
                "corrections": {"type": "string"},
            },
            "required": ["task", "score", "feedback", "corrections"],
            "additionalProperties": False,
        }},
        "overall_score": {"type": "integer"},
        "cefr_estimate": {"type": "string"},
        "verdict": {"type": "string"},
        "next_steps": {"type": "string"},
    },
    "required": ["transcription", "items", "overall_score", "cefr_estimate", "verdict", "next_steps"],
    "additionalProperties": False,
}

STYLE = {
    "baku": "Use standard, polite, textbook register.",
    "santai": "Use natural casual speech and common slang that young native speakers really use; keep it friendly.",
    "dialek": "Use a well-known regional dialect or accent of this language (e.g. Kansai-ben, Egyptian Arabic, Québécois, Beijing or Taiwanese Mandarin, British/Australian English) and mention which one in tip_id the first time.",
    "campur": "Mix standard and casual register the way native speakers do, and point out register shifts in tip_id.",
}

LEVEL = {
    "A1": "Absolute beginner: very short sentences, the most common words, present tense only.",
    "A2": "Elementary: short everyday sentences, simple past and future.",
    "B1": "Intermediate: connected sentences about daily life and experiences.",
    "B2": "Upper intermediate: opinions, comparisons, some idioms, natural pace.",
    "C1": "Advanced: nuanced, formal and informal registers, idioms, complex grammar.",
    "C2": "Near-native: rich vocabulary, wordplay, cultural references, subtle register control.",
}


def call_claude(system: str, messages: list, schema: dict, effort: str) -> dict:
    resp = get_client().beta.messages.create(
        model=MODEL,
        max_tokens=16000,
        betas=["server-side-fallback-2026-07-01"],
        system=system,
        messages=messages,
        output_config={"effort": effort, "format": {"type": "json_schema", "schema": schema}},
        extra_body={"fallbacks": "default"},
    )
    if resp.stop_reason == "refusal":
        raise RuntimeError("Permintaan ditolak oleh filter keamanan model. Coba ubah kalimatnya.")
    text = next((b.text for b in resp.content if b.type == "text"), "")
    return json.loads(text)


def chat(body: dict) -> dict:
    lang_name = body.get("langName", "English")
    level = body.get("level", "A1")
    system = (
        f"You are ELCY, the friendly globe mascot of TUJLC (Telkom University Language Club) and a conversation tutor. "
        f"The learner is an Indonesian university student practising {lang_name}. "
        f"Role-play scenario: {body.get('scenario', 'free chat')}. Stay in character for the scenario and keep the conversation going by ending with a question or prompt.\n"
        f"Level {level}: {LEVEL.get(level, LEVEL['A1'])}\n"
        f"Register: {STYLE.get(body.get('style'), STYLE['baku'])}\n"
        "Write `reply` only in the target language, 1-3 sentences. Put romanization in `reading` for Japanese, Mandarin and Arabic, otherwise an empty string. "
        "In `correction_id`, gently correct the learner's most recent message in Indonesian (grammar, word choice, register); leave it empty if it was fine or if there is no learner message yet. "
        "If there is no learner message yet, open the scenario yourself."
    )
    msgs = [m for m in body.get("messages", []) if m.get("content")]
    if not msgs or msgs[0]["role"] != "user":
        msgs = [{"role": "user", "content": "(Mulai percakapan.)"}] + msgs
    return call_claude(system, msgs, CHAT_SCHEMA, "low")


def grade(body: dict) -> dict:
    images = body.get("images", [])[:4]
    if not images:
        raise ValueError("Tidak ada foto.")
    content = []
    for i, data_url in enumerate(images, 1):
        header, b64 = data_url.split(",", 1)
        media = header.split(";")[0].split(":")[1] if ":" in header else "image/jpeg"
        content.append({"type": "text", "text": f"Halaman {i}:"})
        content.append({"type": "image", "source": {"type": "base64", "media_type": media, "data": b64}})
    tasks = "\n".join(f"{i}. {t}" for i, t in enumerate(body.get("tasks", []), 1))
    content.append({"type": "text", "text": (
        f"Nama anggota: {body.get('member') or '-'}\nBahasa target: {body.get('langName')}\n"
        f"Level tugas: {body.get('levelName')} ({body.get('level')})\nJudul: {body.get('title')}\nSoal:\n{tasks}"
    )})
    level = body.get("level", "A1")
    system = (
        "You grade handwritten language homework for TUJLC, a university language club. The photos show pages of the member's notebook. "
        "First transcribe exactly what is written (keep the original script; mark unreadable parts as [tidak terbaca]). "
        f"Then grade each task from 0-100 for a learner at CEFR {level}: {LEVEL.get(level, '')} "
        "Scale strictness to the level: at A1-A2 reward correct vocabulary, script and meaning and be lenient on grammar; "
        "at B1-B2 also check grammar, tense and coherence; at C1-C2 also judge register, idiom use, nuance and style. "
        "If a task was not attempted, give 0 and say so. If the photos are not homework or are unreadable, say that in verdict and give 0. "
        "Write feedback, corrections, verdict and next_steps in Indonesian, warm and specific. "
        "cefr_estimate is your estimate of the level shown in this work (A1..C2). overall_score is the weighted average."
    )
    return call_claude(system, [{"role": "user", "content": content}], GRADE_SCHEMA, "medium")


def tts(lang: str, text: str) -> Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / (hashlib.sha1(f"{lang}|{text}".encode()).hexdigest()[:16] + ".mp3")
    if not path.exists():
        asyncio.run(edge_tts.Communicate(text[:400], VOICE.get(lang, VOICE["en"]), rate="-8%").save(str(path)))
    return path


import db, excel  # noqa: E402  (database anggota & ekspor Excel)
from http.cookies import SimpleCookie
from datetime import date as _date

PRIVATE_STATIC = ("/uploads/", "/assets/anggota/", "/assets/pengurus/")  # hanya untuk yang sudah masuk
BLOCKED = ("/tools/", "/data/", "/_raw/")
COOKIE = "tujlc_sess"
XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def log_message(self, fmt, *args):  # jangan cetak setiap request
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def _json(self, code, data, cookie=None):
        raw = json.dumps(data, ensure_ascii=False, default=str).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        if cookie is not None:
            age = 30 * 86400 if cookie else 0
            self.send_header("Set-Cookie", f"{COOKIE}={cookie}; Path=/; HttpOnly; SameSite=Lax; Max-Age={age}")
        self.end_headers()
        self.wfile.write(raw)

    def _file(self, data, ctype, name=None):
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        if name:
            self.send_header("Content-Disposition", f'attachment; filename="{name}"')
        self.end_headers()
        self.wfile.write(data)

    def _token(self):
        c = SimpleCookie(self.headers.get("Cookie", ""))
        return c[COOKIE].value if COOKIE in c else None

    def _me(self):
        return db.session_member(self._token())

    def _body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length > 25 * 1024 * 1024:
            raise db.ApiError("File terlalu besar.", 413)
        return json.loads(self.rfile.read(length) or b"{}")

    def do_GET(self):
        u = urlparse(self.path)
        q = {k: v[0] for k, v in parse_qs(u.query).items()}
        if u.path.startswith(BLOCKED):
            return self.send_error(404)
        if u.path.startswith(PRIVATE_STATIC) and not self._me():
            return self.send_error(403)
        try:
            if u.path == "/api/status":
                return self._json(200, {"ai": has_credentials(), "tts": edge_tts is not None, "db": True})
            if u.path == "/api/tts":
                text, lang = q.get("text", ""), q.get("lang", "en")[:2]
                if not text or edge_tts is None:
                    return self.send_error(400)
                return self._file(tts(lang, text).read_bytes(), "audio/mpeg")
            if u.path == "/api/me":
                m = self._me()
                return self._json(200, {"me": db.public_member(m) if m else None})
            if u.path.startswith("/api/"):
                m = self._me()
                if not m:
                    raise db.ApiError("Silakan masuk sebagai anggota.", 401)
                if u.path == "/api/home":
                    return self._json(200, db.member_home(m))
                if u.path == "/api/leaderboard":
                    return self._json(200, {"top": db.leaderboard(q.get("game", ""), q.get("lang", ""))})
                if u.path == "/api/room/state":
                    return self._json(200, db.room_state(m, q.get("code", "")))
                if u.path.startswith("/api/admin/"):
                    if m["role"] != "pengurus":
                        raise db.ApiError("Khusus pengurus.", 403)
                    part = u.path[len("/api/admin/"):]
                    if part == "summary":
                        return self._json(200, db.summary())
                    if part == "iuran":
                        return self._json(200, {"rows": db.iuran_bulan(q.get("bulan", ""))})
                    if part == "absensi":
                        return self._json(200, {"rows": db.absensi_event(int(q.get("event", 0)))})
                    if part.startswith("template/"):
                        key = part.split("/", 1)[1].removesuffix(".xlsx")
                        if key not in excel.TEMPLATES:
                            raise db.ApiError("Template tidak ada.", 404)
                        return self._file(excel.TEMPLATES[key][1](), XLSX, f"Template-{key}-TUJLC.xlsx")
                    if part.startswith("export/"):
                        key = part.split("/", 1)[1].removesuffix(".xlsx")
                        return self._file(excel.export(key), XLSX, f"TUJLC-{key}-{_date.today()}.xlsx")
                    return self._json(200, {"rows": db.admin_list(part, q)})
                raise db.ApiError("Tidak ditemukan.", 404)
        except db.ApiError as e:
            return self._json(e.code, {"error": str(e)})
        return super().do_GET()

    def do_POST(self):
        u = urlparse(self.path)
        try:
            body = self._body()
            if u.path == "/api/register":
                return self._json(200, db.register(body))
            if u.path == "/api/login":
                token, me = db.login(body)
                return self._json(200, {"me": me}, cookie=token)
            if u.path == "/api/demo":
                local = self.client_address[0] in ("127.0.0.1", "::1")
                token, me = db.demo_login(body.get("role", "anggota"), local)
                return self._json(200, {"me": me}, cookie=token)
            if u.path == "/api/logout":
                db.logout(self._token())
                return self._json(200, {"ok": True}, cookie="")
            m = self._me()
            if not m:
                raise db.ApiError("Silakan masuk sebagai anggota.", 401)
            if u.path in ("/api/chat", "/api/grade"):
                if not has_credentials():
                    raise db.ApiError("AI belum aktif: pasang key dengan tools/pasang-key-ai.ps1.", 503)
                return self._json(200, chat(body) if u.path == "/api/chat" else grade(body))
            routes = {"/api/pengurus/daftar": db.register_pengurus, "/api/kelas": db.daftar_kelas, "/api/absen": db.absen_mandiri,
                      "/api/score": db.add_score, "/api/room/create": db.room_create, "/api/room/join": db.room_join,
                      "/api/room/start": db.room_start, "/api/room/answer": db.room_answer}
            if u.path in routes:
                return self._json(200, routes[u.path](m, body))
            if u.path.startswith("/api/admin/"):
                if m["role"] != "pengurus":
                    raise db.ApiError("Khusus pengurus.", 403)
                part = u.path[len("/api/admin/"):]
                if part == "iuran":
                    return self._json(200, db.iuran_set(body))
                if part == "absensi":
                    return self._json(200, db.absensi_set(body))
                if part == "settings":
                    return self._json(200, db.settings_save(body))
                if part == "reset-kode":
                    return self._json(200, db.reset_member_code(body))
                if part.endswith("/delete"):
                    return self._json(200, db.admin_delete(part[:-7], body))
                return self._json(200, db.admin_save(part, body))
            raise db.ApiError("Tidak ditemukan.", 404)
        except db.ApiError as e:
            return self._json(e.code, {"error": str(e)})
        except json.JSONDecodeError:
            return self._json(400, {"error": "Data tidak valid."})
        except Exception as e:
            if anthropic is not None and isinstance(e, anthropic.APIError):
                if isinstance(e, anthropic.AuthenticationError):
                    return self._json(401, {"error": "API key tidak valid."})
                if isinstance(e, anthropic.RateLimitError):
                    return self._json(429, {"error": "Terlalu banyak permintaan, coba lagi sebentar."})
                if isinstance(e, anthropic.APIConnectionError):
                    return self._json(502, {"error": "Tidak bisa terhubung ke API. Cek internet."})
                return self._json(502, {"error": f"API error: {e}"})
            if isinstance(e, (ValueError, KeyError, RuntimeError, TypeError)):
                return self._json(400, {"error": str(e)})
            raise


def lan_ip():
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=5517)
    ap.add_argument("--lan", action="store_true", help="buka untuk HP/laptop lain di WiFi yang sama (mabar)")
    a = ap.parse_args()
    db.init()
    host = "0.0.0.0" if a.lan else "127.0.0.1"
    print(f"TUJLC: http://localhost:{a.port} | AI: {'aktif' if has_credentials() else 'belum aktif'} | TTS: {'aktif' if edge_tts else '-'}", flush=True)
    if a.lan and lan_ip():
        print(f"Anggota di WiFi yang sama buka: http://{lan_ip()}:{a.port}", flush=True)
    print(f"Kode pendaftaran pengurus: {os.path.join(db.DATA, 'KODE-PENGURUS.txt')}", flush=True)
    ThreadingHTTPServer((host, a.port), Handler).serve_forever()


if __name__ == "__main__":
    sys.exit(main())
