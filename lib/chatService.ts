/**
 * Chat Service
 * Main service for handling chat interactions and routing to appropriate AI systems
 */

import { pythonServerClient } from './pythonServerClient';

const DISCLAIMER_KEYWORDS = [
  'medical disclaimer',
  'important notice',
  'educational purposes only'
];

function responseHasDisclaimer(text: string): boolean {
  const lower = text.toLowerCase();
  return DISCLAIMER_KEYWORDS.some(keyword => lower.includes(keyword));
}

export interface ChatResponse {
  response: string;
  queryType: 'symptoms' | 'general' | 'hybrid';
  confidence?: number;
  predictedCondition?: string;
  sources?: string[];
  processingTime?: number;
  systemUsed?: string;
  medicalDisclaimer?: string;
  timestamp: string;
  session_id: string;
  conversation_turn: number;
}

/**
 * Detect whether a user query is symptom-related, general medical, or hybrid
 */
export function detectQueryType(message: string): 'symptoms' | 'general' | 'hybrid' {
  const symptomKeywords = [
    'pain', 'hurt', 'ache', 'fever', 'cough', 'headache', 'nausea', 'vomit',
    'dizzy', 'tired', 'fatigue', 'rash', 'itch', 'swollen', 'bleeding',
    'difficulty breathing', 'chest pain', 'abdominal pain', 'back pain',
    'joint pain', 'muscle pain', 'sore throat', 'runny nose', 'congestion',
    'diarrhea', 'constipation', 'weight loss', 'weight gain', 'trouble sleeping',
    'feel', 'feeling', 'experiencing', 'having', 'getting', 'suffering from'
  ];

  const generalKeywords = [
    'what is', 'how does', 'what causes', 'treatment for', 'prevention',
    'risk factors', 'complications', 'prognosis', 'medication', 'therapy'
  ];

  const lowerMessage = message.toLowerCase();
  
  const hasSymptomKeywords = symptomKeywords.some(keyword => 
    lowerMessage.includes(keyword)
  );
  
  const hasGeneralKeywords = generalKeywords.some(keyword => 
    lowerMessage.includes(keyword)
  );

  const symptomPatterns = [
    /i (have|am having|feel|am feeling|experience|am experiencing)/i,
    /my (head|chest|stomach|back|leg|arm|throat|nose|eye) (hurt|pain|ache)/i,
    /i've been (feeling|having|experiencing)/i,
    /symptoms?/i,
    /what (could|might) (this|it) be/i
  ];

  const hasSymptomPatterns = symptomPatterns.some(pattern => 
    pattern.test(message)
  );

  // Determine query type
  if ((hasSymptomKeywords || hasSymptomPatterns) && hasGeneralKeywords) {
    return 'hybrid';
  } else if (hasSymptomKeywords || hasSymptomPatterns) {
    return 'symptoms';
  } else {
    return 'general';
  }
}

/**
 * Generate fallback response when Python server is unavailable
 */
function generateFallbackResponse(message: string, queryType: 'symptoms' | 'general' | 'hybrid'): ChatResponse {
  let response: string;

  if (queryType === 'symptoms') {
    response = `I understand you're experiencing symptoms. While our AI symptom analysis system is currently unavailable, here are some general recommendations:

**Important Steps:**
• Monitor your symptoms carefully
• Seek medical attention if symptoms worsen or persist
• Contact emergency services for severe symptoms
• Keep a record of your symptoms for healthcare providers

**⚠️ Critical Medical Disclaimer:**
This system is temporarily unavailable. For any health concerns, please consult with qualified healthcare professionals immediately. In case of emergency, contact emergency services.

*Our AI system will be back online shortly to provide more detailed assistance.*`;
  } else if (queryType === 'hybrid') {
    response = `Thank you for your comprehensive medical question. While our hybrid AI system is temporarily unavailable, here's some general guidance:

**For Symptoms:**
• Monitor your symptoms carefully and seek medical attention if needed
• Keep track of symptom patterns and severity
• Contact healthcare providers for persistent or worsening symptoms

**For General Medical Information:**
• Consult with your healthcare provider for personalized advice
• Use reputable medical websites for educational information
• Contact your pharmacy for medication questions

**⚠️ Medical Disclaimer:**
This information is general in nature. Always consult with qualified healthcare professionals for personalized medical advice, diagnosis, or treatment.

*Our comprehensive AI system will be back online shortly.*`;
  } else {
    response = `Thank you for your medical question. While our knowledge base system is temporarily unavailable, here's some general guidance:

**General Health Advice:**
• Maintain regular check-ups with healthcare providers
• Follow a balanced diet and exercise regularly
• Stay hydrated and get adequate sleep
• Keep up with preventive care and screenings

**For Specific Medical Questions:**
• Consult with your healthcare provider
• Contact your pharmacy for medication questions
• Use reputable medical websites for educational information
• Seek immediate care for urgent concerns

**⚠️ Medical Disclaimer:**
This information is general in nature. Always consult with qualified healthcare professionals for personalized medical advice, diagnosis, or treatment.

*Our AI knowledge system will be back online shortly to provide more detailed medical information.*`;
  }

  return {
    response,
    queryType,
    timestamp: new Date().toISOString(),
    session_id: 'fallback-session',
    conversation_turn: 1
  };
}

/**
 * Main function to generate bot response using hybrid system
 */
export async function generateBotResponse(
  message: string, 
  sessionId?: string | null,
  queryType?: 'symptoms' | 'general' | 'hybrid'
): Promise<ChatResponse> {
  const startTime = Date.now();
  
  // Detect query type if not provided
  const detectedType = queryType || detectQueryType(message);
  
  try {
    // Check if Python server is available
    const isServerAvailable = await pythonServerClient.testConnection();
    
    if (!isServerAvailable) {
      console.warn('Python server unavailable, using fallback response');
      return generateFallbackResponse(message, detectedType);
    }

    // Use the new hybrid chat endpoint
    const result = await pythonServerClient.hybridChat({
      message: message,
      query_type: detectedType,
      session_id: sessionId || undefined
    });

    // Format response based on system used
    let formattedResponse = result.response;
    const processingTimeMs = typeof result.processing_time_ms === 'number' ? result.processing_time_ms : undefined;
    
    if (result.system_used?.includes('Disease Prediction')) {
      // Add additional formatting for symptom predictions
      if (result.predicted_condition && result.confidence) {
        formattedResponse += `\n\n**Analysis Details:**\n`;
        formattedResponse += `• Predicted Condition: ${result.predicted_condition}\n`;
        formattedResponse += `• Confidence Level: ${(result.confidence * 100).toFixed(1)}%\n`;
        if (processingTimeMs !== undefined) {
          formattedResponse += `• Processing Time: ${processingTimeMs.toFixed(1)}ms`;
        }
      }
    } else if (result.system_used?.includes('RAG') && result.sources?.length) {
      // Add source information for RAG responses
      formattedResponse += `\n\n**Sources:** ${result.sources.slice(0, 3).join(', ')}`;
      if (processingTimeMs !== undefined) {
        formattedResponse += `\n*Processing time: ${processingTimeMs.toFixed(1)}ms*`;
      }
    }

    // Add medical disclaimer if not already present
    if (result.medical_disclaimer) {
      const disclaimer = result.medical_disclaimer.trim();
      if (disclaimer && !responseHasDisclaimer(formattedResponse)) {
        formattedResponse += `\n\n${disclaimer}`;
      }
    }

    const totalProcessingTime = Date.now() - startTime;

    return {
      response: formattedResponse,
      queryType: result.query_type as 'symptoms' | 'general' | 'hybrid',
      confidence: result.confidence,
      predictedCondition: result.predicted_condition,
      sources: result.sources,
      processingTime: totalProcessingTime,
      systemUsed: result.system_used,
      medicalDisclaimer: result.medical_disclaimer,
      timestamp: new Date().toISOString(),
      session_id: result.session_id,
      conversation_turn: result.conversation_turn
    };

  } catch (error) {
    console.error('Error generating bot response:', error);
    
    // Provide helpful error response
    const errorResponse = generateFallbackResponse(message, detectedType);
    errorResponse.response = `I apologize, but I'm experiencing technical difficulties right now. ${errorResponse.response}`;
    
    return errorResponse;
  }
}

/**
 * Get model information for display in UI
 */
export async function getModelInfo() {
  try {
    return await pythonServerClient.getModelInfo();
  } catch (error) {
    console.error('Error fetching model info:', error);
    // Return mock data for development
    return {
      symptomsModel: {
        modelType: 'svm',
        numClasses: 24,
        accuracy: 0.97,
        conditions: [
          'Acne', 'Arthritis', 'Bronchial Asthma', 'Common Cold',
          'Diabetes', 'Hypertension', 'Migraine', 'Pneumonia'
        ]
      },
      ragModel: {
        chunkSize: 1000,
        topK: 3,
        embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
        llmModel: 'NousResearch/Llama-2-7b-chat-hf'
      },
      status: 'mock_data',
      timestamp: new Date().toISOString()
    };
  }
}
