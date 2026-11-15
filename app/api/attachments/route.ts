/**
 * Attachment upload proxy.
 * The browser POSTs files here; this route validates type/size server-side
 * and forwards to the Python backend. The browser never calls the Python
 * backend directly and no hardcoded ngrok URL is used (SEC-4, SEC-9).
 */

import { NextRequest, NextResponse } from 'next/server';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'text/plain', 'text/csv', 'application/json'];

function allowedFile(file: File): { ok: boolean; reason?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, reason: `File "${file.name}" exceeds 10 MB limit` };
  }
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isDoc = ALLOWED_DOCUMENT_TYPES.includes(file.type);
  if (!isImage && !isDoc) {
    return { ok: false, reason: `Unsupported file type "${file.type}" for "${file.name}"` };
  }
  return { ok: true };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const message = formData.get('message') as string | null;
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    for (const file of files) {
      const check = allowedFile(file);
      if (!check.ok) {
        return NextResponse.json({ error: check.reason }, { status: 400 });
      }
    }

    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

    const upstreamFormData = new FormData();
    if (message) upstreamFormData.append('message', message);
    for (const file of files) {
      upstreamFormData.append('files', file, file.name);
    }

    const response = await fetch(`${backendUrl}/chat-with-attachments`, {
      method: 'POST',
      body: upstreamFormData,
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: body.error || `Backend returned ${response.status}`, fallback: true },
        { status: 502 }
      );
    }

    return NextResponse.json({ ...body, fallback: false });
  } catch (error) {
    console.error('Attachment proxy error:', error);
    return NextResponse.json(
      { error: 'Unable to process attachments', fallback: true },
      { status: 502 }
    );
  }
}
