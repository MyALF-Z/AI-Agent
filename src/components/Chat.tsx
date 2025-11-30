// import React, { useEffect, useRef, useState } from "react";

// type Role = "user" | "assistant";
// type Message = { id: string; role: Role; content: string; ts: number };

// const KEY = "chat_history_app3";

// const load = () => {
//   try {
//     return JSON.parse(localStorage.getItem(KEY) || "[]");
//   } catch {
//     return [];
//   }
// };

// const save = (h: any) => localStorage.setItem(KEY, JSON.stringify(h));

// function genId() {
//   return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
// }

// export default function Chat() {
//   const [history, setHistory] = useState<Message[]>(load);
//   const [input, setInput] = useState("");
//   const [isStreaming, setIsStreaming] = useState(false);

//   const [thinking, setThinking] = useState("");
//   const [content, setContent] = useState("");

//   useEffect(() => save(history), [history]);

//   const add = (m: Message) => setHistory(h => [...h, m]);

//   const send = async () => {
//     const text = input.trim();
//     if (!text || isStreaming) return;

//     const userMsg: Message = { id: genId(), role: "user", content: text, ts: Date.now() };
//     add(userMsg);
//     setInput("");

//     const messagesForModel = [...history, userMsg].map(m => ({
//       role: m.role,
//       content: m.content
//     }));

//     console.log("[FE] Send messages:", messagesForModel);

//     setThinking("");
//     setContent("");
//     setIsStreaming(true);

//     try {
//       const resp = await fetch("/api/agent", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ messages: messagesForModel }),
//       });

//       if (!resp.ok) {
//         const txt = await resp.text();
//         console.error("[FE] Upstream error:", txt);
//         setIsStreaming(false);
//         return;
//       }

//       const reader = resp.body!.getReader();
//       const decoder = new TextDecoder();
//       let buf = "";

//       while (true) {
//         const { value, done } = await reader.read();
//         if (done) break;

//         buf += decoder.decode(value, { stream: true });

//         const parts = buf.split("\n\n");
//         buf = parts.pop() || "";

//         for (const p of parts) {
//           const line = p.trim();
//           if (!line.startsWith("data:")) continue;

//           const payload = line.slice(5).trim();
//           if (payload === "[DONE]") {
//             const assistantMsg: Message = {
//               id: genId(),
//               role: "assistant",
//               content,
//               ts: Date.now(),
//             };
//             add(assistantMsg);

//             console.log("[FE] Stream finished.");
//             setIsStreaming(false);
//             return;
//           }

//           try {
//             const obj = JSON.parse(payload);
//             const delta = obj?.choices?.[0]?.delta || {};

//             if (delta.thinking) {
//               setThinking(t => t + delta.thinking);
//               console.log("[FE] (thinking)", delta.thinking);
//             }
//             if (delta.content) {
//               setContent(c => c + delta.content);
//               console.log("[FE] (content)", delta.content);
//             }
//           } catch (e) {
//             console.warn("[FE] Parse error:", payload);
//           }
//         }
//       }
//     } catch (e) {
//       console.error("[FE] Streaming exception:", e);
//     } finally {
//       setIsStreaming(false);
//     }
//   };

//   return (
//     <div style={{ padding: 20 }}>
//       <h2>Chat</h2>

//       <div style={{ border: "1px solid #ddd", padding: 10, height: 400, overflow: "auto" }}>
//         {history.map(m => (
//           <div key={m.id} style={{ marginBottom: 10 }}>
//             <b>{m.role}</b>: {m.content}
//           </div>
//         ))}

//         {thinking && (
//           <div style={{ color: "#c77", fontStyle: "italic", marginBottom: 10 }}>
//             <b>thinking...</b> {thinking}
//           </div>
//         )}

//         {content && (
//           <div style={{ color: "#333" }}>
//             <b>assistant:</b> {content}
//           </div>
//         )}
//       </div>

//       <textarea
//         value={input}
//         onChange={(e) => setInput(e.target.value)}
//         rows={3}
//         style={{ width: "100%", marginTop: 10 }}
//       />

//       <button onClick={send} disabled={isStreaming || !input.trim()}>
//         {isStreaming ? "Streaming..." : "Send"}
//       </button>
//       <button onClick={() => { setHistory([]); localStorage.removeItem(KEY); }}>
//         Clear
//       </button>
//     </div>
//   );
// }



// src/components/Chat.tsx
import React, { useEffect, useRef, useState } from "react";

type Role = "user" | "assistant";
type Message = { id: string; role: Role; content: string; ts: number };

const STORAGE_KEY = "chat_history_app3";

// 从 localStorage 加载历史
function loadHistory(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Message[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// 保存历史到 localStorage
function saveHistory(history: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {}
}

// 生成唯一 ID
function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function Chat() {
  const [history, setHistory] = useState<Message[]>(loadHistory);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentContent, setCurrentContent] = useState(""); // 实时流式显示

  const containerRef = useRef<HTMLDivElement | null>(null);
  const abortCtrlRef = useRef<AbortController | null>(null);

  // 保存历史 + 自动滚动
  useEffect(() => {
    saveHistory(history);
    setTimeout(() => {
      containerRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
    }, 50);
  }, [history]);

  const addMessage = (msg: Message) => {
    setHistory((prev) => [...prev, msg]);
  };

  const handleStop = () => {
    abortCtrlRef.current?.abort();
    abortCtrlRef.current = null;
    setIsStreaming(false);
    setCurrentContent("");
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    // 添加用户消息
    const userMsg: Message = { id: genId(), role: "user", content: text, ts: Date.now() };
    addMessage(userMsg);
    setInput("");

    // 构造发送给 BFF 的消息（仅 role + content）
    const messagesForModel = [...history, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let finalContent = ""; // 用于最终保存到 history
    setCurrentContent("");
    setIsStreaming(true);
    abortCtrlRef.current = new AbortController();

    try {
      const resp = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesForModel }),
        signal: abortCtrlRef.current.signal,
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
      }

      if (!resp.body) {
        throw new Error("Empty response body");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;

          const payload = line.slice(5).trim();
          if (payload === "[DONE]") {
            // ✅ 流结束：保存最终内容到历史
            const assistantMsg: Message = {
              id: genId(),
              role: "assistant",
              content: finalContent.trim() || "（模型未返回内容）",
              ts: Date.now(),
            };
            addMessage(assistantMsg);
            setCurrentContent("");
            setIsStreaming(false);
            return;
          }

          try {
            const obj = JSON.parse(payload);
            const delta = obj?.choices?.[0]?.delta?.content || "";
            if (delta) {
              finalContent += delta;
              setCurrentContent(finalContent); // 实时更新 UI
            }
          } catch (parseError) {
            console.warn("[FE] Failed to parse SSE payload:", payload, parseError);
          }
        }
      }
    } catch (error: any) {
      console.error("[FE] Streaming error:", error);

      if (error.name === "AbortError") {
        // 用户主动停止，不添加错误消息
        setCurrentContent("");
      } else {
        // ✅ 网络/BFF 错误：添加错误提示到历史
        const errorMsg: Message = {
          id: genId(),
          role: "assistant",
          content: "❌ 请求失败，请检查网络或稍后重试。",
          ts: Date.now(),
        };
        addMessage(errorMsg);
      }
    } finally {
      setIsStreaming(false);
      setCurrentContent(""); // 清理临时状态
      abortCtrlRef.current = null;
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: "system-ui, sans-serif", maxWidth: 800, margin: "0 auto" }}>
      <h2>AI 聊天助手</h2>
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 12,
          height: 450,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          backgroundColor: "#fafafa",
        }}
        ref={containerRef}
      >
        {history.length === 0 && (
          <div style={{ color: "#888", textAlign: "center", padding: 20 }}>
            发送消息开始对话...
          </div>
        )}

        {history.map((m) => (
          <div key={m.id} style={{ marginBottom: 8 }}>
            <b style={{ color: m.role === "user" ? "#1976d2" : "#388e3c" }}>
              {m.role === "user" ? "You" : "AI"}
            </b>
            : {m.content}
          </div>
        ))}

        {isStreaming && currentContent && (
          <div style={{ color: "#333" }}>
            <b style={{ color: "#388e3c" }}>AI</b>: {currentContent}
          </div>
        )}
      </div>

      <textarea
        rows={3}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="输入您的问题..."
        style={{
          width: "100%",
          marginTop: 12,
          borderRadius: 6,
          padding: 10,
          border: "1px solid #ccc",
          fontSize: 14,
        }}
        disabled={isStreaming}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
      />

      <div style={{ marginTop: 10, display: "flex", gap: 10, justifyContent: "flex-start" }}>
        <button
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          style={{
            padding: "8px 16px",
            backgroundColor: isStreaming ? "#ccc" : "#1976d2",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: !input.trim() || isStreaming ? "not-allowed" : "pointer",
          }}
        >
          {isStreaming ? "生成中..." : "发送"}
        </button>

        <button
          onClick={() => {
            setHistory([]);
            localStorage.removeItem(STORAGE_KEY);
          }}
          disabled={isStreaming}
          style={{
            padding: "8px 16px",
            backgroundColor: "#f5f5f5",
            border: "1px solid #ccc",
            borderRadius: 4,
            cursor: isStreaming ? "not-allowed" : "pointer",
          }}
        >
          清空
        </button>

        {isStreaming && (
          <button
            onClick={handleStop}
            style={{
              padding: "8px 16px",
              backgroundColor: "#ff6b6b",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            停止
          </button>
        )}
      </div>
    </div>
  );
}
