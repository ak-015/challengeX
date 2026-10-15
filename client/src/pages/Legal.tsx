import { Link, useParams } from 'react-router-dom';
import { ButtonLink } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Heading } from '@/components/ui/Heading';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const CONTENT: Record<'privacy' | 'terms', { title: string; body: string[] }> = {
  privacy: {
    title: 'Privacy Policy',
    body: [
      'This page is a placeholder. ChallengeX has not published a final privacy policy yet.',
      'In short: your account email, display name, ideas, trials, verdicts, and roadmaps are stored so the product can work. Nothing is sold. Nothing is shared publicly unless you explicitly create a share link.',
      'The full policy will replace this text before launch.',
    ],
  },
  terms: {
    title: 'Terms of Service',
    body: [
      'This page is a placeholder. ChallengeX has not published final terms of service yet.',
      'In short: ChallengeX provides AI-generated analysis of your ideas for decision support. Verdicts and roadmaps are advisory, not professional business, legal, or financial advice.',
      'The full terms will replace this text before launch.',
    ],
  },
};

export function Component() {
  const { doc } = useParams();
  const kind = doc === 'terms' ? 'terms' : 'privacy';
  const c = CONTENT[kind];
  useDocumentTitle(`${c.title} — ChallengeX`);

  return (
    <div className="safe-pad mx-auto max-w-2xl space-y-6 py-16">
      <div className="text-center">
        <Heading level={1}>{c.title}</Heading>
        <div className="rune-divider mt-3" aria-hidden="true">
          <span />
        </div>
      </div>
      <GlassPanel className="space-y-4 p-6 sm:p-8">
        {c.body.map((p, i) => (
          <p key={i} className="font-prose text-lg leading-relaxed text-ash-dim">
            {p}
          </p>
        ))}
      </GlassPanel>
      <div className="text-center">
        <ButtonLink to="/" variant="ghost" size="sm">
          Back to the landing page
        </ButtonLink>
        <p className="mt-4 font-prose text-sm text-ash-faint">
          <Link to={kind === 'privacy' ? '/terms' : '/privacy'} className="underline hover:text-crimson-text">
            {kind === 'privacy' ? 'Terms of Service' : 'Privacy Policy'}
          </Link>
        </p>
      </div>
    </div>
  );
}
