// Cultural Adaptation MCP Connector Types

export type Locale = 
  | 'en-GB' | 'en-US' | 'de-DE' | 'ru-RU' | 'zh-CN' | 'es-ES' | 'fr-FR' | 'ja-JP' | 'ko-KR';

export type Tone = 'formal' | 'neutral' | 'friendly';

export type BrandStyle = 'playful' | 'professional' | 'minimal' | 'casual' | 'corporate';

export type Category = 
  | 'idiom' | 'metaphor' | 'culture_reference' | 'slang'
  | 'emoji_symbol' | 'color_symbolism' | 'formatting'
  | 'formality' | 'length_risk' | 'sensitivity';

export type Severity = 'info' | 'warning' | 'error';

export type Confidence = 'low' | 'medium' | 'high';

export interface Finding {
  keyPath?: string[];       // for bundle analysis; absent for single string
  category: Category;
  ruleId: string;
  severity: Severity;
  confidence: Confidence;
  snippet: string;          // offending part of text
  rationale: string;        // explanation of why it's risky
  suggestions: string[];    // adapted alternatives
  notes?: string[];         // additional context
  metadata?: Record<string, any>; // locale-specific data
}

export interface Report {
  locale: string;
  targetLocale: Locale;
  tone?: Tone;
  brandStyle?: BrandStyle;
  summary: {
    totalFindings: number;
    byCategory: Record<Category, number>;
    bySeverity: Record<Severity, number>;
    pass: boolean;          // true if no "error" level findings
    hotspots?: Array<{ keyPath?: string[]; count: number }>;
    estimatedExpansion?: number; // percentage for length risk
  };
  findings: Finding[];
  metadata: {
    analyzedAt: string;
    textLength: number;
    wordCount: number;
    analysisTime: number;
  };
}

export interface AnalyzeStringParams {
  text: string;
  targetLocale: Locale;
  tone?: Tone;
  brandStyle?: BrandStyle;
  maxSuggestions?: number;  // default 2
}

export interface AnalyzeBundleParams {
  bundleJson: Record<string, any>; // nested i18n object
  targetLocale: Locale;
  tone?: Tone;
  brandStyle?: BrandStyle;
  maxIssuesPerKey?: number; // default 5
}

export interface RuleExplanation {
  ruleId: string;
  title: string;
  description: string;
  category: Category;
  examples: {
    bad: string[];
    good: string[];
  };
  references: string[];
  severity: Severity;
  confidence: Confidence;
}

export interface LocaleMetadata {
  locale: Locale;
  name: string;
  nativeName: string;
  formality: {
    default: Tone;
    requiresFormal: boolean;
    formalPronouns: string[];
    informalPronouns: string[];
  };
  formatting: {
    dateFormat: string;
    decimalSeparator: string;
    thousandsSeparator: string;
    currencyFormat: string;
    timeFormat: string;
  };
  culturalNotes: {
    colorSymbolism: Record<string, string>;
    emojiContext: Record<string, string>;
    taboos: string[];
    formalityTriggers: string[];
  };
  expansionRisk: {
    estimatedExpansion: number; // percentage
    highRiskElements: string[];
    densityNotes: string[];
  };
}

export interface AnalysisOptions {
  tone: Tone;
  brandStyle?: BrandStyle;
  maxSuggestions: number;
  includeNotes: boolean;
  strictMode: boolean;
}

export interface BundleAnalysisResult {
  keyPath: string[];
  text: string;
  findings: Finding[];
  pass: boolean;
}

export interface BundleReport extends Report {
  bundleSummary: {
    totalKeys: number;
    keysWithIssues: number;
    keysPassing: number;
    keysFailing: number;
    topIssues: Array<{ category: Category; count: number }>;
  };
  keyResults: BundleAnalysisResult[];
}
