/**
 * Enhanced Response Formatter
 * Transforms AI responses into well-structured, visually appealing formats
 */

export interface FormattedSection {
  type: 'header' | 'paragraph' | 'list' | 'important' | 'warning' | 'success' | 'info' | 'table';
  content: string | string[];
  title?: string;
}

export interface StructuredResponse {
  sections: FormattedSection[];
  rawText: string;
  queryType: 'symptoms' | 'general' | 'hybrid';
  confidence?: number;
  condition?: string;
  sources?: string[];
}

/**
 * Parse and structure AI response into meaningful sections
 */
export function parseResponse(
  response: string,
  queryType: 'symptoms' | 'general' | 'hybrid' = 'general',
  confidence?: number,
  condition?: string,
  sources?: string[]
): StructuredResponse {
  const sections: FormattedSection[] = [];
  
  // Split by common section markers
  const lines = response.split('\n');
  let currentSection: FormattedSection | null = null;
  let currentContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      if (currentContent.length > 0 && currentSection) {
        currentSection.content = currentContent.join('\n').trim();
        sections.push(currentSection);
        currentSection = null;
        currentContent = [];
      }
      continue;
    }

    // Detect headers (** or # markers)
    if (line.startsWith('##') || line.startsWith('**')) {
      if (currentContent.length > 0 && currentSection) {
        currentSection.content = currentContent.join('\n').trim();
        sections.push(currentSection);
        currentContent = [];
      }

      const title = line.replace(/^#+\s*|\*\*/g, '').trim();
      
      // Determine section type based on keywords
      let type: FormattedSection['type'] = 'header';
      if (title.toLowerCase().includes('warning') || title.toLowerCase().includes('important')) {
        type = 'warning';
      } else if (title.toLowerCase().includes('symptom')) {
        type = 'info';
      } else if (title.toLowerCase().includes('treatment') || title.toLowerCase().includes('recommendation')) {
        type = 'success';
      }
      
      currentSection = { type, title, content: '' };
    }
    // Detect list items
    else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
      if (currentSection?.type !== 'list') {
        if (currentContent.length > 0 && currentSection) {
          currentSection.content = currentContent.join('\n').trim();
          sections.push(currentSection);
          currentContent = [];
        }
        currentSection = { type: 'list', content: [] };
      }
      
      if (Array.isArray(currentSection.content)) {
        currentSection.content.push(line.replace(/^[•\-*]\s*/, '').trim());
      }
    }
    // Detect important notices
    else if (line.includes('⚠️') || line.includes('‼️')) {
      if (currentContent.length > 0 && currentSection) {
        currentSection.content = currentContent.join('\n').trim();
        sections.push(currentSection);
        currentContent = [];
      }
      currentSection = { type: 'warning', content: line };
      sections.push(currentSection);
      currentSection = null;
    }
    // Detect inline formatted text
    else {
      if (!currentSection) {
        currentSection = { type: 'paragraph', content: '' };
      }
      currentContent.push(line);
    }
  }

  // Push remaining content
  if (currentContent.length > 0 && currentSection) {
    currentSection.content = currentContent.join('\n').trim();
    sections.push(currentSection);
  }

  // Add symptom analysis section if applicable
  if (queryType === 'symptoms' && condition && confidence !== undefined) {
    sections.unshift({
      type: 'info',
      title: '📋 Analysis Summary',
      content: [
        `Predicted Condition: ${condition}`,
        `Confidence Level: ${(confidence * 100).toFixed(1)}%`
      ]
    });
  }

  // Add sources section if provided
  if (sources && sources.length > 0) {
    sections.push({
      type: 'info',
      title: '📚 Sources',
      content: sources
    });
  }

  return {
    sections,
    rawText: response,
    queryType,
    confidence,
    condition,
    sources
  };
}

/**
 * Format section content into readable text
 */
export function formatSectionContent(section: FormattedSection): string {
  if (Array.isArray(section.content)) {
    return section.content.join('\n');
  }
  return section.content;
}

/**
 * Get CSS classes for section styling
 */
export function getSectionClasses(type: FormattedSection['type']): {
  container: string;
  title: string;
  content: string;
  icon: string;
} {
  const styles = {
    header: {
      container: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-r-lg',
      title: 'text-lg font-bold text-blue-900',
      content: 'text-blue-800',
      icon: '📌'
    },
    paragraph: {
      container: 'bg-white border border-gray-200 rounded-lg',
      title: '',
      content: 'text-gray-700 leading-relaxed',
      icon: '📝'
    },
    list: {
      container: 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg',
      title: 'text-sm font-semibold text-emerald-900',
      content: 'text-emerald-800',
      icon: '✓'
    },
    important: {
      container: 'bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 rounded-r-lg',
      title: 'text-sm font-bold text-amber-900',
      content: 'text-amber-800 font-medium',
      icon: '⭐'
    },
    warning: {
      container: 'bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 rounded-r-lg',
      title: 'text-sm font-bold text-red-900',
      content: 'text-red-800 font-medium',
      icon: '⚠️'
    },
    success: {
      container: 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg',
      title: 'text-sm font-semibold text-green-900',
      content: 'text-green-800',
      icon: '✅'
    },
    info: {
      container: 'bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg',
      title: 'text-sm font-semibold text-cyan-900',
      content: 'text-cyan-800',
      icon: 'ℹ️'
    },
    table: {
      container: 'bg-white border border-gray-300 rounded-lg overflow-hidden',
      title: 'bg-gray-100 px-4 py-2 font-semibold text-gray-900 border-b',
      content: 'p-4 text-gray-700 font-mono text-sm',
      icon: '📊'
    }
  };

  return styles[type] || styles.paragraph;
}

/**
 * Format response with markdown support
 */
export function markdownToHtml(text: string): string {
  // Convert bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');
  
  // Convert italic
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  text = text.replace(/_(.*?)_/g, '<em>$1</em>');
  
  // Convert inline code
  text = text.replace(/`(.+?)`/g, '<code class="bg-gray-200 px-2 py-1 rounded text-gray-800 font-mono text-sm">$1</code>');
  
  // Convert links
  text = text.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>');
  
  return text;
}

/**
 * Extract key information from response
 */
export function extractKeyInfo(response: string): {
  mainAnswer: string;
  symptoms?: string[];
  treatments?: string[];
  warnings?: string[];
  recommendations?: string[];
} {
  const info = {
    mainAnswer: response.split('\n\n')[0],
    symptoms: [] as string[],
    treatments: [] as string[],
    warnings: [] as string[],
    recommendations: [] as string[]
  };

  // Extract symptoms
  const symptomsMatch = response.match(/symptoms?:?\s*([^*•\n]+(?:[•\n][^*•\n]+)*)/i);
  if (symptomsMatch) {
    info.symptoms = symptomsMatch[1]
      .split(/[•\n-]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  // Extract treatments
  const treatmentsMatch = response.match(/treatment[s]?:?\s*([^*•\n]+(?:[•\n][^*•\n]+)*)/i);
  if (treatmentsMatch) {
    info.treatments = treatmentsMatch[1]
      .split(/[•\n-]/)
      .map(t => t.trim())
      .filter(t => t.length > 0);
  }

  // Extract warnings
  const warningPattern = /⚠️|warning|important|urgent|emergency/i;
  const lines = response.split('\n');
  info.warnings = lines
    .filter(line => warningPattern.test(line))
    .map(line => line.replace(/^[•\-*]\s*/, '').trim())
    .filter(line => line.length > 0);

  // Extract recommendations
  const recommendMatch = response.match(/recommend[a-z]*:?\s*([^*•\n]+(?:[•\n][^*•\n]+)*)/i);
  if (recommendMatch) {
    info.recommendations = recommendMatch[1]
      .split(/[•\n-]/)
      .map(r => r.trim())
      .filter(r => r.length > 0);
  }

  return info;
}

/**
 * Generate a clean summary for quick reading
 */
export function generateSummary(response: string, maxLength: number = 200): string {
  const lines = response.split('\n').filter(line => line.trim().length > 0);
  let summary = '';
  
  for (const line of lines) {
    if (summary.length + line.length > maxLength) {
      return summary.trim() + '...';
    }
    summary += (summary ? ' ' : '') + line.trim();
  }
  
  return summary;
}

/**
 * Check if response needs special formatting based on type
 */
export function getResponseType(response: string): 'medical_info' | 'symptoms' | 'warning' | 'general' {
  const lower = response.toLowerCase();
  
  if (lower.includes('⚠️') || lower.includes('emergency') || lower.includes('immediately')) {
    return 'warning';
  }
  
  if (lower.includes('symptom') || lower.includes('condition') || lower.includes('diagnosis')) {
    return 'symptoms';
  }
  
  if (lower.includes('treatment') || lower.includes('medication') || lower.includes('therapy')) {
    return 'medical_info';
  }
  
  return 'general';
}
