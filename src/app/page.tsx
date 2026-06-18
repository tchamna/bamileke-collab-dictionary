import { ContributionWorkspace } from '@/components/ContributionWorkspace';
import { LANGUAGES } from '@/lib/languages';

export default function Home() {
  return <ContributionWorkspace languages={LANGUAGES} />;
}

