import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldAlert, Eye, BarChart3, Map, Swords, ClipboardCheck, Gavel, Route,
} from 'lucide-react';
import { assets } from '@/utils/assets';
import { Embers, Fog } from '@/components/animations/Atmosphere';

// Reference design content from the PDF — configurable, NOT live analytics.
const REFERENCE_STATS = [
  { value: '10K+', label: 'Ideas Tested' },
  { value: '5K+', label: 'Founders' },
  { value: '78%', label: 'Clearer Decisions' },
  { value: '1.2K+', label: 'Roadmaps Generated' },
];

const FEATURES = [
  { icon: ShieldAlert, title: 'Validate Your Idea', text: 'Put your concept through a rigorous AI interrogation that stress-tests every assumption before the market does.' },
  { icon: Eye, title: 'Identify Hidden Risks', text: 'Surface the technical, financial, legal and social risks you are too close to see.' },
  { icon: BarChart3, title: 'Analyze Market Readiness', text: 'Competitor research and demand signals reveal whether the world is ready for what you are building.' },
  { icon: Map, title: 'Get Actionable Roadmaps', text: 'Survive the trial and receive a phased, decision-aware roadmap from validation to launch.' },
];

const STEPS = [
  { icon: Swords, n: '01', title: 'Submit Your Idea', text: 'Describe your idea in your own words and choose the intensity of the trial.' },
  { icon: ClipboardCheck, n: '02', title: 'Face the Trial', text: 'Answer hard questions across seven risk categories. Skip nothing you cannot defend.' },
  { icon: Gavel, n: '03', title: 'Get Your Verdict', text: 'Receive a scored report: strengths, weaknesses, failure risks and the cheapest validation experiment.' },
  { icon: Route, n: '04', title: 'Build Your Roadmap', text: 'If your idea survives, forge a phased roadmap with milestones and deliverables.' },
];

const TESTIMONIALS = [
  { name: 'Amara O.', role: 'Solo founder', text: 'The brutal mode killed my first idea in a day — and saved me six months. The pivot it suggested is now paying rent.' },
  { name: 'Devin K.', role: 'Indie hacker', text: 'I thought my MVP was ready. The trial exposed three assumptions I had never even written down.' },
  { name: 'Priya S.', role: 'Product lead', text: 'The verdict report reads like a board memo. I took it straight to my co-founder and we refocused instantly.' },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6 },
};


export function LandingPage() {
  return (
    <div className="bg-background">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-40 border-b border-[var(--border-subtle)] bg-background/70 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="font-display text-lg tracking-widest text-parchment">
            CHALLENGE<span className="text-crimson-glow">X</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <a href="#features" className="hidden sm:block text-xs font-heading uppercase tracking-widest text-parchment-dim hover:text-parchment">Features</a>
            <a href="#how" className="hidden sm:block text-xs font-heading uppercase tracking-widest text-parchment-dim hover:text-parchment">How It Works</a>
            <Link to="/login" className="text-xs font-heading uppercase tracking-widest text-parchment-dim hover:text-parchment px-3 py-2">Sign In</Link>
            <Link to="/register" className="gothic-btn-primary text-xs px-4 py-2">Register</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <img src={assets.realmBackground} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" aria-hidden />
        <Embers count={20} />
        <Fog />
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center pt-16">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9 }}
            className="font-display text-4xl sm:text-6xl lg:text-7xl leading-tight tracking-wide text-parchment drop-shadow-[0_2px_24px_rgba(0,0,0,0.9)]"
          >
            CHALLENGE YOUR IDEA.<br />
            <span className="text-crimson-glow drop-shadow-[0_0_18px_rgba(229,9,32,0.7)]">PROVE IT.</span> BUILD IT.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.9 }}
            className="mx-auto mt-6 max-w-2xl font-narrative text-xl sm:text-2xl text-parchment-dim italic"
          >
            Every great idea faces a trial. Test your assumptions, uncover hidden risks, and discover whether your idea is ready to become reality.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.9 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/register" className="gothic-btn-primary text-base px-10 py-4 shadow-crimson-md hover:shadow-crimson-lg w-full sm:w-auto">
              Enter the Realm
            </Link>
            <a href="#how" className="gothic-btn-ghost text-base px-10 py-4 w-full sm:w-auto">How It Works</a>
          </motion.div>
        </div>
      </section>

      {/* Impact statistics (reference design content, configurable) */}
      <section className="border-y border-[var(--border-subtle)] bg-surface/60">
        <div className="mx-auto grid max-w-7xl grid-cols-2 lg:grid-cols-4 gap-8 px-6 py-12">
          {REFERENCE_STATS.map((s, i) => (
            <motion.div key={s.label} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }} className="text-center">
              <div className="font-display text-3xl sm:text-4xl text-crimson-glow">{s.value}</div>
              <div className="mt-1 text-xs font-heading uppercase tracking-[0.2em] text-parchment-dim">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <motion.div {...fadeUp} className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl text-parchment">Forge Your Idea Under Fire</h2>
          <p className="mt-3 font-narrative text-lg text-parchment-dim italic">Four instruments of judgment await inside the realm.</p>
        </motion.div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.1 }}
              className="gothic-panel p-6 hover:shadow-crimson-sm hover:border-[var(--border-visible)] transition-all group"
            >
              <span className="inline-flex rounded-lg bg-crimson-soft p-3 text-crimson-glow group-hover:shadow-crimson-sm">
                <f.icon className="h-6 w-6" aria-hidden />
              </span>
              <h3 className="mt-4 font-heading text-lg text-parchment">{f.title}</h3>
              <p className="mt-2 font-narrative text-parchment-dim leading-relaxed">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="relative overflow-hidden border-y border-[var(--border-subtle)]">
        <img src={assets.ritualChamber} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-24">
          <motion.div {...fadeUp} className="text-center mb-14">
            <h2 className="font-display text-3xl sm:text-4xl text-parchment">How It Works</h2>
            <p className="mt-3 font-narrative text-lg text-parchment-dim italic">Four steps from raw idea to proven roadmap.</p>
          </motion.div>
          <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <motion.li key={s.n} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.1 }} className="relative gothic-panel p-6">
                <span className="font-display text-4xl text-crimson-glow/40">{s.n}</span>
                <span className="mt-3 block text-crimson-glow"><s.icon className="h-6 w-6" aria-hidden /></span>
                <h3 className="mt-3 font-heading text-lg text-parchment">{s.title}</h3>
                <p className="mt-2 font-narrative text-parchment-dim leading-relaxed">{s.text}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* Founder-oriented messaging */}
      <section className="relative overflow-hidden">
        <img src={assets.realmSecondary} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-24">
          <motion.div {...fadeUp} className="max-w-xl">
            <h2 className="font-display text-3xl sm:text-4xl text-parchment">Built for Founders Who Refuse to Build Blind</h2>
            <p className="mt-4 font-narrative text-xl text-parchment-dim italic leading-relaxed">
              Hope is not a strategy. ChallengeX puts a relentless skeptic in the room with you at 2 a.m. — one who has read every post-mortem, priced every risk, and will not let a single assumption pass unchallenged.
            </p>
            <p className="mt-4 font-narrative text-lg text-parchment-faint leading-relaxed">
              You leave either with hard-won confidence or a faster, cheaper pivot. Both outcomes are victories.
            </p>
            <Link to="/register" className="gothic-btn-primary mt-8">Claim Your Trial</Link>
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-[var(--border-subtle)] bg-surface/40">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <motion.h2 {...fadeUp} className="font-display text-3xl sm:text-4xl text-parchment text-center mb-14">Voices from the Realm</motion.h2>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <motion.figure key={t.name} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.1 }} className="gothic-panel p-6">
                <blockquote className="font-narrative text-lg text-parchment-dim italic leading-relaxed">“{t.text}”</blockquote>
                <figcaption className="mt-4 border-t border-[var(--border-subtle)] pt-4">
                  <div className="font-heading text-sm text-parchment">{t.name}</div>
                  <div className="text-xs text-parchment-faint font-heading uppercase tracking-widest">{t.role}</div>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-crimson-dark/20 via-transparent to-transparent" aria-hidden />
        <Embers count={12} />
        <div className="relative mx-auto max-w-3xl px-6 py-28 text-center">
          <motion.h2 {...fadeUp} className="font-display text-3xl sm:text-5xl text-parchment">
            The Gate Does Not Open for the Unprepared.
          </motion.h2>
          <motion.p {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="mt-5 font-narrative text-xl text-parchment-dim italic">
            Bring your idea. Leave with the truth.
          </motion.p>
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }} className="mt-10">
            <Link to="/register" className="gothic-btn-primary text-base px-12 py-4 shadow-crimson-md hover:shadow-crimson-lg">
              Enter the Realm
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)] bg-surface/60">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="font-display text-lg tracking-widest text-parchment">CHALLENGE<span className="text-crimson-glow">X</span></div>
            <p className="mt-3 font-narrative text-parchment-dim italic">Challenge your idea. Prove it. Build it.</p>
          </div>
          <div>
            <h4 className="font-heading text-sm uppercase tracking-widest text-parchment">Product</h4>
            <ul className="mt-3 space-y-2 text-sm text-parchment-dim">
              <li><a href="#features" className="hover:text-parchment">Features</a></li>
              <li><a href="#how" className="hover:text-parchment">How It Works</a></li>
              <li><Link to="/register" className="hover:text-parchment">Start a Trial</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading text-sm uppercase tracking-widest text-parchment">Company</h4>
            <ul className="mt-3 space-y-2 text-sm text-parchment-dim">
              <li><Link to="/login" className="hover:text-parchment">Sign In</Link></li>
              <li><Link to="/register" className="hover:text-parchment">Create Account</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading text-sm uppercase tracking-widest text-parchment">Legal &amp; Support</h4>
            <ul className="mt-3 space-y-2 text-sm text-parchment-dim">
              <li><Link to="/privacy" className="hover:text-parchment">Privacy</Link></li>
              <li><Link to="/terms" className="hover:text-parchment">Terms</Link></li>
              <li><a href="mailto:support@challengex.app" className="hover:text-parchment">Support</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[var(--border-subtle)] py-6 text-center text-xs text-parchment-faint font-heading uppercase tracking-widest">
          © {new Date().getFullYear()} ChallengeX. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
