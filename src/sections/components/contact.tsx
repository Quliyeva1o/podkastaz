import { ContactForm, type ContactFormLabels } from "@/components/site/contact-form";
import { cx } from "@/components/site/ui";
import { SocialLinks } from "@/components/site/social-links";
import { tx } from "../helpers";
import type { ContactSectionData, ContactsData, SectionProps } from "../types";

const formKeys = [
  "firstName", "firstNamePlaceholder", "lastName", "lastNamePlaceholder", "phone", "phonePlaceholder",
  "email", "emailPlaceholder", "subject", "subjectPlaceholder", "message", "messagePlaceholder", "submit",
] as const;

/**
 * Əlaqə (Figma "Frame 2095585168"): white card, contact details left (address, phone, e-mail
 * from Ayarlar → Əlaqə, a line, social buttons), the form right. Mobile: one column.
 */
export function ContactSection({ data, lang, contacts }: SectionProps<ContactSectionData> & { contacts?: ContactsData }) {
  const labels = {
    ...Object.fromEntries(formKeys.map((k) => [k, tx(data[k], lang)])),
    success: tx(data.success, lang),
    error: tx(data.error, lang),
    rateLimit: tx(data.rateLimit, lang),
  } as ContactFormLabels;
  const rows = [
    { label: tx(data.addressLabel, lang), value: tx(contacts?.address, lang) },
    { label: tx(data.phoneLabel, lang), value: contacts?.phone ?? "", href: contacts?.phone && `tel:${contacts.phone.replace(/[^\d+]/g, "")}` },
    // Figma sets the email in Roboto 500 (16/18.75).
    { label: tx(data.emailLabel, lang), value: contacts?.email ?? "", href: contacts?.email && `mailto:${contacts.email}`, font: "font-roboto leading-[1.17]!" },
  ].filter((r) => r.value);

  return (
    <section data-section="contact" className="container-page px-4 pt-8 desktop:px-15 desktop:pt-15">
      <div className="grid grid-cols-1 gap-[7.6875rem] rounded-[0.625rem] bg-white desktop:grid-cols-2 desktop:gap-15">
        <div className="reveal flex flex-col gap-6 desktop:gap-12 desktop:p-7.5">
          <h2 className="text-20 leading-[1.32] font-semibold tracking-tight desktop:text-32 desktop:leading-[1.24]">{tx(data.title, lang)}</h2>
          <div className="flex flex-col gap-8 desktop:max-w-[28.8125rem] desktop:flex-1 desktop:justify-between">
            <address className="flex flex-col gap-6 not-italic desktop:gap-8">
              {rows.map((r) => (
                <div key={r.label} className="flex flex-col gap-1.5">
                  <span className="text-16 leading-[1.5] tracking-tight">{r.label}</span>
                  {r.href ? (
                    <a href={r.href} className={cx("text-16 leading-[1.21] font-medium tracking-[-0.015em] hover:text-primary-600", r.font)}>
                      {r.value}
                    </a>
                  ) : (
                    <span className="text-16 leading-[1.21] font-medium tracking-[-0.015em]">{r.value}</span>
                  )}
                </div>
              ))}
            </address>
            <hr className="border-neutral-200" />
            <div className="flex flex-col gap-4">
              <p className="text-16 leading-[1.21] font-medium tracking-[-0.015em]">{tx(contacts?.socialTitle, lang)}</p>
              <SocialLinks
                socials={contacts?.socials ?? []}
                className="flex-wrap gap-3!"
                itemClassName="size-11! border border-neutral-200 bg-white text-primary-600 backdrop-blur-none! hover:border-primary-600"
                iconClassName="size-6!"
              />
            </div>
          </div>
        </div>
        <div className="reveal desktop:p-7.5">
          <ContactForm labels={labels} lang={lang} turnstileKey={process.env.TURNSTILE_SITE_KEY} />
        </div>
      </div>
    </section>
  );
}
