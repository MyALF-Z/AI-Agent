'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Message {
  type: 'thinking' | 'content';
  text: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  /** 自动滚动到底部 */
  useEffect(() => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  /** 保存历史记录 */
  const saveHistory = (text: string) => {
    const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    history.push(text);
    localStorage.setItem('chatHistory', JSON.stringify(history));
  };

  /** 打字机效果 */
  const typeWriter = async (fullText: string, type: Message['type']) => {
    let current = '';
    for (let i = 0; i < fullText.length; i++) {
      current += fullText[i];
      await new Promise((res) => setTimeout(res, 20));

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { type, text: current },
      ]);
    }
  };

  /** 发送消息 */
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { type: 'content', text: input };
    setMessages((prev) => [...prev, userMsg]);
    saveHistory(input);
    setInput('');

    const response = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    // 临时记录不同类型内容
    let thinkingBuffer = '';
    let contentBuffer = '';

    // 先推入空消息，等之后用打字机效果回填
    setMessages((prev) => [...prev, { type: 'thinking', text: '' }]);

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const msg = JSON.parse(line) as Message;

          if (msg.type === 'thinking') {
            thinkingBuffer += msg.text;

            await typeWriter(thinkingBuffer, 'thinking');
          }

          if (msg.type === 'content') {
            // 若是第一次收到 content，先替换渲染框
            if (contentBuffer.length === 0) {
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { type: 'content', text: '' },
              ]);
            }

            contentBuffer += msg.text;
            await typeWriter(contentBuffer, 'content');
          }
        } catch {}
      }
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-box" ref={containerRef}>
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`msg ${msg.type === 'thinking' ? 'msg-thinking' : 'msg-content'}`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div className="input-row">
        <input
          className="chat-input"
          placeholder="请输入消息…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button className="chat-button" onClick={handleSend}>
          发送
        </button>
      </div>
    </div>
  );
}










