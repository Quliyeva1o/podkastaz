import { image, imageOrVideo, link, list, plain, select, text, toggle, type Field } from "./fields";
import { advantageIcons, socialNetworks } from "./types";

const formFields = [
  ["firstName", "Ad"],
  ["lastName", "Soyad"],
  ["phone", "Telefon"],
  ["email", "E-mail"],
  ["subject", "Mövzu"],
  ["message", "Mesaj"],
] as const;

/** Rezervasiya forması: field name → admin label (Figma texts are the seed). */
const bookingFormFields: [string, string, boolean?][] = [
  ["breadcrumbStudios", "Breadcrumb (dekordan gələndə): Studiyalar"],
  ["breadcrumbDecors", "Breadcrumb (dekordan gələndə): Dekorlar"],
  ["detailsTitle", "Sol sütun başlığı (Dekor haqqında detallar)"],
  ["studioLabel", "Studiya"],
  ["decorLabel", "Dekor"],
  ["otherTitle", "“Digər” dekor: ad"],
  ["otherText", "“Digər” dekor: mətn"],
  ["otherRequest", "“Digər” seçiləndə: istək sahəsi"],
  ["otherRequestPlaceholder", "“Digər” seçiləndə: nümunə mətn"],
  ["dateTimeTitle", "Tarix və saat"],
  ["dateLabel", "Tarix"],
  ["datePlaceholder", "Tarix: boş (gg / aa / iiii)"],
  ["startLabel", "Başlama vaxtı"],
  ["endLabel", "Bitmə vaxtı"],
  ["timePlaceholder", "Saat: boş (00 : 00)"],
  ["calendarToday", "Təqvim: “Bu gün” işarəsi"],
  ["calendarTaken", "Təqvim: “Tutulub” işarəsi"],
  ["calendarSelected", "Təqvim: “Seçilib” işarəsi"],
  ["months", "Təqvim: ayların adları (vergüllə, Yanvar…Dekabr)"],
  ["weekdays", "Təqvim: həftə günləri (vergüllə, bazar ertəsindən)"],
  ["prevMonth", "Təqvim: əvvəlki ay düyməsi (ekran oxuyucu)"],
  ["nextMonth", "Təqvim: növbəti ay düyməsi (ekran oxuyucu)"],
  ["hourLabel", "Saat seçimi: “Saat” sütunu"],
  ["minuteLabel", "Saat seçimi: “Dəqiqə” sütunu"],
  ["confirmTime", "Saat seçimi: təsdiq düyməsi"],
  ["closedDay", "Bu gün studiya bağlıdır"],
  ["noSlots", "Bu gün boş vaxt yoxdur"],
  ["chooseStudioFirst", "Əvvəlcə studiya seçin"],
  ["chooseDateFirst", "Əvvəlcə tarix seçin"],
  ["personalTitle", "Şəxsi məlumatlar"],
  ["firstName", "Ad"],
  ["firstNamePlaceholder", "Ad: nümunə"],
  ["lastName", "Soyad"],
  ["lastNamePlaceholder", "Soyad: nümunə"],
  ["phone", "Telefon"],
  ["phonePlaceholder", "Telefon: nümunə"],
  ["email", "E-mail"],
  ["emailPlaceholder", "E-mail: nümunə"],
  ["consentAccuracy", "Razılıq 1 (məlumatların doğruluğu)"],
  ["consentTerms", "Razılıq 2 — {məxfilik} və {qaydalar} linkə çevrilir", true],
  ["submit", "Göndər düyməsi"],
  ["successTitle", "Qəbul olundu: başlıq"],
  ["successText", "Qəbul olundu: mətn", true],
  ["successButton", "Qəbul olundu: düymə"],
  ["errorTaken", "Xəta: vaxt artıq tutulub", true],
  ["errorInvalid", "Xəta: məlumatlar yanlışdır", true],
  ["errorRate", "Xəta: çox tez-tez", true],
  ["errorServer", "Xəta: server", true],
];

/** Paket müraciəti forması: field name → admin label. */
const packageFormFields: [string, string, boolean?][] = [
  ["detailsTitle", "Sol sütun başlığı (Paket haqqında detallar)"],
  ["addonsTitle", "Add-on başlığı"],
  ["totalLabel", "Ümumi"],
  ["currency", "Valyuta (AZN)"],
  ["customSuffix", "Fərdi qiymətli add-on seçiləndə məbləğin yanında (+ fərdi)"],
  ...bookingFormFields.filter(([n]) =>
    ["personalTitle", "firstName", "firstNamePlaceholder", "lastName", "lastNamePlaceholder", "phone", "phonePlaceholder", "email", "emailPlaceholder", "consentAccuracy", "consentTerms", "submit", "successTitle", "successText", "successButton", "errorInvalid", "errorRate", "errorServer"].includes(n),
  ),
];

const align = [
  { value: "center", label: "Mərkəzdə" },
  { value: "left", label: "Solda" },
];

export type SectionDefinition = {
  type: string;
  /** Name shown in the admin panel. */
  label: string;
  fields: Field[];
};

const menuCard = (name: string, label: string, extra: Field[] = []): Field[] => [
  text(`${name}Title`, `${label}: başlıq`),
  text(`${name}Text`, `${label}: mətn`),
  link(`${name}Link`, `${label}: link`),
  ...extra,
];

/** Every section type from the Figma file. Field names mirror the Figma layers. */
export const sections = {
  header: {
    type: "header",
    label: "Header",
    fields: [
      image("logo", "Loqo (tünd fon üçün, ağ) — ana səhifə"),
      image("logoDark", "Loqo (ağ fon üçün) — daxili səhifələr"),
      text("homeLabel", "Breadcrumb: ana səhifə adı"),
    ],
  },
  menu: {
    type: "menu",
    label: "Menyu",
    fields: [
      list("nav", "Menyu linkləri", "Link", [link("link", "Link")]),
      ...menuCard("booking", "Narıncı kart", [image("bookingBackground", "Narıncı kart: fon şəkli")]),
      ...menuCard("contact", "Tünd kart"),
      link("privacy", "Məxfilik siyasəti linki"),
      link("terms", "İstifadəçi qaydaları linki"),
    ],
  },
  contacts: {
    type: "contacts",
    label: "Əlaqə məlumatları və sosial şəbəkələr",
    fields: [
      text("address", "Ünvan"),
      plain("phone", "Telefon", "+994 12 565 77 77"),
      plain("email", "E-poçt", "info@podkast.az"),
      text("socialTitle", "Sosial şəbəkələr başlığı"),
      list("socials", "Sosial şəbəkələr", "Şəbəkə", [
        select(
          "network",
          "Şəbəkə",
          socialNetworks.map((n) => ({ value: n, label: n === "x" ? "X (Twitter)" : n[0].toUpperCase() + n.slice(1) })),
        ),
        plain("url", "Link"),
      ]),
      text("copyright", "Copyright (ana səhifə)"),
    ],
  },
  business: {
    type: "business",
    label: "Şirkət məlumatları (Google üçün)",
    fields: [
      plain("legalName", "Hüquqi ad", "Podkast.az MMC"),
      list("phones", "Telefonlar", "Telefon", [plain("value", "Nömrə (+994 …)")]),
      text("street", "Küçə və bina"),
      plain("city", "Şəhər (ingiliscə)", "Baku"),
      plain("postalCode", "Poçt indeksi", "AZ1000"),
      plain("latitude", "Xəritə: enlik", "40.4093"),
      plain("longitude", "Xəritə: uzunluq", "49.8671"),
      plain("openingHours", "İş saatları (schema.org formatı)", "Mo-Su 10:00-22:00"),
      plain("priceRange", "Qiymət səviyyəsi", "₼₼"),
      plain("areaServed", "Xidmət göstərilən regionlar", "Azerbaijan"),
    ],
  },
  notifications: {
    type: "notifications",
    label: "Email bildirişləri",
    fields: [
      plain("recipients", "Müraciətlər bu ünvanlara göndərilsin (vergüllə ayırın)", "info@podkast.az"),
      text("subject", "Məktubun mövzusu"),
    ],
  },
  labels: {
    type: "labels",
    label: "UI mətnləri",
    fields: [
      text("menuOpen", "Menyu düyməsi (ekran oxuyucu üçün)"),
      text("menuClose", "Menyunu bağla (ekran oxuyucu üçün)"),
      text("breadcrumb", "Breadcrumb (ekran oxuyucu üçün)"),
      text("notFoundTitle", "404: başlıq"),
      text("notFoundText", "404: mətn", true),
      text("backHome", "“Ana səhifəyə qayıt” düyməsi"),
    ],
  },
  bookingEmails: {
    type: "bookingEmails",
    label: "Rezervasiya email-ləri",
    fields: [
      text("adminSubject", "Adminə: mövzu"),
      ...([
        ["new", "Müraciət qəbul olundu"],
        ["confirmed", "Təsdiqləndi"],
        ["rejected", "Rədd edildi"],
        ["cancelled", "Ləğv edildi"],
      ] as const).flatMap(([k, label]) => [
        text(`${k}Subject`, `Müştəriyə — ${label}: mövzu`),
        text(`${k}Body`, `Müştəriyə — ${label}: mətn ({ad}, {studiya}, {dekor}, {tarix}, {saat} əvəz olunur)`, true),
      ]),
    ],
  },
  requestEmails: {
    type: "requestEmails",
    label: "Paket müraciəti email-ləri",
    fields: [
      text("adminSubject", "Adminə: mövzu"),
      text("customerSubject", "Müştəriyə: mövzu ({ad}, {paket}, {məbləğ} əvəz olunur)"),
      text("customerBody", "Müştəriyə: mətn ({ad}, {paket}, {məbləğ} əvəz olunur)", true),
    ],
  },
  pageHeader: {
    type: "pageHeader",
    label: "Səhifə başlığı",
    fields: [
      text("title", "Başlıq (H1)"),
      text("subtitle", "Alt mətn", true),
      link("cta", "Düymə (istəyə bağlı — boş qalsa göstərilmir)"),
      select("alignDesktop", "Düzülüş (desktop)", align),
      select("alignMobile", "Düzülüş (mobil)", align),
      text("crumb", "Breadcrumb adı (boşdursa başlıq)"),
      text("headingSuffix", "H1 davamı — ekranda görünmür, Google üçün (məs. “— Bakıda podcast studiyası”)"),
    ],
  },
  hero: {
    type: "hero",
    label: "Hero (tək ekran)",
    fields: [
      imageOrVideo("background", "Fon (şəkil və ya video)"),
      text("title", "Başlıq (H1)"),
      text("seoHeading", "H1 davamı — ekranda görünmür, Google üçün"),
      text("subtitle", "Alt mətn"),
      link("primary", "Ağ düymə"),
      link("secondary", "Şəffaf düymə"),
    ],
  },
  bookingForm: {
    type: "bookingForm",
    label: "Rezervasiya forması",
    fields: [
      ...bookingFormFields.map(([name, label, multiline]) => text(name, label, multiline)),
    ],
  },
  packageRequestForm: {
    type: "packageRequestForm",
    label: "Paket müraciəti forması",
    fields: packageFormFields.map(([name, label, multiline]) => text(name, label, multiline)),
  },
  aboutIntro: {
    type: "aboutIntro",
    label: "Giriş (şəkil + mətn)",
    fields: [image("image", "Şəkil"), text("title", "Başlıq (narıncı)", true), text("body", "Mətn (abzaslar boş sətirlə ayrılır)", true)],
  },
  partners: {
    type: "partners",
    label: "Tərəfdaşlar (loqolar kolleksiyadan)",
    fields: [text("title", "Başlıq (ekranda görünmür, ekran oxuyucu üçün)"), plain("logoHeight", "Loqoların hündürlüyü (px, desktop)", "56")],
  },
  advantages: {
    type: "advantages",
    label: "Üstünlüklər (4 kart)",
    fields: [
      text("title", "Başlıq (boşdursa göstərilmir)"),
      image("background", "Narıncı kartların fonu"),
      list("items", "Kartlar", "Kart", [
        select("icon", "İkon", advantageIcons.map((v) => ({ value: v, label: v }))),
        text("title", "Başlıq"),
        text("text", "Mətn"),
        toggle("accent", "Narıncı kart"),
      ]),
    ],
  },
  serviceList: { type: "serviceList", label: "Xidmət kartları (kolleksiyadan)", fields: [] },
  studioList: {
    type: "studioList",
    label: "Studiyalar (Studiyalar və dekorlar bölməsindən)",
    fields: [text("cta", "Düymə: Dekorlara bax")],
  },
  decorList: {
    type: "decorList",
    label: "Dekorlar (studiyanın dekorları)",
    fields: [text("cta", "Düymə: Rezervasiya et")],
  },
  packageList: {
    type: "packageList",
    label: "Paketlər və add-on-lar (kolleksiyadan)",
    fields: [
      text("cta", "Düymə: Müraciət et"),
      text("highlightLabel", "Lent: Ən çox seçilən"),
      text("currency", "Valyuta (AZN)"),
      text("addonsTitle", "Add-on başlığı"),
    ],
  },
  worksGallery: {
    type: "worksGallery",
    label: "İşlərimiz: tab-lar, şəkillər və videolar (kolleksiyadan)",
    fields: [
      text("photosLabel", "Tab: Şəkillər"),
      text("videosLabel", "Tab: Videolar"),
      text("playLabel", "Videonu aç (ekran oxuyucu üçün)"),
      text("prevLabel", "Əvvəlki (ekran oxuyucu üçün)"),
      text("nextLabel", "Növbəti (ekran oxuyucu üçün)"),
      text("closeLabel", "Bağla (ekran oxuyucu üçün)"),
    ],
  },
  contactSection: {
    type: "contactSection",
    label: "Əlaqə: məlumatlar və forma",
    fields: [
      text("title", "Başlıq", true),
      text("addressLabel", "Ünvan etiketi"),
      text("phoneLabel", "Telefon etiketi"),
      text("emailLabel", "E-poçt etiketi"),
      ...formFields.flatMap(([n, label]) => [text(n, `Forma: ${label}`), text(`${n}Placeholder`, `Forma: ${label} — nümunə mətn`)]),
      text("submit", "Göndər düyməsi"),
      text("success", "Uğurlu göndəriş mesajı", true),
      text("error", "Xəta mesajı", true),
      text("rateLimit", "Çox tez-tez göndəriş mesajı", true),
    ],
  },
  legal: {
    type: "legal",
    label: "Hüquqi mətn",
    fields: [
      list("blocks", "Bölmələr", "Bölmə", [
        text("title", "Başlıq (istəyə bağlı)"),
        text("body", "Mətn (abzaslar boş sətirlə ayrılır)", true),
      ]),
    ],
  },
} as const satisfies Record<string, SectionDefinition>;

export type SectionType = keyof typeof sections;

export const isSectionType = (value: string): value is SectionType => value in sections;
