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
                Hybrid Medical Chatbot System
              </CardTitle>
              <CardDescription>
                This system combines two AI approaches for comprehensive medical assistance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">Symptom Analysis</h4>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Machine learning model trained to classify symptoms into medical conditions
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">Medical Q&A</h4>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    RAG system providing answers from medical knowledge base
                  </p>
                </div>
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
                    Symptoms Classification Model
                  </CardTitle>
                  <CardDescription>
                    SVM-based model for symptom analysis and condition prediction
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-red-500">
                        {(modelInfo.symptomsModel.accuracy * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Accuracy</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-blue-500">
                        {modelInfo.symptomsModel.numClasses}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Conditions</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-green-500">SVM</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Model Type</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-purple-500">5K</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Features</div>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-semibold mb-2">Supported Medical Conditions:</h5>
                    <div className="flex flex-wrap gap-2">
                      {modelInfo.symptomsModel.conditions.slice(0, 12).map((condition) => (
                        <Badge key={condition} variant="secondary" className="text-xs">
                          {condition}
                        </Badge>
                      ))}
                      {modelInfo.symptomsModel.conditions.length > 12 && (
                        <Badge variant="outline" className="text-xs">
                          +{modelInfo.symptomsModel.conditions.length - 12} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* RAG Model Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="text-blue-500" size={20} />
                    Medical Knowledge System (RAG)
                  </CardTitle>
                  <CardDescription>
                    Retrieval-Augmented Generation for medical question answering
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-blue-500">
                        {modelInfo.ragModel.totalChunks}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Knowledge Chunks</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-green-500">
                        {modelInfo.ragModel.topK}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Top Retrieval</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-purple-500">
                        {modelInfo.ragModel.chunkSize}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Chunk Size</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-xl font-bold text-orange-500">RAG</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Architecture</div>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-semibold mb-2">Knowledge Base Topics:</h5>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'General Health', 'Chronic Conditions', 'Medications', 
                        'Emergency Care', 'Preventive Care', 'Treatment Guidelines',
                        'Symptoms & Diagnosis', 'Medical Procedures'
                      ].map((topic) => (
                        <Badge key={topic} variant="secondary" className="text-xs">
                          {topic}
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
