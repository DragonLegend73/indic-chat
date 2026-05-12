/**
 * StreamingText.jsx
 * Renders text that arrives token-by-token with a blinking cursor.
 * Supports Devanagari, Tamil, Bengali and all other Indic scripts via
 * the Noto font stack set in index.css.
 */
import { useEffect, useRef } from "react";

export default function StreamingText({ text, done = false, className = "" }) {
  const endRef = useRef(null);

  // Auto-scroll to the latest token
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [text]);

  return (
    <span className={`streaming-text ${className}`}>
      {text}
      {!done && <span className="cursor" aria-hidden="true">▌</span>}
      <span ref={endRef} />
    </span>
  );
}
