import { Inter } from "next/font/google";

/**
 * Inter variable font (Figma: 400/500/600/700), self-hosted by next/font — no request to
 * Google at runtime. latin + latin-ext covers the Azerbaijani letters (ə, ğ, ı, ö, ş, ü, ç).
 * Figma uses Roboto in a few small texts (©, legal links); they are set in Inter too.
 */
export const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});
