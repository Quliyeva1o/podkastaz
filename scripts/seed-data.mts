// Initial content for every section, copied from Figma (Podcast.az, Page 1). Where Figma still
// has lorem ipsum (legal pages) a short draft note is used instead, so placeholder Latin never
// reaches the live site; the client replaces it in the admin panel.
import type { Localized } from "../src/i18n/config";
import type { PageSeo } from "../src/db/schema";
import type { PageKey } from "../src/sections/pages";
import type { SectionType } from "../src/sections/registry";

const t = (az: string): Localized => ({ az });
const lnk = (label: string, target: string) => ({ label: t(label), target });
type Align = "center" | "left";
const header = (
  title: string,
  subtitle = "",
  headingSuffix = "",
  opts: { crumb?: string; mobile?: Align; desktop?: Align; cta?: [string, string] } = {},
) => ({
  type: "pageHeader" as const,
  data: {
    title: t(title),
    subtitle: t(subtitle),
    cta: opts.cta ? lnk(...opts.cta) : lnk("", ""),
    alignDesktop: opts.desktop ?? "center",
    alignMobile: opts.mobile ?? "center",
    crumb: t(opts.crumb ?? ""),
    headingSuffix: t(headingSuffix),
  },
});
const left = { mobile: "left" as const };

/** Seed rows: `<page>.<slot>` (or a slot's `shareKey`) → section type and data. */
export const sectionData: Record<string, { type: SectionType; data: Record<string, unknown> }> = {
  "global.header": { type: "header", data: { logo: null, logoDark: null, homeLabel: t("Ana səhifə") } },
  "global.menu": {
    type: "menu",
    data: {
      nav: [
        { link: lnk("Ana səhifə", "home") },
        { link: lnk("Haqqımızda", "about") },
        { link: lnk("Xidmətlər", "services") },
        { link: lnk("Studiyalar", "studios") },
        { link: lnk("Paketlər", "packages") },
        { link: lnk("İşlərimiz", "works") },
      ],
      bookingTitle: t("Rezervasiya et"),
      bookingText: t("Vaxtını seç, studiyanı təmin et."),
      bookingLink: lnk("Rezervasiya et", "booking"),
      bookingBackground: null,
      contactTitle: t("Əlaqə"),
      contactText: t("Sualınız var? Bizə müraciət edin"),
      contactLink: lnk("Əlaqə", "contact"),
      privacy: lnk("Məxfilik siyasəti", "privacy"),
      terms: lnk("İstifadəçi qaydaları", "terms"),
    },
  },
  "global.contacts": {
    type: "contacts",
    data: {
      // Figma sample data — to be confirmed by the client (PLAN.md §2.4).
      address: t("Bakı şəhəri, Ə.Rəcəbli 1/10"),
      phone: "+99412 565 77 77",
      email: "info@podkast.az",
      socialTitle: t("Biz sosial şəbəkələrdə"),
      socials: [
        { network: "facebook", url: "https://www.facebook.com/" },
        { network: "linkedin", url: "https://www.linkedin.com/" },
        { network: "instagram", url: "https://www.instagram.com/" },
        { network: "youtube", url: "https://www.youtube.com/" },
        { network: "whatsapp", url: "https://wa.me/994125657777" },
        { network: "x", url: "https://x.com/" },
      ],
      copyright: t("© 2026 Podcast.az"),
    },
  },
  "global.labels": {
    type: "labels",
    data: {
      menuOpen: t("Menyu"),
      menuClose: t("Menyunu bağla"),
      breadcrumb: t("Naviqasiya"),
      notFoundTitle: t("Səhifə tapılmadı"),
      notFoundText: t("Axtardığınız səhifə silinib və ya ünvanı dəyişib."),
      backHome: t("Ana səhifəyə qayıt"),
    },
  },
  "global.notifications": {
    type: "notifications",
    data: { recipients: "info@podkast.az", subject: t("Saytdan yeni müraciət") },
  },
  "global.business": {
    type: "business",
    data: {
      legalName: "",
      phones: [{ value: "+994 12 565 77 77" }],
      street: t("Ə.Rəcəbli küç. 1/10"),
      city: "Baku",
      postalCode: "",
      latitude: "",
      longitude: "",
      openingHours: "Mo-Su 10:00-22:00",
      priceRange: "₼₼",
      areaServed: "Azerbaijan",
    },
  },

  "home.hero": {
    type: "hero",
    data: {
      background: null,
      title: t("Səsini Brendə Çevir"),
      seoHeading: t("— Bakıda podcast studiyası: video və audio podcast çəkilişi, studiya icarəsi"),
      subtitle: t("Podcast, video və kontent üçün professional studio"),
      primary: lnk("Rezervasiya et", "booking"),
      secondary: lnk("Paketlər", "packages"),
    },
  },
  "about.header": header("Haqqımızda", "", "— Bakıda podcast və video studiya", left),
  "services.header": header(
    "Xidmətlər",
    "Səsdən yayıma qədər bütün xidmətlər bir məkanda.",
    "— podcast çəkilişi, montaj, studiya icarəsi və canlı yayım",
    { ...left, cta: ["Müraciət et", "contact"] },
  ),
  "studios.header": header(
    "Studiyalar",
    "Studiyalarımız peşəkar səs avadanlıqları, optimal akustika və rahat çəkiliş mühiti ilə təchiz olunub.",
    "— Bakıda podcast studiyası icarəsi",
  ),
  "decors.header": header("Dekorlar", "Sizə uyğun olan dekoru seçib rezervasiya edin!", "", { desktop: "left" }),
  "packages.header": header(
    "Paketlər",
    "Hər büdcəyə uyğun seçim, hər səviyyədə peşəkar studiya.",
    "— podcast çəkilişi qiymətləri",
  ),
  "packageRequest.header": header("Paketə qoşul", "Büdcəyə uyğun paketi seçib bizə müraciət edin", "", { mobile: "left", desktop: "left", crumb: "Müraciət et" }),
  "works.header": header("İşlərimiz", "Kadrların arxasında duran keyfiyyəti kəşf et.", "— podcast və video çəkiliş nümunələri"),
  "worksVideos.header": header("İşlərimiz", "Kadrların arxasında duran keyfiyyəti kəşf et.", "— video podcast nümunələri"),
  "booking.header": header("Rezervasiya et", "Vaxtını seç, studiyanı təmin et.", "— podcast studiyası onlayn rezervasiya", { mobile: "left", desktop: "left" }),
  "contact.header": header("Əlaqə", "Podkast layihəniz üçün bizimlə əlaqə saxlayın.", "", left),
  "about.intro": {
    type: "aboutIntro",
    data: {
      image: null,
      title: t("Səsiniz burada öz auditoriyasını tapır."),
      // Draft (Figma has lorem ipsum): replace with the client's text in the admin panel.
      body: t(
        "Podkast.az Bakıda podcast, video və kontent çəkilişi üçün qurulmuş peşəkar studiyalar şəbəkəsidir. Akustik izolyasiyalı otaqlar, peşəkar mikrofonlar, 4K kameralar və işıqlandırma ilə ideyanızı yüksək keyfiyyətli kontentə çeviririk.\n\nStudiyanı saatlıq icarəyə götürə, hazır paketlərdən birini seçə və ya çəkilişdən montaja, qısa videolardan canlı yayıma qədər bütün işi komandamıza həvalə edə bilərsiniz. Hər studiyada fərqli auditoriyalar üçün hazırlanmış dekorlar var — həkimlər, marketoloqlar, dizaynerlər və müəllimlər üçün.",
      ),
    },
  },
  "about.partners": { type: "partners", data: { title: t("Tərəfdaşlarımız"), logoHeight: "56" } },
  advantages: {
    type: "advantages",
    data: {
      title: t("Səsiniz burada öz auditoriyasını tapır."),
      background: null,
      items: [
        { icon: "VideoCamera", title: t("4K Keyfiyyət"), text: t("Kristal təmiz, yüksək səviyyəli çəkiliş"), accent: true },
        { icon: "Alarm", title: t("Çevik Rezervasiya"), text: t("Saat və ya günlük sifariş"), accent: false },
        { icon: "Rocket", title: t("Sürətli Production"), text: t("Sürətli geridönüş, peşəkar nəticələr"), accent: true },
        { icon: "MapPinArea", title: t("Uyğun Ünvanlar"), text: t("Sizə yaxın studiyalar"), accent: false },
      ],
    },
  },
  "services.list": { type: "serviceList", data: {} },
  "studios.list": { type: "studioList", data: { cta: t("Dekorlara bax") } },
  "decors.list": { type: "decorList", data: { cta: t("Rezervasiya et") } },
  "packages.list": {
    type: "packageList",
    data: { cta: t("Müraciət et"), highlightLabel: t("Ən çox seçilən"), currency: t("AZN"), addonsTitle: t("ADD-ON XİDMƏTLƏR") },
  },
  works: {
    type: "worksGallery",
    data: {
      photosLabel: t("Şəkillər"),
      videosLabel: t("Videolar"),
      playLabel: t("Videonu izlə"),
      prevLabel: t("Əvvəlki"),
      nextLabel: t("Növbəti"),
      closeLabel: t("Bağla"),
    },
  },
  "contact.contact": {
    type: "contactSection",
    data: {
      title: t("Əlaqə saxlayın, sizi dinləmək üçün buradayıq!"),
      addressLabel: t("Ünvan"),
      phoneLabel: t("Telefon"),
      emailLabel: t("E-Poçt"),
      firstName: t("Ad"),
      firstNamePlaceholder: t("Ramin"),
      lastName: t("Soyad"),
      lastNamePlaceholder: t("Quliyev"),
      phone: t("Telefon"),
      phonePlaceholder: t("+994 99 555 55 55"),
      email: t("E-mail ünvanı"),
      emailPlaceholder: t("raminquliyev@gmail.com"),
      subject: t("Mövzu"),
      subjectPlaceholder: t("Video podcast çəkilişi xidməti"),
      message: t("Mesajınız"),
      messagePlaceholder: t("Mesajınızı daxil edin"),
      submit: t("Mesajını göndər"),
      success: t("Mesajınız göndərildi. Tezliklə sizinlə əlaqə saxlayacağıq."),
      error: t("Mesaj göndərilmədi. Məlumatları yoxlayıb yenidən cəhd edin."),
      rateLimit: t("Çox tez-tez göndərirsiniz. Bir neçə dəqiqə sonra yenidən cəhd edin."),
    },
  },
  "booking.form": {
    type: "bookingForm",
    data: {
      breadcrumbStudios: t("Studiyalar"),
      breadcrumbDecors: t("Dekorlar"),
      detailsTitle: t("Dekor haqqında detallar"),
      studioLabel: t("Studiya"),
      decorLabel: t("Dekor"),
      otherTitle: t("Digər"),
      otherText: t("İstəyinizə uyğun dekorun düzəlməsi"),
      otherRequest: t("İstəyiniz"),
      otherRequestPlaceholder: t("Necə dekor istədiyinizi qısaca yazın"),
      dateTimeTitle: t("Tarix və saat"),
      dateLabel: t("Tarix"),
      datePlaceholder: t("gg / aa / iiii"),
      startLabel: t("Başlama vaxtı"),
      endLabel: t("Bitmə vaxtı"),
      timePlaceholder: t("00 : 00"),
      closedDay: t("Bu gün studiya bağlıdır. Başqa tarix seçin."),
      noSlots: t("Bu gün boş vaxt qalmayıb. Başqa tarix seçin."),
      chooseStudioFirst: t("Əvvəlcə studiyanı seçin."),
      chooseDateFirst: t("Əvvəlcə tarixi seçin."),
      personalTitle: t("Şəxsi məlumatlar"),
      firstName: t("Ad"),
      firstNamePlaceholder: t("Ramin"),
      lastName: t("Soyad"),
      lastNamePlaceholder: t("Quliyev"),
      phone: t("Telefon"),
      phonePlaceholder: t("+994 99 555 55 55"),
      email: t("E-mail ünvanı"),
      emailPlaceholder: t("raminquliyev@gmail.com"),
      consentAccuracy: t("Məlumatların doğruluğunu təsdiq edirəm"),
      consentTerms: t("Saytın {məxfilik siyasəti} və {istifadə qaydaları} ilə tanış olmuşam"),
      submit: t("Müraciət et"),
      successTitle: t("Qəbul olundu!"),
      successText: t(
        "Müraciətiniz üçün təşəkkür edirik. Məlumatlarınız Podkast.az saytının administrasiyası tərəfindən yoxlanıldıqdan sonra sizinlə əlaqə saxlanacaq.",
      ),
      successButton: t("Ana səhifəyə qayıt"),
      errorTaken: t("Bu vaxt artıq tutulub. Zəhmət olmasa başqa vaxt seçin."),
      errorInvalid: t("Məlumatlar tam deyil və ya yanlışdır. Yoxlayıb yenidən cəhd edin."),
      errorRate: t("Çox tez-tez müraciət edirsiniz. Bir neçə dəqiqə sonra yenidən cəhd edin."),
      errorServer: t("Müraciət göndərilmədi. Bir az sonra yenidən cəhd edin və ya bizə zəng edin."),
    },
  },
  "packageRequest.form": {
    type: "packageRequestForm",
    data: {
      detailsTitle: t("Paket haqqında detallar"),
      addonsTitle: t("Add-On Xidmətlər"),
      totalLabel: t("Ümumi"),
      currency: t("AZN"),
      customSuffix: t("+ fərdi"),
      personalTitle: t("Şəxsi məlumatlar"),
      firstName: t("Ad"),
      firstNamePlaceholder: t("Jane"),
      lastName: t("Soyad"),
      lastNamePlaceholder: t("Doe"),
      phone: t("Telefon"),
      phonePlaceholder: t("+994 00 000 00 00"),
      email: t("E-mail ünvanı"),
      emailPlaceholder: t("emailhere@gmail.com"),
      consentAccuracy: t("Məlumatların doğruluğunu təsdiq edirəm"),
      consentTerms: t("Saytın {məxfilik siyasəti} və {istifadə qaydaları} ilə tanış olmuşam"),
      submit: t("Müraciət et"),
      successTitle: t("Qəbul olundu!"),
      successText: t(
        "Müraciətiniz üçün təşəkkür edirik. Məlumatlarınız Podkast.az saytının administrasiyası tərəfindən yoxlanıldıqdan sonra sizinlə əlaqə saxlanacaq.",
      ),
      successButton: t("Ana səhifəyə qayıt"),
      errorInvalid: t("Məlumatlar tam deyil və ya yanlışdır. Yoxlayıb yenidən cəhd edin."),
      errorRate: t("Çox tez-tez müraciət edirsiniz. Bir neçə dəqiqə sonra yenidən cəhd edin."),
      errorServer: t("Müraciət göndərilmədi. Bir az sonra yenidən cəhd edin və ya bizə zəng edin."),
    },
  },
  "global.requestEmails": {
    type: "requestEmails",
    data: {
      adminSubject: t("Yeni paket müraciəti"),
      customerSubject: t("{paket} paketi üçün müraciətiniz qəbul olundu — Podkast.az"),
      customerBody: t("Salam, {ad}!\n\n{paket} paketi üçün müraciətiniz bizə çatdı (ümumi: {məbləğ}). Tezliklə sizinlə əlaqə saxlayacağıq."),
    },
  },
  "global.bookingEmails": {
    type: "bookingEmails",
    data: {
      adminSubject: t("Yeni rezervasiya"),
      newSubject: t("Rezervasiya müraciətiniz qəbul olundu — Podkast.az"),
      newBody: t(
        "Salam, {ad}!\n\n{tarix}, {saat} üçün {studiya} müraciətiniz bizə çatdı. Administrator yoxladıqdan sonra təsdiq məktubu göndərəcəyik.",
      ),
      confirmedSubject: t("Rezervasiyanız təsdiqləndi — Podkast.az"),
      confirmedBody: t("Salam, {ad}!\n\n{tarix}, {saat} üçün {studiya} rezervasiyanız təsdiqləndi. Sizi gözləyirik!"),
      rejectedSubject: t("Rezervasiya müraciətiniz haqqında — Podkast.az"),
      rejectedBody: t(
        "Salam, {ad}!\n\nTəəssüf ki, {tarix}, {saat} üçün {studiya} rezervasiyasını təsdiqləyə bilmirik. Başqa vaxt seçmək üçün saytımıza baxın və ya bizə zəng edin.",
      ),
      cancelledSubject: t("Rezervasiyanız ləğv edildi — Podkast.az"),
      cancelledBody: t("Salam, {ad}!\n\n{tarix}, {saat} üçün {studiya} rezervasiyanız ləğv edildi. Suallarınız olarsa, bizə yazın."),
    },
  },
  "terms.header": header("İstifadəçi qaydaları", "", "", left),
  "terms.content": {
    type: "legal",
    data: {
      blocks: [
        {
          title: t(""),
          body: t("İstifadəçi qaydalarının mətni hazırlanır. Mətn hüquqşünas tərəfindən təsdiqləndikdən sonra burada dərc olunacaq."),
        },
      ],
    },
  },
  "privacy.header": header("Məxfilik siyasəti", "", "", left),
  "privacy.content": {
    type: "legal",
    data: {
      blocks: [
        {
          title: t(""),
          body: t("Məxfilik siyasətinin mətni hazırlanır. Mətn hüquqşünas tərəfindən təsdiqləndikdən sonra burada dərc olunacaq."),
        },
      ],
    },
  },
};

const seo = (title: string, description: string): PageSeo => ({ title: t(title), description: t(description) });

/** Titles ≤ 60 and descriptions ≤ 160 characters, with the main search phrases (PLAN.md §11). */
export const pageSeo: Record<PageKey, PageSeo> = {
  global: seo("", ""),
  home: seo(
    "Podkast.az — Bakıda podcast studiyası",
    "Video və audio podcast çəkilişi, studiya icarəsi, montaj və Reels hazırlanması. Bakıda peşəkar podcast studiyasını onlayn rezervasiya edin.",
  ),
  about: seo(
    "Haqqımızda — podcast studiyası Bakıda | Podkast.az",
    "Podkast.az: 4K çəkiliş, çevik rezervasiya, sürətli production və sizə yaxın studiyalar. Səsiniz burada öz auditoriyasını tapır.",
  ),
  services: seo(
    "Xidmətlər: podcast çəkilişi, montaj | Podkast.az",
    "Studiya icarəsi, video və audio podcast çəkilişi, montaj və post-production, Shorts/Reels, canlı yayım və səyyar studiya — bir məkanda.",
  ),
  studios: seo(
    "Studiyalar — podcast studiya icarəsi Bakıda | Podkast.az",
    "Peşəkar səs avadanlığı, optimal akustika və rahat çəkiliş mühiti olan podcast studiyalarımız və dekorlarımızla tanış olun.",
  ),
  decors: seo("", ""),
  packages: seo(
    "Paketlər və qiymətlər — podcast çəkilişi | Podkast.az",
    "START, PRO və PREMIUM podcast paketləri: studiya, kamera, mikrofon, montaj və qısa videolar. Əlavə xidmətlərlə büdcənizə uyğun seçin.",
  ),
  packageRequest: seo(
    "Paketə müraciət | Podkast.az",
    "Podcast paketini və əlavə xidmətləri seçin, ümumi məbləği görün və müraciət göndərin — sizinlə tezliklə əlaqə saxlayacağıq.",
  ),
  works: seo(
    "İşlərimiz — podcast çəkiliş nümunələri | Podkast.az",
    "Podkast.az studiyalarında çəkilmiş podcast-lardan kadrlar: kadrların arxasında duran keyfiyyəti kəşf edin.",
  ),
  worksVideos: seo(
    "Video podcast nümunələri | Podkast.az",
    "Video podcast çəkilişi, audio podcast yazımı və səyyar studiya işlərimizdən nümunələr.",
  ),
  booking: seo(
    "Studiya rezervasiyası — onlayn | Podkast.az",
    "Studiya, dekor, tarix və saatı seçin — podcast studiyasını onlayn rezervasiya edin. Təsdiq üçün sizinlə əlaqə saxlayacağıq.",
  ),
  contact: seo(
    "Əlaqə — Podkast.az, Bakı",
    "Podkast layihəniz üçün bizimlə əlaqə saxlayın: ünvan, telefon, e-poçt və sosial şəbəkələr. Mesajınızı formadan göndərin.",
  ),
  terms: seo("İstifadəçi qaydaları | Podkast.az", "Podkast.az saytının və studiya xidmətlərinin istifadə qaydaları."),
  privacy: seo("Məxfilik siyasəti | Podkast.az", "Podkast.az şəxsi məlumatları necə toplayır, istifadə edir və qoruyur."),
};
