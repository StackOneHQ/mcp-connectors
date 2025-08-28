import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';
import {
  analyzeString,
  analyzeBundle,
  getSupportedLocales,
  getLocaleInfo,
  generateCulturalGuide,
  validateParams
} from '../engine/adaptation';
import { getRuleExplanation } from '../engine/rules';
import type { 
  AnalyzeStringParams, 
  AnalyzeBundleParams, 
  Locale,
  Tone,
  BrandStyle 
} from '../../types/cultural-adaptation';

export const CulturalAdaptationConnectorConfig = mcpConnectorConfig({
  name: 'Cultural Adaptation',
  key: 'cultural-adaptation',
  version: '1.0.0',
  description: 'Analyze text and i18n bundles for culture-specific pitfalls and provide adapted alternatives',
  credentials: z.object({
    // No external API keys needed for basic functionality
    // Could add OpenAI API key for advanced suggestions in the future
    openaiApiKey: z.string().optional().describe('OpenAI API key for advanced cultural adaptation suggestions (optional)'),
  }),
  setup: z.object({
    defaultTone: z.enum(['formal', 'neutral', 'friendly']).default('neutral').describe('Default tone for analysis (formal, neutral, friendly)'),
    defaultBrandStyle: z.enum(['playful', 'professional', 'minimal', 'casual', 'corporate']).optional().describe('Default brand style for analysis'),
    strictMode: z.boolean().default(false).describe('Enable strict mode for stricter cultural compliance'),
    maxSuggestions: z.number().min(1).max(10).default(2).describe('Maximum suggestions per finding (1-10)'),
    maxIssuesPerKey: z.number().min(1).max(20).default(5).describe('Maximum issues per key in bundle analysis (1-20)'),
  }),
  logo: 'https://stackone-logos.com/api/disco/filled/svg',
  examplePrompt: 'Help me analyze my application text for cultural adaptation issues by detecting idioms, metaphors, culture-specific references, and providing adapted alternatives for different locales.',
  tools: (tool) => ({
    ANALYZE_STRING: tool({
      name: 'analyze_string',
      description: 'Analyze a single text string for cultural adaptation issues including idioms, metaphors, and culture-specific references',
      schema: z.object({
        text: z.string().describe('Text to analyze for cultural adaptation issues'),
        targetLocale: z.enum(['en-GB', 'en-US', 'de-DE', 'ru-RU', 'zh-CN', 'es-ES', 'fr-FR', 'ja-JP', 'ko-KR']).describe('Target locale for cultural adaptation analysis'),
        tone: z.enum(['formal', 'neutral', 'friendly']).optional().describe('Tone of the text (formal, neutral, friendly)'),
        brandStyle: z.enum(['playful', 'professional', 'minimal', 'casual', 'corporate']).optional().describe('Brand style to consider in analysis'),
        maxSuggestions: z.number().min(1).max(10).optional().describe('Maximum suggestions per finding (1-10)'),
      }),
      handler: async (args, context) => {
        const { text, targetLocale, tone, brandStyle, maxSuggestions } = args;
        const setup = await context.getSetup();
        
        // Validate parameters
        const validation = validateParams({
          text,
          targetLocale,
          tone: tone || setup.defaultTone,
          brandStyle: brandStyle || setup.defaultBrandStyle,
          maxSuggestions: maxSuggestions || setup.maxSuggestions
        });
        
        if (!validation.valid) {
          return `❌ **Validation Error**: ${validation.errors.join(', ')}`;
        }
        
        // Analyze the text
        const report = analyzeString({
          text,
          targetLocale,
          tone: tone || setup.defaultTone,
          brandStyle: brandStyle || setup.defaultBrandStyle,
          maxSuggestions: maxSuggestions || setup.maxSuggestions
        });
        
        // Store the analysis result for future reference
        const analysisKey = `cultural_adaptation_${Date.now()}_${text.substring(0, 20).replace(/\s+/g, '_')}`;
        await context.setData(analysisKey, report);
        
        // Format the response
        const severityEmojis = { error: '❌', warning: '⚠️', info: 'ℹ️' };
        const categoryEmojis = {
          idiom: '💬', metaphor: '🎭', culture_reference: '🌍', slang: '😎',
          emoji_symbol: '📱', color_symbolism: '🎨', formatting: '📅',
          formality: '👔', length_risk: '📏', sensitivity: '🚫'
        };
        
        let response = `🌍 **Cultural Adaptation Analysis Complete**\n\n`;
        response += `**Text:** "${text}"\n`;
        response += `**Target Locale:** ${targetLocale}\n`;
        response += `**Tone:** ${tone || setup.defaultTone}\n`;
        if (brandStyle) response += `**Brand Style:** ${brandStyle}\n`;
        response += `\n`;
        
        response += `**Overall Score:** ${report.summary.pass ? '✅ PASS' : '❌ FAIL'}\n`;
        response += `**Total Findings:** ${report.summary.totalFindings}\n`;
        response += `**Estimated Expansion:** ${report.summary.estimatedExpansion}%\n\n`;
        
        if (report.findings.length === 0) {
          response += `✅ **No cultural adaptation issues found!** This text is culturally appropriate for ${targetLocale}.\n\n`;
        } else {
          response += `**Findings by Category:**\n`;
          Object.entries(report.summary.byCategory)
            .filter(([_, count]) => count > 0)
            .forEach(([category, count]) => {
              const emoji = categoryEmojis[category as keyof typeof categoryEmojis] || '📋';
              response += `${emoji} **${category.replace('_', ' ')}**: ${count}\n`;
            });
          response += `\n`;
          
          response += `**Findings by Severity:**\n`;
          Object.entries(report.summary.bySeverity)
            .filter(([_, count]) => count > 0)
            .forEach(([severity, count]) => {
              const emoji = severityEmojis[severity as keyof typeof severityEmojis];
              response += `${emoji} **${severity}**: ${count}\n`;
            });
          response += `\n`;
          
          response += `**Detailed Findings:**\n`;
          report.findings.forEach((finding, index) => {
            const severityEmoji = severityEmojis[finding.severity];
            const categoryEmoji = categoryEmojis[finding.category] || '📋';
            
            response += `${severityEmoji} ${categoryEmoji} **${finding.category.replace('_', ' ').toUpperCase()}** (${finding.confidence} confidence)\n`;
            response += `   **Issue:** ${finding.snippet}\n`;
            response += `   **Rationale:** ${finding.rationale}\n`;
            response += `   **Suggestions:**\n`;
            finding.suggestions.forEach(suggestion => {
              response += `     • ${suggestion}\n`;
            });
            if (finding.notes && finding.notes.length > 0) {
              response += `   **Notes:** ${finding.notes.join(', ')}\n`;
            }
            response += `\n`;
          });
        }
        
        response += `**Metadata:**\n`;
        response += `• **Analysis Time:** ${report.metadata.analysisTime}ms\n`;
        response += `• **Text Length:** ${report.metadata.textLength} characters\n`;
        response += `• **Word Count:** ${report.metadata.wordCount}\n`;
        
        return response;
      },
    }),

    ANALYZE_BUNDLE: tool({
      name: 'analyze_bundle',
      description: 'Analyze a bundle of i18n strings for cultural adaptation issues across multiple keys',
      schema: z.object({
        bundleJson: z.any().describe('JSON object containing i18n strings to analyze'),
        targetLocale: z.enum(['en-GB', 'en-US', 'de-DE', 'ru-RU', 'zh-CN', 'es-ES', 'fr-FR', 'ja-JP', 'ko-KR']).describe('Target locale for cultural adaptation analysis'),
        tone: z.enum(['formal', 'neutral', 'friendly']).optional().describe('Tone of the text (formal, neutral, friendly)'),
        brandStyle: z.enum(['playful', 'professional', 'minimal', 'casual', 'corporate']).optional().describe('Brand style to consider in analysis'),
        maxIssuesPerKey: z.number().min(1).max(20).optional().describe('Maximum issues per key (1-20)'),
      }),
      handler: async (args, context) => {
        const { bundleJson, targetLocale, tone, brandStyle, maxIssuesPerKey } = args;
        const setup = await context.getSetup();
        
        // Validate parameters
        const validation = validateParams({
          bundleJson,
          targetLocale,
          tone: tone || setup.defaultTone,
          brandStyle: brandStyle || setup.defaultBrandStyle,
          maxIssuesPerKey: maxIssuesPerKey || setup.maxIssuesPerKey
        });
        
        if (!validation.valid) {
          return `❌ **Validation Error**: ${validation.errors.join(', ')}`;
        }
        
        // Analyze the bundle
        const report = analyzeBundle({
          bundleJson,
          targetLocale,
          tone: tone || setup.defaultTone,
          brandStyle: brandStyle || setup.defaultBrandStyle,
          maxIssuesPerKey: maxIssuesPerKey || setup.maxIssuesPerKey
        });
        
        // Store the analysis result for future reference
        const bundleKey = `bundle_cultural_adaptation_${Date.now()}`;
        await context.setData(bundleKey, report);
        
        // Format the response
        let response = `🌍 **Bundle Cultural Adaptation Analysis Complete**\n\n`;
        response += `**Target Locale:** ${targetLocale}\n`;
        response += `**Tone:** ${tone || setup.defaultTone}\n`;
        if (brandStyle) response += `**Brand Style:** ${brandStyle}\n`;
        response += `\n`;
        
        response += `**Bundle Summary:**\n`;
        response += `• **Total Keys:** ${report.bundleSummary.totalKeys}\n`;
        response += `• **Keys with Issues:** ${report.bundleSummary.keysWithIssues}\n`;
        response += `• **Keys Passing:** ${report.bundleSummary.keysPassing}\n`;
        response += `• **Keys Failing:** ${report.bundleSummary.keysFailing}\n`;
        response += `• **Overall Status:** ${report.summary.pass ? '✅ PASS' : '❌ FAIL'}\n\n`;
        
        response += `**Overall Statistics:**\n`;
        response += `• **Total Findings:** ${report.summary.totalFindings}\n`;
        response += `• **Estimated Expansion:** ${report.summary.estimatedExpansion || 0}%\n\n`;
        
        if (report.bundleSummary.topIssues.length > 0) {
          response += `**Top Issue Categories:**\n`;
          report.bundleSummary.topIssues.forEach(issue => {
            response += `• **${issue.category.replace('_', ' ')}**: ${issue.count} issues\n`;
          });
          response += `\n`;
        }
        
        if (report.summary.hotspots && report.summary.hotspots.length > 0) {
          response += `**Hotspots (Keys with Most Issues):**\n`;
          report.summary.hotspots.forEach(hotspot => {
            const keyPath = hotspot.keyPath ? hotspot.keyPath.join('.') : 'unknown';
            response += `• **${keyPath}**: ${hotspot.count} issues\n`;
          });
          response += `\n`;
        }
        
        if (report.findings.length > 0) {
          response += `**Sample Findings (showing first 5):**\n`;
          report.findings.slice(0, 5).forEach((finding, index) => {
            const keyPath = finding.keyPath ? finding.keyPath.join('.') : 'unknown';
            response += `${index + 1}. **${keyPath}** - ${finding.category.replace('_', ' ')}: ${finding.snippet}\n`;
          });
          response += `\n`;
        }
        
        response += `**Use get_cultural_adaptation_report to retrieve detailed analysis for specific keys.**`;
        
        return response;
      },
    }),

    GET_SUPPORTED_LOCALES: tool({
      name: 'get_supported_locales',
      description: 'Get a list of all supported locales for cultural adaptation analysis',
      schema: z.object({}),
      handler: async () => {
        const locales = getSupportedLocales();
        
        let response = `🌍 **Supported Locales for Cultural Adaptation**\n\n`;
        response += `**Total Locales:** ${locales.length}\n\n`;
        
        response += `**Available Locales:**\n`;
        locales.forEach(locale => {
          response += `• **${locale.code}** - ${locale.name} (${locale.nativeName})\n`;
        });
        
        response += `\n**Note:** Each locale has specific cultural rules, formality requirements, and text expansion characteristics.`;
        
        return response;
      },
    }),

    GET_LOCALE_INFO: tool({
      name: 'get_locale_info',
      description: 'Get detailed information about a specific locale including cultural notes and formatting rules',
      schema: z.object({
        targetLocale: z.enum(['en-GB', 'en-US', 'de-DE', 'ru-RU', 'zh-CN', 'es-ES', 'fr-FR', 'ja-JP', 'ko-KR']).describe('Target locale to get information for'),
      }),
      handler: async (args) => {
        const { targetLocale } = args;
        const info = getLocaleInfo(targetLocale);
        
        let response = `🌍 **Locale Information: ${info.name} (${info.locale})**\n\n`;
        
        response += `**Basic Information:**\n`;
        response += `• **Name:** ${info.name}\n`;
        response += `• **Native Name:** ${info.nativeName}\n`;
        response += `• **Default Formality:** ${info.formality.default}\n`;
        response += `• **Requires Formal Language:** ${info.formality.requiresFormal ? 'Yes' : 'No'}\n\n`;
        
        response += `**Formatting Conventions:**\n`;
        response += `• **Date Format:** ${info.formatting.dateFormat}\n`;
        response += `• **Decimal Separator:** ${info.formatting.decimalSeparator}\n`;
        response += `• **Thousands Separator:** ${info.formatting.thousandsSeparator}\n`;
        response += `• **Currency Format:** ${info.formatting.currencyFormat}\n`;
        response += `• **Time Format:** ${info.formatting.timeFormat}\n\n`;
        
        response += `**Text Expansion Risk:**\n`;
        response += `• **Estimated Expansion:** ${info.expansionRisk.estimatedExpansion}%\n`;
        response += `• **Risk Level:** ${info.expansionRisk.riskLevel}\n`;
        response += `• **Recommendations:**\n`;
        info.expansionRisk.recommendations.forEach(rec => {
          response += `  - ${rec}\n`;
        });
        response += `\n`;
        
        response += `**Cultural Notes:**\n`;
        response += `• **Taboos:** ${info.culturalNotes.taboos.join(', ')}\n`;
        response += `• **Formality Triggers:** ${info.culturalNotes.formalityTriggers.join(', ')}\n\n`;
        
        response += `**Color Symbolism:**\n`;
        Object.entries(info.culturalNotes.colorSymbolism).forEach(([color, meaning]) => {
          response += `• **${color}:** ${meaning}\n`;
        });
        response += `\n`;
        
        response += `**Emoji Context:**\n`;
        Object.entries(info.culturalNotes.emojiContext).forEach(([emoji, meaning]) => {
          response += `• **${emoji}:** ${meaning}\n`;
        });
        
        return response;
      },
    }),

    EXPLAIN_RULE: tool({
      name: 'explain_rule',
      description: 'Get detailed explanation of a specific cultural adaptation rule including examples and rationale',
      schema: z.object({
        ruleId: z.string().describe('Rule ID to explain (e.g., "idiom.break-a-leg", "culture.black-friday")'),
      }),
      handler: async (args) => {
        const { ruleId } = args;
        const rule = getRuleExplanation(ruleId);
        
        if (!rule) {
          return `❌ **Rule Not Found**: No rule found with ID "${ruleId}".\n\nUse get_supported_locales to see available locales and analyze_string to discover rule IDs.`;
        }
        
        let response = `📋 **Rule Explanation: ${ruleId}**\n\n`;
        
        response += `**Category:** ${rule.category.replace('_', ' ').toUpperCase()}\n`;
        response += `**Severity:** ${rule.severity.toUpperCase()}\n`;
        response += `**Confidence:** ${rule.confidence.toUpperCase()}\n`;
        response += `**Description:** ${rule.description}\n\n`;
        
        response += `**Examples:**\n`;
        response += `**❌ Problematic:**\n`;
        rule.suggestions[Object.keys(rule.suggestions)[0] as keyof typeof rule.suggestions].forEach(suggestion => {
          response += `• ${suggestion}\n`;
        });
        response += `\n`;
        
        response += `**✅ Better Alternatives:**\n`;
        // Show suggestions for a few locales
        const sampleLocales = ['de-DE', 'zh-CN', 'es-ES'];
        sampleLocales.forEach(locale => {
          if (rule.suggestions[locale]) {
            response += `• **${locale}**: ${rule.suggestions[locale].join(', ')}\n`;
          }
        });
        response += `\n`;
        
        response += `**Rationale:**\n`;
        // Show rationale for a few locales
        sampleLocales.forEach(locale => {
          if (rule.rationale[locale]) {
            response += `• **${locale}**: ${rule.rationale[locale]}\n`;
          }
        });
        
        return response;
      },
    }),

    GENERATE_CULTURAL_GUIDE: tool({
      name: 'generate_cultural_guide',
      description: 'Generate a comprehensive cultural adaptation guide for a specific locale',
      schema: z.object({
        targetLocale: z.enum(['en-GB', 'en-US', 'de-DE', 'ru-RU', 'zh-CN', 'es-ES', 'fr-FR', 'ja-JP', 'ko-KR']).describe('Target locale to generate guide for'),
      }),
      handler: async (args) => {
        const { targetLocale } = args;
        const guide = generateCulturalGuide(targetLocale);
        
        return guide;
      },
    }),

    GET_CULTURAL_ADAPTATION_REPORT: tool({
      name: 'get_cultural_adaptation_report',
      description: 'Retrieve stored cultural adaptation analysis reports from memory',
      schema: z.object({
        searchTerm: z.string().optional().describe('Search term to find specific reports'),
        reportType: z.enum(['string', 'bundle', 'all']).default('all').describe('Type of reports to retrieve'),
      }),
      handler: async (args, context) => {
        const { searchTerm, reportType } = args;
        
        const allData = await context.getAllData();
        const reports = [];
        
        for (const [key, value] of Object.entries(allData)) {
          if (key.includes('cultural_adaptation_') && typeof value === 'object') {
            if (reportType === 'string' && key.includes('bundle_')) continue;
            if (reportType === 'bundle' && !key.includes('bundle_')) continue;
            
            if (!searchTerm || key.toLowerCase().includes(searchTerm.toLowerCase())) {
              reports.push({ key, data: value });
            }
          }
        }
        
        if (reports.length === 0) {
          return '📝 No cultural adaptation reports found in memory matching your criteria.';
        }
        
        let response = `📝 **Cultural Adaptation Reports Found** (${reports.length}):\n\n`;
        
        for (const { key, data } of reports) {
          response += `**Report:** ${key}\n`;
          if (data.bundleSummary) {
            // Bundle report
            response += `**Type:** Bundle Analysis\n`;
            response += `**Target Locale:** ${data.targetLocale}\n`;
            response += `**Total Keys:** ${data.bundleSummary.totalKeys}\n`;
            response += `**Keys with Issues:** ${data.bundleSummary.keysWithIssues}\n`;
          } else {
            // Single string report
            response += `**Type:** Single String Analysis\n`;
            response += `**Target Locale:** ${data.targetLocale}\n`;
            response += `**Status:** ${data.summary.pass ? 'PASS' : 'FAIL'}\n`;
            response += `**Findings:** ${data.summary.totalFindings}\n`;
          }
          response += `\n`;
        }
        
        return response;
      },
    }),
  }),
});
