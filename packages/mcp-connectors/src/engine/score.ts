import type { 
  Finding, 
  Category, 
  Severity, 
  Confidence, 
  Locale,
  Report 
} from '../../types/cultural-adaptation';
import { getLocaleMetadata } from './locale';

/**
 * Calculate confidence score for a finding based on multiple factors
 */
export function calculateConfidence(
  text: string,
  ruleId: string,
  category: Category,
  targetLocale: Locale
): Confidence {
  let score = 0;
  
  // Base confidence from rule type
  switch (category) {
    case 'idiom':
    case 'metaphor':
      score += 3; // High confidence for idioms
      break;
    case 'culture_reference':
      score += 2; // Medium-high confidence for culture references
      break;
    case 'slang':
      score += 2; // Medium-high confidence for slang
      break;
    case 'emoji_symbol':
      score += 1; // Lower confidence for emojis (context dependent)
      break;
    case 'formality':
      score += 3; // High confidence for formality rules
      break;
    case 'length_risk':
      score += 2; // Medium confidence for length estimates
      break;
    default:
      score += 1;
  }
  
  // Pattern match strength
  if (text.length > 0) {
    if (text.length < 10) {
      score += 1; // Short, specific matches are more reliable
    } else if (text.length < 50) {
      score += 0; // Medium length
    } else {
      score -= 1; // Long text may have false positives
    }
  }
  
  // Locale-specific confidence adjustments
  const localeMeta = getLocaleMetadata(targetLocale);
  if (localeMeta.formality.requiresFormal) {
    if (category === 'formality') {
      score += 1; // Higher confidence for formal language requirements
    }
  }
  
  // Rule-specific confidence adjustments
  if (ruleId.includes('baseball')) {
    if (targetLocale === 'en-US') {
      score += 1; // Higher confidence for US-specific rules in US
    } else {
      score -= 1; // Lower confidence for US-specific rules elsewhere
    }
  }
  
  // Convert score to confidence level
  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

/**
 * Determine severity level based on category, confidence, and locale
 */
export function determineSeverity(
  category: Category,
  confidence: Confidence,
  targetLocale: Locale,
  tone: string = 'neutral'
): Severity {
  // Base severity by category
  let baseSeverity: Severity = 'info';
  
  switch (category) {
    case 'formality':
      baseSeverity = 'error'; // Formality violations are critical
      break;
    case 'idiom':
    case 'metaphor':
      baseSeverity = 'warning'; // Idioms can cause confusion
      break;
    case 'slang':
      baseSeverity = 'warning'; // Slang can be inappropriate
      break;
    case 'culture_reference':
      baseSeverity = 'info'; // Culture references are informational
      break;
    case 'emoji_symbol':
      baseSeverity = 'info'; // Emojis are usually informational
      break;
    case 'length_risk':
      baseSeverity = 'info'; // Length issues are informational
      break;
    default:
      baseSeverity = 'info';
  }
  
  // Adjust based on confidence
  if (confidence === 'high' && baseSeverity === 'info') {
    baseSeverity = 'warning';
  } else if (confidence === 'low' && baseSeverity === 'error') {
    baseSeverity = 'warning';
  }
  
  // Adjust based on locale requirements
  const localeMeta = getLocaleMetadata(targetLocale);
  if (localeMeta.formality.requiresFormal && category === 'formality') {
    baseSeverity = 'error'; // Formal language violations are critical
  }
  
  // Adjust based on tone
  if (tone === 'formal' && category === 'slang') {
    baseSeverity = 'error'; // Slang in formal tone is critical
  }
  
  return baseSeverity;
}

/**
 * Rank findings by severity and importance
 */
export function rankFindings(findings: Finding[]): Finding[] {
  const severityOrder = { 'error': 3, 'warning': 2, 'info': 1 };
  const confidenceOrder = { 'high': 3, 'medium': 2, 'low': 1 };
  
  return findings.sort((a, b) => {
    // First by severity
    const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
    if (severityDiff !== 0) return severityDiff;
    
    // Then by confidence
    const confidenceDiff = confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
    if (confidenceDiff !== 0) return confidenceDiff;
    
    // Then by category priority
    const categoryPriority = {
      'formality': 5,
      'idiom': 4,
      'slang': 3,
      'culture_reference': 2,
      'emoji_symbol': 1,
      'length_risk': 1
    };
    
    const aPriority = categoryPriority[a.category] || 0;
    const bPriority = categoryPriority[b.category] || 0;
    return bPriority - aPriority;
  });
}

/**
 * Calculate overall report score
 */
export function calculateReportScore(findings: Finding[]): {
  score: 'High Cultural Fit' | 'Medium Cultural Fit' | 'Low Cultural Fit';
  criticalIssues: number;
  warningIssues: number;
  infoIssues: number;
  pass: boolean;
} {
  const criticalIssues = findings.filter(f => f.severity === 'error').length;
  const warningIssues = findings.filter(f => f.severity === 'warning').length;
  const infoIssues = findings.filter(f => f.severity === 'info').length;
  
  let score: 'High Cultural Fit' | 'Medium Cultural Fit' | 'Low Cultural Fit';
  
  if (criticalIssues > 0) {
    score = 'Low Cultural Fit';
  } else if (warningIssues > 2 || (warningIssues > 0 && infoIssues > 3)) {
    score = 'Medium Cultural Fit';
  } else {
    score = 'High Cultural Fit';
  }
  
  const pass = criticalIssues === 0;
  
  return {
    score,
    criticalIssues,
    warningIssues,
    infoIssues,
    pass
  };
}

/**
 * Generate summary statistics for findings
 */
export function generateFindingsSummary(findings: Finding[]): {
  byCategory: Record<Category, number>;
  bySeverity: Record<Severity, number>;
  byConfidence: Record<Confidence, number>;
  hotspots: Array<{ keyPath?: string[]; count: number }>;
} {
  const byCategory: Record<Category, number> = {};
  const bySeverity: Record<Severity, number> = {};
  const byConfidence: Record<Confidence, number> = {};
  
  // Initialize counters
  const categories: Category[] = ['idiom', 'metaphor', 'culture_reference', 'slang', 'emoji_symbol', 'color_symbolism', 'formatting', 'formality', 'length_risk', 'sensitivity'];
  const severities: Severity[] = ['info', 'warning', 'error'];
  const confidences: Confidence[] = ['low', 'medium', 'high'];
  
  categories.forEach(cat => byCategory[cat] = 0);
  severities.forEach(sev => bySeverity[sev] = 0);
  confidences.forEach(conf => byConfidence[conf] = 0);
  
  // Count findings
  findings.forEach(finding => {
    byCategory[finding.category]++;
    bySeverity[finding.severity]++;
    byConfidence[finding.confidence]++;
  });
  
  // Find hotspots (keys with most issues)
  const keyCounts = new Map<string, number>();
  findings.forEach(finding => {
    if (finding.keyPath) {
      const key = finding.keyPath.join('.');
      keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
    }
  });
  
  const hotspots = Array.from(keyCounts.entries())
    .map(([key, count]) => ({
      keyPath: key.split('.'),
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5 hotspots
  
  return {
    byCategory,
    bySeverity,
    byConfidence,
    hotspots
  };
}

/**
 * Estimate text expansion risk for a locale
 */
export function estimateExpansionRisk(
  text: string,
  targetLocale: Locale
): {
  estimatedExpansion: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
} {
  const localeMeta = getLocaleMetadata(targetLocale);
  const expansion = localeMeta.expansionRisk.estimatedExpansion;
  
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  const recommendations: string[] = [];
  
  if (expansion > 20) {
    riskLevel = 'high';
    recommendations.push('Plan for significant text expansion');
    recommendations.push('Consider shorter alternatives');
    recommendations.push('Test UI layout with longer text');
  } else if (expansion > 10) {
    riskLevel = 'medium';
    recommendations.push('Plan for moderate text expansion');
    recommendations.push('Test UI layout');
  } else if (expansion < 0) {
    riskLevel = 'low';
    recommendations.push('Text may contract - plan accordingly');
  }
  
  // Add locale-specific recommendations
  if (localeMeta.expansionRisk.highRiskElements.length > 0) {
    recommendations.push(`Watch for: ${localeMeta.expansionRisk.highRiskElements.join(', ')}`);
  }
  
  return {
    estimatedExpansion: expansion,
    riskLevel,
    recommendations
  };
}

/**
 * Validate findings and ensure data integrity
 */
export function validateFindings(findings: Finding[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  findings.forEach((finding, index) => {
    if (!finding.category) {
      errors.push(`Finding ${index}: Missing category`);
    }
    if (!finding.ruleId) {
      errors.push(`Finding ${index}: Missing ruleId`);
    }
    if (!finding.severity) {
      errors.push(`Finding ${index}: Missing severity`);
    }
    if (!finding.confidence) {
      errors.push(`Finding ${index}: Missing confidence`);
    }
    if (!finding.snippet) {
      errors.push(`Finding ${index}: Missing snippet`);
    }
    if (!finding.rationale) {
      errors.push(`Finding ${index}: Missing rationale`);
    }
    if (!finding.suggestions || finding.suggestions.length === 0) {
      errors.push(`Finding ${index}: Missing suggestions`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}
