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

    // Use the new chat endpoint
    const result = await pythonServerClient.hybridChat({
      query: message
    });

    // Format response for frontend
    let formattedResponse = '';
    
    // Add explanation first (from LLAMA 3.1)
    if (result.explanation) {
      formattedResponse = result.explanation;
    }
    
    // Add prediction information (only for symptom queries)
    if (result.predictions && result.predictions.length > 0) {
      const topPrediction = result.predictions[0];
      
      formattedResponse += `\n\n---\n\n### 🔬 HybridMed-AI Analysis\n\n`;
      formattedResponse += `**Primary Diagnosis:** ${topPrediction.disease}\n`;
      formattedResponse += `**Confidence:** ${(topPrediction.confidence * 100).toFixed(1)}%`;
      
      // Show cascade indicator
      if (result.cascade_triggered) {
        formattedResponse += ` ⚡ *(DL Model)*`;
      }
      formattedResponse += `\n`;
      
      if (result.predictions.length > 1) {
        formattedResponse += `\n**Differential Diagnosis:**\n`;
        for (let i = 1; i < Math.min(result.predictions.length, 4); i++) {
          const pred = result.predictions[i];
          formattedResponse += `${i}. ${pred.disease} — ${(pred.confidence * 100).toFixed(1)}%\n`;
        }
      }
    }

    // Add system info footer
    const modelName = result.cascade_triggered ? 'BioBERT (DL)' : 
                      result.predictions && result.predictions.length > 0 ? 'ML Ensemble' : 'LLAMA 3.1 RAG';
    formattedResponse += `\n\n---\n*Model: ${modelName} | Processing: ${result.inference_time_ms.toFixed(0)}ms | Powered by HybridMed-AI*`;

    // Add medical disclaimer
    formattedResponse += `\n\n⚠️ **Medical Disclaimer:**\nThis AI system provides educational information only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of qualified healthcare providers with questions about medical conditions. In case of emergency, contact emergency services immediately.`;

    const totalProcessingTime = Date.now() - startTime;

    return {
      response: formattedResponse,
      queryType: detectedType,
      confidence: result.predictions?.[0]?.confidence,
      predictedCondition: result.predictions?.[0]?.disease,
      sources: [], // RAG sources not directly available in new format
      processingTime: totalProcessingTime,
      systemUsed: result.model_used,
      medicalDisclaimer: "This AI system provides educational information only and is not a substitute for professional medical advice, diagnosis, or treatment.",
      timestamp: new Date().toISOString(),
      session_id: `session-${Date.now()}`,
      conversation_turn: 1
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
 * Generate bot response with file/image attachments
 */
export async function generateBotResponseWithAttachments(
  message: string,
  attachments: { id: string; file: File; type: 'image' | 'document'; preview?: string; name: string; size: number }[],
  sessionId?: string | null
): Promise<ChatResponse> {
  const startTime = Date.now();
  
  try {
    // Check if Python server is available
    const isServerAvailable = await pythonServerClient.testConnection();
    
    if (!isServerAvailable) {
      console.warn('Python server unavailable, using fallback response');
      return generateFallbackResponse(message || 'Analyze attached files', 'hybrid');
    }

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('message', message || 'Please analyze these attachments');
    
    // Add files to FormData
    for (const attachment of attachments) {
      formData.append('files', attachment.file, attachment.name);
    }

    // Get backend URL
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://joye-unennobling-curiously.ngrok-free.dev';
    
    // Send to backend with files (add ngrok bypass header)
    const response = await fetch(`${backendUrl}/chat-with-attachments`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const result = await response.json();
    
    // Format response similar to regular chat
    let formattedResponse = '';
    
    // Check if this is an ImageAnalysisResponse (new format)
    if (result.success !== undefined && result.analysis) {
      // New format: ImageAnalysisResponse from /chat-with-attachments
      formattedResponse += `### 📎 Image Analysis\n\n`;
      formattedResponse += `**File:** ${result.filename}\n\n`;
      formattedResponse += `---\n\n`;
      
      // Add the actual vision analysis content
      formattedResponse += result.analysis;
      
      // Add system info footer
      formattedResponse += `\n\n---\n*Processing: ${result.inference_time_ms?.toFixed(0) || 0}ms | Powered by Vision AI*`;
      
      // Add medical disclaimer
      formattedResponse += `\n\n⚠️ **Medical Disclaimer:**\nThis AI-generated analysis is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of qualified healthcare providers with questions about medical conditions. In case of emergency, contact emergency services immediately.`;
      
      const totalProcessingTime = Date.now() - startTime;

      return {
        response: formattedResponse,
        queryType: 'hybrid',
        processingTime: totalProcessingTime,
        systemUsed: 'Vision AI',
        medicalDisclaimer: "This AI-generated analysis is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.",
        timestamp: new Date().toISOString(),
        session_id: sessionId || `session-${Date.now()}`,
        conversation_turn: 1
      };
    }
    
    // Old format handling (for backward compatibility)
    // Add attachment processing info
    if (result.attachments_processed) {
      const proc = result.attachments_processed;
      formattedResponse += `### 📎 Attachments Processed\n\n`;
      formattedResponse += `✅ **${proc.total_files} file(s)** uploaded successfully\n`;
      if (proc.text_extracted > 0) {
        formattedResponse += `📄 Extracted text from ${proc.text_extracted} document(s)\n`;
      }
      if (proc.images_received > 0) {
        formattedResponse += `🖼️ Received ${proc.images_received} image(s)\n`;
      }
      formattedResponse += `\n---\n\n`;
    }
    
    // Add explanation
    if (result.explanation) {
      formattedResponse += result.explanation;
    }
    
    // Add predictions if available
    if (result.predictions && result.predictions.length > 0) {
      const topPrediction = result.predictions[0];
      
      formattedResponse += `\n\n---\n\n### 🔬 HybridMed-AI Analysis\n\n`;
      formattedResponse += `**Primary Diagnosis:** ${topPrediction.disease}\n`;
      formattedResponse += `**Confidence:** ${(topPrediction.confidence * 100).toFixed(1)}%`;
      
      if (result.cascade_triggered) {
        formattedResponse += ` ⚡ *(DL Model)*`;
      }
      formattedResponse += `\n`;
      
      if (result.predictions.length > 1) {
        formattedResponse += `\n**Differential Diagnosis:**\n`;
        for (let i = 1; i < Math.min(result.predictions.length, 4); i++) {
          const pred = result.predictions[i];
          formattedResponse += `${i}. ${pred.disease} — ${(pred.confidence * 100).toFixed(1)}%\n`;
        }
      }
    }

    // Add system info footer
    const modelName = result.model_used || 'HybridMed-AI';
    formattedResponse += `\n\n---\n*Model: ${modelName} | Processing: ${result.inference_time_ms?.toFixed(0) || 0}ms*`;

    // Add medical disclaimer
    formattedResponse += `\n\n⚠️ **Medical Disclaimer:**\nThis AI system provides educational information only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of qualified healthcare providers with questions about medical conditions. In case of emergency, contact emergency services immediately.`;

    const totalProcessingTime = Date.now() - startTime;

    return {
      response: formattedResponse,
      queryType: result.query_type as 'symptoms' | 'general' | 'hybrid' || 'hybrid',
      confidence: result.predictions?.[0]?.confidence,
      predictedCondition: result.predictions?.[0]?.disease,
      sources: result.sources || [],
      processingTime: totalProcessingTime,
      systemUsed: result.model_used,
      medicalDisclaimer: "This AI system provides educational information only and is not a substitute for professional medical advice, diagnosis, or treatment.",
      timestamp: new Date().toISOString(),
      session_id: sessionId || `session-${Date.now()}`,
      conversation_turn: 1
    };

  } catch (error) {
    console.error('Error generating bot response with attachments:', error);
    
    // Provide helpful error response
    const errorResponse = generateFallbackResponse(message || 'Analyze files', 'hybrid');
    errorResponse.response = `I apologize, but I couldn't process your attachments. ${errorResponse.response}`;
    
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
