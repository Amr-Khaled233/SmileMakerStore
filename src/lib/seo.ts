import { useEffect } from "react";

// Client-side per-page <title> + meta manager for the SPA. Google renders JS,
// so updating the document head on each route gives every page its own title,
// description, canonical and social-preview tags.

const SITE_NAME = "Smile Maker — سمايل ميكر";
const ORIGIN = "https://smilemakerstore.cloud";
const DEFAULT_DESCRIPTION =
  "سمايل ميكر (Smile Maker) — أجهزة العناية بالأسنان والابتسامة: فرشاة أسنان كهربائية، واتر فلوسر، وأطقم تقويم. منتجات أصلية بأسعار مناسبة وتوصيل لكل محافظات مصر.";

type Seo = {
  /** Page-specific title; the site name is appended automatically. Omit for the brand-only title (home). */
  title?: string;
  description?: string;
  /** Absolute URL or root-relative path for the social preview image. */
  image?: string;
};

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function useSeo({ title, description, image }: Seo) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const desc = description?.trim() || DEFAULT_DESCRIPTION;
    const url = ORIGIN + window.location.pathname;

    document.title = fullTitle;
    upsertMeta("name", "description", desc);
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", desc);
    upsertMeta("property", "og:url", url);
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", desc);
    upsertCanonical(url);

    // Only set a real, fetchable image (skip base64 data URLs).
    if (image && !image.startsWith("data:")) {
      const img = image.startsWith("http") ? image : ORIGIN + image;
      upsertMeta("property", "og:image", img);
      upsertMeta("name", "twitter:image", img);
    }
  }, [title, description, image]);
}
