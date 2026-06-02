import { Link } from "@tanstack/react-router";
import { Instagram, Facebook } from "lucide-react";
import type { MouseEvent } from "react";
import logo from "@/assets/smile-maker-logo.png";
import { useT } from "@/lib/i18n";
import { TikTokIcon } from "@/components/site/TikTokIcon";
import { SOCIAL_LINKS } from "@/lib/constants";

export function Footer() {
  const { t } = useT();
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
              { Icon: Instagram, href: SOCIAL_LINKS.instagram, label: "Instagram" },
              { Icon: Facebook, href: SOCIAL_LINKS.facebook, label: "Facebook" },
              { Icon: TikTokIcon, href: SOCIAL_LINKS.tiktok, label: "TikTok" },
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
