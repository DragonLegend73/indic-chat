/**
 * ChatWindow.jsx
 * Renders the list of messages + the live streaming assistant bubble.
 * Auto-scrolls to the bottom on new messages.
 */
import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import StreamingText from "./StreamingText";

/**
 * @param {Object}   props
 * @param {Array}    props.history        - { role, content, timestamp }[]
 * @param {boolean}  props.streaming      - true while assistant is generating
 * @param {string}   props.streamingText  - partial assistant text
 * @param {string}   [props.langCode]     - current student language
 */
export default function ChatWindow({ history, streaming, streamingText, langCode }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history.length, streamingText]);

  const isEmpty = history.length === 0 && !streaming;

  return (
    <div className="chat-window" role="log" aria-live="polite" aria-label="Conversation">
      {isEmpty && (
        <div className="chat-empty">
          <span className="chat-empty__icon">🎓</span>
          <p className="chat-empty__text">
            Ask me anything from your NCERT textbook in any language!
          </p>
          <p className="chat-empty__sub">
            Hindi · Tamil · Bengali · Telugu · Kannada · Malayalam + 16 more
          </p>
        </div>
      )}

      {history.map((msg, i) => (
        <MessageBubble
          key={i}
          role={msg.role}
          content={msg.content}
          langCode={msg.role === "assistant" ? langCode : undefined}
          timestamp={msg.timestamp}
        />
      ))}

      {/* Live streaming bubble */}
      {streaming && (
        <div className="message-bubble assistant">
          <div className="bubble-avatar">🤖</div>
          <div className="bubble-body">
            <div className="bubble-meta">
              <span className="bubble-role">Indic-Chat</span>
            </div>
            <div className="bubble-content">
              <StreamingText text={streamingText} done={false} />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
