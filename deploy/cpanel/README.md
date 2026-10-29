# cPanel hostinqində yerləşdirmə (A2 Hosting / hosting.com)

Podkast.az marketinq.az kimi cPanel hesabında **Setup Node.js App** + **PostgreSQL** ilə işləyir
(eyni hesab ola bilər — müştəri təsdiqləyir, PLAN.md §17.3). Bütün skriptlər marketinq.az-da
sınanıb: 1 CPU, 150 proses limiti, Node 22, PostgreSQL 13.

> Yoxlanılıb (2026-10-29, lokal): ixrac olunan baza **superuser olmayan** istifadəçi ilə boş
> bazaya yüklənir (rezervasiya constraint-i üçün `btree_gist` "trusted" extension-dır —
> bazanın sahibi yarada bilir), sonra `db:migrate` heç nəyi dəyişmir.

## Əvvəlcədən lazım olanlar

1. **Domen** qərarı: `podkast.az` yoxsa `podcast.az` əsasdır (digəri 301). Aşağıda `podkast.az` yazılıb.
2. **Kod GitHub-da**: yeni private repo (məs. `Quliyeva1o/podkastaz`), `main` branch-ə push.
3. **cPanel girişi** (müştərinin hesabı) — parolları heç vaxt yazışmada göndərmə.
4. Bu kompüterdə məzmun hazırdır (`npm run check:launch` — nə qaldığını göstərir).

## Serverdə qovluqlar

```
~/podkast-src/            git checkout — yalnız build üçün
~/podkast-app/            "Setup Node.js App"-in Application root-u
  app.js, package.json    (deploy/cpanel-dən kopyalanır)
  current → releases/<id> işləyən build
  releases/               son 3 build (geri qaytarmaq üçün)
  shared/.env             parollar və ayarlar (git-ə düşmür)
  shared/uploads/         şəkillər və videolar
~/podkast-public/         saytın document root-u (yalnız .htaccess + media linki)
~/backups/podkast/        gündəlik baza backup-ı
```

Hesabda başqa saytlar varsa (marketinq.az və s.) — onlara toxunulmur: hər şey öz qovluğundadır.

---

## A. İlk quraşdırma — əvvəlcə test ünvanında (`test.podkast.az`, noindex)

### 1. PostgreSQL bazası
cPanel → **PostgreSQL Database Wizard**: baza `podkast`, istifadəçi **başqa adla** (məs. `pkapp`;
cPanel prefiks əlavə edir: `<hesab>_podkast`, `<hesab>_pkapp`), güclü parol, **ALL PRIVILEGES**.

### 2. Kodu GitHub-dan çəkmək (deploy key, yalnız oxuma)
cPanel → **Terminal**:
```bash
ssh-keygen -q -t ed25519 -N "" -f ~/.ssh/podkast_deploy -C "podkast cpanel deploy (read-only)"
printf 'Host github-podkast\n  HostName github.com\n  User git\n  IdentityFile ~/.ssh/podkast_deploy\n  IdentitiesOnly yes\n' >> ~/.ssh/config
chmod 600 ~/.ssh/config && ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts
cat ~/.ssh/podkast_deploy.pub
```
Çıxan sətri GitHub → repo → **Settings → Deploy keys → Add deploy key** ("Allow write access" işarəsiz). Sonra:
```bash
git clone github-podkast:Quliyeva1o/podkastaz.git ~/podkast-src
```

### 3. Tətbiq qovluğu və ayarlar
```bash
mkdir -p ~/podkast-app/shared/uploads ~/podkast-app/releases ~/podkast-app/tmp ~/podkast-public ~/backups/podkast
cp ~/podkast-src/deploy/cpanel/app.js ~/podkast-src/deploy/cpanel/package.json ~/podkast-app/
cp ~/podkast-src/deploy/cpanel/env.example ~/podkast-app/shared/.env
chmod 600 ~/podkast-app/shared/.env
```
`~/podkast-app/shared/.env`-i File Manager-də doldur (izahlar faylın içindədir). Test üçün:
`SITE_URL=https://test.podkast.az` və `SITE_NOINDEX=1`.

### 4. Məzmunu bu kompüterdən köçürmək (yalnız ilk dəfə)
Bu kompüterdə (Docker işləyərkən, layihə qovluğunda):
```bash
bash scripts/deploy/export-content.sh
```
`deploy-bundle/`-dəki `db.sql.gz` və `uploads.tar.gz.part-*` fayllarını File Manager → Upload ilə
`~/podkast-app/shared/`-ə yüklə, sonra Terminal-da:
```bash
cd ~/podkast-app/shared
DB_URL="$(grep -E '^DATABASE_URL=' .env | cut -d= -f2- | tr -d '"')"
gunzip -c db.sql.gz | psql "$DB_URL" -v ON_ERROR_STOP=1 -q
cat uploads.tar.gz.part-* > uploads.tar.gz && tar -xzf uploads.tar.gz
rm db.sql.gz uploads.tar.gz uploads.tar.gz.part-*
```
Bazaya test rezervasiyaları, müraciətlər və admin istifadəçiləri düşmür.

### 5. İlk build və admin
```bash
bash ~/podkast-src/deploy/cpanel/deploy.sh
cd ~/podkast-src && PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH npm run db:seed-admin
```
Build 1 CPU-da bir neçə dəqiqə çəkir; sonda `✓ live: <commit>`.

### 6. Test domeni və Node.js tətbiqi
1. cPanel → **Domains → Create A New Domain**: `test.podkast.az`, document root `podkast-public`.
2. cPanel → **Setup Node.js App → Create Application**: Node **22.x**, **Production**,
   Application root `podkast-app`, URL `test.podkast.az`, startup file `app.js`,
   Environment variable `NODE_OPTIONS` = `--max-old-space-size=1024 --v8-pool-size=2`. Create → Start
   ("Run NPM Install" lazım deyil).
3. `~/podkast-public/.htaccess`-in ən YUXARISINA `deploy/cpanel/htaccess.txt`-dəki qaydaları
   əlavə et, `podkast.az` yerinə `test.podkast.az` yaz.

### 7. Testdə yoxla
- Bütün səhifələr 320 / 768 / 1440 px-də, menyu, admin (`/admin`).
- **Rezervasiya**: müraciət göndər → admin-də görünür, email-lər (admin + müştəri) gəlir;
  eyni vaxt ikinci dəfə tutula bilmir; statusu təsdiqlə → müştəriyə email.
- Paket müraciəti, əlaqə forması, şəkillər və videolar (`/media/...` LiteSpeed-dən gəlir).
- `npm run check:launch` (`~/podkast-src`-də) — qalan placeholder-lər.

### 8. Backup cron
cPanel → **Cron Jobs** (gündə 03:15):
```
15 3 * * * bash $HOME/podkast-src/deploy/cpanel/backup.sh >/dev/null 2>&1
```

## B. Canlıya keçid (müştərinin razılığı ilə)

1. `npm run check:launch` — `✗` qalmamalıdır (real əlaqə məlumatları, sosial linklər, hüquqi mətnlər…).
2. cPanel → **Domains**: `podkast.az`-ın document root-u → `podkast-public` (domen başqa
   hostinqdədirsə — əvvəlcə DNS / domen hesaba əlavə olunur).
3. **Setup Node.js App** → Edit → Application URL `podkast.az` → Save → Restart.
4. `.env`: `SITE_URL=https://podkast.az`, `SITE_NOINDEX` sətrini sil →
   `bash ~/podkast-src/deploy/cpanel/deploy.sh` (sitemap, canonical, robots yenilənir).
5. `.htaccess`-də `test.podkast.az` → `podkast.az`.
6. Digər domen (`podcast.az`) → cPanel → **Redirects**: Permanent 301 → `https://podkast.az/`,
   "with or without www", "Wild Card Redirect".
7. Yoxla: `https://podkast.az`, `https://www.podkast.az` (→ 301), `http://` (→ https), `podcast.az` (→ 301).
8. Google: **Search Console** (Domain property, sitemap `https://podkast.az/sitemap.xml`),
   **Google Business Profile** (ad, ünvan, telefon, iş saatları saytdakı ilə eyni olsun).

## C. Yeniləmə

Bu kompüterdə `git push`, sonra serverdə:
```bash
bash ~/podkast-src/deploy/cpanel/deploy.sh
```
Migration-lar, build və keçid avtomatikdir; build vaxtı köhnə versiya işləyir. Geri qaytarmaq:
```bash
bash ~/podkast-src/deploy/cpanel/rollback.sh          # siyahı
bash ~/podkast-src/deploy/cpanel/rollback.sh <id>     # həmin versiyaya qayıt
```

## Bilmək lazım olanlar (marketinq.az təcrübəsi)

- **Thread limiti**: CloudLinux hər thread-i proses sayır (150). `deploy.sh` və `app.js` bütün
  hovuzları 2-yə endirir; build tək CPU ilə gedir; `.next` hər dəfə silinir (köhnə CSS problemi).
- **Media Node-dan keçmir**: `deploy.sh` `~/podkast-public/media` → `shared/uploads` linki qurur,
  LiteSpeed şəkil və videoları özü verir (`media.htaccess`: 1 il cache, PHP qadağan).
- **Proxy öz saytına HTTP sorğu atmır** (marketinq.az-da ilişməyə səbəb olmuşdu) — studiya
  slug-ları və yönləndirmələr birbaşa bazadan oxunur.
- **Admin dəyişiklikləri bütün proseslərə** ≤ 3 saniyəyə çatır (`cache_tags`).
- **Videolar**: hesabda `~/bin/ffmpeg` varsa `.env`-də `FFMPEG_PATH`/`FFPROBE_PATH` — admin-dən
  yüklənən videolar arxa planda sıxılır.
- **Saat qurşağı**: rezervasiyalar bazada UTC, saytda və email-lərdə Bakı vaxtı (UTC+4) — serverin
  saat qurşağı fərq etmir.
- Login-dən sonra logda "failed to get redirect response 0.0.0.0:3000" — zərərsizdir.
