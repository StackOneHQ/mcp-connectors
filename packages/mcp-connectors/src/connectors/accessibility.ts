import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';
import {
  generateAccessibilityReport,
  analyzeMultipleTexts,
  checkWCAGCompliance,
  type AccessibilityReport,
  type AccessibilityIssue
} from '../utils/accessibility';

export const AccessibilityConnectorConfig = mcpConnectorConfig({
  name: 'Accessibility Checker',
  key: 'accessibility',
  version: '1.0.0',
  description: 'Automatically scan text strings and report accessibility issues for inclusive app development',
  credentials: z.object({
    // No external API keys needed for basic functionality
    // Could add OpenAI API key for advanced suggestions in the future
    openaiApiKey: z.string().optional().describe('OpenAI API key for advanced accessibility suggestions (optional)'),
  }),
  setup: z.object({
    targetReadabilityGrade: z.number().min(1).max(16).default(8).describe('Target reading grade level (1-16, default: 8)'),
    strictMode: z.boolean().default(false).describe('Enable strict mode for WCAG compliance (pass/fail scoring)'),
    enableAdvancedChecks: z.boolean().default(true).describe('Enable advanced accessibility checks (jargon, idioms, consistency)'),
    maxIssuesBeforeFail: z.number().min(1).default(5).describe('Maximum issues allowed before marking as failed in strict mode'),
  }),
  logo: 'https://stackone-logos.com/api/disco/filled/svg',
  examplePrompt: 'Help me check the accessibility of my application text by analyzing readability, detecting jargon, checking for WCAG compliance, and ensuring inclusive language.',
  tools: (tool) => ({
    ANALYZE_TEXT: tool({
      name: 'analyze_text',
      description: 'Analyze a single text string for accessibility issues including readability, jargon, and WCAG compliance',
      schema: z.object({
        text: z.string().describe('Text to analyze for accessibility issues'),
        context: z.string().optional().describe('Context where this text will be used (e.g., "button", "label", "heading", "paragraph")'),
        targetGrade: z.number().min(1).max(16).optional().describe('Target reading grade level (overrides connector default)'),
      }),
      handler: async (args, context) => {
        const { text, context: textContext, targetGrade } = args;
        const setup = await context.getSetup();
        
        const targetReadabilityGrade = targetGrade || setup.targetReadabilityGrade;
        const report = generateAccessibilityReport(text, textContext, targetReadabilityGrade);
        
        // Store the analysis result for future reference
        const analysisKey = `accessibility_${Date.now()}_${text.substring(0, 20).replace(/\s+/g, '_')}`;
        await context.setData(analysisKey, report);
        
        // Format the response
        const severityEmojis = { error: '❌', warning: '⚠️', info: 'ℹ️' };
        const typeEmojis = {
          readability: '📚', length: '📏', caps: '🔠', punctuation: '🔤',
          ambiguity: '❓', wcag: '♿', consistency: '🔄'
        };
        
        let response = `🔍 **Accessibility Analysis Complete**\n\n`;
        response += `**Text:** "${text}"\n`;
        response += `**Context:** ${textContext || 'General text'}\n`;
        response += `**Target Grade Level:** ${targetReadabilityGrade}\n\n`;
        
        response += `**Overall Score:** ${report.summary.score}\n`;
        response += `**Readability Level:** ${report.summary.readabilityLevel}\n`;
        response += `**Total Issues:** ${report.summary.totalIssues}\n`;
        response += `**Critical Issues:** ${report.summary.criticalIssues}\n\n`;
        
        if (report.issues.length === 0) {
          response += `✅ **No accessibility issues found!** This text meets accessibility guidelines.\n\n`;
        } else {
          response += `**Issues Found:**\n`;
          for (const issue of report.issues) {
            response += `${severityEmojis[issue.severity]} ${typeEmojis[issue.type]} **${issue.type.toUpperCase()}**: ${issue.message}\n`;
            if (issue.suggestion) {
              response += `   💡 **Suggestion:** ${issue.suggestion}\n`;
            }
            response += `\n`;
          }
        }
        
        response += `**Recommendations:**\n`;
        for (const rec of report.summary.recommendations) {
          response += `• ${rec}\n`;
        }
        
        response += `\n**Metadata:**\n`;
        response += `• **Text Length:** ${report.metadata.textLength} characters\n`;
        response += `• **Word Count:** ${report.metadata.wordCount}\n`;
        response += `• **Sentence Count:** ${report.metadata.sentenceCount}\n`;
        response += `• **Average Words per Sentence:** ${report.metadata.averageWordsPerSentence.toFixed(1)}\n`;
        
        return response;
      },
    }),

    ANALYZE_MULTIPLE_TEXTS: tool({
      name: 'analyze_multiple_texts',
      description: 'Analyze multiple text entries for accessibility issues and consistency across the interface',
      schema: z.object({
        texts: z.record(z.string()).describe('Object with text keys and values to analyze (e.g., {"login_button": "Sign In", "welcome_message": "Hello"})'),
        targetGrade: z.number().min(1).max(16).optional().describe('Target reading grade level (overrides connector default)'),
        checkConsistency: z.boolean().default(true).describe('Check for consistency issues across all texts'),
      }),
      handler: async (args, context) => {
        const { texts, targetGrade, checkConsistency } = args;
        const setup = await context.getSetup();
        
        const targetReadabilityGrade = targetGrade || setup.targetReadabilityGrade;
        const reports = analyzeMultipleTexts(texts, targetReadabilityGrade);
        
        // Store the batch analysis results
        const batchKey = `batch_accessibility_${Date.now()}`;
        await context.setData(batchKey, { texts, reports, targetReadabilityGrade });
        
        // Calculate overall statistics
        const totalIssues = reports.reduce((sum, report) => sum + report.summary.totalIssues, 0);
        const criticalIssues = reports.reduce((sum, report) => sum + report.summary.criticalIssues, 0);
        const scores = reports.map(r => r.summary.score);
        const overallScore = scores.includes('Low Accessibility') ? 'Low Accessibility' :
                           scores.includes('Medium Accessibility') ? 'Medium Accessibility' : 'High Accessibility';
        
        let response = `🔍 **Batch Accessibility Analysis Complete**\n\n`;
        response += `**Texts Analyzed:** ${Object.keys(texts).length}\n`;
        response += `**Overall Score:** ${overallScore}\n`;
        response += `**Total Issues:** ${totalIssues}\n`;
        response += `**Critical Issues:** ${criticalIssues}\n`;
        response += `**Target Grade Level:** ${targetReadabilityGrade}\n\n`;
        
        // Group issues by type for summary
        const issuesByType = new Map<string, number>();
        const issuesBySeverity = new Map<string, number>();
        
        for (const report of reports) {
          for (const issue of report.issues) {
            issuesByType.set(issue.type, (issuesByType.get(issue.type) || 0) + 1);
            issuesBySeverity.set(issue.severity, (issuesBySeverity.get(issue.severity) || 0) + 1);
          }
        }
        
        if (totalIssues > 0) {
          response += `**Issues by Type:**\n`;
          for (const [type, count] of issuesByType) {
            response += `• ${type}: ${count}\n`;
          }
          response += `\n`;
          
          response += `**Issues by Severity:**\n`;
          for (const [severity, count] of issuesBySeverity) {
            response += `• ${severity}: ${count}\n`;
          }
          response += `\n`;
        }
        
        // Show individual text results
        response += `**Individual Text Results:**\n`;
        for (const [key, text] of Object.entries(texts)) {
          const report = reports.find(r => r.metadata.textLength === text.length);
          if (report) {
            const score = report.summary.score;
            const issueCount = report.summary.totalIssues;
            const emoji = score === 'High Accessibility' ? '✅' : score === 'Medium Accessibility' ? '⚠️' : '❌';
            response += `${emoji} **${key}**: ${score} (${issueCount} issues)\n`;
          }
        }
        
        response += `\n**Use get_accessibility_report to retrieve detailed analysis for specific texts.**`;
        
        return response;
      },
    }),

    GET_ACCESSIBILITY_REPORT: tool({
      name: 'get_accessibility_report',
      description: 'Retrieve stored accessibility analysis reports from memory',
      schema: z.object({
        searchTerm: z.string().optional().describe('Search term to find specific reports'),
        reportType: z.enum(['single', 'batch', 'all']).default('all').describe('Type of reports to retrieve'),
      }),
      handler: async (args, context) => {
        const { searchTerm, reportType } = args;
        
        const allData = await context.getAllData();
        const reports = [];
        
        for (const [key, value] of Object.entries(allData)) {
          if (key.includes('accessibility_') && typeof value === 'object') {
            if (reportType === 'single' && key.includes('batch_')) continue;
            if (reportType === 'batch' && !key.includes('batch_')) continue;
            
            if (!searchTerm || key.toLowerCase().includes(searchTerm.toLowerCase())) {
              reports.push({ key, data: value });
            }
          }
        }
        
        if (reports.length === 0) {
          return '📝 No accessibility reports found in memory matching your criteria.';
        }
        
        let response = `📝 **Accessibility Reports Found** (${reports.length}):\n\n`;
        
        for (const { key, data } of reports) {
          response += `**Report:** ${key}\n`;
          if (data.texts) {
            // Batch report
            response += `**Type:** Batch Analysis\n`;
            response += `**Texts:** ${Object.keys(data.texts).length}\n`;
            response += `**Target Grade:** ${data.targetReadabilityGrade}\n`;
          } else {
            // Single report
            response += `**Type:** Single Text Analysis\n`;
            response += `**Score:** ${data.summary?.score || 'Unknown'}\n`;
            response += `**Issues:** ${data.summary?.totalIssues || 0}\n`;
          }
          response += `\n`;
        }
        
        return response;
      },
    }),

    CHECK_WCAG_COMPLIANCE: tool({
      name: 'check_wcag_compliance',
      description: 'Check structured content for WCAG compliance issues like missing alt-text',
      schema: z.object({
        content: z.any().describe('JSON content to check for WCAG compliance (e.g., image metadata, form structure)'),
        strictMode: z.boolean().default(false).describe('Enable strict mode for stricter compliance checking'),
      }),
      handler: async (args, context) => {
        const { content, strictMode } = args;
        const setup = await context.getSetup();
        
        const wcagIssues = checkWCAGCompliance(content);
        
        // Store WCAG compliance results
        const wcagKey = `wcag_compliance_${Date.now()}`;
        await context.setData(wcagKey, { content, issues: wcagIssues, strictMode });
        
        let response = `♿ **WCAG Compliance Check Complete**\n\n`;
        
        if (wcagIssues.length === 0) {
          response += `✅ **No WCAG compliance issues found!** Content meets accessibility standards.\n\n`;
        } else {
          response += `**WCAG Issues Found:** ${wcagIssues.length}\n\n`;
          
          const severityEmojis = { error: '❌', warning: '⚠️', info: 'ℹ️' };
          
          for (const issue of wcagIssues) {
            response += `${severityEmojis[issue.severity]} **${issue.type.toUpperCase()}**: ${issue.message}\n`;
            if (issue.suggestion) {
              response += `   💡 **Suggestion:** ${issue.suggestion}\n`;
            }
            if (issue.key) {
              response += `   🔑 **Key:** ${issue.key}\n`;
            }
            response += `\n`;
          }
        }
        
        // Determine compliance status
        const criticalIssues = wcagIssues.filter(issue => issue.severity === 'error').length;
        const warningIssues = wcagIssues.filter(issue => issue.severity === 'warning').length;
        
        let complianceStatus = 'PASS';
        if (criticalIssues > 0) {
          complianceStatus = 'FAIL';
        } else if (strictMode && (criticalIssues > 0 || warningIssues > setup.maxIssuesBeforeFail)) {
          complianceStatus = 'FAIL';
        } else if (warningIssues > 0) {
          complianceStatus = 'WARN';
        }
        
        response += `**Compliance Status:** ${complianceStatus}\n`;
        response += `**Critical Issues:** ${criticalIssues}\n`;
        response += `**Warning Issues:** ${warningIssues}\n`;
        
        if (complianceStatus === 'FAIL') {
          response += `\n❌ **Action Required:** Fix critical issues to achieve WCAG compliance.`;
        } else if (complianceStatus === 'WARN') {
          response += `\n⚠️ **Review Recommended:** Address warnings to improve accessibility.`;
        } else {
          response += `\n✅ **Compliant:** Content meets WCAG accessibility guidelines.`;
        }
        
        return response;
      },
    }),

    GENERATE_ACCESSIBILITY_GUIDE: tool({
      name: 'generate_accessibility_guide',
      description: 'Generate an accessibility guide with best practices and examples',
      schema: z.object({
        focusArea: z.enum(['readability', 'wcag', 'language', 'ui', 'general']).default('general').describe('Focus area for the guide'),
        includeExamples: z.boolean().default(true).describe('Include practical examples'),
        includeChecklist: z.boolean().default(true).describe('Include accessibility checklist'),
      }),
      handler: async (args) => {
        const { focusArea, includeExamples, includeChecklist } = args;
        
        let guide = `# Accessibility Guide: ${focusArea.charAt(0).toUpperCase() + focusArea.slice(1)}\n\n`;
        
        switch (focusArea) {
          case 'readability':
            guide += generateReadabilityGuide(includeExamples, includeChecklist);
            break;
          case 'wcag':
            guide += generateWCAGGuide(includeExamples, includeChecklist);
            break;
          case 'language':
            guide += generateLanguageGuide(includeExamples, includeChecklist);
            break;
          case 'ui':
            guide += generateUIGuide(includeExamples, includeChecklist);
            break;
          default:
            guide += generateGeneralGuide(includeExamples, includeChecklist);
        }
        
        return guide;
      },
    }),

    VALIDATE_ACCESSIBILITY: tool({
      name: 'validate_accessibility',
      description: 'Validate accessibility compliance with configurable rules and scoring',
      schema: z.object({
        text: z.string().describe('Text to validate for accessibility compliance'),
        context: z.string().optional().describe('Context where this text will be used'),
        rules: z.array(z.string()).optional().describe('Specific accessibility rules to check (e.g., ["no-jargon", "readability-grade-8"])'),
        strictMode: z.boolean().default(false).describe('Enable strict mode for pass/fail scoring'),
      }),
      handler: async (args, context) => {
        const { text, context: textContext, rules, strictMode } = args;
        const setup = await context.getSetup();
        
        const report = generateAccessibilityReport(text, textContext, setup.targetReadabilityGrade);
        
        // Apply custom rules if specified
        const customIssues: AccessibilityIssue[] = [];
        if (rules) {
          for (const rule of rules) {
            if (rule === 'no-jargon' && report.issues.some(i => i.type === 'ambiguity' && i.message.includes('jargon'))) {
              customIssues.push({
                type: 'ambiguity',
                severity: 'error',
                message: 'Custom rule violation: Text contains jargon',
                suggestion: 'Replace technical terms with simpler alternatives'
              });
            }
            if (rule.startsWith('readability-grade-') && !isNaN(parseInt(rule.split('-')[2]))) {
              const targetGrade = parseInt(rule.split('-')[2]);
              const analysis = report.issues.find(i => i.type === 'readability');
              if (analysis && report.summary.readabilityLevel.includes('College')) {
                customIssues.push({
                  type: 'readability',
                  severity: 'error',
                  message: `Custom rule violation: Text exceeds Grade ${targetGrade} reading level`,
                  suggestion: `Simplify text to meet Grade ${targetGrade} reading level`
                });
              }
            }
          }
        }
        
        // Combine issues
        const allIssues = [...report.issues, ...customIssues];
        const totalIssues = allIssues.length;
        const criticalIssues = allIssues.filter(issue => issue.severity === 'error').length;
        const warningIssues = allIssues.filter(issue => issue.severity === 'warning').length;
        
        // Determine pass/fail status
        let status = 'PASS';
        if (criticalIssues > 0) {
          status = 'FAIL';
        } else if (strictMode && (criticalIssues > 0 || warningIssues > setup.maxIssuesBeforeFail)) {
          status = 'FAIL';
        } else if (warningIssues > 0) {
          status = 'WARN';
        }
        
        let response = `🔍 **Accessibility Validation Complete**\n\n`;
        response += `**Text:** "${text}"\n`;
        response += `**Context:** ${textContext || 'General text'}\n`;
        response += `**Status:** ${status}\n`;
        response += `**Total Issues:** ${totalIssues}\n`;
        response += `**Critical Issues:** ${criticalIssues}\n`;
        response += `**Warning Issues:** ${warningIssues}\n\n`;
        
        if (allIssues.length === 0) {
          response += `✅ **All accessibility checks passed!**\n\n`;
        } else {
          response += `**Issues Found:**\n`;
          for (const issue of allIssues) {
            const severityEmoji = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
            response += `${severityEmoji} **${issue.type.toUpperCase()}**: ${issue.message}\n`;
            if (issue.suggestion) {
              response += `   💡 **Suggestion:** ${issue.suggestion}\n`;
            }
            response += `\n`;
          }
        }
        
        response += `**Validation Rules Applied:**\n`;
        if (rules && rules.length > 0) {
          for (const rule of rules) {
            response += `• ${rule}\n`;
          }
        } else {
          response += `• Default accessibility rules\n`;
        }
        
        return response;
      },
    }),
  }),
});

// Helper functions for generating guides
function generateReadabilityGuide(includeExamples: boolean, includeChecklist: boolean): string {
  let guide = `## Readability Best Practices\n\n`;
  guide += `**Target Reading Levels:**\n`;
  guide += `• **General Public:** Grade 8-10\n`;
  guide += `• **Technical Users:** Grade 10-12\n`;
  guide += `• **Specialized:** Grade 12+\n\n`;
  
  if (includeExamples) {
    guide += `**Examples:**\n\n`;
    guide += `**❌ Too Complex:**\n`;
    guide += `"The hyperconverged infrastructure paradigm leverages synergistic orchestration capabilities."\n\n`;
    guide += `**✅ Simplified:**\n`;
    guide += `"Our system combines storage, computing, and networking in one easy-to-use package."\n\n`;
  }
  
  if (includeChecklist) {
    guide += `**Readability Checklist:**\n`;
    guide += `- [ ] Use short sentences (15-20 words max)\n`;
    guide += `- [ ] Avoid technical jargon\n`;
    guide += `- [ ] Use active voice\n`;
    guide += `- [ ] Break long paragraphs\n`;
    guide += `- [ ] Test with target audience\n\n`;
  }
  
  return guide;
}

function generateWCAGGuide(includeExamples: boolean, includeChecklist: boolean): string {
  let guide = `## WCAG Compliance Guidelines\n\n`;
  guide += `**Text-Level Requirements:**\n`;
  guide += `• **Buttons:** Max 50 characters\n`;
  guide += `• **Labels:** Max 100 characters\n`;
  guide += `• **Headings:** Max 200 characters\n`;
  guide += `• **Paragraphs:** Max 500 characters\n\n`;
  
  if (includeExamples) {
    guide += `**Examples:**\n\n`;
    guide += `**❌ Too Long:**\n`;
    guide += `"Click here to proceed with the authentication process and gain access to your account dashboard."\n\n`;
    guide += `**✅ Concise:**\n`;
    guide += `"Sign In"\n\n`;
  }
  
  if (includeChecklist) {
    guide += `**WCAG Checklist:**\n`;
    guide += `- [ ] Text length within limits\n`;
    guide += `- [ ] Proper heading hierarchy\n`;
    guide += `- [ ] Alt-text for images\n`;
    guide += `- [ ] Color contrast sufficient\n`;
    guide += `- [ ] Keyboard navigation possible\n\n`;
  }
  
  return guide;
}

function generateLanguageGuide(includeExamples: boolean, includeChecklist: boolean): string {
  let guide = `## Inclusive Language Guidelines\n\n`;
  guide += `**Avoid:**\n`;
  guide += `• Technical jargon\n`;
  guide += `• Idioms and metaphors\n`;
  guide += `• All caps text\n`;
  guide += `• Excessive punctuation\n\n`;
  
  if (includeExamples) {
    guide += `**Examples:**\n\n`;
    guide += `**❌ Problematic:**\n`;
    guide += `"Hit the ground running with our cutting-edge solution!"\n\n`;
    guide += `**✅ Inclusive:**\n`;
    guide += `"Get started quickly with our advanced solution."\n\n`;
  }
  
  if (includeChecklist) {
    guide += `**Language Checklist:**\n`;
    guide += `- [ ] No technical jargon\n`;
    guide += `- [ ] No idioms or metaphors\n`;
    guide += `- [ ] Consistent tone\n`;
    guide += `- [ ] Clear and direct\n`;
    guide += `- [ ] Culturally appropriate\n\n`;
  }
  
  return guide;
}

function generateUIGuide(includeExamples: boolean, includeChecklist: boolean): string {
  let guide = `## UI Accessibility Guidelines\n\n`;
  guide += `**Text Elements:**\n`;
  guide += `• **Buttons:** Action-oriented, concise\n`;
  guide += `• **Labels:** Descriptive but brief\n`;
  guide += `• **Error Messages:** Clear and helpful\n`;
  guide += `• **Help Text:** Contextual and simple\n\n`;
  
  if (includeExamples) {
    guide += `**Examples:**\n\n`;
    guide += `**❌ Poor UX:**\n`;
    guide += `"The system encountered an error during the execution of the requested operation."\n\n`;
    guide += `**✅ Better UX:**\n`;
    guide += `"Unable to save file. Please try again."\n\n`;
  }
  
  if (includeChecklist) {
    guide += `**UI Checklist:**\n`;
    guide += `- [ ] Button text is action-oriented\n`;
    guide += `- [ ] Labels are descriptive\n`;
    guide += `- [ ] Error messages are helpful\n`;
    guide += `- [ ] Help text is contextual\n`;
    guide += `- [ ] Text fits in containers\n\n`;
  }
  
  return guide;
}

function generateGeneralGuide(includeExamples: boolean, includeChecklist: boolean): string {
  let guide = `## General Accessibility Guidelines\n\n`;
  guide += `**Core Principles:**\n`;
  guide += `• **Perceivable:** Information is clear and readable\n`;
  guide += `• **Operable:** Interface is easy to navigate\n`;
  guide += `• **Understandable:** Content is clear and simple\n`;
  guide += `• **Robust:** Works with assistive technologies\n\n`;
  
  if (includeExamples) {
    guide += `**Examples:**\n\n`;
    guide += `**❌ Inaccessible:**\n`;
    guide += `"CLICK HERE TO PROCEED!!!"\n\n`;
    guide += `**✅ Accessible:**\n`;
    guide += `"Continue"\n\n`;
  }
  
  if (includeChecklist) {
    guide += `**General Checklist:**\n`;
    guide += `- [ ] Text is readable\n`;
    guide += `- [ ] Language is clear\n`;
    guide += `- [ ] Length is appropriate\n`;
    guide += `- [ ] Tone is consistent\n`;
    guide += `- [ ] No accessibility barriers\n\n`;
  }
  
  return guide;
}
