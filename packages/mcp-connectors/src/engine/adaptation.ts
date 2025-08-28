import type { 
  Finding, 
  Report, 
  BundleReport,
  AnalyzeStringParams, 
  AnalyzeBundleParams,
  Locale,
  Tone,
  BrandStyle,
  BundleAnalysisResult
} from '../../types/cultural-adaptation';
import { applyRules } from './rules';
import { 
  calculateConfidence, 
  determineSeverity, 
  rankFindings, 
  calculateReportScore,
  generateFindingsSummary,
  estimateExpansionRisk,
  validateFindings
} from './score';
import { getLocaleMetadata } from './locale';

/**
 * Analyze a single text string for cultural adaptation issues
 */
export function analyzeString(params: AnalyzeStringParams): Report {
  const startTime = Date.now();
  const { 
    text, 
    targetLocale, 
    tone = 'neutral', 
    brandStyle, 
    maxSuggestions = 2 
  } = params;
  
  // Apply cultural adaptation rules
  let findings = applyRules(text, targetLocale, tone, brandStyle);
  
  // Calculate confidence and adjust severity for each finding
  findings = findings.map(finding => {
    const confidence = calculateConfidence(text, finding.ruleId, finding.category, targetLocale);
    const severity = determineSeverity(finding.category, confidence, targetLocale, tone);
    
    // Limit suggestions to maxSuggestions
    const suggestions = finding.suggestions.slice(0, maxSuggestions);
    
    return {
      ...finding,
      confidence,
      severity,
      suggestions
    };
  });
  
  // Rank findings by importance
  findings = rankFindings(findings);
  
  // Calculate report score
  const scoreResult = calculateReportScore(findings);
  
  // Generate summary statistics
  const summary = generateFindingsSummary(findings);
  
  // Estimate expansion risk
  const expansionRisk = estimateExpansionRisk(text, targetLocale);
  
  // Validate findings
  const validation = validateFindings(findings);
  if (!validation.valid) {
    console.warn('Validation errors:', validation.errors);
  }
  
  const analysisTime = Date.now() - startTime;
  
  return {
    locale: 'en-US', // Assuming source is English
    targetLocale,
    tone,
    brandStyle,
    summary: {
      totalFindings: findings.length,
      byCategory: summary.byCategory,
      bySeverity: summary.bySeverity,
      pass: scoreResult.pass,
      estimatedExpansion: expansionRisk.estimatedExpansion
    },
    findings,
    metadata: {
      analyzedAt: new Date().toISOString(),
      textLength: text.length,
      wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
      analysisTime
    }
  };
}

/**
 * Recursively walk through a bundle object and collect all string values
 */
function walkBundle(
  obj: any, 
  keyPath: string[] = [], 
  callback: (keyPath: string[], value: string) => void
): void {
  if (typeof obj === 'string') {
    callback(keyPath, obj);
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      walkBundle(item, [...keyPath, index.toString()], callback);
    });
  } else if (obj && typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      walkBundle(obj[key], [...keyPath, key], callback);
    });
  }
}

/**
 * Analyze a bundle of i18n strings for cultural adaptation issues
 */
export function analyzeBundle(params: AnalyzeBundleParams): BundleReport {
  const startTime = Date.now();
  const { 
    bundleJson, 
    targetLocale, 
    tone = 'neutral', 
    brandStyle, 
    maxIssuesPerKey = 5 
  } = params;
  
  const keyResults: BundleAnalysisResult[] = [];
  const allFindings: Finding[] = [];
  
  // Walk through the bundle and analyze each string
  walkBundle(bundleJson, [], (keyPath, text) => {
    if (typeof text === 'string' && text.trim().length > 0) {
      // Analyze this string
      const stringReport = analyzeString({
        text,
        targetLocale,
        tone,
        brandStyle,
        maxSuggestions: 2
      });
      
      // Add keyPath to findings
      const findingsWithPath = stringReport.findings.map(finding => ({
        ...finding,
        keyPath
      }));
      
      // Limit findings per key
      const limitedFindings = findingsWithPath.slice(0, maxIssuesPerKey);
      
      const keyResult: BundleAnalysisResult = {
        keyPath,
        text,
        findings: limitedFindings,
        pass: limitedFindings.filter(f => f.severity === 'error').length === 0
      };
      
      keyResults.push(keyResult);
      allFindings.push(...limitedFindings);
    }
  });
  
  // Calculate overall report score
  const scoreResult = calculateReportScore(allFindings);
  
  // Generate summary statistics
  const summary = generateFindingsSummary(allFindings);
  
  // Calculate bundle summary
  const totalKeys = keyResults.length;
  const keysWithIssues = keyResults.filter(kr => kr.findings.length > 0).length;
  const keysPassing = keyResults.filter(kr => kr.pass).length;
  const keysFailing = keyResults.filter(kr => !kr.pass).length;
  
  // Find top issue categories
  const topIssues = Object.entries(summary.byCategory)
    .filter(([_, count]) => count > 0)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 5)
    .map(([category, count]) => ({ category: category as any, count }));
  
  const analysisTime = Date.now() - startTime;
  
  return {
    locale: 'en-US', // Assuming source is English
    targetLocale,
    tone,
    brandStyle,
    summary: {
      totalFindings: allFindings.length,
      byCategory: summary.byCategory,
      bySeverity: summary.bySeverity,
      pass: scoreResult.pass,
      hotspots: summary.hotspots
    },
    findings: allFindings,
    metadata: {
      analyzedAt: new Date().toISOString(),
      textLength: JSON.stringify(bundleJson).length,
      wordCount: allFindings.length, // Rough estimate
      analysisTime
    },
    bundleSummary: {
      totalKeys,
      keysWithIssues,
      keysPassing,
      keysFailing,
      topIssues
    },
    keyResults
  };
}

/**
 * Get a list of supported locales
 */
export function getSupportedLocales(): Array<{ code: Locale; name: string; nativeName: string }> {
  const locales = [
    'en-GB', 'en-US', 'de-DE', 'ru-RU', 'zh-CN', 'es-ES', 'fr-FR', 'ja-JP', 'ko-KR'
  ] as Locale[];
  
  return locales.map(code => {
    const meta = getLocaleMetadata(code);
    return {
      code,
      name: meta.name,
      nativeName: meta.nativeName
    };
  });
}

/**
 * Get locale information for a specific locale
 */
export function getLocaleInfo(targetLocale: Locale) {
  const meta = getLocaleMetadata(targetLocale);
  const expansionRisk = estimateExpansionRisk('sample text', targetLocale);
  
  return {
    locale: meta.locale,
    name: meta.name,
    nativeName: meta.nativeName,
    formality: meta.formality,
    formatting: meta.formatting,
    culturalNotes: meta.culturalNotes,
    expansionRisk: {
      estimatedExpansion: meta.expansionRisk.estimatedExpansion,
      riskLevel: expansionRisk.riskLevel,
      recommendations: expansionRisk.recommendations
    }
  };
}

/**
 * Validate input parameters
 */
export function validateParams(params: AnalyzeStringParams | AnalyzeBundleParams): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if ('text' in params) {
    // Single string analysis
    if (!params.text || typeof params.text !== 'string') {
      errors.push('Text must be a non-empty string');
    }
    if (params.text.length > 10000) {
      errors.push('Text is too long (max 10,000 characters)');
    }
  } else {
    // Bundle analysis
    if (!params.bundleJson || typeof params.bundleJson !== 'object') {
      errors.push('Bundle must be a valid JSON object');
    }
  }
  
  if (!params.targetLocale) {
    errors.push('Target locale is required');
  } else {
    const supportedLocales = getSupportedLocales().map(l => l.code);
    if (!supportedLocales.includes(params.targetLocale)) {
      errors.push(`Unsupported locale: ${params.targetLocale}`);
    }
  }
  
  if (params.tone && !['formal', 'neutral', 'friendly'].includes(params.tone)) {
    errors.push('Tone must be one of: formal, neutral, friendly');
  }
  
  if (params.maxSuggestions && (params.maxSuggestions < 1 || params.maxSuggestions > 10)) {
    errors.push('Max suggestions must be between 1 and 10');
  }
  
  if ('maxIssuesPerKey' in params && params.maxIssuesPerKey) {
    if (params.maxIssuesPerKey < 1 || params.maxIssuesPerKey > 20) {
      errors.push('Max issues per key must be between 1 and 20');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate a cultural adaptation guide for a specific locale
 */
export function generateCulturalGuide(targetLocale: Locale): string {
  const meta = getLocaleMetadata(targetLocale);
  const expansionRisk = estimateExpansionRisk('sample text', targetLocale);
  
  let guide = `# Cultural Adaptation Guide: ${meta.name} (${targetLocale})\n\n`;
  
  guide += `## 🌍 **Locale Information**\n`;
  guide += `- **Name:** ${meta.name}\n`;
  guide += `- **Native Name:** ${meta.nativeName}\n`;
  guide += `- **Default Formality:** ${meta.formality.default}\n`;
  guide += `- **Requires Formal Language:** ${meta.formality.requiresFormal ? 'Yes' : 'No'}\n\n`;
  
  guide += `## 📅 **Formatting Conventions**\n`;
  guide += `- **Date Format:** ${meta.formatting.dateFormat}\n`;
  guide += `- **Decimal Separator:** ${meta.formatting.decimalSeparator}\n`;
  guide += `- **Thousands Separator:** ${meta.formatting.thousandsSeparator}\n`;
  guide += `- **Currency Format:** ${meta.formatting.currencyFormat}\n`;
  guide += `- **Time Format:** ${meta.formatting.timeFormat}\n\n`;
  
  guide += `## ⚠️ **Text Expansion Risk**\n`;
  guide += `- **Estimated Expansion:** ${meta.expansionRisk.estimatedExpansion}%\n`;
  guide += `- **Risk Level:** ${expansionRisk.riskLevel}\n`;
  guide += `- **High Risk Elements:** ${meta.expansionRisk.highRiskElements.join(', ') || 'None'}\n`;
  guide += `- **Density Notes:** ${meta.expansionRisk.densityNotes.join(', ')}\n\n`;
  
  guide += `## 🚫 **Cultural Taboos**\n`;
  guide += `- ${meta.culturalNotes.taboos.join('\n- ')}\n\n`;
  
  guide += `## 🎨 **Color Symbolism**\n`;
  Object.entries(meta.culturalNotes.colorSymbolism).forEach(([color, meaning]) => {
    guide += `- **${color}:** ${meaning}\n`;
  });
  guide += `\n`;
  
  guide += `## 📱 **Emoji Context**\n`;
  Object.entries(meta.culturalNotes.emojiContext).forEach(([emoji, meaning]) => {
    guide += `- **${emoji}:** ${meaning}\n`;
  });
  guide += `\n`;
  
  guide += `## 💡 **Recommendations**\n`;
  expansionRisk.recommendations.forEach(rec => {
    guide += `- ${rec}\n`;
  });
  
  return guide;
}
