import { connectDB } from '../modules/utils/db';
import { Conversations } from '../modules/Conversations';
import { Messages } from '../modules/Messages';

// GET 会话列表
export async function get() {
  console.log('[GET] /api/lambda/conversations 请求开始');

  try {
    const db = await connectDB();
    const convService = new Conversations(db);
    const conversations = await convService.getConversations();

    console.log('[GET] 返回会话列表：', conversations);
    return new Response(JSON.stringify(conversations), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[GET] 错误：', err);
    return new Response(JSON.stringify({ message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// POST 新建会话
export async function post({ data }: { data: any }) {
  console.log('[POST] 请求数据：', data);

  try {
    const { conversationId, name } = data;
    if (!conversationId) {
      console.warn('[POST] conversationId 缺失');
      return new Response(JSON.stringify({ message: 'conversationId 必填' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = await connectDB();
    const convService = new Conversations(db);
    const doc = await convService.createConversation(conversationId, name);

    console.log('[POST] 创建成功：', doc);
    return new Response(JSON.stringify(doc), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[POST] 错误：', err);
    return new Response(JSON.stringify({ message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
// POST 重命名
export async function put({ data }: { data: any }) {
  console.log('[PUT] 请求数据：', data);

  try {
    const { conversationId, customName, userId } = data;

    if (!conversationId || !customName || !userId) {
      console.warn('[PUT] conversationId, customName 或 userId 缺失');
      return new Response(
        JSON.stringify({ message: 'conversationId、customName 和 userId 必填' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = await connectDB();
    const convService = new Conversations(db);

    // 更新会话名称
    await convService.renameConversation(conversationId, customName);
    console.log(`[PUT] 会话 ${conversationId} 重命名成功 -> ${customName}`);

    // 拉取该用户的最新会话列表
    const updatedList = await convService.getConversations();
    console.log(`[PUT] 返回最新会话列表，数量: ${updatedList.length}`);

    // 返回最新列表
    return new Response(JSON.stringify(updatedList), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[PUT] 错误：', err);
    return new Response(
      JSON.stringify({ message: err.message || '服务器错误' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
// DELETE 删除会话及其消息
export async function del({ data }: { data: any }) {
  console.log('[DELETE] 请求数据：', data);

  try {
    const { conversationId, userId } = data;

    if (!conversationId || !userId) {
      console.warn('[DELETE] conversationId 或 userId 缺失');
      return new Response(
        JSON.stringify({ message: 'conversationId 和 userId 必填' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = await connectDB();
    const convService = new Conversations(db);
    const msgService = new Messages(db);

    // 删除会话
    await convService.deleteConversation(conversationId);
    console.log(`[DELETE] 会话 ${conversationId} 删除成功`);

    // 删除该会话的所有消息
    await msgService.softDeleteByConversation(conversationId, userId);
    console.log(`[DELETE] 会话 ${conversationId} 所有消息逻辑删除成功`);

    // 拉取最新会话列表返回
    const updatedList = await convService.getConversations();
    console.log(`[DELETE] 返回最新会话列表，数量: ${updatedList.length}`);

    return new Response(JSON.stringify(updatedList), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[DELETE] 错误：', err);
    return new Response(
      JSON.stringify({ message: err.message || '服务器错误' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
