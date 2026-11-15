import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { rateLimit, getClientIp, validateEmail, validatePassword, MIN_PASSWORD_LENGTH } from '@/lib/rateLimiter';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = rateLimit(ip, { maxRequests: 10, windowMs: 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.reason }, { status: 400 });
    }

    if (!name.trim() || name.trim().length < 2) {
      return NextResponse.json({ error: 'Please enter a valid name' }, { status: 400 });
    }

    const db = await getDatabase();

    const existingUser = await db.collection('users').findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

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
