import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET all conversations for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default-user';

    const db = await getDatabase();
    const conversations = await db
      .collection('conversations')
      .find({ userId })
      .sort({ isPinned: -1, updatedAt: -1 })
      .toArray();

    const conversationList = conversations.map((conv) => ({
      _id: conv._id.toString(),
      title: conv.title,
      preview: conv.messages[conv.messages.length - 1]?.content?.toString().substring(0, 100) || 'New conversation',
      updatedAt: conv.updatedAt,
      messageCount: conv.messages.length,
      isPinned: conv.isPinned || false,
    }));

    return NextResponse.json({ conversations: conversationList });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

// POST create a new conversation
export async function POST(request: NextRequest) {
  try {
    const { userId, title } = await request.json();

    const db = await getDatabase();
    const newConversation = {
      userId: userId || 'default-user',
      title: title || 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isPinned: false,
      tags: [],
    };

    const result = await db.collection('conversations').insertOne(newConversation);

    return NextResponse.json({
      _id: result.insertedId.toString(),
      ...newConversation,
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}

// DELETE a conversation
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('id');

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    const db = await getDatabase();
    await db.collection('conversations').deleteOne({ _id: new ObjectId(conversationId) });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
}
