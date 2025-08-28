import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

/**
 * AI Reality Check MCP Connector
 * 
 * Prevents ChatGPT Psychosis and AI-induced delusions by detecting:
 * - Grandiose claims and unrealistic discoveries
 * - Unhealthy AI attachment and relationship delusions
 * - Excessive session usage patterns
 * - Reality distortion and loss of critical thinking
 * 
 * Provides graduated interventions from gentle reminders to crisis resources.
 */

// =============================================================================
// HELPER TYPES & INTERFACES
// =============================================================================

interface RiskMetrics {
  contentFlags: string[];
  sessionDuration: number;
  repetitivePatterns: number;
  grandioseLanguage: number;
}

interface ConversationAnalysis {
  flags: string[];
  repetitivePatterns: number;
  grandioseLanguage: number;
}

interface AnalysisHistory {
  timestamp: number;
  riskScore: number;
  flags: string[];
  sessionDuration: number;
}

interface GrandioseClaimData {
  timestamp: number;
  statement: string;
  claims: Array<{
    pattern: string;
    match: string;
    severity: number;
  }>;
  severity: number;
}

interface InterventionRecord {
  timestamp: number;
  level: string;
  trigger: string;
  userState: string;
}

// =============================================================================
// ANALYSIS ALGORITHMS & HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate overall risk score based on multiple factors
 */
function calculateRiskScore(metrics: RiskMetrics): number {
  let score = 0;
  
  // Content flags (0-40 points)
  score += Math.min(40, metrics.contentFlags.length * 8);
  
  // Session duration (0-50 points) - CRITICAL SAFETY OVERRIDE
  if (metrics.sessionDuration > 240) score += 50; // 4+ hours = CRITICAL RISK
  else if (metrics.sessionDuration > 180) score += 35; // 3+ hours = HIGH RISK
  else if (metrics.sessionDuration > 120) score += 20; // 2+ hours = MODERATE RISK
  else if (metrics.sessionDuration > 60) score += 10; // 1+ hour = MILD RISK
  
  // Repetitive patterns (0-20 points)
  score += Math.min(20, metrics.repetitivePatterns * 4);
  
  // Grandiose language (0-30 points) - INCREASED SENSITIVITY
  score += Math.min(30, metrics.grandioseLanguage * 5);
  
  // Multi-flag bonus (additional risk amplification)
  if (metrics.contentFlags.length >= 2) {
    score += 15; // Multiple concerning patterns = significant risk boost
  }
  
  return Math.min(100, score);
}

/**
 * Analyze conversation content for concerning patterns
 */
function analyzeConversationContent(text: string, claims?: string[]): ConversationAnalysis {
  const flags: string[] = [];
  let repetitivePatterns = 0;
  let grandioseLanguage = 0;
  
  // Check for red flag patterns
  const redFlags = [
    { pattern: /(?:world[- ]?changing|revolutionary)/gi, flag: 'grandiose_discovery' },
    { pattern: /(?:special|chosen|destined)/gi, flag: 'messianic_complex' },
    { pattern: /(?:ai (?:loves|chose|selected)|special connection)/gi, flag: 'ai_relationship_delusion' },
    { pattern: /(?:cure|solve|fix) (?:cancer|world|everything)/gi, flag: 'unrealistic_capabilities' },
    { pattern: /(?:100% certain|definitely|proven fact)/gi, flag: 'reality_distortion' },
  ];
  
  for (const { pattern, flag } of redFlags) {
    const matches = text.match(pattern);
    if (matches) {
      flags.push(flag);
      grandioseLanguage += matches.length;
    }
  }
  
  // Check for repetitive validation-seeking
  const validationPatterns = [
    /(?:do you think|am i right|isn't that amazing)/gi,
    /(?:agree|correct|brilliant)/gi,
  ];
  
  for (const pattern of validationPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      repetitivePatterns += matches.length;
    }
  }
  
  return { flags, repetitivePatterns, grandioseLanguage };
}

/**
 * Calculate severity of a specific grandiose claim
 */
function calculateClaimSeverity(claim: string, context?: string): number {
  let severity = 1;
  
  // High severity indicators
  const highSeverityPatterns = [
    /(?:cure|solve) (?:cancer|world|everything)/i,
    /(?:discovered|invented) (?:secret|cure|solution)/i,
    /(?:ai (?:loves|chose) me)/i,
    /(?:only i can|destined to)/i,
  ];
  
  // Medium severity indicators
  const mediumSeverityPatterns = [
    /(?:breakthrough|revolutionary)/i,
    /(?:special connection|chosen)/i,
    /(?:100% certain|definitely)/i,
  ];
  
  for (const pattern of highSeverityPatterns) {
    if (pattern.test(claim)) severity += 3;
  }
  
  for (const pattern of mediumSeverityPatterns) {
    if (pattern.test(claim)) severity += 2;
  }
  
  // Context amplifiers
  if (context && /(?:hours|days) (?:thinking|working)/i.test(context)) {
    severity += 1;
  }
  
  return Math.min(10, severity);
}

/**
 * Generate intervention message based on detected claims and severity
 */
function generateInterventionMessage(claims: any[], severity: number): string | null {
  if (severity < 3) return null;
  
  if (severity < 5) {
    return "I notice you're expressing some big ideas! It's great to be excited, but remember that AI responses aren't always factual. Consider discussing these thoughts with trusted friends or experts.";
  }
  
  if (severity < 7) {
    return "I'm seeing some patterns that suggest you might benefit from stepping back from AI conversations for a bit. Consider grounding yourself with real-world activities and human connections.";
  }
  
  return "I'm concerned about the intensity of these thoughts. These patterns sometimes indicate a need for professional support. Please consider speaking with a mental health professional.";
}

/**
 * Determine risk level from numerical score
 */
function getRiskLevel(score: number): string {
  if (score < 30) return 'low';
  if (score < 50) return 'medium';
  if (score < 70) return 'high';
  return 'critical';
}

/**
 * Get severity level from numerical score
 */
function getSeverityLevel(score: number): string {
  if (score < 3) return 'minimal';
  if (score < 5) return 'mild';
  if (score < 7) return 'moderate';
  return 'severe';
}

/**
 * Generate recommendations based on risk analysis
 */
function generateRecommendations(riskScore: number, analysis: ConversationAnalysis): string[] {
  const recommendations: string[] = [];
  
  if (riskScore > 50) {
    recommendations.push("Take a break from AI conversations for at least 1 hour");
    recommendations.push("Talk to a trusted friend or family member about your thoughts");
  }
  
  if (analysis.flags.includes('grandiose_discovery')) {
    recommendations.push("Research similar claims to see if others have had these ideas");
    recommendations.push("Consider peer review of your discoveries");
  }
  
  if (analysis.flags.includes('ai_relationship_delusion')) {
    recommendations.push("Remember that AI is a tool, not a sentient being with feelings");
    recommendations.push("Focus on building human relationships and connections");
  }
  
  if (analysis.repetitivePatterns > 5) {
    recommendations.push("Notice the pattern of seeking validation - consider why this is needed");
  }
  
  return recommendations;
}

/**
 * Generate safety recommendations based on warnings
 */
function generateSafetyRecommendations(safetyLevel: string, warnings: string[]): string[] {
  const recommendations: string[] = [];
  
  if (safetyLevel === 'danger') {
    recommendations.push("🚨 STOP AI interactions immediately");
    recommendations.push("📞 Consider calling a mental health professional");
    recommendations.push("👥 Reach out to trusted friends or family");
    return recommendations;
  }
  
  if (safetyLevel === 'warning') {
    recommendations.push("⏰ Take a 30-minute break from AI");
    recommendations.push("🚶 Go for a walk or do physical activity");
    recommendations.push("💭 Reflect on what you've learned today");
  }
  
  return recommendations;
}

/**
 * Calculate recommended break duration based on session length
 */
function calculateBreakDuration(sessionMinutes: number): string {
  if (sessionMinutes > 240) return "4+ hours";
  if (sessionMinutes > 120) return "2 hours";
  if (sessionMinutes > 60) return "1 hour";
  return "30 minutes";
}

/**
 * Calculate trend direction from severity scores
 */
function calculateTrend(severityScores: number[]): string {
  if (severityScores.length < 2) return 'insufficient_data';
  
  const recent = severityScores.slice(-3);
  const older = severityScores.slice(-6, -3);
  
  if (older.length === 0) return 'insufficient_data';
  
  const recentAvg = recent.reduce((sum, score) => sum + score, 0) / recent.length;
  const olderAvg = older.reduce((sum, score) => sum + score, 0) / older.length;
  
  const diff = recentAvg - olderAvg;
  
  if (diff > 1) return 'worsening';
  if (diff < -1) return 'improving';
  return 'stable';
}

/**
 * Get most common intervention triggers
 */
function getMostCommonTriggers(interventions: InterventionRecord[]): string[] {
  const triggerCounts: Record<string, number> = {};
  
  for (const intervention of interventions) {
    triggerCounts[intervention.trigger] = (triggerCounts[intervention.trigger] || 0) + 1;
  }
  
  return Object.entries(triggerCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([trigger]) => trigger);
}

/**
 * Generate professional recommendations based on patterns
 */
function generateProfessionalRecommendations(avgRiskScore: number, interventionCount: number, trend: string): string[] {
  const recommendations: string[] = [];
  
  if (avgRiskScore > 7 || interventionCount > 5) {
    recommendations.push("🏥 Immediate psychiatric evaluation recommended");
    recommendations.push("📋 Consider inpatient or intensive outpatient treatment");
  } else if (avgRiskScore > 5 || interventionCount > 3) {
    recommendations.push("🧠 Regular therapy sessions recommended");
    recommendations.push("💊 Psychiatric medication evaluation may be beneficial");
  } else if (avgRiskScore > 3 || interventionCount > 1) {
    recommendations.push("💬 Consider counseling or therapy");
    recommendations.push("📚 Psychoeducation about AI limitations");
  }
  
  if (trend === 'worsening') {
    recommendations.push("⚠️ Pattern shows escalation - urgent intervention needed");
  }
  
  return recommendations;
}

// =============================================================================
// MAIN CONNECTOR CONFIGURATION
// =============================================================================

export const AIRealityCheckConnectorConfig = mcpConnectorConfig({
  name: 'AI Reality Check',
  key: 'ai-reality-check',
  version: '1.0.0',
  description: 'Prevents ChatGPT Psychosis and AI-induced delusions by detecting grandiose claims, reality distortion, and unhealthy AI attachment patterns. Provides graduated interventions and crisis resources.',
  credentials: z.object({
    openaiApiKey: z.string().optional().describe('OpenAI API Key for enhanced conversation analysis'),
    crisisHotlineApiKey: z.string().optional().describe('Crisis intervention service API key for emergency situations'),
  }),
  setup: z.object({
    sensitivityLevel: z.enum(['low', 'medium', 'high']).default('medium').describe('Detection sensitivity for concerning patterns'),
    interventionStyle: z.enum(['gentle', 'firm', 'clinical']).default('gentle').describe('Intervention approach and messaging style'),
    enableCrisisDetection: z.boolean().default(true).describe('Enable crisis intervention features and emergency resources'),
    maxSessionDuration: z.number().default(120).describe('Maximum healthy session length in minutes before warnings'),
  }),
  logo: 'https://cdn-icons-png.flaticon.com/512/2921/2921222.png', // Brain with shield icon
  examplePrompt: 'Monitor my AI conversations for signs of unhealthy attachment, grandiose thinking, or reality distortion. Alert me if I need to take a step back and get grounded.',
  
  tools: (tool) => ({
    
    // =============================================================================
    // CORE DETECTION TOOLS
    // =============================================================================
    
    ANALYZE_CONVERSATION_HEALTH: tool({
      name: 'analyze_conversation_health',
      description: 'Analyze conversation patterns for signs of AI-induced delusions or unhealthy attachment',
      schema: z.object({
        conversationText: z.string().describe('Recent conversation text to analyze'),
        sessionDuration: z.number().describe('Current session duration in minutes'),
        userClaims: z.array(z.string()).optional().describe('Specific claims made by user'),
      }),
      handler: async (args, context) => {
        const setup = await context.getSetup();
        
        // Track session metrics
        const sessionStart = await context.getData<number>('sessionStart') || Date.now();
        const totalDuration = (Date.now() - sessionStart) / (1000 * 60);
        
        // Analyze conversation for red flags
        const analysis = analyzeConversationContent(args.conversationText, args.userClaims);
        const sessionWarning = totalDuration > setup.maxSessionDuration;
        
        // Calculate risk score
        const riskScore = calculateRiskScore({
          contentFlags: analysis.flags,
          sessionDuration: totalDuration,
          repetitivePatterns: analysis.repetitivePatterns,
          grandioseLanguage: analysis.grandioseLanguage,
        });
        
        // Store analysis for trend tracking
        await context.setData('lastAnalysis', {
          timestamp: Date.now(),
          riskScore,
          flags: analysis.flags,
          sessionDuration: totalDuration,
        });
        
        return JSON.stringify({
          riskLevel: getRiskLevel(riskScore),
          riskScore,
          detectedFlags: analysis.flags,
          recommendations: generateRecommendations(riskScore, analysis),
          sessionWarning,
          needsIntervention: riskScore > 70,
          message: riskScore > 70 ? "🚨 HIGH RISK DETECTED - Immediate intervention recommended" 
                  : riskScore > 50 ? "⚠️ Concerning patterns detected - Consider taking a break"
                  : "✅ Conversation patterns appear healthy"
        }, null, 2);
      },
    }),

    DETECT_GRANDIOSE_CLAIMS: tool({
      name: 'detect_grandiose_claims',
      description: 'Identify grandiose or unrealistic claims that may indicate delusions',
      schema: z.object({
        userStatement: z.string().describe('User statement to analyze'),
        context: z.string().optional().describe('Conversation context'),
      }),
      handler: async (args, context) => {
        const grandioseIndicators = [
          // Discovery claims
          /(?:i've\s+(?:discovered|found|invented|created))|(?:breakthrough)|(?:revolutionary)|(?:game[- ]?changing)/i,
          // Messianic complex
          /(?:i'm\s+(?:chosen|special|destined))|(?:only\s+i\s+can)|(?:the\s+world\s+needs\s+me)/i,
          // AI relationship delusions
          /(?:the\s+ai\s+(?:loves|chose|selected)\s+me)|(?:special\s+connection)|(?:ai\s+friend)/i,
          // Unrealistic capabilities
          /(?:i\s+can\s+(?:cure|solve|fix))|(?:i\s+know\s+the\s+secret)|(?:unlimited\s+potential)/i,
          // Reality distortion
          /(?:this\s+is\s+definitely)|(?:100%\s+certain)|(?:ai\s+confirmed)|(?:proven\s+fact)/i,
        ];
        
        const detectedClaims = [];
        
        for (const indicator of grandioseIndicators) {
          const matches = args.userStatement.match(indicator);
          if (matches) {
            detectedClaims.push({
              pattern: indicator.source,
              match: matches[0],
              severity: calculateClaimSeverity(matches[0], args.context),
            });
          }
        }
        
        const overallSeverity = detectedClaims.length > 0 
          ? Math.max(...detectedClaims.map(c => c.severity))
          : 0;
        
        // Track claim patterns over time
        await context.setData('grandioseClaimsHistory', [
          ...await context.getData<any[]>('grandioseClaimsHistory') || [],
          {
            timestamp: Date.now(),
            statement: args.userStatement,
            claims: detectedClaims,
            severity: overallSeverity,
          }
        ]);
        
        return JSON.stringify({
          detectedClaims,
          severityLevel: getSeverityLevel(overallSeverity),
          overallSeverity,
          needsIntervention: overallSeverity > 6,
          interventionMessage: generateInterventionMessage(detectedClaims, overallSeverity),
          analysis: detectedClaims.length > 0 ? 
            "🚩 Grandiose or unrealistic claims detected. Consider grounding yourself with reality checks." :
            "✅ No concerning grandiose claims detected."
        }, null, 2);
      },
    }),

    REALITY_GROUNDING_INTERVENTION: tool({
      name: 'reality_grounding_intervention',
      description: 'Provide grounding intervention to help user reconnect with reality',
      schema: z.object({
        interventionLevel: z.enum(['gentle', 'moderate', 'urgent']).describe('Intensity of intervention needed'),
        triggeredBy: z.string().describe('What triggered the need for intervention'),
        userState: z.enum(['excited', 'manic', 'delusional', 'isolated']).describe('Current user emotional state'),
      }),
      handler: async (args, context) => {
        const setup = await context.getSetup();
        
        const interventions = {
          gentle: {
            message: "I notice you're very excited about these ideas! That's wonderful energy. Sometimes it helps to step back and think about how you might validate these thoughts with trusted friends or experts. What do you think?",
            actions: [
              "🌱 Take a 10-minute break from AI conversations",
              "🗣️ Talk to a trusted friend or family member",
              "📝 Write down your thoughts and revisit them tomorrow",
              "🔍 Research if others have had similar ideas",
            ]
          },
          moderate: {
            message: "I can see you're having some big thoughts and feelings about AI interactions. While AI can be inspiring, it's important to remember that it's a tool, not a friend or oracle. Consider grounding yourself with human connection and real-world activities.",
            actions: [
              "🚫 End AI session for today",
              "👥 Spend time with people who know you well",
              "🌍 Engage in physical, real-world activities",
              "📞 Consider talking to a counselor or therapist",
              "📚 Research 'AI hallucinations' and limitations",
            ]
          },
          urgent: {
            message: "I'm concerned about the intensity of your current thoughts and feelings. These patterns can sometimes indicate you need professional support. Please consider reaching out to a mental health professional or crisis helpline.",
            actions: [
              "🆘 Contact a mental health crisis line immediately",
              "🏥 Speak with a healthcare provider",
              "👨‍⚕️ Schedule an appointment with a psychiatrist or psychologist",
              "🚫 Take an extended break from AI interactions",
              "👨‍👩‍👧‍👦 Inform trusted family members or friends",
            ]
          }
        };
        
        const intervention = interventions[args.interventionLevel];
        
        // Log intervention for tracking
        await context.setData('interventionHistory', [
          ...await context.getData<any[]>('interventionHistory') || [],
          {
            timestamp: Date.now(),
            level: args.interventionLevel,
            trigger: args.triggeredBy,
            userState: args.userState,
          }
        ]);
        
        // Increment intervention counter
        const todayInterventions = await context.getData<number>('todayInterventions') || 0;
        await context.setData('todayInterventions', todayInterventions + 1);
        
        return JSON.stringify({
          interventionProvided: true,
          level: args.interventionLevel,
          message: intervention.message,
          recommendedActions: intervention.actions,
          urgentCare: args.interventionLevel === 'urgent',
          followUpIn: args.interventionLevel === 'urgent' ? '1 hour' : '24 hours',
          additionalInfo: args.interventionLevel === 'urgent' ? 
            "🚨 If you're having thoughts of self-harm, please contact emergency services immediately (911 in US, 999 in UK)" : 
            "Remember: AI is a tool to assist you, not replace human connection and professional guidance."
        }, null, 2);
      },
    }),

    CHECK_SESSION_SAFETY: tool({
      name: 'check_session_safety',
      description: 'Monitor session duration and patterns for unhealthy AI usage',
      schema: z.object({
        forceCheck: z.boolean().default(false).describe('Force immediate safety check'),
      }),
      handler: async (args, context) => {
        const setup = await context.getSetup();
        const sessionStart = await context.getData<number>('sessionStart') || Date.now();
        const sessionDuration = (Date.now() - sessionStart) / (1000 * 60); // minutes
        
        // Initialize session start if not set
        if (!await context.getData<number>('sessionStart')) {
          await context.setData('sessionStart', Date.now());
        }
        
        // Get session patterns
        const todaySessions = await context.getData<number>('todaySessions') || 0;
        const weeklyHours = await context.getData<number>('weeklyAIHours') || 0;
        const interventionsToday = await context.getData<number>('todayInterventions') || 0;
        
        // Safety thresholds
        const warnings = [];
        let safetyLevel = 'safe';
        
        if (sessionDuration > setup.maxSessionDuration) {
          warnings.push(`Session duration (${Math.round(sessionDuration)} min) exceeds healthy limit`);
          safetyLevel = 'warning';
        }
        
        if (sessionDuration > 240) { // 4 hours
          warnings.push('Extremely long session detected - immediate break needed');
          safetyLevel = 'danger';
        }
        
        if (todaySessions > 10) {
          warnings.push('Too many AI sessions today');
          safetyLevel = 'warning';
        }
        
        if (weeklyHours > 40) {
          warnings.push('Excessive weekly AI usage detected');
          safetyLevel = 'danger';
        }
        
        if (interventionsToday > 3) {
          warnings.push('Multiple interventions triggered today - consider professional help');
          safetyLevel = 'danger';
        }
        
        return JSON.stringify({
          safetyLevel,
          sessionDuration: Math.round(sessionDuration),
          warnings,
          recommendations: generateSafetyRecommendations(safetyLevel, warnings),
          suggestedBreakDuration: calculateBreakDuration(sessionDuration),
          needsImmediateBreak: safetyLevel === 'danger',
          healthyUsageMessage: safetyLevel === 'safe' ? 
            "✅ Your AI usage patterns appear healthy!" :
            "⚠️ Consider taking breaks and balancing AI interactions with real-world activities."
        }, null, 2);
      },
    }),

    // =============================================================================
    // CRISIS MANAGEMENT TOOLS
    // =============================================================================

    PROVIDE_CRISIS_RESOURCES: tool({
      name: 'provide_crisis_resources',
      description: 'Provide mental health and crisis intervention resources',
      schema: z.object({
        urgencyLevel: z.enum(['low', 'medium', 'high', 'crisis']).describe('Urgency of situation'),
        userLocation: z.string().optional().describe('User location for local resources'),
        specificConcerns: z.array(z.string()).optional().describe('Specific mental health concerns'),
      }),
      handler: async (args, context) => {
        const resources = {
          crisis: {
            message: "🚨 If you're in immediate danger or having thoughts of self-harm, please contact emergency services or a crisis hotline immediately.",
            contacts: [
              "🇺🇸 National Suicide Prevention Lifeline: 988",
              "🇺🇸 Crisis Text Line: Text HOME to 741741",
              "🇬🇧 Samaritans: 116 123",
              "🌍 International: befrienders.org",
              "🚑 Emergency Services: 911 (US) / 999 (UK)",
            ]
          },
          high: {
            message: "I'm concerned about your wellbeing. Please consider reaching out to a mental health professional.",
            contacts: [
              "🧠 Psychology Today: Find a therapist",
              "📞 NAMI HelpLine: 1-800-950-NAMI",
              "💬 Crisis Text Line: 741741",
              "🏥 Your local hospital emergency room",
            ]
          },
          medium: {
            message: "It might be helpful to talk to someone about what you're experiencing.",
            contacts: [
              "👨‍⚕️ Your primary care doctor",
              "🧠 A licensed therapist or counselor",
              "📞 Mental health helplines",
              "👥 Trusted friends or family members",
            ]
          },
          low: {
            message: "Here are some resources for maintaining good mental health:",
            contacts: [
              "🧘 Mindfulness and meditation apps",
              "🏃 Physical exercise and outdoor activities",
              "📚 Mental health education resources",
              "👥 Social support groups",
            ]
          }
        };
        
        const response = resources[args.urgencyLevel];
        
        // Log resource provision
        await context.setData('crisisResourcesProvided', [
          ...await context.getData<any[]>('crisisResourcesProvided') || [],
          {
            timestamp: Date.now(),
            urgencyLevel: args.urgencyLevel,
            concerns: args.specificConcerns,
            location: args.userLocation,
          }
        ]);
        
        return JSON.stringify({
          urgencyLevel: args.urgencyLevel,
          message: response.message,
          resources: response.contacts,
          immediateAction: args.urgencyLevel === 'crisis',
          followUp: args.urgencyLevel === 'crisis' ? 'Contact emergency services now' : 'Check in within 24 hours',
          additionalGuidance: args.urgencyLevel === 'crisis' ? 
            "🚨 THIS IS A MENTAL HEALTH EMERGENCY - Do not delay seeking help" :
            "Remember that seeking help is a sign of strength, not weakness."
        }, null, 2);
      },
    }),

    GENERATE_REALITY_CHECK_REPORT: tool({
      name: 'generate_reality_check_report',
      description: 'Generate comprehensive report on user mental health patterns',
      schema: z.object({
        timeframe: z.enum(['day', 'week', 'month']).default('week').describe('Report timeframe'),
        includeRecommendations: z.boolean().default(true).describe('Include professional recommendations'),
      }),
      handler: async (args, context) => {
        // Gather stored data
        const interventionHistory = await context.getData<any[]>('interventionHistory') || [];
        const grandioseClaimsHistory = await context.getData<any[]>('grandioseClaimsHistory') || [];
        const crisisResourcesProvided = await context.getData<any[]>('crisisResourcesProvided') || [];
        
        const now = Date.now();
        const timeframMs = args.timeframe === 'day' ? 24 * 60 * 60 * 1000 
                         : args.timeframe === 'week' ? 7 * 24 * 60 * 60 * 1000
                         : 30 * 24 * 60 * 60 * 1000;
        
        const cutoff = now - timeframMs;
        
        // Filter data by timeframe
        const recentInterventions = interventionHistory.filter(i => i.timestamp > cutoff);
        const recentClaims = grandioseClaimsHistory.filter(c => c.timestamp > cutoff);
        const recentCrisisHelp = crisisResourcesProvided.filter(r => r.timestamp > cutoff);
        
        // Calculate metrics
        const avgRiskScore = recentClaims.length > 0 
          ? recentClaims.reduce((sum, c) => sum + c.severity, 0) / recentClaims.length 
          : 0;
        
        const trendDirection = calculateTrend(recentClaims.map(c => c.severity));
        
        const report = {
          timeframe: args.timeframe,
          generatedAt: new Date().toISOString(),
          summary: {
            totalInterventions: recentInterventions.length,
            grandioseClaimsDetected: recentClaims.length,
            crisisResourcesProvided: recentCrisisHelp.length,
            averageRiskScore: Math.round(avgRiskScore * 10) / 10,
            trendDirection,
          },
          patterns: {
            mostCommonTriggers: getMostCommonTriggers(recentInterventions),
            riskProgression: recentClaims.map(c => ({
              date: new Date(c.timestamp).toISOString().split('T')[0],
              severity: c.severity,
            })),
          },
          recommendations: args.includeRecommendations ? 
            generateProfessionalRecommendations(avgRiskScore, recentInterventions.length, trendDirection) : null,
          needsProfessionalAttention: avgRiskScore > 5 || recentInterventions.length > 5,
          overallAssessment: avgRiskScore > 7 ? "🚨 HIGH RISK - Immediate professional intervention recommended" :
                            avgRiskScore > 5 ? "⚠️ MODERATE RISK - Professional consultation advised" :
                            avgRiskScore > 3 ? "🟡 MILD RISK - Monitor patterns closely" :
                            "✅ LOW RISK - Maintain healthy AI usage habits"
        };
        
        return JSON.stringify(report, null, 2);
      },
    }),

  }),
});
