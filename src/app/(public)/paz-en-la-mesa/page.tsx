import type { Metadata } from 'next';
import { PazEnLaMesaLanding, pazLandingMetadata } from '@/components/paz/PazEnLaMesaLanding';

export const metadata: Metadata = pazLandingMetadata;
export const dynamic = 'force-dynamic';

export default function PazEnLaMesaPage() {
  return <PazEnLaMesaLanding />;
}
