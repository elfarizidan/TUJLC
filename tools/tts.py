import asyncio, hashlib, json, os, sys
import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEXTS = {"en":["Hello!","Nice to meet you.","Could you say that again, please?","I'm applying for the position of…","What does this word mean?","I'm not sure, but I think…","See you next Saturday!"],"ja":["こんにちは","はじめまして","よろしくおねがいします","ありがとうございます","すみません","わかりません","おやすみなさい","あ","い","う","え","お"],"zh":["你好","我叫…","这是什么？","谢谢","不客气","再见","妈","麻","马","骂"],"fr":["Bonjour","Bonjour !","Je m'appelle…","Enchanté(e)","Merci beaucoup","Je ne comprends pas","À samedi !","Paris","beaucoup","salut","trois"],"ar":["مرحبا","السلام عليكم","أنا طالب","ما اسمك؟","شكرا","إلى اللقاء","أنا","أنتَ","أنتِ","هو","هي","نحن"]}
VOICE = {"en": "en-US-JennyNeural", "ja": "ja-JP-NanamiNeural", "zh": "zh-CN-XiaoxiaoNeural", "fr": "fr-FR-DeniseNeural", "ar": "ar-SA-ZariyahNeural"}
# Teks yang diucapkan bisa beda dari yang ditampilkan
SPOKEN = {"Enchanté(e)": "Enchanté", "I'm applying for the position of…": "I'm applying for the position of", "我叫…": "我叫", "I'm not sure, but I think…": "I'm not sure, but I think", "Je m'appelle…": "Je m'appelle"}

async def main():
    mapping = {}
    for lang, items in TEXTS.items():
        os.makedirs(f"{ROOT}/audio/{lang}", exist_ok=True)
        for t in items:
            name = hashlib.sha1(f"{lang}|{t}".encode()).hexdigest()[:12] + ".mp3"
            path = f"{ROOT}/audio/{lang}/{name}"
            if not os.path.exists(path):
                await edge_tts.Communicate(SPOKEN.get(t, t), VOICE[lang], rate="-12%").save(path)
            mapping.setdefault(lang, {})[t] = f"audio/{lang}/{name}"
            print(lang, t, os.path.getsize(path))
    with open(f"{ROOT}/audio.js", "w", encoding="utf-8") as f:
        f.write("// Dibuat otomatis oleh tts.py (edge-tts). teks -> file mp3\nwindow.AUDIO=" + json.dumps(mapping, ensure_ascii=False) + ";\n")

asyncio.run(main())
