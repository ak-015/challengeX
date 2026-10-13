import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LazyMotion, MotionConfig } from 'framer-motion';
import { RouterProvider } from 'react-router-dom';
import { Splash } from '@/components/ui/Splash';
import { router } from '@/routes/router';
import './index.css';

// domAnimation is loaded on demand so the animation engine is not part of the entry chunk.
const loadFeatures = () => import('./lib/motionFeatures').then((m) => m.default);

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadFeatures} strict>
        <RouterProvider router={router} fallbackElement={<Splash />} />
      </LazyMotion>
    </MotionConfig>
  </StrictMode>,
);
