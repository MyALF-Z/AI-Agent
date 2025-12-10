// ChatSidebar.tsx
import React, { useContext } from 'react';
import { ChatContext, Conversation } from '../contexts/ChatContext';

const ChatSidebar: React.FC = () => {
  const {
    conversations,
    currentConversationId,
    currentUserId,
    setConversations,
    setCurrentConversationId,
    renameConversation,
    deleteConversation,
  } = useContext(ChatContext);

  const handleNewConversation = () => {
    const newId = `conv${Date.now()}`;

    // ---------- 拼接时间：yyyy-MM-dd HH:mm:ss ----------
    const now = new Date();
    const formatted =
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-` +
      `${String(now.getDate()).padStart(2, '0')} ` +
      `${String(now.getHours()).padStart(2, '0')}:` +
      `${String(now.getMinutes()).padStart(2, '0')}:` +
      `${String(now.getSeconds()).padStart(2, '0')}`;

    const newConv: Conversation = {
      conversationId: newId,
      userId: currentUserId,
      name: `会话 ${formatted}`,   // ← 拼接时间
      customName: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      deleted: false,
      isTemp: true,
    };

    setCurrentConversationId(newId);
    setConversations(prev => [newConv, ...prev]);
  };

  // 为简化，此处仍用原逻辑（实际应从 context 获取 setConversations）
  // 但你的 ChatContext 已提供 setConversations，建议后续重构

  const handleRenameConversation = async (conversationId: string) => {
    const newName = prompt('输入新的会话名称：');
    if (!newName) return;
    const success = await renameConversation(conversationId, newName);
    if (!success) alert('重命名失败，请重试');
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (!confirm('确认删除该会话？')) return;
    const success = await deleteConversation(conversationId);
    if (!success) alert('删除失败，请重试');
  };

  return (
    <div style={{
      width: 280,
      padding: '16px 12px',
      borderRight: '1px solid #e5e7eb',
      backgroundColor: '#f9fafb',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden'      // 防止 Sidebar 本身溢出导致横向滚动条
    }}>
      <button
        onClick={handleNewConversation}
        style={{
          width: '100%',
          padding: '10px 16px',
          marginBottom: '16px',
          borderRadius: '8px',
          border: '1px solid #d1d5db',
          backgroundColor: '#fff',
          cursor: 'pointer',
          fontWeight: 500,
          fontSize: '14px',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
      >
        + 新建会话
      </button>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>  {/* 仅允许竖向滚动 */}
        {conversations.map(conv => (
          <div
            key={conv.conversationId}
            style={{
              marginBottom: '12px',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <button
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: conv.conversationId === currentConversationId ? '#4f46e5' : '#fff',
                color: conv.conversationId === currentConversationId ? '#fff' : '#111827',
                border: 'none',
                textAlign: 'left',
                fontWeight: conv.conversationId === currentConversationId ? 600 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onClick={() => setCurrentConversationId(conv.conversationId)}
            >
              {conv.customName || conv.name}
            </button>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 8px',
              backgroundColor: '#f9fafb'
            }}>
              <button
                onClick={() => handleRenameConversation(conv.conversationId)}
                style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                重命名
              </button>
              <button
                onClick={() => handleDeleteConversation(conv.conversationId)}
                style={{
                  fontSize: '12px',
                  color: '#ef4444',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

};

export default ChatSidebar;
