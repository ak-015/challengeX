import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Modal popup for Terms of Service and Privacy Policy content.
 * Renders the same legal text as the old standalone /privacy and /terms pages.
 */
export function LegalPopup({
  isOpen,
  onClose,
  kind,
}: {
  isOpen: boolean;
  onClose: () => void;
  kind: 'privacy' | 'terms';
}) {
  const isPrivacy = kind === 'terms' ? false : true;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed z-[100] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl p-6 sm:p-8 bg-background border border-[var(--border-visible)] rounded-md shadow-2xl"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-[101] p-2 text-parchment-dim hover:text-parchment"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <h1 className="font-display text-3xl sm:text-4xl text-parchment mb-6">
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
