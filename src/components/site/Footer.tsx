import { Link } from "@tanstack/react-router";
import { Instagram, Facebook } from "lucide-react";
import type { MouseEvent } from "react";
import logo from "@/assets/smile-maker-logo.png";
import { useT } from "@/lib/i18n";

// TikTok icon (lucide doesn't ship one)
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.74a8.16 8.16 0 0 0 4.77 1.52V6.81a4.85 4.85 0 0 1-1.84-.12Z"/>
  </svg>
);

export function Footer() {
  const { t } = useT();
  const facebookLink = "https://web.facebook.com/smilemakercare?mibextid=wwXIfr&rdid=3fkZyF1iiUOelCS3&share_url=https%3A%2F%2Fweb.facebook.com%2Fshare%2F1AgKez2BLz%2F%3Fmibextid%3DwwXIfr%26_rdc%3D1%26_rdr";
  const instagramLink = "https://www.instagram.com/smile_maker_clinic_store";
  const tiktokLink = "https://www.tiktok.com/@smile.maker.co";
  const openExternalLink = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <footer className="bg-soft border-t border-border mt-24">
      <div className="container-lux py-16 grid gap-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Smile Maker" className="h-14 w-14 object-contain" />
            <span className="font-display text-2xl">
              <span className="text-gradient font-semibold">Smile</span> <span className="text-ink">Maker</span>
            </span>
          </Link>
          <p className="mt-4 text-muted-foreground max-w-md text-sm leading-relaxed">
            {t("footer.tagline")}
          </p>
          <form className="mt-6 flex max-w-sm gap-2" onSubmit={(e) => e.preventDefault()}>
            <input
              id="newsletter-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder={t("footer.email")}
              className="flex-1 rounded-full border border-border bg-white px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button className="btn-primary text-sm">{t("footer.join")}</button>
          </form>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-ink mb-4">{t("footer.explore")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground">{t("nav.home")}</Link></li>
            <li><Link to="/about" className="hover:text-foreground">{t("nav.about")}</Link></li>
            <li><Link to="/products" className="hover:text-foreground">{t("nav.products")}</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">{t("nav.contact")}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-ink mb-4">{t("footer.connect")}</h4>
          <div className="flex gap-3">
            {[
              { Icon: Instagram, href: instagramLink, label: "Instagram" },
              { Icon: Facebook, href: facebookLink, label: "Facebook" },
              { Icon: TikTokIcon, href: tiktokLink, label: "TikTok" },
            ].map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                onClick={openExternalLink(href)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="h-10 w-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-deep-blue hover:border-turquoise transition-colors"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted-foreground" dir="ltr">
            hello@smilemaker.com<br/>+2 01050852966
          </p>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-lux py-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Smile Maker. {t("footer.rights")}</p>
          <p>{t("footer.crafted")}</p>
        </div>
      </div>
    </footer>
  );
}
