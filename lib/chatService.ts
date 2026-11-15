/**
 * Chat Service
 * Main service for handling chat interactions and routing to appropriate AI systems
 */

import { pythonServerClient } from './pythonServerClient';
import chatbotSettings from '@/config/chatbot_settings.json';

const DISCLAIMER_KEYWORDS = [
  'medical disclaimer',
  'important notice',
  'educational purposes only'
];

function responseHasDisclaimer(text: string): boolean {
  const lower = text.toLowerCase();
  return DISCLAIMER_KEYWORDS.some(keyword => lower.includes(keyword));
}

// --- Emergency red-flag detection (SAF-1) ---
const RED_FLAG_PATTERNS: Array<{
  id: string;
  patterns: RegExp[];
  urgency: string;
  message: string;
}> = [];

function loadRedFlags(): void {
  const redFlags = (chatbotSettings as any)?.red_flags;
  if (!redFlags || typeof redFlags !== 'object') return;
  for (const [id, value] of Object.entries(redFlags)) {
    const v: any = value;
    RED_FLAG_PATTERNS.push({
      id,
      patterns: (v.patterns || []).map((p: string) => new RegExp(p, 'i')),
      urgency: v.urgency || 'urgent',
      message: v.message || '',
    });
  }
}

loadRedFlags();

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
  fallback?: boolean;
  redFlags?: Array<{ id: string; urgency: string; message: string }>;
}

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

  if ((hasSymptomKeywords || hasSymptomPatterns) && hasGeneralKeywords) {
    return 'hybrid';
  } else if (hasSymptomKeywords || hasSymptomPatterns) {
    return 'symptoms';
  } else {
    return 'general';
  }
}

export function detectRedFlags(message: string): Array<{ id: string; urgency: string; message: string }> {
  const negationPhrases = [
    /no\s+(chest\s+pain|breathing|pain|bleeding|headache|fever)/i,
    /(don.t|do not|does not|did not|never)\s+(have|feel|experience)\s+/i,
    /without\s+(chest\s+pain|breathing|pain|bleeding)/i,
  ];
  const isNegated = negationPhrases.some(pattern => pattern.test(message));

  const matches: Array<{ id: string; urgency: string; message: string }> = [];
  for (const flag of RED_FLAG_PATTERNS) {
    const matched = flag.patterns.some(pattern => pattern.test(message));
    if (matched && !isNegated) {
      matches.push({ id: flag.id, urgency: flag.urgency, message: flag.message });
    }
  }
  return matches;
}

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
    session_id: `session-${crypto.randomUUID()}`,
    conversation_turn: 1,
    fallback: true,
  };
}

function formatPredictionSection(result: {
  predictions: Array<{ disease: string; confidence: number }>;
  cascade_triggered?: boolean;
  model_used?: string;
  inference_time_ms?: number;
}): { text: string; topConfidence: number } {
  const topPrediction = result.predictions?.[0];
  const topConfidence = topPrediction ? topPrediction.confidence : 0;

  const uncertain = topConfidence < 0.70;
  let text = '';

  if (topPrediction) {
    text += `\n\n---\n\n### 🔬 HybridMed-AI Analysis\n\n`;
    text += uncertain ? '**Possible Condition:** ' : '**Primary Diagnosis:** ';
    text += `${topPrediction.disease}\n`;
    text += `**Confidence:** ${(topConfidence * 100).toFixed(1)}%`;

    if (result.cascade_triggered) {
      text += ` ⚡ *(DL Model)*`;
    }
    text += `\n`;

    if (uncertain) {
      text += `\n⚠️ Confidence is below 70%. This is not a reliable diagnosis — please consult a healthcare professional.`;
    }

    if (result.predictions.length > 1) {
      text += `\n**Differential Diagnosis:**\n`;
      for (let i = 1; i < Math.min(result.predictions.length, 4); i++) {
        const pred = result.predictions[i];
        text += `${i}. ${pred.disease} — ${(pred.confidence * 100).toFixed(1)}%\n`;
      }
    }
  }

  const modelName = result.cascade_triggered ? 'BioBERT (DL)' :
    result.predictions && result.predictions.length > 0 ? 'ML Ensemble' : 'LLAMA 3.1 RAG';
  text += `\n\n---\n*Model: ${modelName} | Processing: ${result.inference_time_ms?.toFixed(0) || 0}ms | Powered by HybridMed-AI*`;

  return { text, topConfidence };
}

export async function generateBotResponse(
  message: string,
  sessionId?: string | null,
  queryType?: 'symptoms' | 'general' | 'hybrid'
): Promise<ChatResponse> {
  const startTime = Date.now();

  const detectedType = queryType || detectQueryType(message);

  const redFlags = detectRedFlags(message);

  try {
    const isServerAvailable = await pythonServerClient.testConnection();

    if (!isServerAvailable) {
      console.warn('Python server unavailable, using fallback response');
      const fallback = generateFallbackResponse(message, detectedType);
      if (redFlags.length > 0) {
        fallback.redFlags = redFlags;
        fallback.response = `⚠️ **EMERGENCY SAFETY ALERT**\n\n${redFlags.map(f => f.message).join('\n\n')}\n\n${fallback.response}`;
      }
      return fallback;
    }

    const result = await pythonServerClient.hybridChat({
      query: message
    });

    let formattedResponse = '';

    if (result.explanation) {
      formattedResponse = result.explanation;
    }

    if (result.predictions && result.predictions.length > 0) {
      const { text } = formatPredictionSection(result);
      formattedResponse += text;
    }

    formattedResponse += `\n\n⚠️ **Medical Disclaimer:**\nThis AI system provides educational information only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of qualified healthcare providers with questions about medical conditions. In case of emergency, contact emergency services immediately.`;

    const totalProcessingTime = Date.now() - startTime;

    const serverQueryType = (result as any).query_type;
    const finalQueryType = serverQueryType && ['symptoms', 'general', 'hybrid'].includes(serverQueryType)
      ? serverQueryType
      : detectedType;

    const response: ChatResponse = {
      response: formattedResponse,
      queryType: finalQueryType,
      confidence: result.predictions?.[0]?.confidence,
      predictedCondition: result.predictions?.[0]?.disease,
      sources: [],
      processingTime: totalProcessingTime,
      systemUsed: result.model_used,
      medicalDisclaimer: "This AI system provides educational information only and is not a substitute for professional medical advice, diagnosis, or treatment.",
      timestamp: new Date().toISOString(),
      session_id: `session-${crypto.randomUUID()}`,
      conversation_turn: 1,
    };

    if (redFlags.length > 0) {
      response.redFlags = redFlags;
      response.response = `⚠️ **EMERGENCY SAFETY ALERT**\n\n${redFlags.map(f => f.message).join('\n\n')}\n\n${response.response}`;
    }

    return response;

  } catch (error) {
    console.error('Error generating bot response:', error);

    const errorResponse = generateFallbackResponse(message, detectedType);
    errorResponse.response = `I apologize, but I'm experiencing technical difficulties right now. ${errorResponse.response}`;
    errorResponse.fallback = true;
    if (redFlags.length > 0) {
      errorResponse.redFlags = redFlags;
      errorResponse.response = `⚠️ **EMERGENCY SAFETY ALERT**\n\n${redFlags.map(f => f.message).join('\n\n')}\n\n${errorResponse.response}`;
    }
    return errorResponse;
  }
}

export async function generateBotResponseWithAttachments(
  message: string,
  attachments: { id: string; file: File; type: 'image' | 'document'; preview?: string; name: string; size: number }[],
  sessionId?: string | null
): Promise<ChatResponse> {
  const startTime = Date.now();

  try {
    const formData = new FormData();
    formData.append('message', message || 'Please analyze these attachments');

    for (const attachment of attachments) {
      formData.append('files', attachment.file, attachment.name);
    }

    const response = await fetch('/api/attachments', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const result = await response.json();

    if (result.success !== undefined && result.analysis) {
      let formattedResponse = `### 📎 Image Analysis\n\n`;
      formattedResponse += `**File:** ${result.filename}\n\n`;
      formattedResponse += `---\n\n`;
      formattedResponse += result.analysis;
      formattedResponse += `\n\n---\n*Processing: ${result.inference_time_ms?.toFixed(0) || 0}ms | Powered by Vision AI*`;
      formattedResponse += `\n\n⚠️ **Medical Disclaimer:**\nThis AI-generated analysis is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of qualified healthcare providers with questions about medical conditions. In case of emergency, contact emergency services immediately.`;

      return {
        response: formattedResponse,
        queryType: 'hybrid',
        processingTime: Date.now() - startTime,
        systemUsed: 'Vision AI',
        medicalDisclaimer: "This AI-generated analysis is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.",
        timestamp: new Date().toISOString(),
        session_id: sessionId || `session-${crypto.randomUUID()}`,
        conversation_turn: 1,
        fallback: result.fallback === true,
      };
    }

    let formattedResponse = '';
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
    if (result.explanation) {
      formattedResponse += result.explanation;
    }
    if (result.predictions && result.predictions.length > 0) {
      const topPrediction = result.predictions[0];
      formattedResponse += `\n\n---\n\n### 🔬 HybridMed-AI Analysis\n\n`;
      formattedResponse += `**Primary Diagnosis:** ${topPrediction.disease}\n`;
      formattedResponse += `**Confidence:** ${(topPrediction.confidence * 100).toFixed(1)}%\n`;
      if (result.cascade_triggered) {
        formattedResponse += ` ⚡ *(DL Model)*\n`;
      }
      if (result.predictions.length > 1) {
        formattedResponse += `\n**Differential Diagnosis:**\n`;
        for (let i = 1; i < Math.min(result.predictions.length, 4); i++) {
          const pred = result.predictions[i];
          formattedResponse += `${i}. ${pred.disease} — ${(pred.confidence * 100).toFixed(1)}%\n`;
        }
      }
    }
    const modelName = result.model_used || 'HybridMed-AI';
    formattedResponse += `\n\n---\n*Model: ${modelName} | Processing: ${result.inference_time_ms?.toFixed(0) || 0}ms*`;
    formattedResponse += `\n\n⚠️ **Medical Disclaimer:**\nThis AI system provides educational information only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of qualified healthcare providers with questions about medical conditions. In case of emergency, contact emergency services immediately.`;

    return {
      response: formattedResponse,
      queryType: result.query_type as 'symptoms' | 'general' | 'hybrid' || 'hybrid',
      confidence: result.predictions?.[0]?.confidence,
      predictedCondition: result.predictions?.[0]?.disease,
      sources: result.sources || [],
      processingTime: Date.now() - startTime,
      systemUsed: result.model_used,
      medicalDisclaimer: "This AI system provides educational information only and is not a substitute for professional medical advice, diagnosis, or treatment.",
      timestamp: new Date().toISOString(),
      session_id: sessionId || `session-${crypto.randomUUID()}`,
      conversation_turn: 1,
      fallback: result.fallback === true,
    };

  } catch (error) {
    console.error('Error generating bot response with attachments:', error);

    const errorResponse = generateFallbackResponse(message || 'Analyze files', 'hybrid');
    errorResponse.response = `I apologize, but I couldn't process your attachments. ${errorResponse.response}`;
    errorResponse.fallback = true;
    return errorResponse;
  }
}

export async function getModelInfo() {
  try {
    return await pythonServerClient.getModelInfo();
  } catch (error) {
    console.error('Error fetching model info:', error);
    return {
      symptomsModel: {
        modelType: 'svm',
        numClasses: 24,
        accuracy: null,
        conditions: [
          'Acne', 'Arthritis', 'Bronchial Asthma', 'Common Cold',
          'Diabetes', 'Hypertension', 'Migraine', 'Pneumonia'
        ]
      },
      ragModel: {
        chunkSize: null,
        topK: null,
        embeddingModel: null,
        llmModel: null
      },
      status: 'mock_data',
      timestamp: new Date().toISOString()
    };
  }
}
