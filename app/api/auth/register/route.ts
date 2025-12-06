import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const db = await getDatabase();
    
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email: email.toLowerCase() });
    
    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.collection('users').insertOne({
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name.trim(),
      createdAt: new Date(),
    });

    return NextResponse.json({
      user: {
        id: result.insertedId.toString(),
        email: email.toLowerCase(),
        name: name.trim(),
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
