import { Link } from 'react-router-dom';

/** Simple legal content pages referenced by footer + auth screens. */
export function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const isPrivacy = kind === 'privacy';
  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="text-xs font-heading uppercase tracking-widest text-crimson-glow hover:underline">
        ← Back to home
      </Link>
      <h1 className="font-display text-3xl sm:text-4xl text-parchment mt-4 mb-6">
        {isPrivacy ? 'Privacy Policy' : 'Terms of Service'}
      </h1>
      <div className="gothic-panel p-6 sm:p-8 space-y-5 font-narrative text-lg text-parchment-dim leading-relaxed">
        {isPrivacy ? (
          <>
            <p>
              ChallengeX stores your account email, display name, and the ideas, trials, roadmaps and shares you
              create. Passwords are stored only as bcrypt hashes on the server and are never visible to the client.
            </p>
            <p>
              Authentication uses a signed bearer token kept in your browser's local storage. A 401 response clears
              it immediately. We do not embed API keys, database credentials or backend secrets in browser code.
            </p>
            <p>
              AI providers receive the text you submit for analysis to generate clarifications, questions, verdicts
              and roadmaps. Uploaded avatars and exports are stored by Cloudinary under account-scoped folders.
            </p>
            <p>Contact support@challengex.app to request export or deletion of your data.</p>
          </>
        ) : (
          <>
            <p>
              You agree to use ChallengeX for evaluating your own business or project ideas and to answer trial
              questions honestly — the value of the verdict depends on the honesty of the input.
            </p>
            <p>
              Verdicts, scores and roadmaps are AI-generated decision-support material, not professional financial,
              legal or investment advice. You remain solely responsible for the decisions you make.
            </p>
            <p>
              Do not submit confidential third-party information you are not authorized to share. Accounts found
              abusing the service may be suspended by administrators.
            </p>
            <p>Contact support@challengex.app with questions about these terms.</p>
          </>
        )}
      </div>
    </div>
  );
}
