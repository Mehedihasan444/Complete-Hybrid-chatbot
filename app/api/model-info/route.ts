/**
 * Model Info API Route
 * Endpoint for retrieving information about the AI models
 */

import { NextRequest, NextResponse } from 'next/server';
import { getModelInfo } from '@/lib/chatService';

export async function GET() {
  try {
    const modelInfo = await getModelInfo();
    
    return NextResponse.json({
      ...modelInfo,
      retrievedAt: new Date().toISOString(),
      apiVersion: '1.0.0'
    });

  } catch (error) {
    console.error('Error fetching model info:', error);

    // Return fallback model information
    const fallbackInfo = {
      symptomsModel: {
        modelType: 'svm',
        numClasses: 24,
        accuracy: null,
        conditions: [
          'Acne', 'Arthritis', 'Bronchial Asthma', 'Cervical spondylosis',
          'Chicken pox', 'Common Cold', 'Dengue', 'Dimorphic Hemorrhoids',
          'Fungal infection', 'Hypertension', 'Impetigo', 'Jaundice',
          'Malaria', 'Migraine', 'Pneumonia', 'Psoriasis', 'Typhoid',
          'Varicose Veins', 'allergy', 'diabetes', 'drug reaction',
          'gastroesophageal reflux disease', 'peptic ulcer disease',
          'urinary tract infection'
        ],
        features: null,
        trainingData: null,
        performance: null
      },
      ragModel: {
        chunkSize: null,
        chunkOverlap: null,
        topK: null,
        maxResponseLength: null,
        embeddingModel: null,
        llmModel: null,
        totalChunks: null,
        knowledgeBase: null
      },
      status: 'fallback_data',
      serverStatus: 'unavailable',
      timestamp: new Date().toISOString(),
      retrievedAt: new Date().toISOString(),
      apiVersion: '1.0.0',
      note: 'This is fallback placeholder data as the Python server is currently unavailable. Values are not verified against the training notebooks.'
    };

    return NextResponse.json(fallbackInfo, { status: 503 });
  }
}

export async function POST() {
  return NextResponse.json({
    error: 'Method not allowed. Use GET to retrieve model information.'
  }, { status: 405 });
}
