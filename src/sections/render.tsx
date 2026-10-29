import type { ComponentType, ReactNode } from "react";
import { Breadcrumb, type Crumb } from "@/components/site/breadcrumb";
import { Header } from "@/components/site/header";
import { cx } from "@/components/site/ui";
import type { Locale } from "@/i18n/config";
import { href, type RouteKey } from "@/i18n/routes";
import { getMediaItems, getPageContent, type MediaItem, type RenderedSection } from "@/lib/content/queries";
import { breadcrumbGraph, JsonLd, siteGraph } from "@/lib/structured-data";
import { pageGraph } from "@/lib/page-graph";
import { collectImageIds } from "./fields";
import { navLabel, tx } from "./helpers";
import type { PageKey } from "./pages";
import { isSectionType, sections, type SectionType } from "./registry";
import type { BusinessData, ContactsData, HeaderData, LabelsData, MenuData, PageHeaderData, SectionProps } from "./types";
import { AboutIntroSection } from "./components/about-intro";
import { AdvantagesSection } from "./components/advantages";
import { BookingSection } from "./components/booking";
import { ContactSection } from "./components/contact";
import { DecorListSection } from "./components/decor-list";
import { HeroSection } from "./components/hero";
import { LegalSection } from "./components/legal";
import { PackageListSection } from "./components/package-list";
import { PackageRequestSection } from "./components/package-request";
import { PageHeaderSection } from "./components/page-header";
import { PartnersSection } from "./components/partners";
import { ServiceListSection } from "./components/service-list";
import { StudioListSection } from "./components/studio-list";
import { WorksGallerySection } from "./components/works-gallery";
import type { Decor, Studio } from "@/lib/studios/queries";

/** Extra context every section may use (all optional). */
export type SectionContext = {
  variant?: string;
  contacts?: ContactsData;
  /** The page being rendered (shared sections adapt, e.g. the İşlərimiz tabs). */
  page?: PageKey;
  /** Decors page: the studio and its decors. */
  studio?: { studio: Studio; decors: Decor[] };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySection = ComponentType<SectionProps<any> & SectionContext>;

const components: Partial<Record<SectionType, AnySection>> = {
  hero: HeroSection,
  pageHeader: PageHeaderSection,
  legal: LegalSection,
  aboutIntro: AboutIntroSection,
  partners: PartnersSection,
  advantages: AdvantagesSection,
  serviceList: ServiceListSection,
  studioList: StudioListSection,
  decorList: DecorListSection,
  packageList: PackageListSection,
  worksGallery: WorksGallerySection,
  contactSection: ContactSection,
  bookingForm: BookingSection,
  packageRequestForm: PackageRequestSection,
};

function imageIds(list: RenderedSection[]) {
  const ids = new Set<string>();
  for (const s of list) if (isSectionType(s.type)) collectImageIds(sections[s.type].fields, s.data, ids);
  return [...ids];
}

/** Global content (header, menu, contacts, UI labels) plus media for the given extra sections. */
export async function loadGlobal(extra: RenderedSection[] = []) {
  const global = await getPageContent("global");
  const media = await getMediaItems(imageIds([...extra, ...global.sections]));
  const find = <T,>(type: string) => global.sections.find((s) => s.type === type)?.data as T | undefined;
  return {
    media,
    header: find<HeaderData>("header"),
    menu: find<MenuData>("menu"),
    contacts: find<ContactsData>("contacts"),
    labels: find<LabelsData>("labels"),
    business: find<BusinessData>("business"),
  };
}

/** Breadcrumb parents of nested pages (Figma: Ana səhifə > Paketlər > Müraciət et). */
const parents: Partial<Record<RouteKey, RouteKey>> = { packageRequest: "packages" };

/** Breadcrumb name of a page: its menu label, else the "Breadcrumb adı" / title of its header. */
async function crumbName(route: RouteKey, lang: Locale, menu: MenuData | undefined) {
  const own = (await getPageContent(route)).sections.find((s) => s.type === "pageHeader")?.data as PageHeaderData | undefined;
  return tx(own?.crumb, lang) || navLabel(menu, route, lang) || tx(own?.title, lang) || route;
}

/**
 * Header + breadcrumb + main around any page body, plus the page's JSON-LD (organization,
 * website, breadcrumbs). There is no footer in Figma. `trail` replaces the default
 * breadcrumb after "Ana səhifə" (studio decors page, booking opened from a decor).
 */
export async function SiteFrame({
  route,
  lang,
  trail,
  breadcrumb,
  graph = [],
  children,
}: {
  route: RouteKey;
  lang: Locale;
  trail?: Crumb[];
  /** Replaces the breadcrumb (gets the default trail): the booking page picks its own. */
  breadcrumb?: (crumbs: Crumb[], label: string) => ReactNode;
  /** Extra JSON-LD nodes about the page (services, offers, places, gallery). */
  graph?: Record<string, unknown>[];
  children: ReactNode;
}) {
  const { media, header, menu, contacts, labels, business } = await loadGlobal();
  const home = { name: tx(header?.homeLabel, lang) || "Ana səhifə", path: href("home", lang) };
  const parent = parents[route];
  const crumbs: Crumb[] =
    route === "home"
      ? []
      : [
          home,
          ...(trail ??
            [
              ...(parent ? [{ name: await crumbName(parent, lang, menu), path: href(parent, lang) }] : []),
              { name: await crumbName(route, lang, menu), path: href(route, lang) },
            ]),
        ];
  const isHome = route === "home";
  // Inner pages: the "İşlərimiz / Videolar" tab is still the İşlərimiz menu item.
  const activeTarget = route === "worksVideos" ? "works" : route === "packageRequest" ? "packages" : route;

  return (
    <>
      {header && menu && (
        <Header
          data={header}
          menu={menu}
          labels={labels}
          lang={lang}
          media={media}
          theme={isHome ? "dark" : "light"}
          activeTarget={activeTarget}
        />
      )}
      {!isHome &&
        (breadcrumb?.(crumbs, tx(labels?.breadcrumb, lang) || "Breadcrumb") ?? (
          <Breadcrumb items={crumbs} label={tx(labels?.breadcrumb, lang) || "Breadcrumb"} />
        ))}
      <main id="top" className={cx(!isHome && "pb-10 desktop:pb-20")}>
        {children}
      </main>
      <JsonLd graph={[...siteGraph(lang, contacts, business), ...(crumbs.length ? [breadcrumbGraph(crumbs)] : []), ...graph]} />
    </>
  );
}

/** The sections of one page (or the shared decors template) in admin order. */
export async function Sections({
  page: key,
  lang,
  media: extraMedia,
  studio,
}: {
  page: PageKey;
  lang: Locale;
  media?: Record<string, MediaItem>;
  studio?: SectionContext["studio"];
}) {
  const page = await getPageContent(key);
  const { media, contacts } = await loadGlobal(page.sections);
  const all = { ...media, ...extraMedia };
  return page.sections.map((s) => {
    const Component = isSectionType(s.type) ? components[s.type] : undefined;
    if (!Component) return null;
    return (
      <Component
        key={s.slot}
        data={s.data}
        lang={lang}
        media={all}
        contacts={contacts}
        page={key}
        studio={studio}
        // Haqqımızda shows the shared advantages without the heading Xidmətlər has.
        variant={key === "about" && s.type === "advantages" ? "plain" : undefined}
      />
    );
  });
}

/** One static page: its sections in admin order inside the site frame. All reads are cached per tag. */
export async function PageSections({ route, lang }: { route: RouteKey; lang: Locale }) {
  return (
    <SiteFrame route={route} lang={lang} graph={await pageGraph(route, lang)}>
      <Sections page={route} lang={lang} />
    </SiteFrame>
  );
}
