import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { m } from 'framer-motion';
import { RuneLogo } from '@/components/art/RuneLogo';
import { Embers } from '@/components/scenes/Embers';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useReducedMotion } from '@/hooks/useMedia';
import { useAuth } from '@/store/authStore';

/* ------------------------------------------------------------------ shared bits */

function Brand({ size = 30 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <RuneLogo size={size} />
      <span className="font-display text-lg font-bold tracking-[0.14em] text-ash">
        Challenge<span className="text-crimson-text">X</span>
      </span>
    </span>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="mb-3 text-center">
      <p className="eyebrow">{children}</p>
      <div className="rune-divider mt-2" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}

function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, ease: 'easeOut', delay }}
    >
      {children}
    </m.div>
  );
}

const NAV = [
  { href: '#top', label: 'Home' },
  { href: '#how', label: 'How It Works' },
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
] as const;

const FEATURES: { title: string; text: string; icon: IconName }[] = [
  { title: 'Validate Your Idea', text: 'Face tough questions across seven critical risk categories to uncover the truth.', icon: 'scale' },
  { title: 'Identify Hidden Risks', text: 'Reveal assumptions, market gaps, and potential failure points before you invest.', icon: 'warning' },
  { title: 'Analyze Market Readiness', text: 'Get objective analysis on your idea\u2019s real potential in today\u2019s market.', icon: 'chart' },
  { title: 'Get Actionable Roadmaps', text: 'Turn validated ideas into step-by-step plans for development and launch.', icon: 'map' },
];

const STEPS: { title: string; text: string }[] = [
  { title: 'Submit Your Idea', text: 'Describe your idea, the problem it solves, and who it is for.' },
  { title: 'Face the Trial', text: 'Answer questions across seven risk categories, posed by the Challenger.' },
  { title: 'Get Your Verdict', text: 'Receive a detailed analysis with a score, risks, and honest insights.' },
  { title: 'Build Your Roadmap', text: 'Turn your validated idea into an actionable, staged plan.' },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is ChallengeX?',
    a: 'ChallengeX is a trial for ideas. You submit what you want to build, answer hard questions across seven risk categories, and receive an honest verdict \u2014 KILL, PIVOT, or BUILD \u2014 with a score, risks, and a roadmap.',
  },
  {
    q: 'How does the trial work?',
    a: 'The Challenger generates questions tailored to your idea: technical, market, social, financial, legal, scalability, and competition. You answer or skip; skipped questions become flagged assumptions in your verdict.',
  },
  {
    q: 'What do I get at the end?',
    a: 'A scored verdict with a category radar, your key assumptions, struggles worth fixing, the cheapest validation experiment, and \u2014 if the idea survives \u2014 a step-by-step build roadmap.',
  },
  {
    q: 'Can I generate new ideas with it?',
    a: 'Yes. Tell the realm your interests, skills, and the problems you want to solve, and it will propose fresh, grounded idea concepts you can challenge next.',
  },
  {
    q: 'Do I need an account?',
    a: 'Yes. An account keeps your trials, verdicts, and roadmaps so you can return to them \u2014 and continue any trial where you left off.',
  },
];

/* ------------------------------------------------------------------ page */

export function Component() {
  useDocumentTitle('ChallengeX \u2014 Challenge Your Idea. Prove It. Build It.');
  const navigate = useNavigate();
  const token = useAuth((s) => s.token);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const enter = () => navigate(token ? '/realm' : '/gate');

  return (
    <div id="top" className="min-h-[100dvh] bg-void">
      {/* ============================================================ nav */}
      <header
        className="fixed inset-x-0 top-0 z-50 border-b border-[rgba(229,9,32,0.25)] bg-[rgba(7,5,6,0.88)] backdrop-blur-md"
        style={{ paddingTop: 'var(--safe-top)' }}
      >
        <nav className="safe-pad mx-auto flex h-16 max-w-6xl items-center justify-between gap-3" aria-label="Primary">
          <a href="#top" className="shrink-0" aria-label="ChallengeX home">
            <Brand />
          </a>
          <ul className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <li key={n.href}>
                <a
                  href={n.href}
                  className="inline-flex min-h-[44px] items-center px-3 font-label text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-ash-dim transition-colors hover:text-crimson-text"
                >
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex shrink-0 items-center gap-2">
            <Link to="/gate" className="btn btn-ghost btn-sm hidden sm:inline-flex">
              Login
            </Link>
            <Button size="sm" onClick={enter}>
              Get Started
            </Button>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded text-ash md:hidden"
              aria-expanded={menuOpen}
              aria-controls="landing-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <Icon name={menuOpen ? 'close' : 'menu'} />
            </button>
          </div>
        </nav>
        {menuOpen && (
          <div id="landing-menu" className="border-t border-[var(--edge)] bg-[rgba(7,5,6,0.97)] md:hidden">
            <ul className="safe-pad mx-auto max-w-6xl py-2">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a
                    href={n.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-[48px] items-center font-label text-sm font-semibold uppercase tracking-[0.12em] text-ash-dim hover:text-crimson-text"
                  >
                    {n.label}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  to="/gate"
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-[48px] items-center font-label text-sm font-semibold uppercase tracking-[0.12em] text-ash hover:text-crimson-text"
                >
                  Login
                </Link>
              </li>
            </ul>
          </div>
        )}
      </header>

      {/* ============================================================ hero */}
      <section className="relative flex min-h-[100svh] items-center overflow-hidden pt-16" aria-labelledby="hero-h">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="cc-hero absolute inset-0" />
          <Embers density={0.7} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(7,5,6,0.92) 0%, rgba(7,5,6,0.72) 38%, rgba(7,5,6,0.18) 68%, rgba(7,5,6,0.55) 100%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(7,5,6,0.6) 0%, transparent 30%, rgba(7,5,6,0.9) 100%)' }} />
        </div>

        <div className="safe-pad relative z-10 mx-auto w-full max-w-6xl py-16">
          <m.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }} className="max-w-2xl">
            <p className="eyebrow">The Realm of Ideas</p>
            <h1 id="hero-h" className="mt-4 font-display text-4xl font-bold uppercase leading-[1.08] tracking-wide text-ash sm:text-6xl lg:text-7xl">
              Challenge
              <br />
              Your Idea.
              <br />
              <span className="metal-text">Prove it. Build it.</span>
            </h1>
            <p className="mt-5 max-w-xl font-prose text-lg leading-relaxed text-ash-dim sm:text-xl">
              Every great idea faces a trial. Test your assumptions, uncover hidden risks, and discover whether your idea is ready to become reality.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={enter} className="sm:px-8">
                Enter the Realm <Icon name="chevronRight" size={16} />
              </Button>
              <a href="#how" className="btn btn-ghost">
                <Icon name="scroll" size={16} /> How It Works
              </a>
            </div>
          </m.div>
        </div>
      </section>

      {/* ============================================================ features */}
      <section id="features" className="relative border-t border-[rgba(229,9,32,0.2)] bg-[var(--ink)] py-20" aria-labelledby="features-h">
        <div className="safe-pad mx-auto max-w-6xl">
          <SectionLabel>Why ChallengeX</SectionLabel>
          <Reveal>
            <h2 id="features-h" className="text-center font-display text-3xl font-bold uppercase tracking-wide text-ash sm:text-4xl">
              Turn Ideas Into <span className="text-crimson-text">Real Opportunities</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center font-prose text-lg text-ash-dim">
              ChallengeX combines deep analysis, real market insights, and structured roadmaps to help you separate wishful thinking from real opportunities.
            </p>
          </Reveal>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.08}>
                <li className="glass glass-interactive h-full rounded-md border border-[var(--edge)] p-6">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-crimson bg-[rgba(142,24,36,0.3)] text-crimson-text">
                    <Icon name={f.icon} size={24} />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold uppercase tracking-wide text-ash">{f.title}</h3>
                  <p className="mt-2 font-prose text-base leading-relaxed text-ash-dim">{f.text}</p>
                  <p aria-hidden="true" className="mt-4 font-fell text-sm text-ash-faint">{String(i + 1).padStart(2, '0')}</p>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ============================================================ how it works */}
      <section id="how" className="relative overflow-hidden border-t border-[rgba(229,9,32,0.2)] py-20" aria-labelledby="how-h">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="cc-ritual absolute inset-0" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(7,5,6,0.94) 0%, rgba(7,5,6,0.8) 45%, rgba(7,5,6,0.94) 100%)' }} />
        </div>
        <div className="safe-pad relative mx-auto max-w-6xl">
          <SectionLabel>How It Works</SectionLabel>
          <Reveal>
            <h2 id="how-h" className="text-center font-display text-3xl font-bold uppercase tracking-wide text-ash sm:text-4xl">
              Four Simple Steps
            </h2>
          </Reveal>
          <ol className="relative mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-[12%] right-[12%] top-7 hidden h-px bg-gradient-to-r from-transparent via-[rgba(229,9,32,0.5)] to-transparent lg:block"
            />
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.1}>
                <li className="relative text-center">
                  <span className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-crimson bg-[var(--card)] font-display text-lg font-bold text-crimson-text shadow-glow">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 font-display text-base font-bold uppercase tracking-wide text-ash">{s.title}</h3>
                  <p className="mx-auto mt-2 max-w-[240px] font-prose text-base leading-relaxed text-ash-dim">{s.text}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ============================================================ for founders */}
      <section className="relative border-t border-[rgba(229,9,32,0.2)] bg-[var(--ink)] py-20" aria-labelledby="founders-h">
        <div className="safe-pad mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
          <Reveal className="order-2 lg:order-1">
            <p className="eyebrow">For the Bold</p>
            <h2 id="founders-h" className="mt-3 font-display text-3xl font-bold uppercase leading-tight tracking-wide text-ash sm:text-4xl">
              For Founders, Dreamers,
              <br />
              and <span className="text-crimson-text">Bold Thinkers</span>
            </h2>
            <p className="mt-4 max-w-xl font-prose text-lg leading-relaxed text-ash-dim">
              Whether you&rsquo;re a first-time founder, a seasoned entrepreneur, or simply exploring an idea, ChallengeX gives you the clarity, insights, and direction you need to move forward with confidence.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-3">
              {(
                [
                  ['Based on Real', 'Business Frameworks', 'scale'],
                  ['Practical', 'Recommendations', 'check'],
                  ['Designed for', 'Action', 'sword'],
                ] as const
              ).map(([top, bottom, icon]) => (
                <li key={bottom} className="flex items-center gap-3 rounded-md border border-[var(--edge)] bg-[rgba(0,0,0,0.35)] p-3">
                  <Icon name={icon} size={20} className="shrink-0 text-crimson-text" />
                  <span>
                    <span className="block font-label text-[0.68rem] uppercase tracking-wider text-ash-faint">{top}</span>
                    <span className="block font-label text-[0.8rem] font-bold uppercase tracking-wide text-ash">{bottom}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.15} className="order-1 lg:order-2">
            <div className="glass relative mx-auto aspect-[4/3] max-w-lg overflow-hidden rounded-md p-1">
              <div className="cc-founder relative h-full w-full rounded" role="img" aria-label="A cloaked founder journeying toward a crimson-lit fortress" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================================ testimonials (marked demonstration content) */}
      <section id="testimonials" className="relative border-t border-[rgba(229,9,32,0.2)] py-20" aria-labelledby="testimonials-h">
        <div className="safe-pad mx-auto max-w-6xl">
          <SectionLabel>Trusted by Innovators</SectionLabel>
          <Reveal>
            <h2 id="testimonials-h" className="text-center font-display text-3xl font-bold uppercase tracking-wide text-ash sm:text-4xl">
              What Our Users Say
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center font-prose text-base text-ash-faint">
              Sample layout content — placeholder quotes shown for design purposes, not verified customer reviews.
            </p>
          </Reveal>
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {(
              [
                ['ChallengeX helped me see the flaws in my idea that I completely missed. It saved me months of wasted effort.', 'Rohan Mehta', 'Student Founder', 'RM'],
                ['The structured analysis and roadmap gave me the clarity I needed to move forward with confidence.', 'Priya Sharma', 'Early Stage Founder', 'PS'],
                ['A powerful tool for anyone serious about building real solutions. The insights are practical and eye-opening.', 'Arjun Verma', 'Product Manager', 'AV'],
              ] as const
            ).map(([quote, name, role, initials], i) => (
              <Reveal key={name} delay={i * 0.08}>
                <li className="glass flex h-full flex-col gap-4 rounded-md border border-[var(--edge)] p-6">
                  <Icon name="scroll" size={20} className="text-crimson-text" aria-hidden="true" />
                  <p className="font-prose text-lg italic leading-relaxed text-ash">&ldquo;{quote}&rdquo;</p>
                  <div className="mt-auto flex items-center gap-3 border-t border-[var(--edge)] pt-4">
                    <span aria-hidden="true" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-crimson bg-[rgba(142,24,36,0.35)] font-label text-xs font-bold text-ash">
                      {initials}
                    </span>
                    <span>
                      <span className="block font-label text-sm font-bold text-ash">{name}</span>
                      <span className="block font-prose text-sm text-ash-dim">{role}</span>
                    </span>
                  </div>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ============================================================ impact statistics (neutral placeholders — no public metrics exist yet) */}
      <section className="relative border-t border-[rgba(229,9,32,0.2)] bg-[var(--ink)] py-20" aria-labelledby="impact-h">
        <div className="safe-pad mx-auto max-w-6xl">
          <SectionLabel>Real Impact</SectionLabel>
          <Reveal>
            <h2 id="impact-h" className="text-center font-display text-3xl font-bold uppercase tracking-wide text-ash sm:text-4xl">
              Ideas That Move Forward
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center font-prose text-base text-ash-faint">
              Realm-wide counters are not published yet — these panels will light up once aggregate metrics become available.
            </p>
          </Reveal>
          <ul className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {['Ideas Analyzed', 'Founders Supported', 'Achieved Clearer Direction', 'Roadmaps Generated'].map((label, i) => (
              <Reveal key={label} delay={i * 0.06}>
                <li className="glass rounded-md border border-[var(--edge)] p-6 text-center">
                  <p aria-hidden="true" className="font-display text-3xl font-bold text-ash-faint">&mdash;</p>
                  <p className="mt-2 font-label text-[0.66rem] uppercase tracking-[0.18em] text-ash-dim">{label}</p>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ============================================================ pricing (honest placeholder — no plans are configured) */}
      <section id="pricing" className="relative border-t border-[rgba(229,9,32,0.2)] py-20" aria-labelledby="pricing-h">
        <div className="safe-pad mx-auto max-w-3xl">
          <SectionLabel>Pricing</SectionLabel>
          <Reveal>
            <div className="glass rounded-md border border-[var(--edge)] p-8 text-center cc-stone">
              <h2 id="pricing-h" className="font-display text-2xl font-bold uppercase tracking-wide text-ash sm:text-3xl">
                Plans Forged Soon
              </h2>
              <p className="mx-auto mt-4 max-w-xl font-prose text-lg leading-relaxed text-ash-dim">
                ChallengeX does not publish pricing plans yet. Create an account to explore everything the realm currently offers, and watch this space for
                what comes next.
              </p>
              <div className="mt-6">
                <Button onClick={enter}>
                  Get Started <Icon name="chevronRight" size={16} />
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================================ FAQ */}
      <section id="faq" className="relative border-t border-[rgba(229,9,32,0.2)] py-20" aria-labelledby="faq-h">
        <div className="safe-pad mx-auto max-w-3xl">
          <SectionLabel>Questions</SectionLabel>
          <Reveal>
            <h2 id="faq-h" className="text-center font-display text-3xl font-bold uppercase tracking-wide text-ash sm:text-4xl">
              Frequently Asked
            </h2>
          </Reveal>
          <div className="mt-10 space-y-3">
            {FAQS.map((f, i) => (
              <Reveal key={f.q} delay={i * 0.05}>
                <div className="glass rounded-md border border-[var(--edge)]">
                  <h3>
                    <button
                      type="button"
                      aria-expanded={openFaq === i}
                      aria-controls={`faq-a-${i}`}
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="flex min-h-[56px] w-full items-center justify-between gap-3 px-5 py-3 text-left"
                    >
                      <span className="font-label text-sm font-bold uppercase tracking-wide text-ash sm:text-base">{f.q}</span>
                      <Icon name={openFaq === i ? 'close' : 'plus'} size={18} className="shrink-0 text-crimson-text" />
                    </button>
                  </h3>
                  {openFaq === i && (
                    <p id={`faq-a-${i}`} className="border-t border-[var(--edge)] px-5 py-4 font-prose text-lg leading-relaxed text-ash-dim">
                      {f.a}
                    </p>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ final CTA */}
      <section className="relative overflow-hidden border-t border-[rgba(229,9,32,0.25)] py-24" aria-labelledby="cta-h">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'linear-gradient(180deg, rgba(7,5,6,0.82), rgba(7,5,6,0.9)), url(/assets/gate-background-centered.webp)',
              backgroundSize: 'cover',
              backgroundPosition: 'center 40%',
            }}
          />
          <div className="absolute inset-0 opacity-50" style={{ background: 'radial-gradient(60% 90% at 50% 100%, rgba(142,24,36,0.55), transparent 70%)' }} />
        </div>
        <Reveal className="safe-pad relative mx-auto max-w-3xl text-center">
          <h2 id="cta-h" className="font-display text-3xl font-bold uppercase tracking-wide text-ash sm:text-4xl">
            Ready to <span className="text-crimson-text">Challenge</span> Your Idea?
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-prose text-lg text-ash-dim">Enter the realm and discover what&rsquo;s possible.</p>
          <div className="mt-8">
            <Button onClick={enter} className="px-10">
              Get Started Now <Icon name="chevronRight" size={16} />
            </Button>
          </div>
          <ul className="mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
            {(
              [
                ['Validate Faster', 'Reduce risk with real insights', 'scale'],
                ['Save Time', 'Focus on what really matters', 'history'],
                ['Build with Confidence', 'Turn ideas into real opportunities', 'hammer'],
              ] as const
            ).map(([title, text, icon]) => (
              <li key={title} className="flex flex-col items-center gap-1.5 text-center">
                <Icon name={icon} size={20} className="text-crimson-text" aria-hidden="true" />
                <span className="font-label text-[0.7rem] font-bold uppercase tracking-[0.16em] text-ash">{title}</span>
                <span className="font-prose text-sm text-ash-dim">{text}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      {/* ============================================================ footer */}
      <footer className="border-t border-[rgba(229,9,32,0.25)] bg-[var(--ink)] py-12" style={{ paddingBottom: 'max(3rem, env(safe-area-inset-bottom))' }}>
        <div className="safe-pad mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Brand />
            <p className="mt-2 font-fell text-sm uppercase tracking-[0.2em] text-crimson-text">The Realm of Ideas</p>
            <p className="mt-3 max-w-xs font-prose text-base leading-relaxed text-ash-dim">Challenge your ideas. Validate, analyze, and build with confidence.</p>
          </div>
          <nav aria-label="Product">
            <p className="font-label text-xs font-bold uppercase tracking-[0.2em] text-ash-faint">Product</p>
            <ul className="mt-3 space-y-1">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a href={n.href} className="inline-flex min-h-[36px] items-center font-prose text-base text-ash-dim hover:text-crimson-text">
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Account">
            <p className="font-label text-xs font-bold uppercase tracking-[0.2em] text-ash-faint">Enter</p>
            <ul className="mt-3 space-y-1">
              <li>
                <Link to="/gate" className="inline-flex min-h-[36px] items-center font-prose text-base text-ash-dim hover:text-crimson-text">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/gate" className="inline-flex min-h-[36px] items-center font-prose text-base text-ash-dim hover:text-crimson-text">
                  Create Account
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="inline-flex min-h-[36px] items-center font-prose text-base text-ash-dim hover:text-crimson-text">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="inline-flex min-h-[36px] items-center font-prose text-base text-ash-dim hover:text-crimson-text">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </nav>
          <div>
            <p className="font-label text-xs font-bold uppercase tracking-[0.2em] text-ash-faint">Begin</p>
            <p className="mt-3 font-prose text-base leading-relaxed text-ash-dim">Your idea deserves a trial. Step through the gate.</p>
            <ButtonLink to="/gate" size="sm" className="mt-3">
              Enter the Realm
            </ButtonLink>
          </div>
        </div>
        <p className="safe-pad mx-auto mt-10 max-w-6xl border-t border-[rgba(229,9,32,0.2)] pt-6 text-center font-prose text-sm text-ash-faint">
          &copy; {new Date().getFullYear()} ChallengeX. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
