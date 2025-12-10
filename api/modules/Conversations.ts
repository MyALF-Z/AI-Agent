import { MongoClient, Db } from 'mongodb';

export interface Conversation {
  conversationId: string;
  userId: string;
  name: string;
  customName?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deleted: boolean;
}

export class Conversations {
  private db: Db;
  private collectionName = 'conversations';
  private userId = 'user1'; // 单用户场景

  constructor(db: Db) {
    this.db = db;
  }

  async createConversation(conversationId: string, name?: string) {
    const now = new Date();
    const doc: Conversation = {
      conversationId,
      userId: this.userId,
      name: name || '新会话',
      customName: null,
      createdAt: now,
      updatedAt: now,
      deleted: false,
    };
    await this.db.collection(this.collectionName).insertOne(doc);
    return doc;
  }

  async getConversations() {
    return this.db
      .collection(this.collectionName)
      .find({ userId: this.userId, deleted: false })
      .sort({ updatedAt: -1 })
      .toArray();
  }

  async exists(conversationId: string) {
    const conv = await this.db
      .collection(this.collectionName)
      .findOne({ conversationId, userId: this.userId, deleted: false });
    return !!conv;
  }

  async renameConversation(conversationId: string, customName: string) {
    const now = new Date();
    await this.db.collection(this.collectionName).updateOne(
      { conversationId, userId: this.userId },
      { $set: { customName, updatedAt: now } }
    );
  }

  async deleteConversation(conversationId: string) {
    const now = new Date();
    // 软删除
    await this.db.collection(this.collectionName).updateOne(
      { conversationId, userId: this.userId },
      { $set: { deleted: true, updatedAt: now } }
    );
  }
}
