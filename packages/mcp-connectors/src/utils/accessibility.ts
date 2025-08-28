// Accessibility analysis utilities for MCP connector
export interface AccessibilityIssue {
  type: 'readability' | 'length' | 'caps' | 'punctuation' | 'ambiguity' | 'wcag' | 'consistency';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
  line?: number;
  key?: string;
}

export interface AccessibilityReport {
  issues: AccessibilityIssue[];
  summary: {
    score: 'High Accessibility' | 'Medium Accessibility' | 'Low Accessibility';
    readabilityLevel: string;
    totalIssues: number;
    criticalIssues: number;
    recommendations: string[];
  };
  metadata: {
    analyzedAt: string;
    textLength: number;
    wordCount: number;
    sentenceCount: number;
    averageWordsPerSentence: number;
  };
}

export interface TextAnalysisResult {
  readabilityScore: number;
  readabilityLevel: string;
  wordCount: number;
  sentenceCount: number;
  averageWordsPerSentence: number;
  hasAllCaps: boolean;
  hasExcessivePunctuation: boolean;
  hasJargon: boolean;
  hasIdioms: boolean;
  lengthCategory: 'short' | 'medium' | 'long' | 'very-long';
}

// Jargon and technical terms that might confuse users
const JARGON_WORDS = new Set([
  'hyperconverged', 'paradigm', 'leverage', 'synergy', 'optimize', 'streamline',
  'scalable', 'robust', 'seamless', 'intuitive', 'innovative', 'cutting-edge',
  'state-of-the-art', 'enterprise-grade', 'mission-critical', 'best-in-class',
  'next-generation', 'revolutionary', 'transformative', 'disruptive',
  'synergistic', 'holistic', 'comprehensive', 'end-to-end', 'full-stack',
  'cloud-native', 'microservices', 'containerization', 'orchestration',
  'infrastructure-as-code', 'devops', 'agile', 'scrum', 'kanban'
]);

// Common idioms that might not translate well
const IDIOMATIC_PHRASES = new Set([
  'hit the ground running', 'think outside the box', 'get the ball rolling',
  'pull the plug', 'break the ice', 'cut corners', 'get your feet wet',
  'jump on the bandwagon', 'pull yourself up by your bootstraps',
  'bite the bullet', 'burn the midnight oil', 'call it a day',
  'costs an arm and a leg', 'cry over spilled milk', 'get out of hand',
  'give the benefit of the doubt', 'go the extra mile', 'hit the nail on the head'
]);

// WCAG text-level guidelines
const WCAG_GUIDELINES = {
  maxButtonLength: 50,
  maxLabelLength: 100,
  maxHeadingLength: 200,
  maxParagraphLength: 500,
  minReadabilityGrade: 8,
  maxReadabilityGrade: 12
};

/**
 * Calculate Flesch-Kincaid readability score
 * Formula: 0.39 × (total words ÷ total sentences) + 11.8 × (total syllables ÷ total words) - 15.59
 */
export function calculateReadabilityScore(text: string): number {
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
  
  if (words.length === 0 || sentences.length === 0) return 0;
  
  const wordCount = words.length;
  const sentenceCount = sentences.length;
  const syllableCount = words.reduce((total, word) => total + countSyllables(word), 0);
  
  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / wordCount;
  
  const score = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
  return Math.round(score * 10) / 10; // Round to 1 decimal place
}

/**
 * Count syllables in a word using a simplified algorithm
 */
function countSyllables(word: string): number {
  const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
  if (cleanWord.length <= 3) return 1;
  
  let syllables = 0;
  let previousVowel = false;
  
  for (const char of cleanWord) {
    const isVowel = /[aeiouy]/.test(char);
    if (isVowel && !previousVowel) {
      syllables++;
    }
    previousVowel = isVowel;
  }
  
  // Handle silent 'e' at the end
  if (cleanWord.endsWith('e') && syllables > 1) {
    syllables--;
  }
  
  return Math.max(1, syllables);
}

/**
 * Get readability level description
 */
export function getReadabilityLevel(score: number): string {
  if (score >= 90) return 'Very Easy (5th Grade)';
  if (score >= 80) return 'Easy (6th Grade)';
  if (score >= 70) return 'Fairly Easy (7th Grade)';
  if (score >= 60) return 'Standard (8th-9th Grade)';
  if (score >= 50) return 'Fairly Difficult (10th-12th Grade)';
  if (score >= 30) return 'Difficult (College)';
  return 'Very Difficult (College Graduate)';
}

/**
 * Analyze text for accessibility issues
 */
export function analyzeText(text: string, context?: string): TextAnalysisResult {
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
  
  const readabilityScore = calculateReadabilityScore(text);
  const readabilityLevel = getReadabilityLevel(readabilityScore);
  const wordCount = words.length;
  const sentenceCount = sentences.length;
  const averageWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;
  
  // Check for all caps
  const hasAllCaps = text.length > 3 && text === text.toUpperCase() && /[A-Z]/.test(text);
  
  // Check for excessive punctuation
  const punctuationCount = (text.match(/[!?.,;:]/g) || []).length;
  const hasExcessivePunctuation = punctuationCount > wordCount * 0.3;
  
  // Check for jargon
  const hasJargon = words.some(word => 
    JARGON_WORDS.has(word.toLowerCase().replace(/[^a-z]/g, ''))
  );
  
  // Check for idioms
  const hasIdioms = Array.from(IDIOMATIC_PHRASES).some(idiom => 
    text.toLowerCase().includes(idiom.toLowerCase())
  );
  
  // Categorize length
  let lengthCategory: 'short' | 'medium' | 'long' | 'very-long';
  if (text.length <= 25) lengthCategory = 'short';
  else if (text.length <= 100) lengthCategory = 'medium';
  else if (text.length <= 300) lengthCategory = 'long';
  else lengthCategory = 'very-long';
  
  return {
    readabilityScore,
    readabilityLevel,
    wordCount,
    sentenceCount,
    averageWordsPerSentence,
    hasAllCaps,
    hasExcessivePunctuation,
    hasJargon,
    hasIdioms,
    lengthCategory
  };
}

/**
 * Generate accessibility report for a single text
 */
export function generateAccessibilityReport(
  text: string, 
  context?: string, 
  targetReadabilityGrade: number = 8
): AccessibilityReport {
  const analysis = analyzeText(text, context);
  const issues: AccessibilityIssue[] = [];
  
  // Readability issues
  if (analysis.readabilityScore > targetReadabilityGrade + 4) {
    issues.push({
      type: 'readability',
      severity: 'warning',
      message: `This text scores at Grade ${analysis.readabilityScore} (${analysis.readabilityLevel}), consider simplifying for accessibility.`,
      suggestion: 'Use shorter sentences and simpler words. Aim for Grade 8-12 reading level.'
    });
  }
  
  // Length issues based on context
  if (context === 'button' && text.length > WCAG_GUIDELINES.maxButtonLength) {
    issues.push({
      type: 'length',
      severity: 'warning',
      message: `Button text is ${text.length} characters long. Consider keeping button text under ${WCAG_GUIDELINES.maxButtonLength} characters.`,
      suggestion: 'Use shorter, action-oriented text like "Save" instead of "Save your changes".'
    });
  } else if (context === 'label' && text.length > WCAG_GUIDELINES.maxLabelLength) {
    issues.push({
      type: 'length',
      severity: 'info',
      message: `Label text is ${text.length} characters long. Consider breaking into multiple lines or shortening.`,
      suggestion: 'Use concise labels or break into multiple lines for better readability.'
    });
  } else if (text.length > WCAG_GUIDELINES.maxParagraphLength) {
    issues.push({
      type: 'length',
      severity: 'info',
      message: `Text is ${text.length} characters long. Consider breaking into shorter paragraphs.`,
      suggestion: 'Break long text into paragraphs of 2-3 sentences each.'
    });
  }
  
  // All caps issues
  if (analysis.hasAllCaps) {
    issues.push({
      type: 'caps',
      severity: 'warning',
      message: 'Text is in ALL CAPS, which can be difficult for screen readers and may appear aggressive.',
      suggestion: 'Use sentence case or title case instead of all caps.'
    });
  }
  
  // Punctuation issues
  if (analysis.hasExcessivePunctuation) {
    issues.push({
      type: 'punctuation',
      severity: 'info',
      message: 'Text contains excessive punctuation which can confuse screen readers.',
      suggestion: 'Use punctuation sparingly and consistently.'
    });
  }
  
  // Jargon issues
  if (analysis.hasJargon) {
    issues.push({
      type: 'ambiguity',
      severity: 'warning',
      message: 'Text contains technical jargon that may confuse non-technical users.',
      suggestion: 'Replace technical terms with simpler alternatives or provide explanations.'
    });
  }
  
  // Idiom issues
  if (analysis.hasIdioms) {
    issues.push({
      type: 'ambiguity',
      severity: 'warning',
      message: 'Text contains idioms that may not translate well or confuse non-native speakers.',
      suggestion: 'Use literal language instead of idioms for better accessibility.'
    });
  }
  
  // Determine overall score
  const criticalIssues = issues.filter(issue => issue.severity === 'error').length;
  const warningIssues = issues.filter(issue => issue.severity === 'warning').length;
  
  let score: 'High Accessibility' | 'Medium Accessibility' | 'Low Accessibility';
  if (criticalIssues > 0 || warningIssues > 2) {
    score = 'Low Accessibility';
  } else if (warningIssues > 0 || issues.length > 3) {
    score = 'Medium Accessibility';
  } else {
    score = 'High Accessibility';
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  if (analysis.readabilityScore > targetReadabilityGrade + 4) {
    recommendations.push('Use shorter sentences and simpler words');
  }
  if (analysis.hasJargon) {
    recommendations.push('Avoid technical jargon and technical terms');
  }
  if (analysis.hasIdioms) {
    recommendations.push('Use literal language instead of idioms');
  }
  if (analysis.hasAllCaps) {
    recommendations.push('Use sentence case instead of all caps');
  }
  if (text.length > 100) {
    recommendations.push('Break long text into shorter paragraphs');
  }
  
  return {
    issues,
    summary: {
      score,
      readabilityLevel: analysis.readabilityLevel,
      totalIssues: issues.length,
      criticalIssues,
      recommendations: recommendations.length > 0 ? recommendations : ['Text meets accessibility guidelines']
    },
    metadata: {
      analyzedAt: new Date().toISOString(),
      textLength: text.length,
      wordCount: analysis.wordCount,
      sentenceCount: analysis.sentenceCount,
      averageWordsPerSentence: analysis.averageWordsPerSentence
    }
  };
}

/**
 * Analyze multiple text entries for consistency and accessibility
 */
export function analyzeMultipleTexts(
  texts: Record<string, string>,
  targetReadabilityGrade: number = 8
): AccessibilityReport[] {
  const reports: AccessibilityReport[] = [];
  const allTexts = Object.entries(texts);
  
  // Analyze each text individually
  for (const [key, text] of allTexts) {
    const report = generateAccessibilityReport(text, key, targetReadabilityGrade);
    reports.push(report);
  }
  
  // Check for consistency issues across all texts
  const consistencyIssues = checkConsistency(allTexts);
  
  // Add consistency issues to the first report
  if (consistencyIssues.length > 0 && reports.length > 0) {
    reports[0].issues.push(...consistencyIssues);
    reports[0].summary.totalIssues += consistencyIssues.length;
  }
  
  return reports;
}

/**
 * Check for consistency issues across multiple texts
 */
function checkConsistency(texts: [string, string][]): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  
  // Check capitalization consistency
  const capitalizationStyles = texts.map(([key, text]) => {
    if (text === text.toUpperCase()) return 'all-caps';
    if (text === text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()) return 'sentence-case';
    if (text === text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())) return 'title-case';
    return 'mixed';
  });
  
  const uniqueStyles = new Set(capitalizationStyles);
  if (uniqueStyles.size > 1) {
    issues.push({
      type: 'consistency',
      severity: 'warning',
      message: 'Inconsistent capitalization styles detected across text elements.',
      suggestion: 'Use consistent capitalization (e.g., all sentence case or all title case) throughout the interface.'
    });
  }
  
  // Check tone consistency (formal vs informal)
  const formalIndicators = ['please', 'thank you', 'would you', 'could you', 'kindly'];
  const informalIndicators = ['hey', 'hi there', 'cool', 'awesome', 'gonna', 'wanna'];
  
  const hasFormal = texts.some(([, text]) => 
    formalIndicators.some(indicator => text.toLowerCase().includes(indicator))
  );
  const hasInformal = texts.some(([, text]) => 
    informalIndicators.some(indicator => text.toLowerCase().includes(indicator))
  );
  
  if (hasFormal && hasInformal) {
    issues.push({
      type: 'consistency',
      severity: 'info',
      message: 'Mixed formal and informal tone detected across text elements.',
      suggestion: 'Choose one tone (formal or informal) and use it consistently throughout the interface.'
    });
  }
  
  return issues;
}

/**
 * Check for WCAG compliance issues in structured content
 */
export function checkWCAGCompliance(content: any): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  
  // Check for missing alt-text in image metadata
  if (typeof content === 'object' && content !== null) {
    const imageKeys = Object.keys(content).filter(key => 
      key.toLowerCase().includes('image') || 
      key.toLowerCase().includes('img') ||
      key.toLowerCase().includes('photo') ||
      key.toLowerCase().includes('picture')
    );
    
    for (const imageKey of imageKeys) {
      const imageData = content[imageKey];
      if (typeof imageData === 'object' && imageData !== null) {
        if (!imageData.alt && !imageData.altText && !imageData.description) {
          issues.push({
            type: 'wcag',
            severity: 'error',
            message: `Missing alt-text for image: ${imageKey}`,
            suggestion: 'Add descriptive alt-text for screen readers and accessibility compliance.',
            key: imageKey
          });
        }
      }
    }
  }
  
  return issues;
}
