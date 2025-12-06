import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET a specific conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDatabase();
    const conversation = await db
      .collection('conversations')
      .findOne({ _id: new ObjectId(id) });

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

// PUT update a conversation (add message, update title, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();
    const db = await getDatabase();

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

// PATCH add a message to conversation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { message } = await request.json();
    const db = await getDatabase();

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
