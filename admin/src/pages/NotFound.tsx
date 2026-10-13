import { Link } from 'react-router-dom';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Heading } from '../components/ui/Heading';

export default function NotFound() {
  return (
    <GlassPanel corners={false} className="mx-auto max-w-md space-y-3 p-8 text-center">
      <p className="font-label text-sm tracking-[0.3em] text-crimson-text">404</p>
      <Heading level={2}>Nothing here</Heading>
      <Link to="/" className="btn mt-2">Back to the dashboard</Link>
    </GlassPanel>
  );
}
