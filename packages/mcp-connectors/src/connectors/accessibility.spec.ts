import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccessibilityConnectorConfig } from './accessibility';

// Mock context
const mockContext = {
  getCredentials: vi.fn().mockResolvedValue({}),
  getSetup: vi.fn().mockResolvedValue({
    targetReadabilityGrade: 8,
    strictMode: false,
    enableAdvancedChecks: true,
    maxIssuesBeforeFail: 5,
  }),
  setData: vi.fn().mockResolvedValue(undefined),
  getData: vi.fn().mockResolvedValue(undefined),
  getAllData: vi.fn().mockResolvedValue({}),
};

describe('AccessibilityConnectorConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct basic configuration', () => {
    expect(AccessibilityConnectorConfig.name).toBe('Accessibility Checker');
    expect(AccessibilityConnectorConfig.key).toBe('accessibility');
    expect(AccessibilityConnectorConfig.version).toBe('1.0.0');
  });

  it('should have all required tools', () => {
    const tools = AccessibilityConnectorConfig.tools;
    expect(tools).toBeDefined();
    
    const toolNames = Object.keys(tools);
    expect(toolNames).toContain('ANALYZE_TEXT');
    expect(toolNames).toContain('ANALYZE_MULTIPLE_TEXTS');
    expect(toolNames).toContain('GET_ACCESSIBILITY_REPORT');
    expect(toolNames).toContain('CHECK_WCAG_COMPLIANCE');
    expect(toolNames).toContain('GENERATE_ACCESSIBILITY_GUIDE');
    expect(toolNames).toContain('VALIDATE_ACCESSIBILITY');
  });

  describe('ANALYZE_TEXT tool', () => {
    it('should analyze simple text without issues', async () => {
      const tool = AccessibilityConnectorConfig.tools.ANALYZE_TEXT;
      const result = await tool.handler({
        text: 'Hello world',
        context: 'button'
      }, mockContext);
      
      expect(result).toContain('🔍 **Accessibility Analysis Complete**');
      expect(result).toContain('**Text:** "Hello world"');
      expect(result).toContain('**Context:** button');
      expect(result).toContain('**Overall Score:** High Accessibility');
      expect(result).toContain('**Total Issues:** 0');
    });

    it('should detect jargon in text', async () => {
      const tool = AccessibilityConnectorConfig.tools.ANALYZE_TEXT;
      const result = await tool.handler({
        text: 'Welcome to our hyperconverged platform experience!',
        context: 'heading'
      }, mockContext);
      
      expect(result).toContain('🔍 **Accessibility Analysis Complete**');
      expect(result).toContain('**Overall Score:**');
      expect(result).toContain('**Issues Found:**');
      expect(result).toContain('**AMBIGUITY**: Text contains technical jargon');
    });

    it('should detect all caps text', async () => {
      const tool = AccessibilityConnectorConfig.tools.ANALYZE_TEXT;
      const result = await tool.handler({
        text: 'CLICK HERE TO PROCEED',
        context: 'button'
      }, mockContext);
      
      expect(result).toContain('**CAPS**: Text is in ALL CAPS');
      expect(result).toContain('Use sentence case or title case instead of all caps');
    });

    it('should detect excessive punctuation', async () => {
      const tool = AccessibilityConnectorConfig.tools.ANALYZE_TEXT;
      const result = await tool.handler({
        text: 'Hello!!! How are you??? I am fine...',
        context: 'paragraph'
      }, mockContext);
      
      expect(result).toContain('**PUNCTUATION**: Text contains excessive punctuation');
    });

    it('should detect idioms', async () => {
      const tool = AccessibilityConnectorConfig.tools.ANALYZE_TEXT;
      const result = await tool.handler({
        text: 'Hit the ground running with our solution',
        context: 'paragraph'
      }, mockContext);
      
      expect(result).toContain('**AMBIGUITY**: Text contains idioms');
      expect(result).toContain('Use literal language instead of idioms');
    });

    it('should handle long text appropriately', async () => {
      const tool = AccessibilityConnectorConfig.tools.ANALYZE_TEXT;
      const longText = 'This is a very long text that exceeds the recommended length for buttons and should trigger a length warning because it contains many words and goes on for quite a while without stopping.';
      const result = await tool.handler({
        text: longText,
        context: 'button'
      }, mockContext);
      
      expect(result).toContain('**LENGTH**: Button text is');
      expect(result).toContain('characters long. Consider keeping button text under 50 characters');
    });

    it('should respect target grade level', async () => {
      const tool = AccessibilityConnectorConfig.tools.ANALYZE_TEXT;
      const complexText = 'The hyperconverged infrastructure paradigm leverages synergistic orchestration capabilities for optimal resource utilization.';
      const result = await tool.handler({
        text: complexText,
        targetGrade: 6
      }, mockContext);
      
      expect(result).toContain('**Target Grade Level:** 6');
      expect(result).toContain('**READABILITY**: This text scores at Grade');
    });
  });

  describe('ANALYZE_MULTIPLE_TEXTS tool', () => {
    it('should analyze multiple texts successfully', async () => {
      const tool = AccessibilityConnectorConfig.tools.ANALYZE_MULTIPLE_TEXTS;
      const result = await tool.handler({
        texts: {
          'login_button': 'Sign In',
          'welcome_message': 'Hello, welcome to our app!',
          'error_message': 'An error occurred during the authentication process'
        }
      }, mockContext);
      
      expect(result).toContain('🔍 **Batch Accessibility Analysis Complete**');
      expect(result).toContain('**Texts Analyzed:** 3');
      expect(result).toContain('**Individual Text Results:**');
      expect(result).toContain('✅ **login_button**: High Accessibility');
    });

    it('should detect consistency issues across texts', async () => {
      const tool = AccessibilityConnectorConfig.tools.ANALYZE_MULTIPLE_TEXTS;
      const result = await tool.handler({
        texts: {
          'button1': 'CLICK HERE',
          'button2': 'Click here',
          'button3': 'click here'
        }
      }, mockContext);
      
      expect(result).toContain('**Issues by Type:**');
      expect(result).toContain('consistency: 1');
    });

    it('should handle empty text object', async () => {
      const tool = AccessibilityConnectorConfig.tools.ANALYZE_MULTIPLE_TEXTS;
      const result = await tool.handler({
        texts: {}
      }, mockContext);
      
      expect(result).toContain('**Texts Analyzed:** 0');
      expect(result).toContain('**Total Issues:** 0');
    });
  });

  describe('CHECK_WCAG_COMPLIANCE tool', () => {
    it('should pass WCAG compliance for simple content', async () => {
      const tool = AccessibilityConnectorConfig.tools.CHECK_WCAG_COMPLIANCE;
      const result = await tool.handler({
        content: { simple_text: 'Hello world' }
      }, mockContext);
      
      expect(result).toContain('♿ **WCAG Compliance Check Complete**');
      expect(result).toContain('✅ **No WCAG compliance issues found!**');
      expect(result).toContain('**Compliance Status:** PASS');
    });

    it('should detect missing alt-text for images', async () => {
      const tool = AccessibilityConnectorConfig.tools.CHECK_WCAG_COMPLIANCE;
      const result = await tool.handler({
        content: {
          profile_image: { src: 'profile.jpg' },
          logo: { src: 'logo.png', alt: 'Company Logo' }
        }
      }, mockContext);
      
      expect(result).toContain('**WCAG Issues Found:**');
      expect(result).toContain('**WCAG**: Missing alt-text for image: profile_image');
      expect(result).toContain('**Compliance Status:** FAIL');
    });

    it('should handle strict mode correctly', async () => {
      const tool = AccessibilityConnectorConfig.tools.CHECK_WCAG_COMPLIANCE;
      const result = await tool.handler({
        content: { simple_text: 'Hello world' },
        strictMode: true
      }, mockContext);
      
      expect(result).toContain('**Compliance Status:** PASS');
    });
  });

  describe('GENERATE_ACCESSIBILITY_GUIDE tool', () => {
    it('should generate general accessibility guide', async () => {
      const tool = AccessibilityConnectorConfig.tools.GENERATE_ACCESSIBILITY_GUIDE;
      const result = await tool.handler({
        focusArea: 'general',
        includeExamples: true,
        includeChecklist: true
      }, mockContext);
      
      expect(result).toContain('# Accessibility Guide: General');
      expect(result).toContain('**Core Principles:**');
      expect(result).toContain('**Examples:**');
      expect(result).toContain('**General Checklist:**');
    });

    it('should generate readability guide', async () => {
      const tool = AccessibilityConnectorConfig.tools.GENERATE_ACCESSIBILITY_GUIDE;
      const result = await tool.handler({
        focusArea: 'readability',
        includeExamples: true,
        includeChecklist: false
      }, mockContext);
      
      expect(result).toContain('# Accessibility Guide: Readability');
      expect(result).toContain('**Target Reading Levels:**');
      expect(result).toContain('**Examples:**');
      expect(result).not.toContain('**Readability Checklist:**');
    });

    it('should generate WCAG guide', async () => {
      const tool = AccessibilityConnectorConfig.tools.GENERATE_ACCESSIBILITY_GUIDE;
      const result = await tool.handler({
        focusArea: 'wcag',
        includeExamples: false,
        includeChecklist: true
      }, mockContext);
      
      expect(result).toContain('# Accessibility Guide: Wcag');
      expect(result).toContain('**Text-Level Requirements:**');
      expect(result).not.toContain('**Examples:**');
      expect(result).toContain('**WCAG Checklist:**');
    });
  });

  describe('VALIDATE_ACCESSIBILITY tool', () => {
    it('should pass validation for accessible text', async () => {
      const tool = AccessibilityConnectorConfig.tools.VALIDATE_ACCESSIBILITY;
      const result = await tool.handler({
        text: 'Hello world',
        context: 'button',
        strictMode: false
      }, mockContext);
      
      expect(result).toContain('🔍 **Accessibility Validation Complete**');
      expect(result).toContain('**Status:** PASS');
      expect(result).toContain('✅ **All accessibility checks passed!**');
    });

    it('should fail validation with custom rules', async () => {
      const tool = AccessibilityConnectorConfig.tools.VALIDATE_ACCESSIBILITY;
      const result = await tool.handler({
        text: 'Welcome to our hyperconverged platform',
        context: 'heading',
        rules: ['no-jargon'],
        strictMode: true
      }, mockContext);
      
      expect(result).toContain('**Status:** FAIL');
      expect(result).toContain('Custom rule violation: Text contains jargon');
    });

    it('should handle readability grade rules', async () => {
      const tool = AccessibilityConnectorConfig.tools.VALIDATE_ACCESSIBILITY;
      const result = await tool.handler({
        text: 'The hyperconverged infrastructure paradigm leverages synergistic orchestration capabilities.',
        context: 'paragraph',
        rules: ['readability-grade-8'],
        strictMode: true
      }, mockContext);
      
      expect(result).toContain('**Status:** FAIL');
      expect(result).toContain('Custom rule violation: Text exceeds Grade 8 reading level');
    });
  });

  describe('GET_ACCESSIBILITY_REPORT tool', () => {
    it('should return no reports when memory is empty', async () => {
      const tool = AccessibilityConnectorConfig.tools.GET_ACCESSIBILITY_REPORT;
      const result = await tool.handler({}, mockContext);
      
      expect(result).toContain('📝 No accessibility reports found in memory');
    });

    it('should filter reports by type', async () => {
      mockContext.getAllData.mockResolvedValue({
        'accessibility_123_text': { summary: { score: 'High Accessibility' } },
        'batch_accessibility_456': { texts: { button: 'Hello' } }
      });
      
      const tool = AccessibilityConnectorConfig.tools.GET_ACCESSIBILITY_REPORT;
      const result = await tool.handler({ reportType: 'single' }, mockContext);
      
      expect(result).toContain('**Type:** Single Text Analysis');
      expect(result).not.toContain('**Type:** Batch Analysis');
    });

    it('should search reports by term', async () => {
      mockContext.getAllData.mockResolvedValue({
        'accessibility_123_hello_world': { summary: { score: 'High Accessibility' } },
        'accessibility_456_goodbye': { summary: { score: 'Medium Accessibility' } }
      });
      
      const tool = AccessibilityConnectorConfig.tools.GET_ACCESSIBILITY_REPORT;
      const result = await tool.handler({ searchTerm: 'hello' }, mockContext);
      
      expect(result).toContain('hello_world');
      expect(result).not.toContain('goodbye');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle very short text', async () => {
      const tool = AccessibilityConnectorConfig.tools.ANALYZE_TEXT;
      const result = await tool.handler({
        text: 'Hi',
        context: 'button'
      }, mockContext);
      
      expect(result).toContain('**Overall Score:** High Accessibility');
      expect(result).toContain('**Total Issues:** 0');
    });

    it('should handle text with only punctuation', async () => {
      const tool = AccessibilityConnectorConfig.tools.ANALYZE_TEXT;
      const result = await tool.handler({
        text: '!!!',
        context: 'button'
      }, mockContext);
      
      expect(result).toContain('**Overall Score:**');
      expect(result).toContain('**Total Issues:**');
    });

    it('should handle very long text', async () => {
      const tool = AccessibilityConnectorConfig.tools.ANALYZE_TEXT;
      const longText = 'This is a very long text that goes on and on for many sentences. '.repeat(50);
      const result = await tool.handler({
        text: longText,
        context: 'paragraph'
      }, mockContext);
      
      expect(result).toContain('**LENGTH**: Text is');
      expect(result).toContain('characters long. Consider breaking into shorter paragraphs');
    });
  });
});
