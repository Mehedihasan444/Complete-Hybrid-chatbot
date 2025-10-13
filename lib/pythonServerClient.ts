/**
 * Python Server Client
 * Handles communication with the FastAPI Python backend
 */

export interface ServerHealthResponse {
  status: string;
  timestamp: string;
  models_loaded: {
    disease_predictor: boolean;
    rag_pipeline: boolean;
    symptom_models: boolean;
    rag_initialized: boolean;
  };
  system_info: {
    startup_time: string | null;
    total_requests: number;
    symptom_requests: number;
    rag_requests: number;
    hybrid_requests: number;
    errors: number;
    uptime_seconds: number;
    error_rate: number;
    last_error?: string | null;
  };
}

export interface SymptomClassificationRequest {
  symptoms: string;
  patient_age?: number;
  patient_gender?: string;
}

export interface SymptomClassificationResponse {
  predicted_condition: string;
  confidence: number;
  top_predictions: Array<{
    condition: string;
    confidence: number;
    probability_percentage: number;
  }>;
  recommendations: string[];
  processing_time_ms: number;
  model_used: string;
}

export interface RAGRequest {
  question: string;
  context_type?: string;
}

export interface RAGResponse {
  answer: string;
  sources: string[];
  confidence: number;
  processing_time_ms: number;
  context_chunks_used: number;
}

export interface ModelInfoResponse {
  symptomsModel: {
    modelType: string;
    numClasses: number;
    accuracy: number;
    conditions: string[];
  };
  ragModel: {
    chunkSize: number;
    topK: number;
    embeddingModel: string;
    llmModel: string;
  };
  status: string;
  timestamp: string;
}

export interface HybridChatRequest {
  message: string;
  query_type?: 'symptoms' | 'general' | 'hybrid';
  session_id?: string;
}

export interface HybridChatResponse {
  response: string;
  query_type: string;
  confidence?: number;
  predicted_condition?: string;
  sources?: string[];
  processing_time_ms: number;
  system_used: string;
  medical_disclaimer: string;
  session_id: string;
  conversation_turn: number;
}

class PythonServerClient {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_PYTHON_SERVER_URL || 'http://127.0.0.1:8000';
    this.timeout = 30000; // 30 seconds
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: AbortSignal.timeout(this.timeout),
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - Python server may be down');
        }
        if (error.message.includes('fetch')) {
          throw new Error('Cannot connect to Python server - please ensure it is running');
        }
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  async checkHealth(): Promise<ServerHealthResponse> {
    return this.makeRequest<ServerHealthResponse>('/health');
  }

  async classifySymptoms(request: SymptomClassificationRequest): Promise<SymptomClassificationResponse> {
    return this.makeRequest<SymptomClassificationResponse>('/predict-symptoms', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async queryRAG(request: RAGRequest): Promise<RAGResponse> {
    return this.makeRequest<RAGResponse>('/ask-medical', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getModelInfo(): Promise<ModelInfoResponse> {
    return this.makeRequest<ModelInfoResponse>('/api/model-info');
  }

  async hybridChat(request: HybridChatRequest): Promise<HybridChatResponse> {
    return this.makeRequest<HybridChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.checkHealth();
      return true;
    } catch {
      return false;
    }
  }
}

export const pythonServerClient = new PythonServerClient();
