// api/lambda/messages.ts
import { connectDB } from '../modules/utils/db';
import { Collection, Db } from 'mongodb';

interface Message {
  _id?: string;
  userId: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  deleted: boolean;
  createdAt: string;
}

export async function get({ query }: { query: Record<string, string> }) {
  console.log('[GET] /api/lambda/messages 请求开始');

  try {
    const conversationId = query.conversationId;
    const userId = query.userId;

    console.log('[GET] 查询参数 conversationId:', conversationId, 'userId:', userId);

    if (!conversationId) {
      console.warn('[GET] conversationId 参数缺失');
      return new Response(
        JSON.stringify({ message: 'conversationId 参数缺失' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!userId) {
      console.warn('[GET] userId 参数缺失');
      return new Response(
        JSON.stringify({ message: 'userId 参数缺失' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db: Db = await connectDB();
    const messagesCollection: Collection<Message> = db.collection('messages');

    const messages = await messagesCollection
      .find({ conversationId, userId, deleted: false })
      .sort({ createdAt: 1 }) // 按时间升序
      .toArray();

    console.log('[GET] 返回历史消息数量:', messages.length);

    return new Response(JSON.stringify(messages), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[GET] 获取历史消息失败:', err);
    return new Response(
      JSON.stringify({ message: err.message || '服务器错误' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
