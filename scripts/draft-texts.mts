// Draft texts for places where Figma has lorem ipsum (studio and decor descriptions). They keep
// the layout as designed until the client sends real texts; `npm run check:launch` warns while
// any of them is still live.

export const studioDraft =
  "Səs izolyasiyalı, video və audio podcast üçün hazır studiya. Dekorlardan birini seçin — işıq, səs və çəkilişi komandamız qurur.";

/** By the decor's short name (the booking card label). */
export const decorDrafts: Record<string, string> = {
  "Həkimlər üçün":
    "Sakit və etibar yaradan, açıq tonlu mühit: tibbi mövzular, mütəxəssis müsahibələri və maarifləndirici podcastlar üçün. Söhbət rahat axır, kadr təmiz və peşəkar görünür, izləyici danışana inanır və mövzunu sonadək dinləyir.",
  "Marketoloqlar üçün":
    "Canlı rənglər və müasir detallar: brend, marketinq və biznes söhbətləri üçün enerjili fon. Qonaqlı formatlar, panel müzakirələri və sosial şəbəkələr üçün qısa video kəsimləri üçün də uyğundur, hər kadr brendinizi önə çıxarır.",
  "Dizaynerlər üçün":
    "Rəngli işıq və yaradıcı detallarla zəngin mühit: dizayn, incəsənət və kreativ sahələr haqqında söhbətlər üçün. Kadrın hər bucağı maraqlı görünür, hər çəkiliş öz rəngini və əhval-ruhiyyəsini qazanır, ideyalar ekranda canlanır.",
  "Müəllimlər üçün":
    "İsti tonlu, diqqəti yayındırmayan fon: dərslər, təhsil mövzuları və uzun müsahibələr üçün rahat mühit. Danışan və dinləyən özünü sinifdəki kimi hiss edir, mövzu isə izləyicinin diqqətində qalır və asan yadda qalır.",
};

export const draftTexts = new Set([studioDraft, ...Object.values(decorDrafts)]);
