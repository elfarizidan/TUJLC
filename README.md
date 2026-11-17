# Web TUJLC

Situs statis klub bahasa TUJLC (Telkom University Language Club). Tidak perlu database atau build.

## Database online (Supabase), sejak 17 November 2026

Web online (Firebase Hosting) memakai database **Supabase (Postgres)**, jadi area anggota, dasbor pengurus, Akademi, Kamus, Arena, dan game Dunia bisa dipakai tanpa server Python.

- `supabase/schema.sql`: semua tabel (schema `tujlc`, tertutup dari luar) dan satu fungsi pintu `public.tujlc_api` yang mengecek login, peran pengurus, dan validasi. Isinya sama dengan aturan `tools/db.py`.
- `common.js`: isi `window.SUPABASE = { url, key }` dengan Project URL dan kunci anon/publishable dari Supabase. Kunci ini memang publik. Kalau dikosongkan, web kembali memakai server lokal `tools/ai_server.py`.
- `excel.js`: template dan ekspor Excel dibuat langsung di browser (ExcelJS), pengganti `tools/excel.py`.
- `tools/supabase_setup.py seed`: membuat `data/supabase-seed.sql` (periode, pengurus, kode pengurus) dari SQLite lama. File ini rahasia dan tidak ikut ke GitHub.
- `tools/supabase_setup.py foto`: mengunggah foto pengurus dan foto anggota ke tabel privat. Foto ini tidak lagi ada di hosting publik.

Pemasangan: SQL Editor di Supabase → jalankan `supabase/schema.sql`, lalu `data/supabase-seed.sql` → isi `window.SUPABASE` → `python tools/supabase_setup.py foto` → commit & push.

Catatan: tamu pengurus dimatikan di web online (data pribadi anggota). Chat AI dan penilaian buku tetap butuh `tools/ai_server.py` + API key. Proyek Supabase gratis akan dijeda kalau 7 hari tidak dipakai; buka dasbor Supabase untuk menyalakan lagi.

## Halaman

| File | Isi | Akses |
|---|---|---|
| `index.html` | Beranda: bahasa, daftar event, game tebak bahasa, ELCY Shop, FAQ | Publik |
| `event.html?e=<slug>` | Cerita + galeri foto per event | Publik (link album Drive hanya untuk anggota) |
| `bahasa.html?l=en/ja/zh/fr/ar` | Foto kelas, cara mengajar, mini pelajaran, tombol dengar pelafalan | Publik |
| `anggota.html` | Kartu latihan, progres, album lengkap, foto anggota, brand kit, folder tim | Anggota (pakai kode) |

## Kode anggota

> **Status 8 November 2026: gerbang kode DIMATIKAN.** Area anggota bisa dibuka siapa saja karena kode resmi belum dibuat. Untuk menyalakan lagi, ubah `MEMBER_GATE = false` menjadi `true` di `common.js`, lalu ganti angka `?v=` di tag script semua file HTML supaya browser mengambil versi baru.

Kode cadangan (dipakai kalau gerbang dinyalakan): **ELCY-5C38B2** (huruf besar/kecil tidak berpengaruh).

Bagikan hanya di grup anggota. Untuk mengganti kode:

1. Buat kode baru, misalnya `ELCY-NEXTGEN26`.
2. Hitung SHA-256 dari kode itu dalam HURUF BESAR. Di PowerShell:
   `python -c "import hashlib;print(hashlib.sha256(b'ELCY-NEXTGEN26').hexdigest())"`
3. Tempel hasilnya ke `MEMBER_HASH` di `common.js`.

**Penting:** ini gerbang sederhana di sisi browser. Cukup untuk memisahkan tampilan publik dan anggota, tapi orang yang paham kode bisa melewatinya, dan link Drive-nya sendiri tetap bisa dibuka siapa pun yang punya link. Kalau butuh login sungguhan per anggota, perlu backend (misalnya Flask + database atau Firebase Auth).

## Mengubah isi

- **Link sosial media dan formulir:** objek `LINKS` di `common.js`.
- **Event baru:** tambah objek di `EVENTS` dalam `data.js`, taruh foto WebP di `assets/events/<slug>/` (ukuran penuh) dan `assets/events/<slug>/t/` (thumbnail), lalu tambahkan daftar nama fotonya di `photos.js`.
- **Materi bahasa:** objek `LANGS` di `data.js` (tagline, cara mengajar, mini pelajaran, enam kalimat).

## Menjalankan di komputer

```
python -m http.server 5517
```

lalu buka http://localhost:5517. Untuk online, folder ini bisa langsung diunggah ke GitHub Pages, Netlify, atau Vercel.

## Sumber

Logo, ilustrasi ELCY, warna, dan semua foto diambil dari folder Google Drive Media Creative dan Documentation TUJLC. File mentah ada di `_raw/` (tidak perlu ikut diunggah).

## Akademi ELCY (`belajar.html`, area anggota)

- **Jalur 40 tes per bahasa** dalam 6 mode: Pemula A1 (1–8), Dasar A2 (9–15), Menengah B1 (16–23), Menengah Atas B2 (24–30), Mahir C1 (31–36), Expert C2 (37–40). Lulus = minimal 80% dan nyawa tersisa (Ujian Akhir 85%).
- **Tes lompat**: di kepala tiap mode yang masih terkunci. Isinya 15 soal dari ujian mode sebelumnya; lulus membuka semua tes sebelumnya.
- **Tipe soal**: arti kata, pilih kata, dengar, pasangkan, ketik (boleh romaji/pinyin/latin), susun kalimat, bahasa gaul vs baku, dialek/logat, peribahasa, simulator percakapan.
- **Materi** ada di `akademi-data.js`: 12 kategori kosakata × 10 kata × 5 bahasa, 12 kalimat bertingkat, 6 pasangan baku–gaul, 6 ungkapan dialek, 5 peribahasa, 2 skenario simulator per bahasa.
- Progres, XP, dan hari beruntun disimpan di browser masing-masing anggota (localStorage).

### Fitur AI (chat + penilaian tugas tulis di buku)

Butuh server lokal `tools/ai_server.py` dan API key Claude (berbayar per pemakaian, model Claude Opus 5.5).

1. Buat API key di console.anthropic.com.
2. Simpan sebagai environment variable (PowerShell, sekali saja): `setx ANTHROPIC_API_KEY "kunci-kamu"` lalu buka terminal baru.
3. Dari folder ini: `python tools/ai_server.py` lalu buka http://localhost:5517/belajar.html

Server juga membuat suara neural untuk teks apa pun (`/api/tts`), termasuk bahasa Arab. Tanpa server, situs tetap jalan sebagai situs statis: semua tes dan simulator bisa dipakai, hanya chat AI dan penilaian buku yang nonaktif.

Kalau menambah materi di `akademi-data.js`, jalankan `python tools/gen_audio.py` supaya file suaranya ikut dibuat.

## Kamus TUJLC (`kamus.html`)

Lima kamus dua arah, dicari lewat huruf asli, romaji (Jepang), pinyin (Mandarin), bahasa Inggris, atau bahasa Indonesia.

| Bahasa | Entri | Sumber |
|---|---|---|
| Inggris | ~160 ribu | Open English WordNet (CC BY 4.0) |
| Jepang | ~219 ribu | JMdict (CC BY-SA 4.0) |
| Mandarin | ~116 ribu | CC-CEDICT (CC BY-SA 4.0) + level HSK |
| Prancis | ~97 ribu | Wiktionary via kaikki.org (CC BY-SA 4.0) |
| Arab | ~24 ribu | Wiktionary via kaikki.org (CC BY-SA 4.0) |

- `kamus/<bahasa>-inti.json` dimuat langsung (kata tersering), `-lengkap.json` dimuat saat tombol "Muat kamus lengkap" ditekan.
- Arti Indonesia: ✓ = dicek manual (`tools/id_overrides.json`), ≈ = otomatis dari padanan Inggris (bisa meleset).
- Membangun ulang: `python tools/build_kamus.py` (butuh internet, membaca ~1,6 GB data Wiktionary sambil diunduh; data mentah kecil disimpan di `D:\tujlc-kamus-raw`).
- Menambah atau membetulkan arti Indonesia: edit `tools/id_overrides.json` (kunci = arti Inggris pertama), lalu bangun ulang.
- Karena lisensi CC BY-SA, data kamus ini juga harus dibagikan dengan lisensi CC BY-SA dan mencantumkan sumbernya (sudah ada di bagian bawah halaman kamus).

## Status proyek (disimpan 8 November 2026)

**Sudah jadi:** situs publik (beranda, 12 event, 5 halaman bahasa), keanggotaan berbasis server (daftar → kode anggota, 3 peran: publik/anggota/pengurus), Dasbor Pengurus 10 tab + Excel, Arena 7 game + mabar 2–5 orang, Akademi ELCY (40 tes × 5 bahasa, simulator, tugas tulis), Kamus TUJLC 5 bahasa, 867 MP3 suara. Tombol **masuk sebagai tamu** (anggota) dan **dasbor pengurus tamu** (hanya di laptop server) di `anggota.html`; akun tamu tidak ikut terhitung di data.

**Tertunda / menunggu keputusan:**
1. **API key Claude** belum dipasang → chat AI & penilaian buku masih nonaktif. Pasang: `tools/pasang-key-ai.ps1`, lepas: `tools/lepas-key-ai.ps1`. Berbayar per pemakaian.
2. **Link sosial media & formulir** masih kosong (`LINKS` di `common.js`).
3. **Tombol tamu pengurus** sebaiknya dimatikan sebelum web dipakai sungguhan (`/api/demo` di `tools/ai_server.py`, `db.demo_login`).
4. **Alamat kampus SB dan C** perlu dipastikan (sekarang SB = Daan Mogot/Stasiun Bumi, C = Minangkabau). Foto pengurus Rafi Pramudia (Logistik) belum ada.
5. **Hosting** belum dipilih (bagian statis bisa di Cloudflare Pages; server Python butuh host terpisah).
6. **Game Keliling Dunia ELCY**: versi web 3D SUDAH JADI (`dunia.html`, `dunia.js`, `dunia-data.js`, `dunia.css`; Three.js 0.160 dari CDN jsDelivr, jadi butuh internet). ELCY naik skuter hijau seperti logo, 5 kota dengan **peta asli OpenStreetMap** (jalan, tapak & tinggi gedung, sungai, taman, pohon, kafe/hotel/kantor asli; dibuat oleh `tools/build_osm.py` → `dunia/<kode>.json`, data mentah di `D:	ujlc-osm-raw`, atribusi © OpenStreetMap wajib tetap tampil): Westminster (London), Shiba/Minato (Tokyo), Tiananmen (Beijing), Champ de Mars (Paris), Giza (Kairo), landmark dimodel ukuran asli (Big Ben 96 m, Tokyo Tower 333 m, Gerbang Tiananmen, Menara Eiffel 330 m, 3 piramida + Sphinx), 6 NPC per kota (imigrasi, kafe, hotel, pasar, kantor, warga) × 3 giliran dialog, suara ▶, cap paspor, skor `dunia` ke papan peringkat, tombol "Ngobrol bebas (AI)" (butuh API key). Kota hidup: 34 mobil berjalan mengikuti jaringan jalan asli (berhenti bila ada ELCY/pejalan kaki), 90 pejalan kaki yang bisa disapa (obrolan singkat), NPC melambai & menyapa dengan suara, zebra cross, etalase toko lantai dasar, atap mansard (Paris/London), perabot jalan khas kota. ELCY bisa turun dari skuter (F) dan jalan kaki. Peta kota besar (M / klik peta kecil) dengan penunjuk arah. Kontrol: WASD/panah + Shift, E bicara/sapa, F turun/naik, M peta; HP pakai joystick. Versi **Unreal Engine** menyusul; isi dialog di `dunia-data.js` bisa dipakai ulang.

**Menjalankan lagi:** `python tools/ai_server.py` dari folder ini, lalu buka http://localhost:5517

## Keanggotaan, pengurus, dan arena (8 November 2026)

Semua fitur ini butuh server: `python tools/ai_server.py` (tambahkan `--lan` supaya HP/laptop lain di WiFi yang sama bisa membuka dan main bareng; alamatnya dicetak di terminal).

**Peran**
- **Publik:** beranda, event, halaman bahasa.
- **Anggota:** daftar di `anggota.html` → Daftar anggota (nama, email, NIM, gender, tahun lahir) → dapat kode `TUJ-XXXX-XXXX` (hanya tampil sekali) → masuk dengan NIM/email + kode. Dasbor menampilkan nama, jadwal, absen mandiri, daftar kelas, status iuran, kepengurusan, foto anggota, album, brand kit. Akademi, Kamus, dan Arena juga khusus anggota.
- **Pengurus:** anggota yang mendaftar di bagian "Daftar sebagai pengurus" dengan **kode pengurus** (ada di `data/KODE-PENGURUS.txt`, bisa diganti dari dasbor). Nama & NIM otomatis dari akun, plus foto & jabatan → tampil di Kepengurusan.

**Dasbor Pengurus (`pengurus.html`)**: ringkasan & pengaturan, data anggota (+ buat kode baru untuk yang lupa), kas & iuran per bulan (otomatis masuk buku kas), buku kas, event & jadwal (kode absen), absensi, pendaftaran kelas, peminjaman ruang 3 kampus, kepengurusan per periode, 6 template Excel + 8 ekspor data.

**Kampus** (alamat dari jakarta.telkomuniversity.ac.id): SB = Daan Mogot (Gedung Stasiun Bumi), B = Halimun, C = Minangkabau.

**Arena (`arena.html`)**: ELCY Lari Kata, Tangkap Suara, Susun Kata Kilat, Memori Pasangan, Petualangan Kota ELCY (London/Tokyo/Beijing/Paris/Kairo), Duel Kuis (2 orang 1 layar), Mabar Kuis (2–5 orang online). Skor masuk papan peringkat.

**Data pribadi**: tersimpan di `data/tujlc.db` (SQLite) dan foto pengurus di `uploads/`. Kode anggota disimpan sebagai hash. Folder `data/`, `uploads/`, dan `tools/` diblokir dari akses browser; foto anggota/pengurus hanya bisa dibuka setelah masuk. **Cadangkan folder `data/` secara berkala** dan jangan unggah ke hosting publik.
