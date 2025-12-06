import { ObjectId } from 'mongodb';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string | any;
  timestamp: Date;
  metadata?: {
    queryType?: string;
    confidence?: number;
    condition?: string;
    sources?: string[];
    processingTime?: number;
  };
}

export interface Conversation {
  _id?: ObjectId;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  isPinned?: boolean;
  tags?: string[];
}

export interface ConversationListItem {
  _id: string;
  title: string;
  preview: string;
  updatedAt: Date;
  messageCount: number;
  isPinned?: boolean;
}
