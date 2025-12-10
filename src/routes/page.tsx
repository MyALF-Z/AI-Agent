// page.tsx
import React from 'react';
import './index.css'
import { ChatProvider } from '../contexts/ChatContext';
import ChatSidebar from '../components/ChatSidebar';
import ChatWindow from '../components/ChatWindow';

const ChatPage: React.FC = () => {
  return (
    <ChatProvider>
      {/* 主容器：全屏高度，禁止溢出 */}
      <div style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        <ChatSidebar />
        <ChatWindow />
      </div>
    </ChatProvider>
  );
};

export default ChatPage;
