// ChatWindow.tsx
import React, { useContext, useState, useRef, useEffect } from 'react';
import { ChatContext } from '../contexts/ChatContext';

const ChatWindow: React.FC = () => {
  const { currentConversationId, messages, sendMessage, isLoadingMessages, isWaitingResponse } = useContext(ChatContext);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (inputValue.trim()) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoadingMessages, isWaitingResponse]);

  // 未选择会话
  if (!currentConversationId) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        color: '#6b7280',
        fontSize: '16px',
        textAlign: 'center',
        padding: '20px',
        backgroundColor: '#fff',
        boxSizing: 'border-box'
      }}>
        请选择左侧会话，或点击「新建会话」开始对话
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#fff',
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxSizing: 'border-box'
      }}>
        {isLoadingMessages ? (
          <div style={{
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '14px',
            marginTop: '20px'
          }}>
            正在加载历史消息...
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  maxWidth: '80%',
                  wordBreak: 'break-word',
                  padding: '12px 16px',
                  borderRadius: '18px',
                  backgroundColor: msg.role === 'user' ? '#4f46e5' : '#f1f5f9',
                  color: msg.role === 'user' ? '#fff' : '#1e293b',
                  fontSize: '15px',
                  lineHeight: 1.5
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {isWaitingResponse && (
              <div style={{
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '14px',
                fontStyle: 'italic',
                marginTop: '10px'
              }}>
                加载回复中…
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{
        padding: '16px',
        borderTop: '1px solid #e5e7eb',
        backgroundColor: '#fff',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="输入消息...（回车发送，Shift+Enter 换行）"
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '20px',
              border: '1px solid #d1d5db',
              fontSize: '15px',
              outline: 'none',
              minHeight: '24px',
              resize: 'none'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            style={{
              padding: '12px 24px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: inputValue.trim() ? '#4f46e5' : '#e5e7eb',
              color: inputValue.trim() ? '#fff' : '#9ca3af',
              fontWeight: 500,
              cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
              fontSize: '15px'
            }}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;

