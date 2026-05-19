import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { Sparkles, Shield, Heart, Lightbulb } from "lucide-react";
import logo from "@/assets/smile-maker-logo.png";
import clinic from "@/assets/about-clinic.jpg";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  const { t } = useT();
  const values = [
    { icon: Lightbulb, title: t("about.values.innov.t"), text: t("about.values.innov.x") },
    { icon: Shield, title: t("about.values.safety.t"), text: t("about.values.safety.x") },
    { icon: Sparkles, title: t("about.values.beauty.t"), text: t("about.values.beauty.x") },
    { icon: Heart, title: t("about.values.conf.t"), text: t("about.values.conf.x") },
  ];

  return (
    <Layout>
      <section className="relative section-pad overflow-hidden">
        <div className="absolute inset-0 bg-soft" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-arc)" }} />
        <div className="container-lux relative grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-up">
            <p className="eyebrow">{t("about.eyebrow")}</p>
            <h1 className="mt-4 text-5xl md:text-6xl font-display">
              {t("about.h.a")} <span className="text-gradient">{t("about.h.b")}</span> {t("about.h.c")}
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl">{t("about.lead")}</p>
          </div>
          <div className="flex justify-center">
            <img src={logo} alt="Smile Maker" className="h-72 w-72 object-contain animate-float" />
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-lux grid lg:grid-cols-2 gap-16 items-center">
          <img src={clinic} alt="Smile Maker studio" loading="lazy" width={1920} height={1080} className="rounded-3xl shadow-[var(--shadow-glow)] object-cover w-full aspect-[4/3]" />
          <div>
            <p className="eyebrow">{t("about.who.eyebrow")}</p>
            <h2 className="mt-3 text-4xl">{t("about.who.h")}</h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">{t("about.who.p1")}</p>
            <p className="mt-4 text-muted-foreground leading-relaxed">{t("about.who.p2")}</p>
          </div>
        </div>
      </section>

      <section className="section-pad bg-soft">
        <div className="container-lux grid md:grid-cols-2 gap-8">
          <div className="lux-card p-10">
            <p className="eyebrow">{t("about.mission.eyebrow")}</p>
            <h3 className="mt-3 text-3xl">{t("about.mission.h")}</h3>
            <p className="mt-4 text-muted-foreground leading-relaxed">{t("about.mission.p")}</p>
          </div>
          <div className="lux-card p-10">
            <p className="eyebrow">{t("about.vision.eyebrow")}</p>
            <h3 className="mt-3 text-3xl">{t("about.vision.h")}</h3>
            <p className="mt-4 text-muted-foreground leading-relaxed">{t("about.vision.p")}</p>
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-lux">
          <div className="text-center max-w-2xl mx-auto">
            <p className="eyebrow">{t("about.values.eyebrow")}</p>
            <h2 className="mt-3 text-4xl">{t("about.values.h")}</h2>
          </div>
          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v) => (
              <div key={v.title} className="lux-card p-8">
                <div className="h-12 w-12 rounded-2xl bg-brand text-white flex items-center justify-center mb-4">
                  <v.icon className="h-5 w-5" />
                </div>
                <h4 className="text-xl font-display">{v.title}</h4>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-lux">
          <div className="rounded-3xl p-12 md:p-20 text-center bg-brand text-white shadow-[var(--shadow-glow)]">
            <h2 className="text-4xl md:text-5xl text-white">{t("about.cta.h")}</h2>
            <p className="mt-4 opacity-90 max-w-xl mx-auto">{t("about.cta.lead")}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link to="/products/h2o-water-flosser" className="btn-ghost">{t("about.cta.shop")}</Link>
              <Link to="/contact" className="btn-ghost">{t("btn.talkToUs")}</Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
