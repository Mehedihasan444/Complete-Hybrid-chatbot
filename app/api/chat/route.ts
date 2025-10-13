/**
 * Chat API Route
 * Main endpoint for handling chat messages and routing to appropriate AI systems
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateBotResponse } from '@/lib/chatService';

export async function POST(request: NextRequest) {
  try {
  const body = await request.json();
  const { message, queryType, sessionId } = body;

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    if (message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    if (message.length > 1000) {
      return NextResponse.json(
        { error: 'Message is too long (max 1000 characters)' },
        { status: 400 }
      );
    }

    // Validate queryType if provided
    if (queryType && !['symptoms', 'general', 'hybrid'].includes(queryType)) {
      return NextResponse.json(
        { error: 'Invalid queryType. Must be "symptoms", "general", or "hybrid"' },
        { status: 400 }
      );
    }

    if (sessionId && typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'sessionId, if provided, must be a string' },
        { status: 400 }
      );
    }

    // Generate response using the chat service
  const response = await generateBotResponse(message, sessionId, queryType);

    // Return successful response
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in chat API:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Request timeout. Please try again.' },
          { status: 504 }
        );
      }
      
      if (error.message.includes('server')) {
        return NextResponse.json(
          { error: 'Medical AI service temporarily unavailable. Please try again later.' },
          { status: 503 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred while processing your request',
        fallbackResponse: generateErrorFallback()
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Medical Chatbot Chat API',
    version: '1.0.0',
    endpoints: {
      POST: 'Send a chat message',
    },
    usage: {
      method: 'POST',
      body: {
        message: 'string (required)',
        queryType: 'symptoms | general (optional)'
      }
    }
  });
}

function generateErrorFallback() {
  return {
    response: `I apologize, but I'm experiencing technical difficulties right now. Here's some general guidance:

**For Symptom-Related Concerns:**
• Monitor your symptoms carefully
• Seek medical attention if symptoms worsen or persist
• Contact emergency services for severe symptoms
• Keep a record of symptoms for healthcare providers

**For General Medical Questions:**
• Consult with your healthcare provider
• Use reputable medical websites for information
• Contact your pharmacy for medication questions
• Seek immediate care for urgent concerns

**⚠️ Medical Disclaimer:**
This system is temporarily experiencing issues. For any health concerns, please consult with qualified healthcare professionals immediately. In case of emergency, contact emergency services.

*Please try again in a few moments as our system should be back online shortly.*`,
    queryType: 'general' as const,
    timestamp: new Date().toISOString()
  };
}
