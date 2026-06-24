import { GamesWorkspace } from '@/components/GamesWorkspace';
import { LANGUAGES } from '@/lib/languages';

export default function GamesPage() {
  return <GamesWorkspace languages={LANGUAGES} />;
}
