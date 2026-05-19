import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { Mail, Phone, MapPin, Instagram, Facebook, ArrowUpRight, MessageCircle } from "lucide-react";
import type { MouseEvent } from "react";
import { useT } from "@/lib/i18n";
import { whatsappLink } from "@/data/products";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Smile Maker — We'd Love to Hear From You" },
      { name: "description", content: "Reach the Smile Maker team for product help, orders, partnerships, or just to say hello." },
      { property: "og:title", content: "Contact Smile Maker" },
      { property: "og:description", content: "Get in touch with our beauty-tech team." },
    ],
  }),
  component: ContactPage,
});

const mapsLink = "https://www.google.com/maps?q=29.847217559814453,31.355276107788086&z=17&hl=en";
const facebookLink = "https://web.facebook.com/smilemakercare?mibextid=wwXIfr&rdid=3fkZyF1iiUOelCS3&share_url=https%3A%2F%2Fweb.facebook.com%2Fshare%2F1AgKez2BLz%2F%3Fmibextid%3DwwXIfr%26_rdc%3D1%26_rdr";
const instagramLink = "https://www.instagram.com/smile_maker_clinic_store";
const tiktokLink = "https://www.tiktok.com/@smile.maker.co";

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.74a8.16 8.16 0 0 0 4.77 1.52V6.81a4.85 4.85 0 0 1-1.84-.12Z"/>
  </svg>
);

const openExternalLink = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
  event.preventDefault();
  window.open(href, "_blank", "noopener,noreferrer");
};

function ContactPage() {
  const { t } = useT();
  const waLink = whatsappLink("Hello, I have a question about Smile Maker products.");

  const cards = [
    { Icon: Phone, label: t("contact.phone"), value: "+2 010 5085 2966", href: "tel:+201050852966", dir: "ltr" as const },
    { Icon: Mail, label: t("contact.email"), value: "hello@smilemaker.com", href: "mailto:hello@smilemaker.com", dir: "ltr" as const },
    { Icon: MapPin, label: t("contact.address"), value: t("contact.addressValue"), href: mapsLink, external: true },
  ];

  return (
    <Layout>
      <section className="section-pad bg-soft relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-arc)" }} />
        <div className="container-lux relative text-center max-w-2xl mx-auto">
          <p className="eyebrow">{t("contact.eyebrow")}</p>
          <h1 className="mt-4 text-4xl sm:text-5xl md:text-6xl font-display">
            {t("contact.h1.a")} <span className="text-gradient">{t("contact.h1.b")}</span>.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground">
            {t("contact.lead")}
          </p>

          {/* WhatsApp CTA — prominent, opens directly */}
          <a
            href={waLink}
            onClick={openExternalLink(waLink)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#25D366] text-white font-semibold px-8 py-4 text-base shadow-lg hover:bg-[#20bf5b] transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
            Contact Us
          </a>
        </div>
      </section>

      <section className="pt-12 pb-24">
        <div className="container-lux grid lg:grid-cols-2 gap-6 lg:gap-8">
          <div className="space-y-4">
            {cards.map(({ Icon, label, value, href, dir, external }) => (
              <a
                key={label}
                href={href}
                {...(external
                  ? { onClick: openExternalLink(href), target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="lux-card p-4 sm:p-6 flex items-center gap-4 sm:gap-5 group"
              >
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-brand text-white flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
                  <p className="mt-1 text-ink font-medium text-base sm:text-lg break-words" dir={dir}>{value}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-deep-blue transition-colors shrink-0" />
              </a>
            ))}

            <div className="lux-card p-4 sm:p-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">{t("contact.follow")}</p>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { Icon: Instagram, href: instagramLink, label: "Instagram", handle: "@smile_maker_clinic_store" },
                  { Icon: Facebook, href: facebookLink, label: "Facebook", handle: "smilemakercare" },
                  { Icon: TikTokIcon, href: tiktokLink, label: "TikTok", handle: "@smile.maker.co" },
                ].map(({ Icon, href, label, handle }) => (
                  <a
                    key={label}
                    href={href}
                    onClick={openExternalLink(href)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="rounded-2xl border border-border p-3 flex flex-col items-center gap-2 text-center hover:border-turquoise hover:bg-soft transition-colors"
                  >
                    <div className="h-10 w-10 rounded-xl bg-brand text-white flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 w-full">
                      <p className="text-xs font-medium text-ink">{label}</p>
                      <p className="text-[10px] text-muted-foreground truncate" dir="ltr">{handle}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <a
            href={mapsLink}
            onClick={openExternalLink(mapsLink)}
            target="_blank"
            rel="noopener noreferrer"
            className="lux-card overflow-hidden block group relative"
            aria-label="Open Smile Maker location on Google Maps"
          >
            <iframe
              title="Smile Maker location"
              src="https://www.openstreetmap.org/export/embed.html?bbox=31.3490%2C29.8455%2C31.3615%2C29.8490&layer=mapnik&marker=29.8472176%2C31.3552761"
              className="w-full h-full min-h-[320px] sm:min-h-[420px] border-0 pointer-events-none"
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 bg-gradient-to-t from-white via-white/95 to-transparent">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("contact.visit")}</p>
                  <p className="mt-1 text-ink font-medium text-sm sm:text-base">{t("contact.addressValue")}</p>
                </div>
                <span className="btn-primary text-sm">{t("contact.openMaps")} <ArrowUpRight className="h-4 w-4" /></span>
              </div>
            </div>
          </a>
        </div>
      </section>
    </Layout>
  );
}
