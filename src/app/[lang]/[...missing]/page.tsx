import { notFound } from "next/navigation";

/**
 * Unknown URLs: the proxy rewrites them to `/<lang>/404`, which lands here and renders the
 * site's own 404 page (`../not-found.tsx`) in that language with a 404 status.
 */
export default function Missing(): never {
  notFound();
}
