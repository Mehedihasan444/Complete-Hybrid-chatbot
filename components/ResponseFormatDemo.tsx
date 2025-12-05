"use client";

import React from 'react';
import { ResponseDisplay } from './chat/ResponseDisplay';
import { MedicalAlert, EmergencyAlert, Recommendation, MedicalDisclaimer } from './MedicalAlert';

/**
 * Demo component showing all response formatting options
 * Use this to test and showcase the enhanced formatting
 */
export function ResponseFormatDemo() {
  const exampleResponses = {
    symptomAnalysis: {
      response: `## Analysis Results

Based on your reported symptoms, I've analyzed the information you provided.

**Key Findings:**
• Primary indication: Possible viral infection
• Secondary consideration: Bacterial infection
• Severity assessment: Moderate

## Recommended Initial Steps

**Immediate Actions:**
• Rest for 24-48 hours
• Maintain hydration (8-10 glasses of water daily)
• Monitor temperature every 4-6 hours
• Avoid strenuous activities

**Symptom Management:**
• For fever: Acetaminophen or ibuprofen as directed
• For body aches: Over-the-counter pain relievers
• For congestion: Saline nasal spray or drops
• For cough: Honey-based cough drops or lozenges

## When to Seek Medical Attention

⚠️ **Urgent Care Needed If:**
• Fever exceeds 103°F (39.4°C)
• Difficulty breathing or shortness of breath
• Chest pain or pressure
• Confusion or severe headache
• Symptoms worsen significantly

**Schedule Appointment If:**
• Symptoms persist beyond 7 days
• New symptoms develop
• Symptoms affect daily functioning
• You have underlying health conditions

## Additional Information

Natural remedies that may help:
• Ginger tea with honey
• Vitamin C-rich foods (citrus, berries)
• Steam inhalation for congestion
• Adequate sleep (7-9 hours)`,
      queryType: 'symptoms' as const,
      confidence: 0.85,
      condition: 'Viral Infection',
      processingTime: 1240,
      sources: ['Medical Database - Viral Infections', 'Clinical Guidelines 2024']
    },

    generalQuestion: {
      response: `## Diabetes Overview

Diabetes is a chronic condition affecting how your body processes blood glucose. There are three main types:

**Type 1 Diabetes**
• Autoimmune condition
• Usually diagnosed in children/young adults
• Requires insulin therapy
• Accounts for 5-10% of diabetes cases

**Type 2 Diabetes**
• Most common type (90% of cases)
• Related to insulin resistance
• Often preventable through lifestyle
• Develops gradually over years

**Gestational Diabetes**
• Occurs during pregnancy
• Usually resolves after delivery
• Increases risk for Type 2 later

## Key Risk Factors

• Family history of diabetes
• Overweight or obesity
• Sedentary lifestyle
• Age over 45
• High blood pressure
• High cholesterol

## Management Strategies

**Lifestyle Changes:**
• Regular exercise (150 minutes/week)
• Balanced diet rich in fiber
• Weight management
• Stress reduction
• Quality sleep

**Medical Treatment:**
• Blood glucose monitoring
• Oral medications
• Insulin therapy (when needed)
• Regular health check-ups`,
      queryType: 'general' as const,
      sources: ['WHO Guidelines', 'CDC Diabetes Resources', 'American Diabetes Association']
    },

    hybridResponse: {
      response: `## Comprehensive Allergy Analysis

### Your Symptoms Indicate: Seasonal Allergies
**Confidence: 78%**

---

## Symptoms You Reported
• Itchy, watery eyes
• Sneezing
• Nasal congestion
• Mild throat irritation

These are classic signs of environmental allergies, commonly triggered by pollen, dust, or pet dander.

---

## Immediate Relief Measures

**Over-the-Counter Options:**
• Antihistamines (cetirizine, fexofenadine)
• Nasal decongestants
• Saline nasal spray
• Artificial tears for eye symptoms

**Non-Medication Approaches:**
• Keep windows closed during high pollen seasons
• Use HEPA air filters in bedroom
• Shower and change clothes after outdoor exposure
• Use air conditioning with clean filters

---

## Professional Consultation Recommended

Consider visiting a healthcare provider if:
• Symptoms persist despite treatments
• New symptoms develop
• Symptoms significantly impact daily life
• You want allergy testing
• You're interested in immunotherapy`,
      queryType: 'hybrid' as const,
      confidence: 0.78,
      condition: 'Seasonal Allergies',
      processingTime: 1856,
      sources: ['Allergy & Immunology Database', 'Environmental Health Guidelines']
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Response Format Showcase</h1>
        <p className="text-gray-600">Examples of enhanced response formatting for the medical chatbot</p>
      </div>

      {/* Example 1: Symptom Analysis */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-blue-900 border-b-2 border-blue-200 pb-2">
          📋 Example 1: Symptom Analysis Response
        </h2>
        <div className="bg-white rounded-lg shadow-lg p-6 border border-blue-100">
          <ResponseDisplay
            response={exampleResponses.symptomAnalysis.response}
            queryType={exampleResponses.symptomAnalysis.queryType}
            confidence={exampleResponses.symptomAnalysis.confidence}
            condition={exampleResponses.symptomAnalysis.condition}
            sources={exampleResponses.symptomAnalysis.sources}
            processingTime={exampleResponses.symptomAnalysis.processingTime}
          />
        </div>
        <p className="text-sm text-gray-600 italic">
          ✓ Shows confidence badge, analysis summary, structured recommendations, and medical disclaimer
        </p>
      </section>

      {/* Example 2: General Question */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-green-900 border-b-2 border-green-200 pb-2">
          🔍 Example 2: General Medical Information
        </h2>
        <div className="bg-white rounded-lg shadow-lg p-6 border border-green-100">
          <ResponseDisplay
            response={exampleResponses.generalQuestion.response}
            queryType={exampleResponses.generalQuestion.queryType}
            sources={exampleResponses.generalQuestion.sources}
          />
        </div>
        <p className="text-sm text-gray-600 italic">
          ✓ Structured sections, clear headers, formatted lists, and source references
        </p>
      </section>

      {/* Example 3: Hybrid Response */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-purple-900 border-b-2 border-purple-200 pb-2">
          🎯 Example 3: Hybrid (ML + RAG) Response
        </h2>
        <div className="bg-white rounded-lg shadow-lg p-6 border border-purple-100">
          <ResponseDisplay
            response={exampleResponses.hybridResponse.response}
            queryType={exampleResponses.hybridResponse.queryType}
            confidence={exampleResponses.hybridResponse.confidence}
            condition={exampleResponses.hybridResponse.condition}
            sources={exampleResponses.hybridResponse.sources}
            processingTime={exampleResponses.hybridResponse.processingTime}
          />
        </div>
        <p className="text-sm text-gray-600 italic">
          ✓ Combines ML prediction with detailed medical information
        </p>
      </section>

      {/* Alert Components Demo */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-red-900 border-b-2 border-red-200 pb-2">
          ⚠️ Alert Components Examples
        </h2>
        <div className="bg-white rounded-lg shadow-lg p-6 border border-red-100 space-y-4">
          <MedicalAlert
            type="warning"
            title="Seek Medical Attention"
            message="These symptoms may require professional evaluation"
            details={['Persistent fever > 103°F', 'Severe headache', 'Stiff neck']}
          />

          <MedicalAlert
            type="success"
            title="Self-Care Measures"
            message="Try these at-home treatments first"
            details={['Rest for 24-48 hours', 'Stay hydrated', 'Take over-the-counter pain relievers']}
          />

          <MedicalAlert
            type="info"
            title="Additional Information"
            message="More details about your condition"
            details={['Recovery typically takes 5-7 days', 'Most cases resolve without treatment']}
          />

          <EmergencyAlert
            symptoms={['Chest pain', 'Difficulty breathing', 'Loss of consciousness']}
          />
        </div>
      </section>

      {/* Recommendations Demo */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-amber-900 border-b-2 border-amber-200 pb-2">
          💡 Recommendation Cards
        </h2>
        <div className="bg-white rounded-lg shadow-lg p-6 border border-amber-100 space-y-4">
          <Recommendation
            category="when_to_seek_care"
            items={[
              'Fever persists beyond 3 days',
              'Symptoms worsen significantly',
              'New symptoms develop',
              'Difficulty breathing or chest pain'
            ]}
          />

          <Recommendation
            category="self_care"
            items={[
              'Rest for adequate recovery',
              'Drink plenty of fluids',
              'Use saline nasal spray',
              'Take over-the-counter pain relievers as directed'
            ]}
          />

          <Recommendation
            category="prevention"
            items={[
              'Wash hands frequently',
              'Avoid close contact with sick people',
              'Clean and disinfect surfaces',
              'Maintain good sleep and nutrition'
            ]}
          />
        </div>
      </section>

      {/* Format Features */}
      <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <h2 className="text-xl font-bold text-blue-900 mb-4">✨ Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <span className="text-emerald-500 font-bold">✓</span>
            <span>Intelligent section parsing and formatting</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-500 font-bold">✓</span>
            <span>Confidence level visualization with progress bars</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-500 font-bold">✓</span>
            <span>Color-coded sections for easy scanning</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-500 font-bold">✓</span>
            <span>Source references with collapsible details</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-500 font-bold">✓</span>
            <span>Markdown support for rich text formatting</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-500 font-bold">✓</span>
            <span>Responsive design for all screen sizes</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-500 font-bold">✓</span>
            <span>Emergency alert system for critical conditions</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-500 font-bold">✓</span>
            <span>Multiple alert types (warning, info, success, error)</span>
          </div>
        </div>
      </section>

      {/* Usage Instructions */}
      <section className="bg-amber-50 rounded-lg p-6 border border-amber-200">
        <h2 className="text-xl font-bold text-amber-900 mb-4">🚀 How to Use</h2>
        <ol className="space-y-3 text-sm text-gray-700 ml-4 list-decimal">
          <li>The <code className="bg-amber-100 px-2 py-1 rounded text-xs">ResponseDisplay</code> component automatically handles all formatting</li>
          <li>Pass the full response object from the backend (including queryType, confidence, sources)</li>
          <li>The component parses sections, applies styling, and renders everything</li>
          <li>Medical disclaimers are automatically included</li>
          <li>Alerts can be used separately for critical information</li>
        </ol>
      </section>
    </div>
  );
}

export default ResponseFormatDemo;
