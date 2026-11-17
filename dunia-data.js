// Data game "Keliling Dunia ELCY": kota, NPC, dan dialog.
// Format dialog sama dengan AK.SIM: ["kalimat NPC|bacaan|arti", [[jawaban, bacaan, nilai 0-2, umpan balik], ...]]
window.DUNIA = {
  CITIES: {
    en: { name: "London", flag: "🇬🇧", landmark: "london", sky: 0xaec4d6, fog: 0xc5d3de, ground: 0x6f9a5b, sun: 0xfff1d6, sunI: 2.2,
      bld: [0xb46a4b, 0x8e5a44, 0xd9cdb8, 0x5a6470, 0xa9a49a], desc: "Kota berkabut di tepi Sungai Thames. Logat British, bus merah, dan menara jam yang terkenal." },
    ja: { name: "Tokyo", flag: "🇯🇵", landmark: "tokyo", sky: 0xf4c7c3, fog: 0xf2d6d2, ground: 0x7da26a, sun: 0xffe2c8, sunI: 2.0,
      bld: [0xe8e4dc, 0x9aa6b1, 0x6d7a88, 0xd7c9b0, 0xc6d2d8], desc: "Kota rapi dengan musim sakura. Belajar sopan santun dan bahasa hormat (keigo)." },
    zh: { name: "Beijing", flag: "🇨🇳", landmark: "beijing", sky: 0xcfe0ea, fog: 0xe3e2d6, ground: 0x8aa064, sun: 0xfff0cc, sunI: 2.3,
      bld: [0xb23a2e, 0x8c8c86, 0xc9b79a, 0x6e7066, 0xd8d2c4], desc: "Ibu kota bersejarah. Latihan nada, menawar di pasar, dan bayar pakai pindai QR." },
    fr: { name: "Paris", flag: "🇫🇷", landmark: "paris", sky: 0xbad7ee, fog: 0xdfe7ee, ground: 0x7fa56a, sun: 0xffe9c4, sunI: 2.4,
      bld: [0xe6dcc8, 0xd8ccb4, 0xcfc2a8, 0xe9e2d2, 0xbfb39b], desc: "Kota bangunan krem beratap abu. Selalu ucapkan “Bonjour” dulu sebelum bicara!" },
    ar: { name: "Kairo", flag: "🇪🇬", landmark: "kairo", sky: 0xf3dcae, fog: 0xf0e0bd, ground: 0xd9b77a, sun: 0xfff3d9, sunI: 2.8,
      bld: [0xd8b98a, 0xc9a172, 0xe5cfa4, 0xb88c5e, 0xefe0c0], desc: "Kota tua di tepi Sungai Nil. Bahasa baku (fusha) bercampur dialek Mesir di pasar." },
  },
  // NPC sama di setiap kota; posisi [x, z] di peta
  NPCS: [
    { id: "imigrasi", role: "Petugas imigrasi", pos: [7, 40], shirt: 0x274045, hat: 0x1d2f33, dlg: "imigrasi" },
    { id: "kafe", role: "Barista kafe", pos: [-7, 18], shirt: 0x8b5a2b, hat: null, sim: 0 },
    { id: "hotel", role: "Resepsionis hotel", pos: [-22, 7.5], shirt: 0x6b3fa0, hat: null, dlg: "hotel" },
    { id: "pasar", role: "Pedagang pasar", pos: [-14, -9.5], shirt: 0x2e8b57, hat: 0xd9a441, dlg: "pasar" },
    { id: "kantor", role: "Manajer kantor", pos: [16, -7.5], shirt: 0x2f3e52, hat: null, sim: 1 },
    { id: "warga", role: "Warga lokal", pos: [-7, -24], shirt: 0xE9212C, hat: 0x00A5FF, dlg: "arah" },
  ],
  LANDMARK: { en: "Big Ben", ja: "Tokyo Tower", zh: "Tiananmen", fr: "Menara Eiffel", ar: "Piramida Giza" },
  DLG: {
    en: {
      imigrasi: [
        ["Good morning. May I see your passport, please?||Selamat pagi. Boleh lihat paspor Anda?", [["Sure, here you are.", "", 2, "Sopan dan alami."], ["Yes, I see.", "", 0, "“I see” artinya “saya mengerti”, bukan menyerahkan."], ["Passport.", "", 1, "Dimengerti, tapi terlalu singkat."]]],
        ["What's the purpose of your visit?||Apa tujuan kunjungan Anda?", [["I'm here for a language exchange programme.", "", 2, "Jelas dan lengkap."], ["Holiday.", "", 1, "Benar, tapi lebih baik kalimat lengkap."], ["I am purpose.", "", 0, "Tidak bermakna."]]],
        ["How long will you be staying?||Berapa lama Anda akan tinggal?", [["About two weeks.", "", 2, "Tepat."], ["Since two weeks.", "", 0, "“Since” dipakai untuk titik waktu di masa lalu."], ["Long.", "", 1, "Kurang jelas."]]],
      ],
      hotel: [
        ["Welcome! Do you have a reservation?||Selamat datang! Sudah reservasi?", [["Yes, it's under the name Rafi.", "", 2, "Cara standar menyebut nama pemesan."], ["Yes, my name is reservation.", "", 0, "Susunannya salah."], ["I want room.", "", 1, "Dimengerti, tapi kurang artikel “a”."]]],
        ["Could you fill out this form, please?||Bisa isi formulir ini?", [["Of course. Do you need my passport too?", "", 2, "Sopan dan proaktif."], ["OK.", "", 1, "Boleh, tapi datar."], ["I don't fill.", "", 0, "Terdengar kasar dan tidak lengkap."]]],
        ["Breakfast is from seven to ten. Anything else?||Sarapan jam tujuh sampai sepuluh. Ada lagi?", [["What's the Wi-Fi password?", "", 2, "Pertanyaan yang wajar."], ["No, thank you. Good night!", "", 2, "Juga tepat."], ["Seven ten.", "", 0, "Hanya mengulang angka."]]],
      ],
      pasar: [
        ["Fresh strawberries! Two pounds a box.||Stroberi segar! Dua pound sekotak.", [["Can I have two boxes, please?", "", 2, "Tepat."], ["I want two box.", "", 1, "Bentuk jamaknya “boxes”."], ["How old are you?", "", 0, "Tidak nyambung."]]],
        ["Anything else, love?||Ada lagi, Kak?", [["That's all, thanks.", "", 2, "Alami."], ["Love you too.", "", 0, "“Love” di sini hanya sapaan ramah khas Inggris."], ["No more.", "", 1, "Dimengerti, tapi kaku."]]],
        ["That's four pounds, then.||Jadi empat pound.", [["Can I pay by card?", "", 2, "Pertanyaan umum dan sopan."], ["Here's a fiver. Keep the change.", "", 2, "Gaul British: fiver = uang lima pound."], ["Four pound is cheap.", "", 1, "Seharusnya “pounds”, dan komentarnya tidak perlu."]]],
      ],
      arah: [
        ["You look lost. Can I help?||Kamu kelihatan tersesat. Bisa dibantu?", [["Yes, please. How do I get to Big Ben?", "", 2, "Cara bertanya arah yang standar."], ["Where Big Ben?", "", 1, "Kurang kata kerja “is”."], ["I am lost Big Ben.", "", 0, "Tidak gramatikal."]]],
        ["Go straight on, then take the second left.||Lurus, lalu belok kiri kedua.", [["Second left. Is it far from here?", "", 2, "Konfirmasi + pertanyaan lanjutan."], ["Go straight you.", "", 0, "Tidak bermakna."], ["OK, left.", "", 1, "Kurang jelas belokan yang mana."]]],
        ["About ten minutes on foot.||Sekitar sepuluh menit jalan kaki.", [["Brilliant, thanks a lot!", "", 2, "Ungkapan khas British."], ["Ten minutes foot.", "", 0, "Mengulang tanpa makna."], ["Thanks.", "", 1, "Boleh, cukup singkat."]]],
      ],
    },
    ja: {
      imigrasi: [
        ["パスポートをみせてください。|pasupōto o misete kudasai.|Tolong tunjukkan paspor Anda.", [["はい、どうぞ。", "hai, dōzo.", 2, "Alami saat menyerahkan sesuatu."], ["パスポートです。", "pasupōto desu.", 1, "Benar, tapi kaku."], ["みません。", "mimasen.", 0, "Artinya “saya tidak melihat”."]]],
        ["にゅうこくのもくてきは？|nyūkoku no mokuteki wa?|Apa tujuan masuk negara?", [["かんこうです。", "kankō desu.", 2, "“Wisata.” Jawaban standar."], ["りゅうがくです。", "ryūgaku desu.", 2, "“Belajar di luar negeri.” Juga tepat."], ["もくてきです。", "mokuteki desu.", 0, "Hanya mengulang kata “tujuan”."]]],
        ["なんにちかん たいざいしますか？|nan-nichikan taizai shimasu ka?|Tinggal berapa hari?", [["とおかかんです。", "tōkakan desu.", 2, "“Selama sepuluh hari.” Tepat."], ["とおかです。", "tōka desu.", 1, "Itu “tanggal 10”; untuk lamanya pakai tōkakan."], ["にほんです。", "nihon desu.", 0, "Tidak menjawab."]]],
      ],
      hotel: [
        ["いらっしゃいませ。ごよやくのおなまえは？|irasshaimase. go-yoyaku no onamae wa?|Selamat datang. Atas nama siapa reservasinya?", [["ラフィです。よろしくおねがいします。", "rafi desu. yoroshiku onegai shimasu.", 2, "Sopan."], ["ラフィ。", "rafi.", 1, "Terlalu singkat."], ["よやくします。", "yoyaku shimasu.", 0, "“Saya akan memesan”, padahal ditanya nama."]]],
        ["チェックアウトは じゅうじです。|chekkuauto wa jūji desu.|Check-out jam sepuluh.", [["わかりました。", "wakarimashita.", 2, "“Baik, saya mengerti.”"], ["じゅうじですね。ありがとうございます。", "jūji desu ne. arigatō gozaimasu.", 2, "Konfirmasi yang sopan."], ["いいえ、じゅうじ。", "iie, jūji.", 0, "Membantah tanpa alasan."]]],
        ["ほかに ごしつもんは？|hoka ni go-shitsumon wa?|Ada pertanyaan lain?", [["Wi-Fiのパスワードは なんですか？", "waifai no pasuwādo wa nan desu ka?", 2, "Pertanyaan wajar."], ["おふろは なんじまでですか？", "ofuro wa nanji made desu ka?", 2, "“Pemandian buka sampai jam berapa?” Khas penginapan Jepang."], ["しつもんです。", "shitsumon desu.", 0, "“Ini pertanyaan.” Tidak bermakna."]]],
      ],
      pasar: [
        ["いらっしゃい！このりんご、ひとつ ひゃくえんだよ。|irasshai! kono ringo, hitotsu hyaku-en da yo.|Ayo mampir! Apel ini 100 yen satu.", [["みっつ ください。", "mittsu kudasai.", 2, "Tepat: “tolong tiga”."], ["さん りんご ください。", "san ringo kudasai.", 0, "Bahasa Jepang memakai kata bantu bilangan: mittsu."], ["りんご！", "ringo!", 1, "Dimengerti, tapi tanpa jumlah."]]],
        ["ほかには？|hoka ni wa?|Yang lain?", [["それだけです。", "sore dake desu.", 2, "“Itu saja.”"], ["ほかです。", "hoka desu.", 0, "Mengulang kata."], ["いいです。", "ii desu.", 1, "Bisa berarti “tidak usah”, tapi ambigu."]]],
        ["さんびゃくえんです。|sanbyaku-en desu.|300 yen.", [["カードでも いいですか？", "kādo demo ii desu ka?", 2, "“Boleh pakai kartu?”"], ["はい、ちょうどです。", "hai, chōdo desu.", 2, "“Uangnya pas.” Alami."], ["やすいですね、もっと ください。", "yasui desu ne, motto kudasai.", 1, "Gramatikal, tapi mengubah pesanan."]]],
      ],
      arah: [
        ["どうしましたか？|dō shimashita ka?|Ada yang bisa dibantu?", [["すみません、とうきょうタワーは どこですか？", "sumimasen, Tōkyō Tawā wa doko desu ka?", 2, "Pola tanya arah standar."], ["タワー、どこ？", "tawā, doko?", 1, "Kasual, terlalu singkat untuk orang asing."], ["タワーです。", "tawā desu.", 0, "“Ini menara.”"]]],
        ["まっすぐ いって、ふたつめの かどを みぎです。|massugu itte, futatsume no kado o migi desu.|Lurus, lalu belok kanan di sudut kedua.", [["ふたつめを みぎですね。", "futatsume o migi desu ne.", 2, "Konfirmasi dengan “ne”."], ["ひだりですか。", "hidari desu ka.", 0, "Ia bilang kanan (migi), bukan kiri."], ["はい。", "hai.", 1, "Boleh, tapi tanpa konfirmasi."]]],
        ["あるいて ごふんぐらいですよ。|aruite gofun gurai desu yo.|Sekitar lima menit jalan kaki.", [["ごしんせつに ありがとうございます。", "goshinsetsu ni arigatō gozaimasu.", 2, "“Terima kasih atas kebaikannya.”"], ["ありがとう。", "arigatō.", 1, "Ke orang asing lebih sopan arigatō gozaimasu."], ["ごふん ください。", "gofun kudasai.", 0, "“Tolong beri lima menit.”"]]],
      ],
    },
    zh: {
      imigrasi: [
        ["请出示您的护照。|qǐng chūshì nín de hùzhào.|Tolong tunjukkan paspor Anda.", [["好的，给您。", "hǎo de, gěi nín.", 2, "Sopan, memakai 您."], ["护照。", "hùzhào.", 1, "Terlalu singkat."], ["我不是护照。", "wǒ bú shì hùzhào.", 0, "“Saya bukan paspor.”"]]],
        ["你来中国做什么？|nǐ lái Zhōngguó zuò shénme?|Ke Tiongkok untuk apa?", [["我来学习汉语。", "wǒ lái xuéxí Hànyǔ.", 2, "Tepat."], ["旅游。", "lǚyóu.", 1, "Benar, tapi lebih baik lengkap: 我来旅游。"], ["我做什么。", "wǒ zuò shénme.", 0, "Mengulang pertanyaan."]]],
        ["你打算住多久？|nǐ dǎsuàn zhù duō jiǔ?|Rencana tinggal berapa lama?", [["两个星期。", "liǎng ge xīngqī.", 2, "Tepat: 两 + kata bantu bilangan 个."], ["二星期。", "èr xīngqī.", 0, "Sebelum kata bantu bilangan pakai 两, dan perlu 个."], ["很久。", "hěn jiǔ.", 1, "“Lama sekali.” Tidak jelas."]]],
      ],
      hotel: [
        ["您好，请问有预订吗？|nín hǎo, qǐngwèn yǒu yùdìng ma?|Halo, sudah ada reservasi?", [["有，我叫拉菲。", "yǒu, wǒ jiào Lāfēi.", 2, "Tepat."], ["有。", "yǒu.", 1, "Benar, tapi belum menyebut nama."], ["我是预订。", "wǒ shì yùdìng.", 0, "“Saya adalah reservasi.”"]]],
        ["您的房间在三楼，这是房卡。|nín de fángjiān zài sān lóu, zhè shì fángkǎ.|Kamar Anda di lantai 3, ini kartu kamarnya.", [["谢谢！早饭几点开始？", "xièxie! zǎofàn jǐ diǎn kāishǐ?", 2, "Berterima kasih + bertanya jam sarapan."], ["三楼在哪儿？", "sān lóu zài nǎr?", 1, "Wajar, tapi kurang perlu."], ["我不要三楼。", "wǒ bú yào sān lóu.", 0, "Menolak tanpa alasan."]]],
        ["早上七点。还有别的问题吗？|zǎoshang qī diǎn. hái yǒu bié de wèntí ma?|Jam 7 pagi. Ada pertanyaan lain?", [["没有了，谢谢。", "méiyǒu le, xièxie.", 2, "Alami."], ["Wi-Fi密码是多少？", "Wi-Fi mìmǎ shì duōshao?", 2, "Pertanyaan wajar."], ["七点。", "qī diǎn.", 0, "Hanya mengulang."]]],
      ],
      pasar: [
        ["来看看！苹果五块钱一斤。|lái kànkan! píngguǒ wǔ kuài qián yì jīn.|Mari lihat! Apel 5 yuan per jin (½ kg).", [["给我两斤吧。", "gěi wǒ liǎng jīn ba.", 2, "Tepat."], ["我要二斤苹果。", "wǒ yào èr jīn píngguǒ.", 1, "Sebelum satuan pakai 两, bukan 二."], ["苹果是什么？", "píngguǒ shì shénme?", 0, "Tidak nyambung."]]],
        ["还要别的吗？|hái yào bié de ma?|Mau yang lain?", [["不要了，谢谢。", "bú yào le, xièxie.", 2, "Alami."], ["要别的。", "yào bié de.", 1, "“Mau yang lain” tanpa menyebut apa."], ["我不是别的。", "wǒ bú shì bié de.", 0, "Tidak bermakna."]]],
        ["一共十块。|yígòng shí kuài.|Totalnya 10 yuan.", [["能便宜点儿吗？", "néng piányi diǎnr ma?", 2, "Menawar dengan sopan, khas pasar."], ["我扫码付吧。", "wǒ sǎo mǎ fù ba.", 2, "“Saya bayar pindai QR.” Sangat umum di Tiongkok."], ["十块很好吃。", "shí kuài hěn hǎochī.", 0, "“10 yuan enak sekali.”"]]],
      ],
      arah: [
        ["你好，需要帮忙吗？|nǐ hǎo, xūyào bāngmáng ma?|Halo, perlu bantuan?", [["请问，天安门怎么走？", "qǐngwèn, Tiān'ānmén zěnme zǒu?", 2, "Pola tanya arah standar."], ["天安门在哪儿？", "Tiān'ānmén zài nǎr?", 2, "Juga tepat."], ["我是天安门。", "wǒ shì Tiān'ānmén.", 0, "“Saya Tiananmen.”"]]],
        ["一直往前走，到路口往左拐。|yìzhí wǎng qián zǒu, dào lùkǒu wǎng zuǒ guǎi.|Lurus terus, di perempatan belok kiri.", [["到路口左拐，对吗？", "dào lùkǒu zuǒ guǎi, duì ma?", 2, "Konfirmasi yang baik."], ["右拐，好的。", "yòu guǎi, hǎo de.", 0, "Ia bilang kiri (左), bukan kanan."], ["好。", "hǎo.", 1, "Boleh, cukup singkat."]]],
        ["走路大概十分钟。|zǒulù dàgài shí fēnzhōng.|Jalan kaki kira-kira 10 menit.", [["太好了，谢谢你！", "tài hǎo le, xièxie nǐ!", 2, "Alami dan ramah."], ["十分钟走。", "shí fēnzhōng zǒu.", 0, "Susunannya salah."], ["谢谢。", "xièxie.", 1, "Cukup."]]],
      ],
    },
    fr: {
      imigrasi: [
        ["Bonjour. Votre passeport, s'il vous plaît.||Selamat siang. Paspor Anda, silakan.", [["Bonjour. Le voici.", "", 2, "Salam dulu, lalu “ini dia”. Sangat Prancis."], ["Passeport.", "", 1, "Tanpa “Bonjour” terdengar kasar di Prancis."], ["Je suis passeport.", "", 0, "“Saya paspor.”"]]],
        ["Quel est le but de votre séjour ?||Apa tujuan kunjungan Anda?", [["Je viens pour un échange linguistique.", "", 2, "Jelas."], ["Tourisme.", "", 1, "Benar, tapi lebih baik kalimat lengkap."], ["J'ai but.", "", 0, "Tidak bermakna."]]],
        ["Vous restez combien de temps ?||Berapa lama Anda tinggal?", [["Deux semaines.", "", 2, "Tepat."], ["Depuis deux semaines.", "", 0, "“Depuis” = sejak (sudah berlangsung)."], ["Beaucoup.", "", 1, "Tidak jelas."]]],
      ],
      hotel: [
        ["Bonsoir ! Vous avez une réservation ?||Selamat malam! Sudah reservasi?", [["Oui, au nom de Rafi.", "", 2, "Ungkapan standar “atas nama”."], ["Oui, je m'appelle réservation.", "", 0, "Susunannya salah."], ["Je veux chambre.", "", 1, "Kurang artikel: une chambre."]]],
        ["Le petit-déjeuner est servi de 7 h à 10 h.||Sarapan disajikan jam 7 sampai 10.", [["Parfait, merci. Et le code du Wi-Fi ?", "", 2, "Sopan + pertanyaan wajar."], ["Je mange à 11 h.", "", 0, "Sarapan sudah selesai jam 10."], ["D'accord.", "", 1, "Boleh."]]],
        ["Bon séjour parmi nous !||Selamat menginap!", [["Merci beaucoup, bonne soirée !", "", 2, "Alami."], ["Bon séjour à vous aussi.", "", 1, "Kurang pas: resepsionis tidak sedang menginap."], ["Au revoir séjour.", "", 0, "Tidak bermakna."]]],
      ],
      pasar: [
        ["Bonjour ! Les fraises sont à trois euros la barquette.||Halo! Stroberi 3 euro per kotak.", [["Bonjour, j'en voudrais deux, s'il vous plaît.", "", 2, "Sopan, memakai “en”."], ["Deux fraises.", "", 1, "Artinya dua buah stroberi, bukan dua kotak."], ["Je suis fraise.", "", 0, "“Saya stroberi.”"]]],
        ["Et avec ceci ?||Ada lagi?", [["Ce sera tout, merci.", "", 2, "Ungkapan standar di toko."], ["Avec ceci.", "", 0, "Mengulang."], ["Non.", "", 1, "Agak ketus."]]],
        ["Six euros, s'il vous plaît.||Enam euro.", [["Je peux payer par carte ?", "", 2, "Tepat."], ["Voilà, gardez la monnaie.", "", 2, "“Silakan, ambil kembaliannya.”"], ["C'est cher, non ?", "", 1, "Boleh, tapi kurang sopan ke penjual."]]],
      ],
      arah: [
        ["Vous cherchez quelque chose ?||Sedang mencari sesuatu?", [["Oui, excusez-moi, pour aller à la tour Eiffel ?", "", 2, "Pola tanya arah yang sopan."], ["Où tour Eiffel ?", "", 1, "Kurang kata kerja dan artikel."], ["Je cherche moi.", "", 0, "Tidak bermakna."]]],
        ["Prenez la deuxième rue à droite, puis tout droit.||Ambil jalan kedua di kanan, lalu lurus.", [["La deuxième à droite, c'est ça ?", "", 2, "Konfirmasi yang alami."], ["À gauche, merci.", "", 0, "Ia bilang kanan (droite), bukan kiri."], ["D'accord.", "", 1, "Boleh, tapi tanpa konfirmasi."]]],
        ["C'est à dix minutes à pied.||Sepuluh menit jalan kaki.", [["Merci, c'est très gentil !", "", 2, "“Baik sekali Anda.”"], ["Merci.", "", 1, "Cukup."], ["Dix minutes pied.", "", 0, "Tidak gramatikal."]]],
      ],
    },
    ar: {
      imigrasi: [
        ["جَوازُ السَّفَرِ مِنْ فَضْلِكَ.|jawāzu s-safari min faḍlik.|Paspornya, silakan.", [["تَفَضَّلْ.", "tafaḍḍal.", 2, "Ungkapan standar saat menyerahkan sesuatu."], ["جَواز.", "jawāz.", 1, "Terlalu singkat."], ["أَنا جَوازٌ.", "anā jawāz.", 0, "“Saya paspor.”"]]],
        ["ما هَدَفُ زِيارَتِكَ؟|mā hadafu ziyāratik?|Apa tujuan kunjungan Anda?", [["جِئْتُ لِدِراسَةِ اللُّغَةِ العَرَبِيَّةِ.", "ji'tu li-dirāsati l-lughati l-ʿarabiyya.", 2, "Jelas."], ["سِياحَة.", "siyāḥa.", 1, "“Wisata.” Benar tapi singkat."], ["هَدَفٌ.", "hadaf.", 0, "Mengulang kata “tujuan”."]]],
        ["كَمْ يَوْمًا سَتَبْقى؟|kam yawman satabqā?|Berapa hari akan tinggal?", [["أُسْبوعَيْنِ.", "usbūʿayn.", 2, "Bentuk dual: dua minggu."], ["اِثْنانِ أُسْبوع.", "ithnān usbūʿ.", 0, "Untuk “dua” pakai bentuk dual: usbūʿayn."], ["كَثير.", "kathīr.", 1, "“Banyak.” Tidak jelas."]]],
      ],
      hotel: [
        ["أَهْلًا وَسَهْلًا! هَلْ عِنْدَكَ حَجْزٌ؟|ahlan wa sahlan! hal ʿindaka ḥajz?|Selamat datang! Ada reservasi?", [["نَعَمْ، بِاسْمِ رافي.", "naʿam, bi-smi Rāfī.", 2, "“Atas nama Rafi.”"], ["نَعَمْ.", "naʿam.", 1, "Belum menyebut nama."], ["أَنا حَجْزٌ.", "anā ḥajz.", 0, "“Saya reservasi.”"]]],
        ["غُرْفَتُكَ في الطّابِقِ الثّالِثِ.|ghurfatuka fi ṭ-ṭābiqi th-thālith.|Kamarmu di lantai tiga.", [["شُكْرًا. مَتى الفُطورُ؟", "shukran. matā l-fuṭūr?", 2, "Berterima kasih + tanya jam sarapan."], ["لا أُريدُ.", "lā urīd.", 0, "“Saya tidak mau.”"], ["الثّالِث.", "ath-thālith.", 1, "Hanya mengulang."]]],
        ["الفُطورُ مِنَ السّابِعَةِ. أَيُّ خِدْمَةٍ أُخْرى؟|al-fuṭūru mina s-sābiʿa. ayyu khidmatin ukhrā?|Sarapan mulai jam 7. Ada yang lain?", [["لا، شُكْرًا جَزيلًا.", "lā, shukran jazīlan.", 2, "Alami."], ["ما كَلِمَةُ سِرِّ الواي فاي؟", "mā kalimatu sirri l-wāy fāy?", 2, "Pertanyaan wajar."], ["السّابِعَة.", "as-sābiʿa.", 0, "Mengulang."]]],
      ],
      pasar: [
        ["أَهْلًا! البُرْتُقالُ بِعَشَرَةِ جُنَيْهاتٍ لِلْكيلو.|ahlan! al-burtuqālu bi-ʿasharati junayhātin li-l-kīlū.|Halo! Jeruk 10 pound per kilo.", [["أُريدُ كيلو مِنْ فَضْلِكَ.", "urīdu kīlū min faḍlik.", 2, "Tepat (bahasa baku)."], ["عايِز كيلو.", "ʿāyiz kīlū.", 2, "Dialek Mesir “mau sekilo”. Sangat alami di Kairo."], ["أَنا بُرْتُقال.", "anā burtuqāl.", 0, "“Saya jeruk.”"]]],
        ["أَيُّ شَيْءٍ آخَر؟|ayyu shay'in ākhar?|Ada lagi?", [["لا، هذا كُلُّ شَيْءٍ.", "lā, hādhā kullu shay'.", 2, "“Itu saja.”"], ["آخَر.", "ākhar.", 0, "Mengulang."], ["لا.", "lā.", 1, "Agak ketus."]]],
        ["عَشَرَةُ جُنَيْهاتٍ.|ʿasharatu junayhāt.|10 pound.", [["مُمْكِن أَقَلّ شْوَيَّة؟", "mumkin aqall shwayya?", 2, "Menawar sopan ala Mesir: “bisa kurang sedikit?”"], ["تَفَضَّلْ، شُكْرًا.", "tafaḍḍal, shukran.", 2, "Membayar dengan sopan."], ["غالي جِدًّا!", "ghālī jiddan!", 1, "“Mahal sekali!” Terlalu keras."]]],
      ],
      arah: [
        ["هَلْ تَحْتاجُ مُساعَدَةً؟|hal taḥtāju musāʿada?|Perlu bantuan?", [["نَعَمْ، كَيْفَ أَذْهَبُ إِلى الأَهْرامِ؟", "naʿam, kayfa adhhabu ilā l-ahrām?", 2, "Pola tanya arah standar."], ["أَيْنَ الأَهْرام؟", "ayna l-ahrām?", 2, "Juga tepat."], ["أَنا الأَهْرام.", "anā l-ahrām.", 0, "“Saya piramida.”"]]],
        ["اِمْشِ مُسْتَقيمًا ثُمَّ خُذِ اليَمينَ.|imshi mustaqīman thumma khudhi l-yamīn.|Jalan lurus lalu belok kanan.", [["مُسْتَقيمًا ثُمَّ يَمين، صَحيح؟", "mustaqīman thumma yamīn, ṣaḥīḥ?", 2, "Konfirmasi yang baik."], ["اليَسار، شُكْرًا.", "al-yasār, shukran.", 0, "Ia bilang kanan (yamīn), bukan kiri."], ["حَسَنًا.", "ḥasanan.", 1, "Cukup."]]],
        ["حَوالَيْ عَشْرِ دَقائِقَ بِالسَّيّارَةِ.|ḥawālay ʿashri daqā'iqa bi-s-sayyāra.|Sekitar 10 menit naik mobil.", [["شُكْرًا جَزيلًا، أَنْتَ لَطيف!", "shukran jazīlan, anta laṭīf!", 2, "Ramah."], ["شُكْرًا.", "shukran.", 1, "Cukup."], ["عَشْرُ سَيّارات.", "ʿashru sayyārāt.", 0, "“Sepuluh mobil.”"]]],
      ],
    },
  },
};

// Sapaan & obrolan singkat pejalan kaki (format sama dengan dialog, 1 giliran)
window.DUNIA.GREET = {
  en: ["Hello!", "Hiya!", "Morning!", "Alright?", "Lovely day!"],
  ja: ["こんにちは！", "どうも！", "いい天気ですね！", "ようこそ！"],
  zh: ["你好！", "欢迎！", "嗨！", "今天天气不错！"],
  fr: ["Bonjour !", "Salut !", "Coucou !", "Bonne journée !"],
  ar: ["السَّلامُ عَلَيْكُم!", "أَهْلًا!", "مَرْحَبًا!", "صَباحُ الخَيْر!"],
};
window.DUNIA.THANKS = { en: "Thanks, see you!", ja: "ありがとう、またね！", zh: "谢谢，再见！", fr: "Merci, à bientôt !", ar: "شُكْرًا، إِلى اللِّقاء!" };
window.DUNIA.TALK = {
  en: [
    ["Lovely weather today, isn't it?||Cuacanya bagus ya hari ini?", [["Yes, it's gorgeous!", "", 2, "Alami: setuju dengan antusias."], ["I am weather.", "", 0, "Tidak bermakna."], ["Yes.", "", 1, "Boleh, tapi datar."]]],
    ["Are you a tourist?||Kamu turis?", [["Yes, I'm visiting from Indonesia.", "", 2, "Lengkap dan ramah."], ["Tourist yes me.", "", 0, "Susunannya kacau."], ["Yeah.", "", 1, "Kasual tapi singkat."]]],
    ["Nice scooter! Where did you get it?||Skuternya keren! Beli di mana?", [["Thanks! It's from Jakarta.", "", 2, "Berterima kasih lalu menjawab."], ["Scooter is nice yes.", "", 1, "Dimengerti, tapi kaku."], ["I get Jakarta.", "", 0, "Tidak gramatikal."]]],
    ["Cheers, mate! Have a good one.||Makasih, bro! Semoga harimu menyenangkan.", [["You too, cheers!", "", 2, "Balasan khas British."], ["Good one what?", "", 0, "“Have a good one” = semoga harimu baik."], ["Bye.", "", 1, "Boleh, singkat."]]],
  ],
  ja: [
    ["いい天気ですね。|ii tenki desu ne.|Cuacanya bagus ya.", [["そうですね！", "sō desu ne!", 2, "Cara setuju yang paling alami."], ["天気です。", "tenki desu.", 0, "“Ini cuaca.”"], ["はい。", "hai.", 1, "Boleh, tapi kaku."]]],
    ["旅行ですか？|ryokō desu ka?|Sedang jalan-jalan?", [["はい、インドネシアから来ました。", "hai, Indoneshia kara kimashita.", 2, "Lengkap dan sopan."], ["旅行。", "ryokō.", 1, "Terlalu singkat."], ["いいえ、旅行です。", "iie, ryokō desu.", 0, "Kontradiktif: “tidak, saya jalan-jalan”."]]],
    ["そのスクーター、かわいいですね！|sono sukūtā, kawaii desu ne!|Skuter itu lucu ya!", [["ありがとうございます！", "arigatō gozaimasu!", 2, "Menerima pujian dengan sopan."], ["かわいいです。", "kawaii desu.", 1, "Hanya mengulang."], ["すみません、かわいい。", "sumimasen, kawaii.", 0, "Tidak nyambung."]]],
    ["気をつけてね！|ki o tsukete ne!|Hati-hati ya!", [["はい、ありがとう！", "hai, arigatō!", 2, "Ramah."], ["気です。", "ki desu.", 0, "Tidak bermakna."], ["はい。", "hai.", 1, "Cukup."]]],
  ],
  zh: [
    ["今天天气真好！|jīntiān tiānqì zhēn hǎo!|Cuaca hari ini bagus sekali!", [["是啊，很舒服！", "shì a, hěn shūfu!", 2, "Setuju dengan alami."], ["我是天气。", "wǒ shì tiānqì.", 0, "“Saya cuaca.”"], ["好。", "hǎo.", 1, "Terlalu singkat."]]],
    ["你是从哪儿来的？|nǐ shì cóng nǎr lái de?|Kamu dari mana?", [["我是从印度尼西亚来的。", "wǒ shì cóng Yìndùníxīyà lái de.", 2, "Pola 是…的 yang tepat."], ["印度尼西亚。", "Yìndùníxīyà.", 1, "Benar, tapi singkat."], ["我去哪儿。", "wǒ qù nǎr.", 0, "“Saya pergi ke mana.”"]]],
    ["你的中文说得很好！|nǐ de Zhōngwén shuō de hěn hǎo!|Bahasa Mandarinmu bagus!", [["哪里哪里，谢谢！", "nǎlǐ nǎlǐ, xièxie!", 2, "Merendah, khas budaya Tiongkok."], ["是，我很好。", "shì, wǒ hěn hǎo.", 1, "Terdengar kurang rendah hati."], ["中文很好吃。", "Zhōngwén hěn hǎochī.", 0, "“Mandarin enak dimakan.”"]]],
    ["慢走！|màn zǒu!|Hati-hati di jalan!", [["再见！", "zàijiàn!", 2, "Tepat."], ["我走得很慢。", "wǒ zǒu de hěn màn.", 0, "“慢走” adalah salam perpisahan, bukan “jalan lambat”."], ["好。", "hǎo.", 1, "Cukup."]]],
  ],
  fr: [
    ["Il fait beau aujourd'hui, hein ?||Cuacanya cerah hari ini, ya?", [["Oui, c'est magnifique !", "", 2, "Alami."], ["Je suis beau.", "", 0, "“Saya tampan.”"], ["Oui.", "", 1, "Boleh, datar."]]],
    ["Vous êtes touriste ?||Anda turis?", [["Oui, je viens d'Indonésie.", "", 2, "Lengkap."], ["Touriste.", "", 1, "Singkat."], ["Non, je suis touriste.", "", 0, "Kontradiktif."]]],
    ["Elle est mignonne, votre trottinette !||Skuter Anda lucu!", [["Merci, c'est gentil !", "", 2, "Menerima pujian dengan sopan."], ["Elle est mignonne.", "", 1, "Hanya mengulang."], ["Je mange trottinette.", "", 0, "Tidak bermakna."]]],
    ["Bonne visite à Paris !||Selamat berkunjung di Paris!", [["Merci, bonne journée !", "", 2, "Balasan sopan khas Prancis."], ["Visite Paris.", "", 0, "Tidak lengkap."], ["Merci.", "", 1, "Cukup."]]],
  ],
  ar: [
    ["الجَوُّ جَميلٌ اليَوْمَ.|al-jawwu jamīlun al-yawm.|Cuaca indah hari ini.", [["نَعَمْ، جَميلٌ جِدًّا!", "naʿam, jamīlun jiddan!", 2, "Setuju dengan alami."], ["أَنا جَوٌّ.", "anā jaww.", 0, "“Saya cuaca.”"], ["نَعَمْ.", "naʿam.", 1, "Cukup."]]],
    ["مِنْ أَيْنَ أَنْتَ؟|min ayna anta?|Kamu dari mana?", [["أَنا مِنْ إِنْدونيسْيا.", "anā min Indūnīsyā.", 2, "Tepat."], ["إِنْدونيسْيا.", "Indūnīsyā.", 1, "Singkat."], ["أَيْنَ أَنا؟", "ayna anā?", 0, "“Di mana saya?”"]]],
    ["الأَهْرامُ رائِعَةٌ، أَلَيْسَ كَذٰلِكَ؟|al-ahrāmu rāʾiʿa, a-laysa ka-dhālik?|Piramidanya menakjubkan, bukan?", [["بَلى، رائِعَةٌ جِدًّا!", "balā, rāʾiʿatun jiddan!", 2, "“Balā” = ya, untuk pertanyaan bernada negatif."], ["لا أَهْرام.", "lā ahrām.", 0, "Tidak bermakna."], ["نَعَمْ.", "naʿam.", 1, "Boleh, tapi “balā” lebih tepat."]]],
    ["مَعَ السَّلامَة!|maʿa s-salāma!|Selamat jalan!", [["مَعَ السَّلامَة، شُكْرًا!", "maʿa s-salāma, shukran!", 2, "Tepat."], ["السَّلامَة.", "as-salāma.", 1, "Kurang lengkap."], ["أَنا سَلامَة.", "anā salāma.", 0, "“Saya keselamatan.”"]]],
  ],
};
