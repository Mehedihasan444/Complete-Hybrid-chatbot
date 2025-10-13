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
        accuracy: 0.9708,
        conditions: [
          'Acne', 'Arthritis', 'Bronchial Asthma', 'Cervical spondylosis',
          'Chicken pox', 'Common Cold', 'Dengue', 'Dimorphic Hemorrhoids',
          'Fungal infection', 'Hypertension', 'Impetigo', 'Jaundice',
          'Malaria', 'Migraine', 'Pneumonia', 'Psoriasis', 'Typhoid',
          'Varicose Veins', 'allergy', 'diabetes', 'drug reaction',
          'gastroesophageal reflux disease', 'peptic ulcer disease',
          'urinary tract infection'
        ],
        features: 5000,
        trainingData: {
          trainSamples: 792,
          validationSamples: 180,
          testSamples: 240
        },
        performance: {
          accuracy: 0.9708,
          f1Score: 0.9704,
          precision: 0.9729,
          recall: 0.9708
        }
      },
      ragModel: {
        chunkSize: 1000,
        chunkOverlap: 200,
        topK: 3,
        maxResponseLength: 512,
        embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
        llmModel: 'NousResearch/Llama-2-7b-chat-hf',
        totalChunks: 23444,
        knowledgeBase: {
          source: 'Gale Encyclopedia of Medicine (3rd Edition)',
          totalDocuments: 4505,
          topics: [
            'General Health', 'Chronic Conditions', 'Medications',
            'Emergency Care', 'Preventive Care', 'Treatment Guidelines',
            'Symptoms & Diagnosis', 'Medical Procedures'
          ]
        }
      },
      status: 'fallback_data',
      serverStatus: 'unavailable',
      timestamp: new Date().toISOString(),
      retrievedAt: new Date().toISOString(),
      apiVersion: '1.0.0',
      note: 'This is fallback data as the Python server is currently unavailable'
    };

    return NextResponse.json(fallbackInfo, { status: 503 });
  }
}

export async function POST() {
  return NextResponse.json({
    error: 'Method not allowed. Use GET to retrieve model information.'
  }, { status: 405 });
}
