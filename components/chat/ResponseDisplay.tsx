"use client";

import React from 'react';
import { parseResponse, getSectionClasses, markdownToHtml, FormattedSection } from '@/lib/responseFormatter';
import { AlertCircle, CheckCircle, Info, AlertTriangle, BookOpen, TrendingUp } from 'lucide-react';
import { EmergencyAlert, MedicalAlert } from '@/components/MedicalAlert';

interface ResponseDisplayProps {
  response: string;
  queryType?: 'symptoms' | 'general' | 'hybrid';
  confidence?: number;
  condition?: string;
  sources?: string[];
  processingTime?: number;
  /** Emergency red flags detected in the user message (SAF-1). */
  redFlags?: Array<{ id: string; urgency: string; message: string }>;
  /** True when this response was generated locally because the backend was unavailable (APP-2). */
  fallback?: boolean;
}

/**
 * Renders a single formatted section
 */
function SectionRenderer({ section }: { section: FormattedSection }) {
  const { container, title: titleClass, content: contentClass, icon } = getSectionClasses(section.type);

  const iconMap = {
    header: <BookOpen size={18} />,
    paragraph: <Info size={18} />,
    list: <CheckCircle size={18} />,
    important: <TrendingUp size={18} />,
    warning: <AlertTriangle size={18} />,
    success: <CheckCircle size={18} />,
    info: <Info size={18} />,
    table: <BookOpen size={18} />
  };

  return (
    <div className={`${container} p-4 mb-3 shadow-sm hover:shadow-md transition-shadow`}>
      {section.title && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{iconMap[section.type]}</span>
          <h3 className={titleClass}>{section.title}</h3>
        </div>
      )}

      <div className={contentClass}>
        {section.type === 'list' && Array.isArray(section.content) ? (
          <ul className="space-y-2">
            {section.content.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold mt-1">▸</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : section.type === 'table' && Array.isArray(section.content) ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {section.content.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="border border-gray-300 px-3 py-2">{row}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p
            dangerouslySetInnerHTML={{
              __html: markdownToHtml(
                Array.isArray(section.content)
                  ? section.content.join('\n')
                  : section.content || ''
              )
            }}
            className="leading-relaxed break-words"
          />
        )}
      </div>
    </div>
  );
}

/**
 * Analysis badge for symptom predictions
 */
function AnalysisBadge({
  condition,
  confidence,
  processingTime
}: {
  condition?: string;
  confidence?: number;
  processingTime?: number;
}) {
  if (!condition) return null;

  const isUncertain = confidence! < 0.70;
  
  const confidenceColor =
    confidence! >= 0.8 ? 'bg-green-100 text-green-800' :
    confidence! >= 0.7 ? 'bg-yellow-100 text-yellow-800' :
    'bg-red-100 text-red-800';

  const confidenceText =
    confidence! >= 0.8 ? 'High Confidence' :
    confidence! >= 0.7 ? 'Moderate Confidence' :
    'UNCERTAIN';

  const badgeStyle = isUncertain
    ? 'mb-4 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-lg p-4 shadow-md'
    : 'mb-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-4 shadow-sm';

  return (
    <div className={badgeStyle}>
      {isUncertain && (
        <div className="mb-3 flex items-center gap-2 bg-red-100 border border-red-400 rounded-md p-2">
          <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />
          <span className="text-xs font-bold text-red-800">
            ⚠️ UNCERTAIN PREDICTION - Confidence below 70%. Please consult a healthcare professional.
          </span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔍</span>
          <div>
            <p className="text-xs font-semibold text-gray-600">Predicted Condition</p>
            <p className="text-sm font-bold text-indigo-900">{condition}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          <div>
            <p className="text-xs font-semibold text-gray-600">Confidence Level</p>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-green-500 transition-all"
                  style={{ width: `${Math.round(confidence! * 100)}%` }}
                />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded ${confidenceColor}`}>
                {(confidence! * 100).toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">{confidenceText}</p>
          </div>
        </div>
        {processingTime && (
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="text-xs font-semibold text-gray-600">Processing Time</p>
              <p className="text-sm font-mono text-gray-700">{processingTime.toFixed(0)}ms</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Main response display component
 */
export function ResponseDisplay({
  response,
  queryType = 'general',
  confidence,
  condition,
  sources,
  processingTime,
  redFlags,
  fallback
}: ResponseDisplayProps) {
  // Parse the response into structured sections
  const structured = parseResponse(response, queryType, confidence, condition, sources);

  return (
    <div className="w-full space-y-3">
      {/* Emergency red-flag alert rendered before any other content (SAF-1) */}
      {redFlags && redFlags.length > 0 && (
        <EmergencyAlert
          symptoms={redFlags.map((f) => `${f.id}: ${f.message}`)}
        />
      )}

      {/* Fallback indicator: response was generated locally, not by the AI backend (APP-2) */}
      {fallback && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
            <span className="font-medium">
              Running in fallback mode — the AI backend is unavailable. This response is general guidance only, not an AI-generated analysis.
            </span>
          </div>
        </div>
      )}

      {queryType === 'symptoms' && condition && (
        <AnalysisBadge condition={condition} confidence={confidence} processingTime={processingTime} />
      )}

      {/* Render structured sections */}
      <div className="space-y-2">
        {structured.sections.map((section, idx) => (
          <SectionRenderer key={idx} section={section} />
        ))}
      </div>

      {/* Show sources if available */}
      {sources && sources.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <details className="text-sm text-gray-600 cursor-pointer group">
            <summary className="font-semibold text-gray-700 group-open:text-blue-600 flex items-center gap-2">
              <span>📚 References ({sources.length})</span>
            </summary>
            <div className="mt-3 pl-6 space-y-1 text-xs">
              {sources.map((source, idx) => (
                <div key={idx} className="text-gray-600 hover:text-blue-600 break-all">
                  {idx + 1}. {source}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

export default ResponseDisplay;
