import { SITE_URL } from '../seo-config';
import MotionAnalyzer from './MotionAnalyzer';

export const metadata = {
  title: 'Motionlang — extract & analyze a website’s motion language',
  description:
    'Paste any URL and see its motion language come alive: easing curves with riding dots, duration scale, detected springs, every keyframe replayed, transitioned properties, scroll-linked animation, and a motion "feel" fingerprint. Copy the motion tokens, Framer Motion presets, or CSS.',
  alternates: { canonical: `${SITE_URL}/motion` },
  openGraph: {
    title: 'Motionlang — analyze a website’s motion language',
    description: 'Easing curves, durations, springs, keyframes, scroll-linked motion and a feel fingerprint — extracted from any URL.',
    url: `${SITE_URL}/motion`,
  },
};

export default function MotionPage() {
  return <MotionAnalyzer />;
}
