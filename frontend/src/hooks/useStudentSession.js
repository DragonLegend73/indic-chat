/**
 * useStudentSession.js
 * Convenience hook for the most common student + chat actions.
 * Thin wrapper over StudentContext + api/client.
 */
import { useCallback, useState } from "react";
import { useStudent } from "../context/StudentContext";
import { streamChat } from "../api/client";

/**
 * Returns helpers for sending messages and managing the streaming state.
 */
export function useStudentSession() {
  const { student, langCode, addMessage } = useStudent();
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");

  const sendMessage = useCallback(
    async (text, { onChunk, onDone, onError } = {}) => {
      if (!student || streaming) return;
      if (!text.trim()) return;

      addMessage("user", text);
      setStreaming(true);
      setStreamingText("");

      let accumulated = "";

      try {
        for await (const event of streamChat(student.id, text)) {
          if (event.type === "token") {
            accumulated += event.content;
            setStreamingText(accumulated);
            onChunk?.(event.content);
          } else if (event.type === "final") {
            accumulated = event.content;
            setStreamingText(accumulated);
          } else if (event.type === "done") {
            addMessage("assistant", accumulated);
            setStreamingText("");
            setStreaming(false);
            onDone?.(accumulated);
          }
        }
      } catch (err) {
        setStreaming(false);
        setStreamingText("");
        onError?.(err);
      }
    },
    [student, langCode, streaming, addMessage]
  );

  const cancelStream = useCallback(() => {
    setStreaming(false);
    setStreamingText("");
  }, []);

  return { streaming, streamingText, sendMessage, cancelStream };
}
