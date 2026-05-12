/**
 * AudioPlayer.jsx
 * Minimal audio player for TTS output.
 * Accepts a src (object URL from fetchTTS).
 */
import { useRef, useState } from "react";

/**
 * @param {Object} props
 * @param {string} props.src   - Audio URL (object URL or HTTP URL)
 * @param {string} [props.label]
 */
export default function AudioPlayer({ src, label = "Listen" }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      el.play().catch(() => setError(true));
    }
  };

  if (!src) return null;
  if (error) return <span className="audio-error">Audio unavailable</span>;

  return (
    <div className="audio-player">
      <button
        type="button"
        className={`audio-play-btn ${playing ? "playing" : ""}`}
        onClick={toggle}
        aria-label={playing ? "Pause audio" : label}
      >
        {playing ? (
          /* Pause icon */
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          /* Play icon */
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
        <span>{playing ? "Pause" : label}</span>
      </button>

      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setError(true)}
        preload="metadata"
      />
    </div>
  );
}
