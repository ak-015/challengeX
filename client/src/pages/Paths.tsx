import { Swords, Lightbulb, Map, History } from 'lucide-react';
import { PathCard } from '@/components/cards/PathCard';
import { RealmScene } from '@/components/realm/RealmScene';

const PATHS = [
  {
    to: '/challenge/new',
    icon: Swords,
    title: 'Challenge My Idea',
    description: 'Submit your idea to a merciless interrogation and receive a scored verdict.',
  },
  {
    to: '/ideas/generate',
    icon: Lightbulb,
    title: 'Generate a New Idea',
    description: 'Feed the forge your interests and constraints; receive fresh, tailored concepts.',
  },
  {
    to: '/roadmaps/new',
    icon: Map,
    title: 'Get Roadmap',
    description: 'Turn a surviving idea into a phased plan with milestones and deliverables.',
  },
  {
    to: '/history',
    icon: History,
    title: 'Load Previous Trials',
    description: 'Return to your past verdicts, roadmaps and generated ideas.',
  },
];

export function PathsPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Paths-only background: gothic cathedral interior with floor ritual circle
          (ritual-chamber.webp) rendered as a live scene (torches, smoke, embers). Fixed layer
          rendered inside this page only; covers the global crimson-moon background beneath the header. */}
      <RealmScene scene="ritual" fixed className="!top-16" scrim="linear-gradient(rgba(5,3,4,0.20), rgba(5,3,4,0.35))" />

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-14">
        {/* Heading + subtitle: top center */}
        <header className="text-center mb-10 sm:mb-14">
          <h1 className="font-display text-3xl sm:text-5xl tracking-wide text-parchment drop-shadow-[0_0_16px_rgba(229,9,32,0.5)]">
            Choose Your Path
          </h1>
          <p className="mt-3 font-narrative text-lg sm:text-xl text-parchment-dim italic">
            Four trials await. Which road do you walk?
          </p>
        </header>

        {/* Four cards: balanced horizontal row on desktop, wrapping below */}
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {PATHS.map((p, i) => (
            <PathCard key={p.to} to={p.to} icon={p.icon} title={p.title} description={p.description} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

