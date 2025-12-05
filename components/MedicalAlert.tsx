"use client";

import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';

export type AlertType = 'warning' | 'error' | 'info' | 'success';

interface MedicalAlertProps {
  type: AlertType;
  title: string;
  message: string;
  details?: string[];
  isDismissible?: boolean;
}

const alertConfig = {
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-900',
    messageColor: 'text-amber-800',
    badge: 'bg-amber-200 text-amber-900'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    icon: AlertTriangle,
    iconColor: 'text-red-600',
    titleColor: 'text-red-900',
    messageColor: 'text-red-800',
    badge: 'bg-red-200 text-red-900'
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    icon: Info,
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-900',
    messageColor: 'text-blue-800',
    badge: 'bg-blue-200 text-blue-900'
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-300',
    icon: CheckCircle,
    iconColor: 'text-green-600',
    titleColor: 'text-green-900',
    messageColor: 'text-green-800',
    badge: 'bg-green-200 text-green-900'
  }
};

export function MedicalAlert({
  type,
  title,
  message,
  details,
  isDismissible = false
}: MedicalAlertProps) {
  const [isVisible, setIsVisible] = React.useState(true);
  const config = alertConfig[type];
  const Icon = config.icon;

  if (!isVisible && isDismissible) {
    return null;
  }

  return (
    <div className={`${config.bg} border ${config.border} rounded-lg p-4 mb-4 shadow-sm`}>
      <div className="flex gap-3">
        <Icon className={`${config.iconColor} flex-shrink-0 mt-0.5`} size={20} />
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold ${config.titleColor} mb-1`}>{title}</h4>
          <p className={`text-sm ${config.messageColor} leading-relaxed`}>{message}</p>
          
          {details && details.length > 0 && (
            <ul className={`mt-2 space-y-1 text-sm ${config.messageColor}`}>
              {details.map((detail, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-xs font-bold mt-0.5">•</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {isDismissible && (
          <button
            onClick={() => setIsVisible(false)}
            className={`text-xs font-semibold ${config.titleColor} hover:opacity-75 flex-shrink-0 mt-1`}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Emergency medical alert for critical conditions
 */
export function EmergencyAlert({ symptoms }: { symptoms: string[] }) {
  return (
    <div className="bg-gradient-to-r from-red-900 to-red-800 rounded-lg p-4 mb-4 shadow-lg border-l-4 border-red-400">
      <div className="flex gap-3">
        <AlertTriangle className="text-red-300 flex-shrink-0 mt-1 animate-pulse" size={24} />
        <div className="text-white">
          <h4 className="font-bold text-lg mb-2">⚠️ SEEK IMMEDIATE MEDICAL ATTENTION</h4>
          <p className="text-red-100 text-sm mb-3">
            You may be experiencing a medical emergency. Please call emergency services or go to the nearest hospital immediately.
          </p>
          {symptoms.length > 0 && (
            <div className="bg-red-950 rounded p-2 text-red-100 text-xs mb-3">
              <p className="font-semibold mb-1">Detected symptoms:</p>
              <ul className="space-y-1">
                {symptoms.map((symptom, idx) => (
                  <li key={idx}>• {symptom}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-red-200 text-xs">
            Do not rely on this chatbot for emergency medical care. Contact emergency services (911 in the US) immediately.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Medical disclaimer banner
 */
export function MedicalDisclaimer() {
  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 rounded-r-lg p-4 mb-4 shadow-sm">
      <div className="flex gap-3">
        <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="font-semibold text-amber-900 mb-1">Medical Disclaimer</h4>
          <p className="text-sm text-amber-800 leading-relaxed">
            This chatbot provides educational information only and should never replace professional medical advice, diagnosis, or treatment. Always consult with qualified healthcare professionals for medical concerns. In case of emergency, contact emergency services immediately.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Recommendation card component
 */
interface RecommendationProps {
  category: 'when_to_seek_care' | 'self_care' | 'prevention' | 'medication';
  items: string[];
}

export function Recommendation({ category, items }: RecommendationProps) {
  const config: Record<string, {
    icon: string;
    title: string;
    bg: string;
    border: string;
    badge: string;
  }> = {
    when_to_seek_care: {
      icon: '🏥',
      title: 'When to Seek Medical Care',
      bg: 'bg-red-50',
      border: 'border-red-200',
      badge: 'bg-red-100 text-red-800'
    },
    self_care: {
      icon: '💊',
      title: 'Self-Care Measures',
      bg: 'bg-green-50',
      border: 'border-green-200',
      badge: 'bg-green-100 text-green-800'
    },
    prevention: {
      icon: '🛡️',
      title: 'Prevention Tips',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      badge: 'bg-blue-100 text-blue-800'
    },
    medication: {
      icon: '💉',
      title: 'Common Medications',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      badge: 'bg-purple-100 text-purple-800'
    }
  };

  const { icon, title, bg, border, badge } = config[category];

  return (
    <div className={`${bg} border ${border} rounded-lg p-4 mb-3`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{icon}</span>
        <h5 className="font-semibold text-gray-900">{title}</h5>
      </div>
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="text-emerald-500 font-bold flex-shrink-0">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
