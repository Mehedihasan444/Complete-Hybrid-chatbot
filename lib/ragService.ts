/**
 * RAG (Retrieval-Augmented Generation) Service
 * Interface to the medical knowledge base and Q&A system
 */

import { pythonServerClient, RAGRequest, RAGResponse } from './pythonServerClient';

export interface RAGResult {
  answer: string;
  sources: string[];
  confidence: number;
  processingTime: number;
  chunksUsed: number;
  timestamp: string;
}

/**
 * Query the RAG system for medical information
 */
export async function queryRAG(
  question: string,
  contextType: string = 'general'
): Promise<RAGResult> {
  try {
    const request: RAGRequest = {
      question: question.trim(),
      context_type: contextType
    };

    const response: RAGResponse = await pythonServerClient.queryRAG(request);

    return {
      answer: response.answer,
      sources: response.sources,
      confidence: response.confidence,
      processingTime: response.processing_time_ms,
      chunksUsed: response.context_chunks_used,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error in RAG query:', error);
    
    // Provide fallback response for development/offline use
    return generateFallbackRAGResponse(question);
  }
}

/**
 * Generate fallback response when RAG system is unavailable
 */
function generateFallbackRAGResponse(question: string): RAGResult {
  const questionLower = question.toLowerCase();
  let answer: string;

  if (questionLower.includes('diabetes')) {
    answer = `**Diabetes Overview (Fallback Response)**

Diabetes is a group of metabolic disorders characterized by high blood glucose levels over a prolonged period.

**Types:**
• Type 1: Autoimmune condition affecting insulin production
• Type 2: Insulin resistance or insufficient insulin production
• Gestational: Develops during pregnancy

**Management:**
• Regular blood glucose monitoring
• Healthy diet with controlled carbohydrates
• Regular physical activity
• Medication as prescribed by healthcare provider
• Regular medical check-ups

**⚠️ Medical Disclaimer:** This is a fallback response. The full medical knowledge base is currently unavailable. Please consult healthcare professionals for comprehensive medical advice.`;

  } else if (questionLower.includes('hypertension') || questionLower.includes('blood pressure')) {
    answer = `**Hypertension Information (Fallback Response)**

High blood pressure is a condition where blood pressure is consistently elevated.

**Normal Range:** Less than 120/80 mmHg
**High Blood Pressure:** 140/90 mmHg or higher

**Management:**
• Reduce sodium intake
• Regular exercise
• Maintain healthy weight
• Limit alcohol consumption
• Stress management
• Take prescribed medications

**⚠️ Medical Disclaimer:** This is a fallback response. The full medical knowledge base is currently unavailable. Please consult healthcare professionals for comprehensive medical advice.`;

  } else if (questionLower.includes('medication') || questionLower.includes('drug')) {
    answer = `**Medication Safety (Fallback Response)**

General medication safety guidelines:

**Over-the-Counter Medications:**
• Follow dosage instructions carefully
• Check for drug interactions
• Be aware of side effects
• Don't exceed recommended doses

**Prescription Medications:**
• Take exactly as prescribed
• Don't stop without consulting your doctor
• Report side effects to healthcare provider
• Keep up-to-date medication list

**⚠️ Medical Disclaimer:** This is a fallback response. The full medical knowledge base is currently unavailable. Please consult healthcare professionals or pharmacists for specific medication advice.`;

  } else {
    answer = `**General Medical Information (Fallback Response)**

Thank you for your medical question. While our comprehensive knowledge base is temporarily unavailable, here's some general guidance:

**General Health Principles:**
• Maintain regular check-ups with healthcare providers
• Follow a balanced diet rich in fruits, vegetables, and whole grains
• Engage in regular physical activity
• Get adequate sleep (7-9 hours for adults)
• Manage stress effectively
• Stay hydrated and avoid harmful substances

**When to Seek Medical Care:**
• Persistent or worsening symptoms
• Severe pain or discomfort
• Signs of infection (fever, unusual discharge)
• Breathing difficulties
• Chest pain or heart symptoms
• Any concerning changes in your health

**⚠️ Medical Disclaimer:** This is a fallback response providing general information only. The full medical knowledge base is currently unavailable. Always consult with qualified healthcare professionals for personalized medical advice, diagnosis, or treatment.`;
  }

  return {
    answer,
    sources: ['Fallback Medical Knowledge (Limited)'],
    confidence: 0.6,
    processingTime: 0,
    chunksUsed: 1,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get RAG system configuration
 */
export async function getRAGConfiguration() {
  try {
    const modelInfo = await pythonServerClient.getModelInfo();
    return {
      chunkSize: modelInfo.ragModel.chunkSize,
      topK: modelInfo.ragModel.topK,
      embeddingModel: modelInfo.ragModel.embeddingModel,
      llmModel: modelInfo.ragModel.llmModel
    };
  } catch (error) {
    console.error('Error fetching RAG configuration:', error);
    
    // Return fallback configuration
    return {
      chunkSize: 1000,
      topK: 3,
      embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
      llmModel: 'NousResearch/Llama-2-7b-chat-hf'
    };
  }
}

/**
 * Validate question input
 */
export function validateRAGInput(question: string): {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const suggestions: string[] = [];

  // Check minimum length
  if (question.trim().length < 5) {
    errors.push('Question should be at least 5 characters long');
    suggestions.push('Please provide a more detailed question');
  }

  // Check maximum length
  if (question.length > 500) {
    errors.push('Question is too long (max 500 characters)');
    suggestions.push('Please provide a more concise question');
  }

  // Check for question words or medical terms
  const hasQuestionWords = /\b(what|how|why|when|where|who|which|can|could|should|would|is|are|do|does|will)\b/i.test(question);
  const hasMedicalTerms = /\b(health|medical|medicine|doctor|treatment|symptom|disease|condition|diagnosis|therapy|prevention|care)\b/i.test(question);
  
  if (!hasQuestionWords && !hasMedicalTerms) {
    suggestions.push('Try starting with question words like "What is...", "How can...", "Why does..."');
    suggestions.push('Include medical terms related to your query');
  }

  return {
    isValid: errors.length === 0,
    errors,
    suggestions
  };
}

/**
 * Format RAG result for display
 */
export function formatRAGResult(result: RAGResult): string {
  let formatted = result.answer;
  
  if (result.sources.length > 0) {
    formatted += `\n\n**Sources:** ${result.sources.join(', ')}`;
  }
  
  formatted += `\n\n*Confidence: ${(result.confidence * 100).toFixed(1)}% | `;
  formatted += `Processing time: ${result.processingTime.toFixed(1)}ms | `;
  formatted += `Knowledge chunks: ${result.chunksUsed}*`;
  
  return formatted;
}

/**
 * Get suggested follow-up questions
 */
export function getSuggestedQuestions(topic?: string): string[] {
  const generalQuestions = [
    "What are the symptoms of diabetes?",
    "How can I manage high blood pressure?",
    "What are the side effects of common pain medications?",
    "When should I seek emergency medical care?",
    "How can I maintain a healthy lifestyle?",
    "What is the difference between Type 1 and Type 2 diabetes?",
    "How do I know if my chest pain is serious?",
    "What are the warning signs of a stroke?"
  ];

  if (topic) {
    const topicLower = topic.toLowerCase();
    if (topicLower.includes('diabetes')) {
      return [
        "How is diabetes diagnosed?",
        "What foods should diabetics avoid?",
        "How often should diabetics check blood sugar?",
        "What are diabetes complications?"
      ];
    } else if (topicLower.includes('hypertension') || topicLower.includes('blood pressure')) {
      return [
        "What causes high blood pressure?",
        "How to lower blood pressure naturally?",
        "What blood pressure readings are dangerous?",
        "What medications treat hypertension?"
      ];
    }
  }

  return generalQuestions;
}
