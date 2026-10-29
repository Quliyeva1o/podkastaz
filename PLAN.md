# Podkast.az — layihə planı (yeni sessiya üçün)

> **Yeni Claude sessiyası:** bu faylı tam oxu, sonra işə başla. İstifadəçi ilə **Azərbaycan dilində**, qısa və aydın danış.
> Bu layihə **marketinq.az** layihəsinin davamıdır: eyni stack, eyni admin məntiqi, eyni hostinq (A2 Hosting cPanel).
> marketinq.az-da yaşanan bütün problemlər və onların həlli aşağıda (§14) yazılıb — **hamısını əvvəldən tətbiq et**, sonradan düzəltmə.
>
> - marketinq.az kodu: `C:\Users\Microsol\Desktop\marketing` (GitHub `Quliyeva1o/marketingaz`), təhvil qeydləri: `docs/HANDOFF.md`, cPanel deploy: `deploy/cpanel/README.md`
> - Figma: https://www.figma.com/design/YCsdeoCq9yoNPOKXYnBmWr/Podcast.az (file key `YCsdeoCq9yoNPOKXYnBmWr`)
> - Bu qovluqda: `design/reference/*.jpg` (Figma ekranlarının şəkilləri), `design/figma-notes/` (bütün mətnlər, bölmə quruluşu, dizaynerin qeydləri)

---

## 1. Məqsəd və əsas tələblər

1. **Figma ilə 1:1** sayt (yalnız Figma-da olan; özündən dizayn əlavə etmə). Figma **yalnız oxunur** — heç vaxt redaktə etmə.
2. **Hər şey admin-dən dəyişdirilə bilsin**: bütün mətnlər, şəkillər, videolar, loqo, paketlər və qiymətlər, add-on-lar, xidmətlər, studiyalar, dekorlar, qalereya, əlaqə məlumatları, sosial linklər, hüquqi mətnlər, hər səhifənin SEO-su.
3. **Rezervasiya** (studiya + dekor + tarix/saat + şəxsi məlumat) → admin panelə düşür, admin-ə və müştəriyə email gedir, admin təsdiqləyir/rədd edir. Eyni studiyada eyni vaxta iki rezervasiya **ola bilməz**.
4. **Paket müraciəti** (paket + add-on-lar + ümumi məbləğ + şəxsi məlumat) → admin-ə düşür.
5. **Əlaqə forması** → admin-ə düşür.
6. **SEO mükəmməl** (marketinq.az-dakı kimi 100), **performans maksimum** (Lighthouse mobil 95+, desktop 99+), **heç bir ilişmə** (admin keçidləri < 300 ms).
7. Hostinq: müştərinin A2 Hosting cPanel hesabı (marketinq.az ilə eyni hesab ola bilər — təsdiqlə).

---

## 2. Figma inventarı

### 2.1 Quruluş
- **Page 1 = son dizayn.** Desktop **1440 px** (18 frame) + Mobil **320 px** (16 frame). **Tablet frame-i YOXDUR** → 321–1439 arası fluid (bax §12.3).
- **Page 2 = dizayn sistemi + qaralamalar:** `Colours`, `Icons`, `Components` (input, checkbox, paket seçim kartı, tab), loqolar (`Logotype`, `Logotype-White`), köhnə Home variantları (istifadə etmə), **`Frame 1` = dizaynerin mətn qeydləri** (paket strukturu, xidmətlərin "Daxildir" siyahıları, əlavə xidmət ideyaları) → `design/figma-notes/texts-and-designer-notes.txt`.

### 2.2 Frame ID-ləri (API üçün)
| Ekran | Desktop | Mobil |
|---|---|---|
| Home | `285:697` | `472:1183` |
| Menu (overlay) | `214:852` | `476:590` |
| Paketlər | `221:1236` | `484:690` |
| Paketlər / Müraciət et (boş) | `221:1237` | `493:820` |
| Paketlər / Müraciət et (doldurulub) | `285:705` | — |
| Paketlər / Müraciət qəbul olundu | `346:1026` | `495:1318` |
| İşlərimiz / Şəkillər | `282:320` | `507:762` |
| İşlərimiz / Videolar | `285:569` | `509:830` |
| Studiyalar | `307:409` | `512:903` |
| Dekorlar (studiyanın) | `311:581` | `518:806` |
| Xidmətlər | `351:1889` | `526:1021` |
| Haqqımızda | `423:598` | `530:1701` |
| Əlaqə | `380:740` | `530:1372` |
| Rezervasiya et | `331:933` | `519:981` |
| Rezervasiya et (ana səhifədən keçid) | `346:1338` | — |
| Rezervasiya qəbul olundu | `346:1581` | `524:839` |
| İstifadəçi qaydaları | `275:540` | `500:756` |
| Məxfilik siyasəti | `275:719` | `503:1116` |
| Colours / Icons / Components | `110:1266` / `236:1495` / `221:1426` | |

### 2.3 Dizayn token-ləri
- **Şrift:** Inter 400/500/600/700 (əsas), Roboto 400/500 (bir-iki yer — yoxla, mümkünsə Inter-ə birləşdir). `next/font` ilə self-host, `display: swap`, yalnız latin + latin-ext (ə, ğ, ı, ö, ş, ü, ç).
- **Ölçülər (çox işlənən):** 16/24, 14/21, 14/20, 24/28 (600), 18/21, 20/30, 28/29, 48/50 (600, səhifə başlıqları), 54/57–81 (600, hero), 84/84 (700).
- **Rənglər:**
  - Primary (narıncı) şkala: 50 `#fff7ec`, 100 `#ffeed3`, 200 `#ffd8a5`, 300 `#ffbc6d`, 400 `#ff9432`, 500 `#ff750a`, **600 `#fe5b00` (əsas)**, 700 `#cc4002`, 800 `#a1320b`, 900 `#822c0c`, 950 `#461304`.
  - Neytral şkala: `#f8f8f8`, `#f1f0ef`, `#e5e4e3`, `#d2d0cf`, `#bfbcba`, `#9d9996`, `#85807d`, `#6e6a67`, `#5d5957`, `#504e4c`, **`#292726` (əsas mətn)**.
  - Əlavə: `#ffffff`, `#000000` (menyu fonu), `#d9d9d9`, `#343b41`.
- **İkonlar:** Phosphor (CalendarDots, Alarm, CheckCircle, WarningCircle) + hugeicons (menu). Xidmət kartlarındakı illüstrasiyalar `image 2` adlı şəkillərdir → Figma-dan **SVG** kimi export et (bu faylda `/images` render endpoint-i işləyir).
- **Komponentlər:** Text Input (default / filled / typing / error + hint), Checkbox, Radio-kart (studiya, dekor, paket), Toggle-kart (add-on), Tab (Şəkillər/Videolar), Breadcrumb, Header (loqo + hamburger), Menu overlay.

### 2.4 Diqqət çəkən dizayn qərarları (kodlaşdırarkən unutma)
- **Ana səhifə tək ekrandır** (1440×900): tam ekran foto fon, loqo, H1 "Səsini Brendə Çevir", alt mətn, 2 düymə (Rezervasiya et / Paketlər), © 2026, sosial ikonlar (FB, LinkedIn, Instagram, YouTube, WhatsApp, X). Başqa bölmə yoxdur.
- **Daxili səhifələrdə footer YOXDUR.** Hüquqi linklər və "Əlaqə" yalnız menyu overlay-dədir.
- **Header:** sol loqo, sağ hamburger — bütün ölçülərdə (desktop-da da menyu overlay-dir). Overlay: qara fon, sol tərəfdə böyük linklər, sağ-aşağıda 2 kart (narıncı "Rezervasiya et", tünd "Əlaqə"), aşağıda "Məxfilik siyasəti / İstifadəçi qaydaları".
- **Breadcrumb** hər daxili səhifədə (Ana səhifə > … ), narıncı ">" ayırıcı.
- **Studiyalar:** hər studiya üçün böyük şəkil + sağda 3 dar şəkil (dekorlar) — çox güman ki, hover/kliklə genişlənən "accordion gallery"; şəklin üstündə dekor adı və təsviri. **Interaksiyanı dizayner/müştəri ilə dəqiqləşdir.**
- **Paket kartı "PRO"** üstündə narıncı "Ən çox seçilən" lent.
- **Müraciət/rezervasiya düyməsi** checkbox-lar işarələnməyənə qədər boz (disabled) görünür.
- **"Qəbul olundu" modalı** formanın üstündə açılır (yarımşəffaf fon + ağ kart + CheckCircle + "Ana səhifəyə qayıt").
- Mətnlərin çoxu hələ **lorem ipsum**-dur (Studiyalar, Dekorlar, Haqqımızda, hüquqi səhifələr) → müştəridən real mətn lazımdır (§17).
- Əlaqə səhifəsində nümunə məlumat: "Bakı şəhəri, Ə.Rəcəbli 1/10", "+99412 565 77 77", "info@netpoint.az" — **real deyil, təsdiqlət**.

---

## 3. Səhifələr və URL-lər

Dil: Figma yalnız **AZ**-dır. Tövsiyə: başlanğıcda yalnız AZ (prefikssiz), amma kod marketinq.az kimi i18n-hazır olsun (lokallaşdırılmış slug-lar, `Localized` sahələr), sonra EN/RU asanlıqla əlavə olunsun. **Müştəridən soruş** (§17).

| Səhifə | URL |
|---|---|
| Ana səhifə | `/` |
| Haqqımızda | `/haqqimizda` |
| Xidmətlər | `/xidmetler` |
| Studiyalar | `/studiyalar` |
| Studiyanın dekorları | `/studiyalar/[studiya-slug]` (breadcrumb: Ana səhifə > Studiya 1 > Dekorlar) |
| Paketlər | `/paketler` |
| Paket müraciəti | `/paketler/muraciet` (`?paket=pro` ilə əvvəlcədən seçilmiş) |
| İşlərimiz | `/islerimiz` (Şəkillər) və `/islerimiz/videolar` — tab-lar ayrı URL olsun (SEO + paylaşım) |
| Rezervasiya | `/rezervasiya` (`?studiya=…&dekor=…` ilə əvvəlcədən seçilmiş; breadcrumb mənbəyə görə dəyişir) |
| Əlaqə | `/elaqe` |
| İstifadəçi qaydaları | `/istifadeci-qaydalari` |
| Məxfilik siyasəti | `/mexfilik-siyaseti` |
| Admin | `/admin` |

"Qəbul olundu" ayrıca səhifə deyil, modaldır (URL dəyişmir).

---

## 4. Səhifələr bölmə-bölmə (admin-də hər biri redaktə olunan bölmədir)

**Global (bütün səhifələr):** Header (loqo ağ/qara variant, hamburger), Menu overlay (linklər, 2 CTA kartı, hüquqi linklər), sosial linklər, əlaqə məlumatları (ünvan, telefon, email, iş saatları, xəritə koordinatları — JSON-LD üçün), UI mətnləri (düymələr, form label-ləri, xəta mesajları, "Qəbul olundu" mətni), bildiriş email-ləri, "Şirkət məlumatları (SEO)".

1. **Ana səhifə:** Hero (fon şəkli və ya video, H1, alt mətn, 2 düymə + linkləri, © mətni, sosial ikonlar). SEO üçün gizli açar sözlü H1 davamı (marketinq.az-dakı kimi `seoHeading`).
2. **Haqqımızda:** Səhifə başlığı → şəkil + "Səsiniz burada öz auditoriyasını tapır." + uzun mətn → tərəfdaş loqoları (mobil-də görünür: Mado, Starbucks, Baku Electronics, Peynirci Baba…) → 4 üstünlük kartı (4K Keyfiyyət, Çevik Rezervasiya, Sürətli Production, Uyğun Ünvanlar; 2-si narıncı, 2-si ağ).
3. **Xidmətlər:** başlıq + alt mətn + "Müraciət et" düyməsi → 8 xidmət kartı (ikon/illüstrasiya, ad, qısa təsvir): Studio icarəsi, Video podcast çəkilişi, Audio Podcast Yazımı, Montaj & Post-Production, Shorts/Reels, Podcast Start, Canlı Yayım, Səyyar studio → "Səsiniz burada…" + 4 üstünlük kartı (Haqqımızda ilə **paylaşılan bölmə**). Dizaynerin qeydlərində hər xidmət üçün "Daxildir" siyahısı var — kart açılanda/detalda göstərmək olar (müştəri ilə dəqiqləşdir).
4. **Studiyalar:** başlıq + alt mətn → hər studiya: ad, qısa mətn, "Dekorlara bax" düyməsi, böyük şəkil + 3 dar şəkil, şəkil üstündə dekor adı/təsviri. **Studiyalar kolleksiyadır** (admin-dən əlavə/sil/sırala).
5. **Dekorlar (studiyaya görə):** başlıq + alt mətn → hər dekor: ad, təsvir, "Rezervasiya et" (→ `/rezervasiya?studiya=…&dekor=…`), 8 şəkillik qalereya (desktop 4×2, mobil 1 sütun). **Dekorlar kolleksiyadır** (studiyaya bağlı).
6. **Paketlər:** başlıq + alt mətn → 3 paket kartı (ad, kimin üçün, qiymət AZN, "Müraciət et", xüsusiyyət siyahısı, "Ən çox seçilən" lent) → "ADD-ON XİDMƏTLƏR" (ad + qiymət; "Aylıq paket — Fərdi qiymət"). **Paketlər və add-on-lar kolleksiyadır.**
7. **Paket müraciəti:** sol: paket seçimi (radio-kart), add-on-lar (checkbox-kart), "Ümumi X AZN" (canlı hesablanır); sağ: Ad, Soyad, Telefon, Email, 2 checkbox (məlumatların doğruluğu; qaydalar və məxfilik — linklərlə), "Müraciət et".
8. **İşlərimiz:** başlıq + alt mətn + tab-lar. **Şəkillər:** masonry (desktop 3 sütun, mobil 1), lightbox. **Videolar:** böyük kartlar (video/şəkil + başlıq + mətn + xüsusiyyətlər) — Video Podcast Çəkilişi, Audio Podcast Yazımı, Səyyar studio — + kiçik şəkil kollajı. Videolar: media kitabxanasından mp4 (səssiz loop) və ya YouTube linki (lite-embed, klikdə yüklənsin).
9. **Rezervasiya:** sol: Studiya (radio-kart: ad + ünvan), Dekor (radio-kart: kiçik şəkil + ad; seçilmiş studiyanın dekorları + "Digər — İstəyinizə uyğun dekorun düzəlməsi"), Tarix, Başlama vaxtı, Bitmə vaxtı; sağ: şəxsi məlumatlar + 2 checkbox + "Müraciət et" → modal "Qəbul olundu!".
10. **Əlaqə:** başlıq + alt mətn → sol: "Əlaqə saxlayın…", Ünvan, Telefon, E-poçt, sosial ikonlar; sağ: Ad, Soyad, Telefon, Email, Mövzu, Mesaj, "Mesajını göndər".
11. **İstifadəçi qaydaları / Məxfilik siyasəti:** başlıq + zəngin mətn (admin-dən rich text). Mətnlər müştərinin hüquqşünasından.

---

## 5. Rezervasiya sistemi (ən vacib hissə)

### 5.1 Axın
1. İstifadəçi studiyanı seçir → həmin studiyanın aktiv dekorları göstərilir (və "Digər").
2. Tarixi seçir → həmin gün üçün **boş saatlar** serverdən gəlir (`GET /api/availability?studio=…&date=…`), dolu saatlar disabled.
3. Başlama/bitmə vaxtı seçir (addım: 30 dəq, minimum: 1 saat — admin-dən dəyişir).
4. Şəxsi məlumat + 2 razılıq → "Müraciət et".
5. Server: validasiya (zod), spam qoruma, **vaxt toqquşmasını DB səviyyəsində yoxla** → `bookings`-ə yaz (status `new`) → admin-ə və müştəriyə email (`after()` ilə, cavabı gözlətmədən) → modal.

### 5.2 Toqquşma qorunması (mütləq)
- Postgres `btree_gist` + **exclusion constraint**: `EXCLUDE USING gist (studio_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status IN ('new','confirmed'))`. Eyni anda iki müraciət gəlsə də ikincisi DB-də rədd olunur → istifadəçiyə "Bu vaxt artıq tutulub, başqa vaxt seçin".
- Admin-in "bağlı günləri/saatları" (tətil, texniki iş) də eyni cədvəldə `blocked` statuslu sətir kimi saxlanıla bilər.
- Saat qurşağı: **Asia/Baku**; DB-də `timestamptz`, UI-da Bakı vaxtı.

### 5.3 Ayarlar (admin → Rezervasiya ayarları)
- Hər studiya üçün iş saatları (həftənin günlərinə görə), addım (30 dəq), minimum/maksimum müddət, rezervasiyalar arası bufer (məs. 15 dəq təmizlik), neçə gün əvvələ qədər rezervasiya olar (məs. 60 gün), eyni gün üçün minimum qabaqcadan vaxt (məs. 2 saat).
- Bildiriş email-ləri (alıcılar), müştəriyə gedən email mətni (AZ), "Qəbul olundu" mətni.

### 5.4 Statuslar və admin
- Statuslar: **Yeni → Təsdiqləndi / Rədd edildi / Ləğv edildi → Tamamlandı**. Hər status dəyişikliyi müştəriyə email (şablon admin-dən), qeyd (admin note), kim dəyişdi və nə vaxt (audit).
- Admin görünüşləri: **təqvim** (həftə/gün, studiyaya görə rəngli), **siyahı** (filtr: status, studiya, tarix; axtarış), detal səhifəsi, **CSV export**.
- Dashboard: bugünkü/sabahkı rezervasiyalar, yeni (baxılmamış) müraciət sayı (sidebar badge).
- Opsional (müştəri istəsə): müştəriyə `.ics` təqvim faylı, WhatsApp linki, SMS.

### 5.5 Qiymət
Figma-da rezervasiya formasında qiymət yoxdur. Studiya icarəsinin saatlıq qiyməti varsa (məs. paketlərdəki "Əlavə 1 saat +40 AZN") — **müştəridən soruş**; varsa ümumi məbləğ formada göstərilsin və server hesablasın.

### 5.6 Kənar hallar
- Seçilmiş dekor sonradan deaktiv edilsə — köhnə rezervasiyada adı saxlanır (snapshot).
- "Digər" dekor seçiləndə qısa mətn sahəsi (istək) — Figma-da yoxdur, dizaynerlə dəqiqləşdir.
- Keçmiş tarix/saat seçilə bilməz (həm UI, həm server).
- `?studiya=&dekor=` parametrləri ilə gələndə seçimlər hazır olsun; breadcrumb: dekor səhifəsindən gəlibsə "Studiyalar > Dekorlar > Rezervasiya et", ana səhifədən gəlibsə "Ana səhifə > Rezervasiya et" (Figma-da iki variant var).

---

## 6. Paket müraciəti
- Paket radio (1 seçim), add-on-lar checkbox (çox seçim; "Aylıq paket — Fərdi qiymət" seçiləndə məbləğə əlavə olunmur, "+ fərdi" yazılır).
- **Məbləğ server tərəfdə yenidən hesablanır** (brauzerə etibar etmə), müraciətdə qiymətlərin o anki **snapshot**-u saxlanır.
- Admin: siyahı + detal + status (Yeni / Əlaqə saxlanıldı / Razılaşdı / İmtina) + qeyd + email bildiriş.

## 7. Əlaqə forması
- Sahələr: Ad, Soyad, Telefon, Email, Mövzu (dropdown — xidmətlərdən? Figma-da input kimidir, dəqiqləşdir), Mesaj.
- marketinq.az-dakı kimi: honeypot + 3 san. vaxt tələsi + IP limit (20 / 10 dəq, IP hash) + optional Turnstile; bota saxta "uğur" cavabı; email `after()` ilə.

---

## 8. Admin panel

marketinq.az admin-indən götür (görünüş eyni brend rəngi ilə — narıncı): sol menyu, səhifə → bölmə redaktoru, dil tab-ları (əgər çoxdillidirsə), media kitabxanası, versiyalar, gizlət/sırala, paylaşılan bölmə checkbox-u.

**Menyu:**
- Dashboard (bugünkü rezervasiyalar, yeni müraciətlər, sürətli linklər)
- **Rezervasiyalar** (təqvim, siyahı, detal) · **Paket müraciətləri** · **Mesajlar** (əlaqə)
- Səhifələr (bütün səhifələrin bölmələri + SEO tab-ı)
- **Studiyalar** (kolleksiya) · **Dekorlar** (kolleksiya, studiyaya görə filtr) · **Paketlər** · **Add-on-lar** · **Xidmətlər** · **İşlərimiz** (şəkillər və videolar) · **Tərəfdaşlar** (loqolar)
- Media kitabxanası (axtarış, silmə + istifadə qoruması, şəkil/video, alt mətn — marketinq.az-dakının eynisi)
- Ayarlar: Header/Menu, Əlaqə məlumatları, Sosial şəbəkələr, Şirkət məlumatları (SEO / JSON-LD), Rezervasiya ayarları, Email bildirişləri, Yönləndirmələr (301), UI mətnləri, Admin istifadəçilər

**Qaydalar:** hər kolleksiya elementi üçün: dərc/qaralama, sıra (yuxarı/aşağı), slug (avto, redaktə olunan), SEO sahələri, şəkil-və-ya-video "Örtük" sahəsi (marketinq.az-dakı `imageOrVideo`).

---

## 9. Data modeli (Drizzle / Postgres 16)

marketinq.az-dakı əsas cədvəllər olduğu kimi: `users`, `sessions`, `media` (+`file_name`, variants, blur, alt), `pages`, `section_contents`, `page_sections`, `section_versions`, `collection_items`, `redirects`, `submissions`, `cache_tags`.

Yeni:
- `studios` (id, slug, ad, ünvan, qısa mətn, şəkillər, sıra, aktiv, iş saatları jsonb)
- `decors` (id, studio_id, slug, ad, təsvir, örtük + qalereya, sıra, aktiv)
- `packages` (id, ad, kimin üçün, qiymət, xüsusiyyətlər[], vurğulanmış, sıra, aktiv)
- `addons` (id, ad, qiymət nullable = "fərdi", sıra, aktiv)
- `bookings` (id, studio_id, decor_id nullable, decor_snapshot, custom_request, starts_at, ends_at, ad, soyad, telefon, email, status, admin_note, ip_hash, source, created_at, updated_at, notified_at) + **exclusion constraint** (§5.2)
- `booking_events` (booking_id, status, note, user_id, at) — audit
- `package_requests` (id, package snapshot, addons snapshot, total, ad, soyad, telefon, email, status, admin_note, ip_hash, created_at)
- `booking_settings` (studio_id, step_min, min_duration, max_duration, buffer_min, horizon_days, lead_time_min)

Studiyalar/dekorlar/paketlər `collection_items`-də də saxlanıla bilər (marketinq.az-dakı kolleksiya sistemi) — **amma rezervasiya üçün xarici açar (FK) və constraint lazım olduğundan `studios`, `decors` ayrıca cədvəl olsun.** Paketlər/add-on-lar kolleksiya ola bilər (sadə), qərarı ilk fazada ver.

---

## 10. Stack və başlanğıc

- **marketinq.az repo-sunu şablon kimi götür** (sıfırdan yazma): `git clone` → yeni repo `podcastaz` (və ya `podkastaz`) → marketinq.az-a xas bölmələri (hero, team, process, pricing, portfolio, blog…) sil, admin nüvəsini, media sistemini, formaları, SEO-nu, deploy skriptlərini saxla.
- Next.js **16.4.x** App Router, Cache Components (`'use cache'`, `cacheLife('max')`, `cacheTag`, `updateTag`), `src/proxy.ts` (middleware yox). Next kodu yazmazdan əvvəl `node_modules/next/dist/docs/` oxu (AGENTS.md qaydası).
- Tailwind v4 + Figma token-ləri; **fluid rem** şkalası (1rem = aktiv frame-in 16px-i); `--sbw` scrollbar düzəlişi.
- Drizzle ORM + Postgres 16 (lokal Docker port 5440 — marketinq.az-ın bazası ilə toqquşmasın deyə **5441** istifadə et), Mailpit (lokal email), Playwright E2E, sharp (şəkil), ffmpeg (video).
- Lokal: `docker-compose.dev.yml` (db + mailpit), `.env.local` (Figma token marketinq.az-ın `.env.local`-ından köçür — **commit etmə**).

---

## 11. SEO planı (hədəf: Lighthouse SEO 100, Google-da "podcast studio Bakı" üçün yuxarıda)

- Hər səhifə: unikal title (≤60) və description (≤160), açar sözlər: *podcast studiya Bakı, podcast çəkilişi, video podcast, studiya icarəsi, səsyazma studiyası, podcast montaj, reels çəkilişi*.
- **Bir H1** hər səhifədə; ana səhifənin H1-i qısadır ("Səsini Brendə Çevir") → gizli açar sözlü davam (`sr-only`, admin-dən), daxili səhifələrdə də `headingSuffix`.
- **JSON-LD:** `LocalBusiness` + `ProfessionalService` (ad, ünvan, telefon, iş saatları, geo, sameAs), `WebSite`, `BreadcrumbList`, `Service` (xidmətlər), `Offer`/`OfferCatalog` (paketlər, AZN), `ImageGallery`/`VideoObject` (işlərimiz), hər studiya üçün `Place`.
- `sitemap.xml` (studiya və dekor səhifələri daxil), `robots.txt`, canonical, OG şəkli (default + səhifəyə görə), Twitter card.
- **Test domenində noindex** (`SITE_NOINDEX=1`) — canlıya keçəndə söndür.
- Domen: **podkast.az vs podcast.az** (§17) — biri əsas, digərləri + `www` 301 ilə əsasa.
- Alt mətnlər: media kitabxanasında, açar sözlü; dekorativ şəkillər `alt=""`.
- Ana səhifə tək ekran olduğundan mətn azdır → **Google Business Profile**, yerli kataloqlar, YouTube kanalı, sosial profillər mütləqdir (müştəriyə tövsiyə).
- Footer olmadığı üçün NAP (ad/ünvan/telefon) yalnız Əlaqə səhifəsində və JSON-LD-dədir — kifayətdir, amma JSON-LD hər səhifədə olsun.

## 12. Performans planı

1. **Hero şəkli/videosu LCP-dir:** AVIF/WebP, `priority`, `fetchpriority=high`, preload; video olarsa poster şəkil + lazy video (marketinq.az `BackgroundVideo`).
2. Qalereyalar (İşlərimiz, Dekorlar — onlarla şəkil): lazy, `sizes` dəqiq, blur placeholder, masonry CSS (`columns`), JS yox; lightbox yalnız klikdə yüklənsin (dynamic import).
3. **Tablet frame-i yoxdur** → 320 → 1440 arası fluid rem; breakpoint-lər: mobil < 768 (320 dizaynı), desktop ≥ 1024 (1440 dizaynı); 768–1023 üçün mobil düzümün genişlənmiş versiyası (2 sütun) — dizaynerlə təsdiqlət.
4. Rezervasiya formasında boş saatlar API-si: kiçik JSON, cache yox (real vaxt), DB indeks `(studio_id, starts_at)`.
5. Şriftlər self-host, yalnız lazım olan çəkilər.
6. Hədəflər: mobil LCP < 2.5 s (real), CLS 0, TBT < 150 ms; admin keçidləri < 300 ms.
7. YouTube videoları: `lite-youtube` tipli fasad (klikə qədər iframe yox).

## 13. Hostinq və deploy (A2 Hosting cPanel — marketinq.az ilə eyni)

- Struktur marketinq.az kimi: `~/podkast-src` (git, build), `~/podkast-app/{app.js,current,releases,shared/{.env,uploads}}`, document root `~/podkast-public` (yalnız `.htaccess` + `media` symlink).
- `deploy/cpanel/deploy.sh`-ı köçür, yolları dəyiş (APP_DIR, SRC_DIR, PUBLIC_DIR). Node 22 (`/opt/alt/alt-nodejs22`), `UV_THREADPOOL_SIZE=2`, `--v8-pool-size=2`, `RAYON_NUM_THREADS=2`, `NEXT_BUILD_CPUS=1`, hər build-də `rm -rf .next`.
- **Media birbaşa LiteSpeed-dən** (`media` → `shared/uploads` symlink + `media.htaccess`).
- **ffmpeg** artıq `~/bin`-dədir (marketinq.az üçün quraşdırılıb, eyni hesabdırsa) → `.env`-də `FFMPEG_PATH`/`FFPROBE_PATH`.
- Ayrıca Postgres bazası (`podkast` adlı), ayrıca DB istifadəçisi; backup cron (marketinq.az-dakı kimi).
- Test ünvanı əvvəlcə (məs. `new.podkast.az` və ya `test.podkast.az`, noindex), sonra əsas domen.
- SSL: AutoSSL; Cloudflare istəyə bağlı (marketinq.az-da A qeydləri ilə başladıq).

---

## 14. marketinq.az-dan dərslər — əvvəldən tətbiq et ✅

| Problem (marketinq.az-da) | Bu layihədə əvvəldən |
|---|---|
| `proxy.ts` saytın öz URL-inə HTTP sorğu atırdı → cPanel-də proses limiti → admin və sayt **ilişirdi** | Proxy məlumatı **birbaşa DB-dən** oxuyur (`src/lib/proxy-data.ts`), heç vaxt öz origin-inə `fetch` yoxdur |
| `Readable.toWeb(createReadStream)` video stream-də "Controller is already closed" uncaught exception | Pull-based `ReadableStream` + `cancel()`-də fayl bağlanır (`storage.ts` `streamObject`) |
| Bütün media Node-dan keçirdi, 2 thread-lik hovuz dolurdu | `/media` LiteSpeed-dən (symlink), Node media verməsin |
| Admin-dən yüklənən video sıxılmırdı (20 MB) | ffmpeg `~/bin`, arxa planda sıxma (`encodeLater`), CRF 22, `-threads 2`, mənbədən ağır olmasın, şaquli videolar da |
| Build `SIGABRT` (thread limiti 150) | Bütün thread hovuzları 2, `NEXT_BUILD_CPUS=1` |
| Köhnə `.next` cache → yeni HTML köhnə CSS-ə işarə | Hər deploy-da `rm -rf .next` |
| `HOSTNAME` CloudLinux maşın adı → redirect loop | `app.js`-də `HOSTNAME=0.0.0.0` |
| Bir neçə app prosesi → admin dəyişikliyi bəzisində görünmürdü | `cache_tags` cədvəli + `tag-sync` (3 san) |
| Bölmələr arası 1px boz xətt (fractional height, yüksək DPR) | `main > * + * { margin-top: -1px }` əvvəldən |
| Footer künclərindən qara fon görünürdü | Künc arxa fonu son bölmənin rəngini alır (burada footer yoxdur, amma yuvarlaq künclü bloklarda eyni məntiq) |
| AZ sözləri Figma-dakı İngilis mətnindən uzundur → mobil menyu sütunu kəsilirdi | Sabit en əvəzinə `minmax`/`auto`; 320 px-də hər səhifəni yoxla |
| Loqolar `object-cover` + scale ilə kəsilirdi | Loqolar həmişə `object-contain` |
| Ad rəngi fon parlaqlığına görə — 125% ekran miqyasında səhv ölçürdü (`naturalWidth` density-corrected) | Kətanı əvvəl `naturalWidth×naturalHeight`-də çək, sonra sahəni oxu |
| `<summary>` içində düymələr (a11y xəbərdarlığı) | Düymələr `summary`-dən kənarda |
| Media seçici grid-i üst-üstə düşürdü | Ayrıca scroll konteyneri |
| Hover `group` başqa `.group` valideyndən aktivləşirdi | Ad verilmiş qruplar (`group/tile`) |
| Count-up WebKit-də 0-da qalırdı | Yekun dəyər görünür, animasiya başlayanda 0 + taymer ehtiyatı |
| Windows npm lockfile-dan Linux paketlərini silir → `npm ci` sınır | Asılılıq dəyişəndə Docker-də `npm install --package-lock-only` |
| Windows Smart App Control Playwright Firefox/WebKit-i bloklayır | Cross-browser testləri Docker-də (`mcr.microsoft.com/playwright`) |
| Docker Desktop açılmırdı (WSL ilişirdi) | `wsl --shutdown`, sonra Docker-i aç |
| Dev rejimdə HMR səhifəni təkrar yükləyir | Yoxlamaları production build ilə (`next start -p 3100`) et |
| Figma API limiti (Starter plan, `/files` 80+ saat bloklanır) | Lazım olan hər şeyi **bir dəfə** yüklə və `design/figma-notes`-da saxla; bu fayl üçün `/files` və `/images` hazırda işləyir |
| Admin-də silinən şəkil səhifədə boş qutu qoyurdu | Media silmə istifadə yoxlaması ilə (marketinq.az-dakı kimi) |
| Fayl adı ilə axtarış yox idi | `media.file_name` + axtarış (AZ hərf qatlama) |
| Örtük üçün şəkil və video ayrı sahə idi | Tək `imageOrVideo` sahəsi |
| Login redirect-dən sonra "failed to get redirect response 0.0.0.0:3000" logu | Zərərsizdir (bilinən Next/Passenger davranışı) — öz-özünə sorğu ilə "düzəltmə" |

---

## 15. Testlər
- Playwright E2E (Chromium lokal, Firefox/WebKit Docker-də): routing, 404, redirects, JSON-LD, hər səhifə 320/768/1440-da xətasız və üfüqi scroll-suz, mobil menyu, formalar (honeypot, vaxt tələsi, IP limit), **rezervasiya toqquşması** (eyni vaxta iki paralel müraciət → biri rədd), keçmiş tarix rədd, paket məbləğinin server hesablaması, admin: bölmə redaktəsi, kolleksiyalar, rezervasiya statusu dəyişməsi + email (Mailpit API ilə yoxla), media silmə qoruması.
- Lighthouse (mobil + desktop) hər fazanın sonunda; real şəbəkədə (devtools throttling) də ölç.
- Vizual: Figma render-ləri (`design/reference`) ilə yan-yana screenshot müqayisəsi.

## 16. Fazalar

| Faza | Məzmun | Təxmini |
|---|---|---|
| 0 | Figma-dan çatışmayan aktivləri export (loqo SVG, ikonlar/illüstrasiyalar SVG, foto fill-lər), müştəri suallarına cavab | 0.5–1 gün |
| 1 | marketinq.az-dan şablon: repo, təmizləmə, token-lər, şrift, layout, header + menu overlay, breadcrumb, DB sxemi, admin auth | 1–2 gün |
| 2 | Admin nüvəsi uyğunlaşdırma + yeni kolleksiyalar (studiyalar, dekorlar, paketlər, add-on-lar, xidmətlər, işlərimiz, tərəfdaşlar) | 2–3 gün |
| 3 | Səhifələr pixel-perfect (desktop + mobil + aralıq): Home, Haqqımızda, Xidmətlər, Studiyalar, Dekorlar, Paketlər, İşlərimiz, Əlaqə, hüquqi | 4–6 gün |
| 4 | **Rezervasiya**: availability API, form, constraint, statuslar, admin təqvim/siyahı, email şablonları | 3–4 gün |
| 5 | Paket müraciəti + əlaqə forması + spam qoruma + bildirişlər | 1–2 gün |
| 6 | SEO (meta, JSON-LD, sitemap, OG, redirects) | 1 gün |
| 7 | Performans + QA (Lighthouse, cross-browser Docker, a11y, vizual müqayisə) | 1–2 gün |
| 8 | Deploy test ünvanına (cPanel), müştəri məzmunu, sonra əsas domen + Search Console + Business Profile | 1 gün |

Hər fazanın sonunda: lint + typecheck + build + E2E yaşıl → istifadəçidən icazə ilə commit/push (**commit/push/deploy yalnız istifadəçi deyəndə**).

---

## 17. Müştəridən lazım olanlar / açıq suallar

**Qərar tələb edən:**
1. **Domen:** `podkast.az` (loqoda belədir) yoxsa `podcast.az` (©-də belədir)? Hər ikisi alınıbsa biri əsas, digəri 301.
2. **Dil:** yalnız AZ, yoxsa EN/RU da? (Kod hər halda hazır olacaq.)
3. **Hostinq:** marketinq.az ilə eyni cPanel hesabı? (ffmpeg və təcrübə hazırdır.)
4. **Studiya icarəsinin qiyməti** rezervasiyada göstərilsin/hesablansın? Saatlıq qiymət nədir?
5. **Rezervasiya qaydaları:** iş saatları (hər studiya, hər gün), minimum/maksimum müddət, addım, bufer, neçə gün qabaqcadan, ödəniş/depozit varmı (onlayn ödəniş — gələcək faza?).
6. **Studiyalar səhifəsindəki şəkil interaksiyası** (hover-da genişlənmə?) və "Digər" dekor üçün istək mətn sahəsi.
7. **Əlaqə formasında "Mövzu"** sərbəst mətn, yoxsa siyahı?
8. **Xidmət kartları** kliklənəndə detal (Daxildir siyahısı) açılsın?
9. **Tablet** görünüşü dizaynerdən gələcək, yoxsa biz uyğunlaşdıraq?

**Məzmun:**
- Real mətnlər: Haqqımızda, Studiyalar, Dekorlar, hüquqi səhifələr (hüquqşünas təsdiqi).
- Studiya və dekor fotoları (yüksək keyfiyyət), işlərimiz (foto + video), hero şəkli/videosu.
- Real əlaqə məlumatları (ünvan, telefon, email, iş saatları, Google Maps), sosial linklər (FB, LinkedIn, Instagram, YouTube, WhatsApp, X).
- Tərəfdaş loqoları (SVG/PNG, sıx kəsilmiş).
- Bildiriş email ünvanları + SMTP (göndərən poçt).
- Google Search Console / Business Profile girişi (sahibi müştəri, bizi əlavə etsin).
- Admin istifadəçilərin siyahısı.

---

## 18. Risklər
- **Ana səhifə tək ekran + footer yoxdur** → SEO üçün mətn azdır: JSON-LD, daxili səhifələrin zəngin mətni və xarici siqnallar (Business Profile, YouTube) vacibdir. Dizayna mətn əlavə etmək lazım olsa — dizaynerlə.
- **Rezervasiya toqquşması** yalnız UI-də yoxlansa ikiqat rezervasiya olar → DB constraint mütləq.
- **Lorem ipsum** canlıya çıxmamalıdır — deploy-dan əvvəl yoxlama siyahısı.
- Figma API limiti — lazım olanı tez və bir dəfə yüklə.
- Shared hosting limitləri — §13 və §14-dəki tədbirlərsiz sayt ilişə bilər.
