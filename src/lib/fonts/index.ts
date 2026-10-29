import { Inter, Roboto } from "next/font/google";

/**
 * Inter variable font (Figma: 400/500/600/700), self-hosted by next/font — no request to
 * Google at runtime. latin + latin-ext covers the Azerbaijani letters (ə, ğ, ı, ö, ş, ü, ç).
 */
export const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});

/**
 * Roboto 400/500 for the few Figma texts set in it: the home subtitle and ©, the menu's legal
 * links, the contact email. Not preloaded — only the home page shows it at first paint.
 */
export const roboto = Roboto({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-roboto-face",
  preload: false,
});
