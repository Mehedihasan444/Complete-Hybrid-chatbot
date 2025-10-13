/**
 * Symptoms Classifier Service
 * Direct interface to the SVM-based symptom classification system
 */

import { pythonServerClient, SymptomClassificationRequest, SymptomClassificationResponse } from './pythonServerClient';

export interface SymptomClassificationResult {
  predictedCondition: string;
  confidence: number;
  alternatives: Array<{
    condition: string;
    confidence: number;
    percentage: number;
  }>;
  recommendations: string[];
  processingTime: number;
  modelInfo: string;
}

/**
 * Classify symptoms using the trained SVM model
 */
export async function classifySymptoms(
  symptoms: string,
  patientAge?: number,
  patientGender?: string
): Promise<SymptomClassificationResult> {
  try {
    const request: SymptomClassificationRequest = {
      symptoms: symptoms.trim(),
      patient_age: patientAge,
      patient_gender: patientGender
    };

    const response: SymptomClassificationResponse = await pythonServerClient.classifySymptoms(request);

    // Transform response to our interface
    const alternatives = response.top_predictions.slice(1).map(pred => ({
      condition: pred.condition,
      confidence: pred.confidence,
      percentage: pred.probability_percentage
    }));

    return {
      predictedCondition: response.predicted_condition,
      confidence: response.confidence,
      alternatives,
      recommendations: response.recommendations,
      processingTime: response.processing_time_ms,
      modelInfo: response.model_used
    };

  } catch (error) {
    console.error('Error in symptom classification:', error);
    
    // Provide fallback classification for development/offline use
    return generateFallbackClassification(symptoms);
  }
}

/**
 * Generate fallback classification when the server is unavailable
 */
function generateFallbackClassification(symptoms: string): SymptomClassificationResult {
  const symptomsLower = symptoms.toLowerCase();
  
  // Simple keyword-based classification
  let predictedCondition = 'Common Cold';
  let confidence = 0.65;
  
  if (symptomsLower.includes('headache') || symptomsLower.includes('migraine')) {
    predictedCondition = 'Migraine';
    confidence = 0.78;
  } else if (symptomsLower.includes('cough') || symptomsLower.includes('breathing')) {
    predictedCondition = 'Bronchial Asthma';
    confidence = 0.72;
  } else if (symptomsLower.includes('fever') || symptomsLower.includes('cold')) {
    predictedCondition = 'Common Cold';
    confidence = 0.81;
  } else if (symptomsLower.includes('diabetes') || symptomsLower.includes('thirsty')) {
    predictedCondition = 'Diabetes';
    confidence = 0.88;
  } else if (symptomsLower.includes('joint') || symptomsLower.includes('arthritis')) {
    predictedCondition = 'Arthritis';
    confidence = 0.75;
  }

  const alternatives = [
    { condition: 'Common Cold', confidence: 0.65, percentage: 65 },
    { condition: 'Viral Infection', confidence: 0.58, percentage: 58 },
    { condition: 'Stress-related symptoms', confidence: 0.45, percentage: 45 }
  ].filter(alt => alt.condition !== predictedCondition);

  return {
    predictedCondition,
    confidence,
    alternatives: alternatives.slice(0, 3),
    recommendations: [
      'Consult with a healthcare professional for proper diagnosis',
      'Monitor symptoms and seek care if they worsen',
      'This assessment should not replace professional medical advice',
      'Server connection unavailable - using fallback classification'
    ],
    processingTime: 0,
    modelInfo: 'Fallback Classification (Server Unavailable)'
  };
}

/**
 * Get supported medical conditions
 */
export async function getSupportedConditions(): Promise<string[]> {
  try {
    const modelInfo = await pythonServerClient.getModelInfo();
    return modelInfo.symptomsModel.conditions;
  } catch (error) {
    console.error('Error fetching supported conditions:', error);
    
    // Return fallback list
    return [
      'Acne', 'Arthritis', 'Bronchial Asthma', 'Cervical spondylosis',
      'Chicken pox', 'Common Cold', 'Dengue', 'Diabetes',
      'Fungal infection', 'Hypertension', 'Jaundice', 'Malaria',
      'Migraine', 'Pneumonia', 'Psoriasis', 'Typhoid',
      'Varicose Veins', 'Allergy', 'Drug reaction',
      'Gastroesophageal reflux disease', 'Peptic ulcer disease',
      'Urinary tract infection'
    ];
  }
}

/**
 * Validate symptom input
 */
export function validateSymptomInput(symptoms: string): {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const suggestions: string[] = [];

  // Check minimum length
  if (symptoms.trim().length < 10) {
    errors.push('Symptom description should be at least 10 characters long');
    suggestions.push('Please provide more detailed description of your symptoms');
  }

  // Check maximum length
  if (symptoms.length > 1000) {
    errors.push('Symptom description is too long (max 1000 characters)');
    suggestions.push('Please provide a more concise description');
  }

  // Check for meaningful content
  const hasSymptomWords = /\b(pain|hurt|ache|feel|symptom|sick|ill|problem|issue|difficulty|trouble)\b/i.test(symptoms);
  if (!hasSymptomWords) {
    suggestions.push('Try describing how you feel or what symptoms you are experiencing');
    suggestions.push('Example: "I have a headache and feel nauseous"');
  }

  return {
    isValid: errors.length === 0,
    errors,
    suggestions
  };
}

/**
 * Format classification result for display
 */
export function formatClassificationResult(result: SymptomClassificationResult): string {
  const confidencePercentage = (result.confidence * 100).toFixed(1);
  
  let formatted = `**Predicted Condition:** ${result.predictedCondition}\n`;
  formatted += `**Confidence:** ${confidencePercentage}%\n\n`;
  
  if (result.alternatives.length > 0) {
    formatted += `**Alternative Possibilities:**\n`;
    result.alternatives.forEach(alt => {
      formatted += `• ${alt.condition} (${alt.percentage.toFixed(1)}%)\n`;
    });
    formatted += '\n';
  }
  
  formatted += `**Recommendations:**\n`;
  result.recommendations.forEach(rec => {
    formatted += `• ${rec}\n`;
  });
  
  return formatted;
}
