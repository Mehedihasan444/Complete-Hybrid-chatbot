import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

function requestUserId(request: NextRequest): string | null {
  const { searchParams } = new URL(request.url);
  return searchParams.get('userId') || null;
}

// GET a specific conversation - only the owner may read it
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = requestUserId(request);
    const db = await getDatabase();

    const query: any = { _id: new ObjectId(id) };
    if (userId) query.userId = userId;

    const conversation = await db.collection('conversations').findOne(query);

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...conversation,
      _id: conversation._id.toString(),
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}

// PUT update a conversation - only the owner may modify it
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();
    const userId = updates.userId || requestUserId(request);
    const db = await getDatabase();

    const existing = await db.collection('conversations').findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    if (userId && existing.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden: not the conversation owner' }, { status: 403 });
    }

    const updateDoc: any = {
      updatedAt: new Date(),
    };

    if (updates.title) updateDoc.title = updates.title;
    if (updates.messages) updateDoc.messages = updates.messages;
    if (updates.isPinned !== undefined) updateDoc.isPinned = updates.isPinned;
    if (updates.tags) updateDoc.tags = updates.tags;

    await db.collection('conversations').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
  }
}

// PATCH add a message to conversation - only the owner may append
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { message, userId } = await request.json();
    const db = await getDatabase();

    const existing = await db.collection('conversations').findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    if (userId && existing.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden: not the conversation owner' }, { status: 403 });
    }

    // Validate message structure before storing (SEC-7)
    if (!message || typeof message !== 'object') {
      return NextResponse.json({ error: 'Invalid message payload' }, { status: 400 });
    }
    if (typeof message.id !== 'string' || !message.id) {
      return NextResponse.json({ error: 'Message id is required' }, { status: 400 });
    }
    if (!['user', 'assistant'].includes(message.role)) {
      return NextResponse.json({ error: 'Message role must be "user" or "assistant"' }, { status: 400 });
    }
    if (typeof message.timestamp !== 'string') {
      return NextResponse.json({ error: 'Message timestamp is required' }, { status: 400 });
    }

    await db.collection('conversations').updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { messages: message },
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding message:', error);
    return NextResponse.json({ error: 'Failed to add message' }, { status: 500 });
  }
}
