'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Music, Volume2, VolumeX } from 'lucide-react';
import { createShuffledPlaylist, pickRandomStartIndex } from '@/lib/soundtracks';

const MUSIC_ENABLED_STORAGE_KEY = 'bamilekeGameMusicEnabled';
const BACKGROUND_VOLUME = 0.08;
const CAPTURE = { capture: true };

export function GameBackgroundMusic() {
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const playlistRef = useRef<string[]>([]);
  const trackIndexRef = useRef(0);
  const enabledRef = useRef(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(MUSIC_ENABLED_STORAGE_KEY);
    if (stored === '0') {
      enabledRef.current = false;
      setIsEnabled(false);
    }
  }, []);

  useEffect(() => {
    enabledRef.current = isEnabled;
    window.localStorage.setItem(MUSIC_ENABLED_STORAGE_KEY, isEnabled ? '1' : '0');
  }, [isEnabled]);

  const playCurrentTrack = useCallback(() => {
    const audio = audioEl;
    const playlist = playlistRef.current;
    if (!audio || !enabledRef.current || playlist.length === 0) return;

    audio.volume = BACKGROUND_VOLUME;
    if (!audio.src) {
      audio.src = playlist[trackIndexRef.current];
      audio.load();
    }

    const attempt = audio.play();
    if (attempt) {
      attempt.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      setIsPlaying(!audio.paused);
    }
  }, [audioEl]);

  useEffect(() => {
    if (!audioEl) return;

    const playlist = createShuffledPlaylist();
    if (playlist.length === 0) return;

    playlistRef.current = playlist;
    trackIndexRef.current = pickRandomStartIndex(playlist.length);
    audioEl.volume = BACKGROUND_VOLUME;
    audioEl.src = playlist[trackIndexRef.current];
    audioEl.load();

    function playNextTrack() {
      const audio = audioEl;
      const currentPlaylist = playlistRef.current;
      if (!audio || !enabledRef.current || currentPlaylist.length === 0) return;

      trackIndexRef.current = (trackIndexRef.current + 1) % currentPlaylist.length;
      audio.src = currentPlaylist[trackIndexRef.current];
      audio.load();
      const attempt = audio.play();
      if (attempt) {
        attempt.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    }

    function startFromGesture() {
      const audio = audioEl;
      if (!audio || !enabledRef.current || !audio.paused) return;
      playCurrentTrack();
    }

    function onPlay() {
      setIsPlaying(true);
    }

    function onPause() {
      setIsPlaying(false);
    }

    audioEl.addEventListener('ended', playNextTrack);
    audioEl.addEventListener('play', onPlay);
    audioEl.addEventListener('pause', onPause);
    window.addEventListener('pointerdown', startFromGesture, CAPTURE);
    window.addEventListener('keydown', startFromGesture, CAPTURE);

    return () => {
      audioEl.removeEventListener('ended', playNextTrack);
      audioEl.removeEventListener('play', onPlay);
      audioEl.removeEventListener('pause', onPause);
      window.removeEventListener('pointerdown', startFromGesture, CAPTURE);
      window.removeEventListener('keydown', startFromGesture, CAPTURE);
      audioEl.pause();
    };
  }, [audioEl, playCurrentTrack]);

  function toggleMusic() {
    const audio = audioEl;
    if (!audio) return;

    if (isEnabled) {
      audio.pause();
      setIsEnabled(false);
      setIsPlaying(false);
      return;
    }

    setIsEnabled(true);
    enabledRef.current = true;
    playCurrentTrack();
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#d8d6c8] bg-white p-4 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#edf3ef] text-[#2f6b58]">
          <Music className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#17211c]">Background music</p>
          <p className="truncate text-xs font-medium text-[#62685d]">{isPlaying ? 'Playing soundtrack' : isEnabled ? 'Starts on play' : 'Off'}</p>
        </div>
      </div>
      <audio ref={setAudioEl} preload="auto" playsInline aria-hidden="true" />
      <button
        type="button"
        onClick={toggleMusic}
        aria-pressed={isEnabled}
        aria-label={isEnabled ? 'Turn music off' : 'Turn music on'}
        className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold shadow-sm transition ${
          isEnabled ? 'bg-[#2f6b58] text-white hover:bg-[#255645]' : 'border border-[#c9cabc] bg-white text-[#355f4f] hover:border-[#2f6b58]'
        }`}
      >
        {isEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        {isEnabled ? 'On' : 'Off'}
      </button>
    </div>
  );
}
