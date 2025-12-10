import React, { createContext, useState, useEffect, ReactNode } from 'react';

export interface Conversation {
  conversationId: string;
  userId: string;
  name: string;
  customName?: string | null;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
  isTemp?: boolean; //新增字段：前端专用
}

export interface Message {
  _id?: string;
  userId: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  deleted: boolean;
  createdAt: string; // ISO 字符串
}

interface ChatContextType {
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  currentConversationId: string | null;
  setCurrentConversationId: React.Dispatch<React.SetStateAction<string | null>>;
  currentUserId: string;
  setCurrentUserId: React.Dispatch<React.SetStateAction<string>>;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isLoadingMessages: boolean;
  setIsLoadingMessages: React.Dispatch<React.SetStateAction<boolean>>;
  createConversation: (conversationId: string, name: string) => Promise<Conversation | null>;
  renameConversation: (conversationId: string, customName: string) => Promise<boolean>;
  deleteConversation: (conversationId: string) => Promise<boolean>;
  sendMessage: (content: string) => Promise<void>; // 新增 sendMessage
  isWaitingResponse: boolean;
  setIsWaitingResponse: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ChatContext = createContext<ChatContextType>({} as ChatContextType);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('user1');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isWaitingResponse, setIsWaitingResponse] = useState(false);

  // ----------- 获取会话列表 -----------
  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to fetch conversations');
      const data: Conversation[] = await res.json();
      setConversations(data);
    } catch (err) {
      console.error('[ChatContext] 获取会话列表失败，使用模拟数据', err);
      setConversations([
        {
          conversationId: 'conv1',
          userId: 'user1',
          name: '默认会话',
          customName: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deleted: false,
        },
      ]);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // ----------- 获取历史消息 -----------
  const fetchMessages = async (conversationId: string, userId: string) => {
    try {
      setIsLoadingMessages(true);

      const res = await fetch(`/api/messages?conversationId=${conversationId}&userId=${userId}`);
      if (!res.ok) throw new Error('拉取历史消息失败');

      const data: Message[] = await res.json();
      setMessages(data);
    } catch (err) {
      console.error('[ChatContext] 获取历史消息失败:', err);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (currentConversationId && currentUserId) {
      // 立即清空消息，避免短暂显示错误会话的历史
      setMessages([]);

      // 再去后台拉取新的
      fetchMessages(currentConversationId, currentUserId);
    } else {
      setMessages([]);
    }
  }, [currentConversationId, currentUserId]);

  // ----------- 创建会话 -----------
  const createConversation = async (conversationId: string, name: string) => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify( { conversationId, name, userId: currentUserId } ),
      });
      if (!res.ok) throw new Error('创建会话失败');
      const data: Conversation = await res.json();
      // setConversations(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('[ChatContext] 创建会话失败:', err);
      return null;
    }
  };

  // ----------- 重命名会话（支持临时会话） -----------
const renameConversation = async (conversationId: string, customName: string) => {
  const conv = conversations.find(c => c.conversationId === conversationId);

  // 临时会话：只更新前端，不请求数据库
  if (conv?.isTemp) {
    setConversations(prev =>
      prev.map(c =>
        c.conversationId === conversationId
          ? { ...c, name: customName }
          : c
      )
    );
    return true;
  }

  // 正式会话 → 调用后端 API
  try {
    const res = await fetch('/api/conversations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, customName, userId: currentUserId }),
    });
    if (!res.ok) throw new Error('重命名失败');

    const updatedList: Conversation[] = await res.json();
    setConversations(updatedList);

    return true;
  } catch (err) {
    console.error('[ChatContext] 重命名会话失败:', err);
    return false;
  }
};

// ----------- 删除会话（支持临时会话） -----------
const deleteConversation = async (conversationId: string) => {
  const conv = conversations.find(c => c.conversationId === conversationId);

  // 临时会话：只删前端状态，不请求数据库
  if (conv?.isTemp) {
    setConversations(prev =>
      prev.filter(c => c.conversationId !== conversationId)
    );

    if (currentConversationId === conversationId) {
      setCurrentConversationId(null);
      setMessages([]);
    }

    return true;
  }

// 正式会话 → 调用后端 API
  try {
    const res = await fetch('/api/conversations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, userId: currentUserId }),
    });
    if (!res.ok) throw new Error('删除失败');

    const updatedList: Conversation[] = await res.json();
    setConversations(updatedList);

    if (currentConversationId === conversationId) {
      setCurrentConversationId(null);
      setMessages([]);
    }

    return true;
  } catch (err) {
    console.error('[ChatContext] 删除会话失败:', err);
    return false;
  }
};

// ----------- 发送消息（自动保存临时会话 + SSE 流式 + 逐字打印） -----------
const sendMessage = async (content: string) => {
  if (!content.trim()) return;

  let convId = currentConversationId;
  let conv = conversations.find(c => c.conversationId === convId);

  // 自动创建临时会话
  if (!convId) {
    convId = `conv${Date.now()}`;
    conv = {
      conversationId: convId,
      userId: currentUserId,
      name: '新会话',
      customName: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false,
      isTemp: true,
    };
    setConversations(prev => [conv!, ...prev]);
    setCurrentConversationId(convId);
  }

  // 临时会话第一次发送消息 → 写入数据库
  if (conv?.isTemp) {
    const created = await createConversation(convId, conv.name);
    if (!created) {
      console.error('创建会话失败');
      return;
    }
    setConversations(prev =>
      prev.map(c => (c.conversationId === convId ? { ...created } : c))
    );
    conv = created;
  }

  // 先添加用户消息（立即显示）
  const userMsg: Message = {
    role: 'user',
    content,
    createdAt: new Date().toISOString(),
    userId: currentUserId,
    conversationId: convId!,
    deleted: false,
  };
  setMessages(prev => [...prev, userMsg]);




  // SSE 请求模型
  try {
    // 开始等待回复
    setIsWaitingResponse(true);

    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: convId,
        message: content,
        userId: currentUserId,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) throw new Error('SSE 请求失败');

    // 初始化 assistant 消息
    let currentAssistant: Message = {
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      userId: 'assistant',
      conversationId: convId!,
      deleted: false,
    };
    setMessages(prev => [...prev, currentAssistant]);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split('\n');

      for (let line of lines) {
        if (!line.startsWith('data:')) continue;

        const jsonStr = line.replace('data:', '').trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;

        let parsed;
        try {
          parsed = JSON.parse(jsonStr); // { delta: "..." }
        } catch {
          console.warn('无法解析 SSE JSON:', jsonStr);
          continue;
        }

        const delta = parsed.delta ?? parsed.content ?? '';
        if (!delta) continue;

        // 逐字打印
        for (let char of delta) {
          currentAssistant.content += char;
          setMessages(prev => {
            const copy = [...prev];
            copy[copy.length - 1] = { ...currentAssistant };
            return copy;
          });
          await new Promise(r => setTimeout(r, 20)); // 逐字延时，可调整速度
        }
      }
    }
  } catch (err) {
    console.error('发送消息失败:', err);
  }finally {
    setIsWaitingResponse(false); //等待提示结束
  }
};





  return (
    <ChatContext.Provider
      value={{
        conversations,
        setConversations,
        currentConversationId,
        setCurrentConversationId,
        currentUserId,
        setCurrentUserId,
        messages,
        setMessages,
        isLoadingMessages,
        setIsLoadingMessages,
        isWaitingResponse,
        setIsWaitingResponse,
        createConversation,
        renameConversation,
        deleteConversation,
        sendMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
