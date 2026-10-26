// Landingspagina, letterlijk omgezet uit design-source/dist/index.html.
import { InteractivePhone } from '@/components/phone/InteractivePhone';

export function SiteHeader() {
  return (
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Plateful — terug naar boven">
        <span className="brand-symbol" aria-hidden="true"><img src="/assets/plateful-icon.svg" alt="" /></span>
        <span>plateful<span className="brand-dot">.</span></span>
      </a>
      <div className="topbar-right">
        <span className="version-pill">VISUEEL CONCEPT <span className="version-dot">●</span> V2.0</span>
        <a href="#stijl" className="top-link">Designsystem <span aria-hidden="true">↗</span></a>
      </div>
    </header>
  );
}

export function FeatureRow({ glyph, variant, title, text }: { glyph: string; variant: 'mint' | 'peach' | 'lemon'; title: string; text: string }) {
  return <div><span className={`feature-glyph ${variant}`}>{glyph}</span><div><strong>{title}</strong><small>{text}</small></div></div>;
}

export function HeroSection() {
  return (
    <section className="hero-grid" aria-label="Plateful appontwerp">
      <div className="story-pane">
        <div className="eyebrow"><span className="eyebrow-line"></span> DE SLIMME GEZINSASSISTENT</div>
        <h1>Iedereen anders.<br /><em>Samen aan tafel.</em></h1>
        <p className="story-intro">Een maaltijd die bij jullie past. Minder discussie, minder denkwerk — en altijd een slim plan B als de dag anders loopt.</p>
        <div className="feature-lines">
          <FeatureRow glyph="✳" variant="mint" title="Kent iedereen aan tafel" text="Van lievelingseten tot écht-niet-lekker." />
          <FeatureRow glyph="↗" variant="peach" title="Maakt de keuze makkelijk" text="Een voorstel dat het hele gezin meeneemt." />
          <FeatureRow glyph="↻" variant="lemon" title="Regelt direct een plan B" text="Geen tijd? Ander rooster? Toch geen probleem." />
        </div>
        <a className="primary-cta" href="#demo" id="exploreButton">Ontdek het ontwerp <span>↗</span></a>
        <div className="signature"><span className="signature-stack"><span>F</span><span>M</span><span>S</span></span><span>Een app voor échte gezinsavonden.</span></div>
      </div>

      <div className="device-area" id="demo">
        <div className="device-pattern pattern-a" aria-hidden="true">✳</div>
        <div className="device-pattern pattern-b" aria-hidden="true">✳</div>
        <div className="device-pattern pattern-c" aria-hidden="true">✳</div>
        <span className="device-label">KLIKBAAR APPONTWERP <span>↘</span></span>
        <InteractivePhone />
      </div>
    </section>
  );
}

export function ProductPrinciples() {
  return (
    <section className="principles" aria-labelledby="principles-title">
      <div className="section-heading">
        <div><span className="section-kicker">DE PRODUCTGEDACHTE</span><h2 id="principles-title">Minder regelen.<br /><em>Meer samen genieten.</em></h2></div>
        <p>Plateful voelt als een behulpzame huisgenoot. Geen eindeloze instellingen of ingewikkelde weekplanners, maar duidelijke keuzes op het juiste moment.</p>
      </div>
      <div className="principle-grid">
        <article className="principle-card olive"><div className="principle-icon">01 <span>✳</span></div><h3>Jullie smaken,<br />één tafel.</h3><p>Persoonlijke voorkeuren per gezinslid — ouders houden de regie bij de maaltijdkeuze.</p></article>
        <article className="principle-card apricot"><div className="principle-icon">02 <span>↗</span></div><h3>Het antwoord<br />staat al klaar.</h3><p>Een passend voorstel, met wat er in huis is en hoeveel tijd jullie hebben.</p></article>
        <article className="principle-card butter"><div className="principle-icon">03 <span>↻</span></div><h3>De dag verandert?<br />Wij bewegen mee.</h3><p>Met Plan B blijft de maaltijd haalbaar, ook als de planning in de war loopt.</p></article>
      </div>
    </section>
  );
}

export function BrandSystem() {
  return (
    <section className="style-section" id="stijl" aria-labelledby="style-title">
      <div className="section-heading">
        <div><span className="section-kicker">VISUELE IDENTITEIT</span><h2 id="style-title">Warm, fris en<br /><em>lekker eigen.</em></h2></div>
        <p>Een elegante foodstijl met genoeg karakter voor een herkenbaar merk. Deze kleuren en lettertypen vormen het uitgangspunt voor de technische uitwerking.</p>
      </div>
      <div className="identity-showcase" aria-label="Nieuw Plateful beeldmerk en app-icoon">
        <div className="identity-story">
          <span className="section-kicker">HET NIEUWE BEELDMERK · V2</span>
          <h3>Een tafel.<br /><em>Ruimte voor iedereen.</em></h3>
          <p>De cirkel staat voor één gedeelde maaltijd. De vier plaatsen voor verschillende smaken. Het mandarijnkleurige accent maakt de vorm eigen: samen eten zonder dat iedereen hetzelfde hoeft te zijn.</p>
          <div className="identity-rule"><span>✓</span> Herkenbaar op 24 pixels <span>·</span> Ook in één kleur</div>
        </div>
        <div className="identity-previews">
          <div className="identity-preview icon-preview"><img src="/assets/plateful-icon.svg" alt="Nieuw Plateful app-icoon" /><span>APP-ICOON</span></div>
          <div className="identity-preview logo-preview"><div className="identity-lockup"><img src="/assets/plateful-icon.svg" alt="" /><strong>plateful<span>.</span></strong></div><span>LOGO OP CRÈME</span></div>
          <div className="identity-preview small-preview"><div className="mini-symbols"><img src="/assets/plateful-icon.svg" alt="Plateful icoon op 24 pixels" /><img src="/assets/plateful-icon.svg" alt="Plateful icoon op 36 pixels" /><img src="/assets/plateful-icon.svg" alt="Plateful icoon op 56 pixels" /></div><span>24 · 36 · 56 PX</span></div>
        </div>
      </div>
      <div className="style-layout">
        <div className="color-swatches">
          <div className="swatch deep"><strong>Forest</strong><span>#124E43</span></div>
          <div className="swatch orange"><strong>Mandarin</strong><span>#F26B3A</span></div>
          <div className="swatch cream"><strong>Oat milk</strong><span>#FBF8F1</span></div>
          <div className="swatch sage"><strong>Sage</strong><span>#DDE9DE</span></div>
          <div className="swatch pink"><strong>Peach</strong><span>#F9DFD1</span></div>
          <div className="swatch yellow"><strong>Lemon</strong><span>#F8EDBB</span></div>
        </div>
        <div className="type-card">
          <span className="type-label">TITELS · FRAUNCES</span>
          <div className="type-headline">Eten we <em>samen?</em></div>
          <div className="type-divider"></div>
          <span className="type-label">INTERFACE · DM SANS</span>
          <div className="type-sentence">Samen eten wordt een stuk makkelijker.</div>
          <p>Vriendelijke afrondingen, duidelijke contrasten en ruimte om adem te halen.</p>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <span className="footer-brand"><img src="/assets/plateful-icon.svg" alt="" />plateful<span>.</span></span>
      <span>Visuele designstudie · oktober 2026</span>
      <a href="#top">Terug naar boven ↑</a>
    </footer>
  );
}

export function Landing() {
  return (
    <div className="landing-root">
      {/* Afwijking t.o.v. index.html: de decoratieve blur-cirkels staan in een clip-laag, zodat ze op
          telefoons de layout-viewport niet verbreden (origineel: 441 px breed op een 390 px-toestel). */}
      <div className="ambient-layer" aria-hidden="true">
        <div className="ambient ambient-one"></div>
        <div className="ambient ambient-two"></div>
      </div>
      <div className="page">
        <SiteHeader />
        <main id="top">
          <HeroSection />
          <ProductPrinciples />
          <BrandSystem />
          <Footer />
        </main>
      </div>
    </div>
  );
}
