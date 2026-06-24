import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, ShoppingCart, Globe } from "lucide-react";
import logo from "@/assets/smile-maker-logo.png";
import { useT } from "@/lib/i18n";
import { useCart } from "@/lib/cart";

const links = [
  { to: "/", key: "nav.home" as const },
  { to: "/products", key: "nav.products" as const },
  { to: "/about", key: "nav.about" as const },
  { to: "/contact", key: "nav.contact" as const },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const { t, lang, setLang } = useT();
  const { count } = useCart();
  const toggleLang = () => setLang(lang === "en" ? "ar" : "en");

  const cartButton = (
    <Link to="/cart" className="relative inline-flex items-center justify-center h-10 w-10 rounded-full border border-border bg-white hover:border-turquoise transition-colors" aria-label={t("nav.cart")}>
      <ShoppingCart className="h-4 w-4 text-ink" />
      {count > 0 && (
        <span className="absolute -top-1 -inset-e-1 min-w-4.5 h-4.5 px-1 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center">
          {count}
        </span>
      )}
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/75 border-b border-border/60">
      <div className="container-lux flex items-center justify-between py-3 gap-2">
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <img src={logo} alt="Smile Maker" className="h-10 w-10 sm:h-12 sm:w-12 object-contain" />
          <span className="hidden sm:block font-display text-xl tracking-tight">
            <span className="text-gradient font-semibold">Smile</span>{" "}
            <span className="text-ink">Maker</span>
          </span>
        </Link>
        <nav className="hidden lg:flex items-center gap-8">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              activeProps={{ className: "text-sm text-foreground font-medium" }}
              activeOptions={{ exact: true }}
            >
              {t(l.key)}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLang}
            aria-label="Toggle language"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-ink hover:border-turquoise transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>{t("nav.lang")}</span>
          </button>
          {cartButton}
          <button
            className="lg:hidden p-2 rounded-full border border-border"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="lg:hidden border-t border-border bg-white">
          <div className="container-lux py-4 flex flex-col gap-3">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="py-2 text-foreground"
              >
                {t(l.key)}
              </Link>
            ))}
            <Link to="/cart" onClick={() => setOpen(false)} className="btn-primary text-sm w-fit">
              <ShoppingCart className="h-4 w-4" /> {t("nav.cart")}{count > 0 ? ` (${count})` : ""}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
