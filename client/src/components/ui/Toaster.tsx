import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

const icons = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden />,
  error: <XCircle className="h-5 w-5 text-red-400" aria-hidden />,
  info: <Info className="h-5 w-5 text-sky-400" aria-hidden />,
};

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="pointer-events-auto flex items-start gap-3 gothic-panel px-4 py-3 shadow-crimson-sm"
            role="status"
          >
            {icons[t.kind]}
            <p className="flex-1 text-sm text-parchment font-body">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-parchment-faint hover:text-parchment"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
