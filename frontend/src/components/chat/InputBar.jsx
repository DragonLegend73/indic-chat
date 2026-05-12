import { useState, useRef, useCallback } from "react";

/**
 * @param {Object} props
 * @param {Function} props.onSend       - (text: string) => void
 * @param {string}   props.langCode     - current language code (for voice hint)
 * @param {boolean}  [props.disabled]   - true while streaming
 * @param {string}   [props.placeholder]
 */
export default function InputBar({
  onSend,
  langCode = "eng_Latn",
  disabled = false,
  placeholder = "Ask anything…",
}) {
  const [text, setText] = useState("");
  const textareaRef = useRef(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    textareaRef.current?.focus();
  }, [text, disabled, onSend]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };



  return (
    <div className="input-bar">
      <textarea
        ref={textareaRef}
        className="input-bar__textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        aria-label="Message input"
      />

      <div className="input-bar__actions">


        <button
          type="button"
          className="send-btn"
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          aria-label="Send message"
        >
          {disabled ? (
            <span className="spinner" aria-hidden="true" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              width="20"
              height="20"
              aria-hidden="true"
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
