const SOUNDTRACK_FILES = [
  '1_Safari Drum Circle.mp3',
  'Greetings African Languages (Cover).mp3',
  'Greetings African Languages (Cover) (1).mp3',
  'Nufi - O li sa ma po pia bo (bon) (3).mp3',
  'Nufi - O li sa ma po pia bo (bon) (4).mp3',
  'Nufi Ka ba Nha Mbuani (3).mp3',
  'Nufi Ka ba Nha Mbuani Jazz (1).mp3',
  'Nufi Mbe wen nkwa (bon) (1).mp3',
  'Nufi_O si mba nge (1).mp3',
  'Nufi_Zahnam o si mba nge.mp3',
] as const;

export function getSoundtrackUrl(filename: string) {
  return `/soundtracks/${encodeURIComponent(filename)}`;
}

export function createShuffledPlaylist() {
  const playlist = SOUNDTRACK_FILES.map((file) => getSoundtrackUrl(file));
  for (let index = playlist.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [playlist[index], playlist[swapIndex]] = [playlist[swapIndex], playlist[index]];
  }
  return playlist;
}

export function pickRandomStartIndex(length: number) {
  return Math.floor(Math.random() * length);
}
