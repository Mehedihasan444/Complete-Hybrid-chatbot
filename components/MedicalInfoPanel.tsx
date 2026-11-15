"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Activity, Database, Info, X } from 'lucide-react';

interface ModelInfo {
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
    totalChunks: number;
  };
}

interface MedicalInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MedicalInfoPanel({ isOpen, onClose }: MedicalInfoPanelProps) {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && !modelInfo) {
      fetchModelInfo();
    }
  }, [isOpen, modelInfo]);

  const fetchModelInfo = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/model-info');
      if (response.ok) {
        const data = await response.json();
        setModelInfo(data);
      }
    } catch (error) {
      console.error('Error fetching model info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Info className="text-blue-500" size={24} />
            <h2 className="text-xl font-semibold">Medical AI System Information</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* System Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="text-purple-500" size={20} />
                HybridMed-AI System v3.0
              </CardTitle>
              <CardDescription>
                Intelligent medical chatbot with cascading ML/DL architecture and RAG
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <h4 className="font-semibold text-purple-700 dark:text-purple-300 mb-2">🧠 Query Classification</h4>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    Groq-hosted Qwen classifies queries and flags emergencies
                  </p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">⚡ ML/DL Cascade</h4>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Fast ML Ensemble with PubMedBERT DL fallback for accuracy
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">📚 RAG Knowledge</h4>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    44.4K chunks from Gale Encyclopedia + LLAMA 3.1
                  </p>
                </div>
              </div>
              
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Intelligent Routing:</strong> Symptom queries → ML/DL pipeline | General medical questions → Direct LLM/RAG | Emergency queries → Immediate alerts
                </p>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2">Loading model information...</span>
            </div>
          ) : modelInfo ? (
            <>
              {/* Symptoms Model Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="text-red-500" size={20} />
                    ML Ensemble + DL Cascade
                  </CardTitle>
                  <CardDescription>
                    Fast ML prediction with PubMedBERT deep learning cascade when confidence {"<"} 75%
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-red-500">
                        97%
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">ML Accuracy</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-blue-500">
                        24
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Diseases</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-green-500">75%</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Cascade Threshold</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-purple-500">~1.2s</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Avg Response</div>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-semibold mb-2">Primary: ML Ensemble (Fast)</h5>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {[
                        { name: 'Naive Bayes', accuracy: '100%' },
                        { name: 'SVM Linear', accuracy: '99.6%' },
                        { name: 'SVM RBF', accuracy: '99.6%' },
                        { name: 'Logistic Regression', accuracy: '99.6%' },
                        { name: 'Random Forest', accuracy: '99.2%' },
                        { name: 'XGBoost', accuracy: '96.7%' },
                      ].map((model) => (
                        <Badge key={model.name} variant="outline" className="text-xs">
                          {model.name} ({model.accuracy})
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-semibold mb-2">Cascade: PubMedBERT DL (Accurate)</h5>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="secondary" className="text-xs">
                        PubMedBERT Fine-tuned
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Transformer Architecture
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Trained on PubMed
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Activated when ML {"<"} 75%
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-semibold mb-2">Supported Medical Conditions:</h5>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Psoriasis', 'Diabetes', 'Hypertension', 'Migraine', 'Arthritis',
                        'Common Cold', 'Bronchial Asthma', 'Dengue', 'Malaria', 'Typhoid',
                        'Pneumonia', 'Acne'
                      ].map((condition) => (
                        <Badge key={condition} variant="secondary" className="text-xs">
                          {condition}
                        </Badge>
                      ))}
                      <Badge variant="outline" className="text-xs">
                        +12 more
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* RAG Model Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="text-blue-500" size={20} />
                    RAG System + LLAMA 3.1 (Fine-tuned)
                  </CardTitle>
                  <CardDescription>
                    FAISS vector search with LLAMA 3.1 8B (4-bit, fine-tuned on Gale Encyclopedia)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-xl font-bold text-blue-500">
                        44.4K
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Medical Chunks</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-xl font-bold text-green-500">
                        LLAMA 3.1
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">8B (4-bit)</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-xl font-bold text-purple-500">
                        FAISS
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Vector Store</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-xl font-bold text-orange-500">384</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Embedding Dim</div>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-semibold mb-2">Routing & Generation:</h5>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800">
                        <div className="text-xs font-semibold text-purple-700 dark:text-purple-300">Groq / Qwen (Routing)</div>
                        <div className="text-sm text-purple-600 dark:text-purple-400">Classifies queries & analyzes images</div>
                      </div>
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                        <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">LLAMA 3.1 (Generation)</div>
                        <div className="text-sm text-blue-600 dark:text-blue-400">Patient-friendly explanations</div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-semibold mb-2">Technical Stack:</h5>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                        <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">Vector Database</div>
                        <div className="text-sm text-blue-600 dark:text-blue-400">FAISS (Facebook AI)</div>
                      </div>
                      <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                        <div className="text-xs font-semibold text-green-700 dark:text-green-300">Embeddings</div>
                        <div className="text-sm text-green-600 dark:text-green-400">all-MiniLM-L6-v2</div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-semibold mb-2">Knowledge Source:</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      The Gale Encyclopedia of Medicine (3rd Edition) - 44,387 indexed medical chunks with comprehensive coverage
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Disease Information', 'Treatment Guidelines', 'Symptoms & Diagnosis', 
                        'Medications', 'Prevention', 'Medical Procedures',
                        'Emergency Care', 'Chronic Conditions'
                      ].map((topic) => (
                        <Badge key={topic} variant="secondary" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-semibold mb-2">Safety Features:</h5>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Emergency Detection', 'Red Flag Alerts', 'Medical Disclaimers', 
                        'Professional Referral', 'Citation Tracking'
                      ].map((type) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Failed to load model information
            </div>
          )}

          {/* Disclaimer */}
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm font-bold">!</span>
                </div>
                <div>
                  <h5 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
                    Important Medical Disclaimer
                  </h5>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    This AI system provides educational information only and should never replace 
                    professional medical advice, diagnosis, or treatment. Always consult with 
                    qualified healthcare professionals for medical concerns. In case of emergency, 
                    contact emergency services immediately.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
