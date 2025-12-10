// src/server/db/messages.ts
import { Collection, Db } from "mongodb";

export interface Message {
  _id?: string;
  userId: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  deleted: boolean;
  createdAt: string; // ISO 字符串
}

export class Messages {
  private collection: Collection<Message>;

  constructor(db: Db) {
    this.collection = db.collection<Message>("messages");
  }

  /**
   * 创建消息（发送后不可修改）
   */
  async createMessage(params: {
    userId: string;
    conversationId: string;
    role: "user" | "assistant";
    content: string;
  }): Promise<Message> {
    const message: Message = {
      userId: params.userId,
      conversationId: params.conversationId,
      role: params.role,
      content: params.content,
      deleted: false,
      createdAt: new Date().toISOString(),
    };

    const result = await this.collection.insertOne(message);
    return { ...message, _id: result.insertedId.toString() };
  }

  /**
   * 获取某个会话的有效历史消息（非删除）
   */
  async getMessagesByConversation(conversationId: string, userId: string) {
    return this.collection
      .find(
        {
          conversationId,
          userId,
          deleted: false,
        },
        { sort: { createdAt: 1 } }
      )
      .toArray();
  }

  /**
   * 删除消息 → 软删除所有消息
   */
  async softDeleteByConversation(conversationId: string, userId: string) {
    await this.collection.updateMany(
      { conversationId, userId },
      { $set: { deleted: true } }
    );
  }

  /**
   * 获取某个用户的所有消息（调试或统计用）
   */
  async getAllUserMessages(userId: string) {
    return this.collection
      .find({ userId, deleted: false })
      .sort({ createdAt: 1 })
      .toArray();
  }

  /**
   * 彻底删除所有消息（开发调试用）
   */
  async clearAll() {
    await this.collection.deleteMany({});
  }
}
