import { describe, it, expect, beforeEach } from 'vitest';
import { CulturalAdaptationConnectorConfig } from './cultural-adaptation';
import type { MCPContext } from '@stackone/mcp-config-types';

// Mock context
const mockContext: MCPContext = {
  getSetup: async () => ({
    defaultTone: 'neutral',
    defaultBrandStyle: 'professional',
    strictMode: false,
    maxSuggestions: 2,
    maxIssuesPerKey: 5
  }),
  setData: async () => {},
  getAllData: async () => ({}),
  getData: async () => null
};

describe('CulturalAdaptationConnectorConfig', () => {
  it('should have correct basic configuration', () => {
    expect(CulturalAdaptationConnectorConfig.name).toBe('Cultural Adaptation');
    expect(CulturalAdaptationConnectorConfig.key).toBe('cultural-adaptation');
    expect(CulturalAdaptationConnectorConfig.version).toBe('1.0.0');
  });

  it('should have all required tools', () => {
    const tools = CulturalAdaptationConnectorConfig.tools;
    expect(tools.ANALYZE_STRING).toBeDefined();
    expect(tools.ANALYZE_BUNDLE).toBeDefined();
    expect(tools.GET_SUPPORTED_LOCALES).toBeDefined();
    expect(tools.GET_LOCALE_INFO).toBeDefined();
    expect(tools.EXPLAIN_RULE).toBeDefined();
    expect(tools.GENERATE_CULTURAL_GUIDE).toBeDefined();
    expect(tools.GET_CULTURAL_ADAPTATION_REPORT).toBeDefined();
  });

  describe('ANALYZE_STRING tool', () => {
    it('should analyze simple text without issues', async () => {
      const result = await CulturalAdaptationConnectorConfig.tools.ANALYZE_STRING.handler(
        { text: 'Hello world', targetLocale: 'en-US' },
        mockContext
      );
      
      expect(result).toContain('✅ **No cultural adaptation issues found!**');
      expect(result).toContain('en-US');
    });

    it('should detect idioms in text', async () => {
      const result = await CulturalAdaptationConnectorConfig.tools.ANALYZE_STRING.handler(
        { text: 'Break a leg!', targetLocale: 'de-DE' },
        mockContext
      );
      
      expect(result).toContain('💬 **idiom**');
      expect(result).toContain('Break a leg');
      expect(result).toContain('Viel Erfolg!');
    });

    it('should detect baseball metaphors', async () => {
      const result = await CulturalAdaptationConnectorConfig.tools.ANALYZE_STRING.handler(
        { text: 'Hit a home run with our deals!', targetLocale: 'de-DE' },
        mockContext
      );
      
      expect(result).toContain('💬 **idiom**');
      expect(result).toContain('home run');
      expect(result).toContain('großer Erfolg');
    });

    it('should detect culture references', async () => {
      const result = await CulturalAdaptationConnectorConfig.tools.ANALYZE_STRING.handler(
        { text: 'Black Friday sale!', targetLocale: 'de-DE' },
        mockContext
      );
      
      expect(result).toContain('🌍 **culture reference**');
      expect(result).toContain('Black Friday');
      expect(result).toContain('große Saison-Angebote');
    });

    it('should detect slang', async () => {
      const result = await CulturalAdaptationConnectorConfig.tools.ANALYZE_STRING.handler(
        { text: 'Grab it now!', targetLocale: 'de-DE' },
        mockContext
      );
      
      expect(result).toContain('😎 **slang**');
      expect(result).toContain('Grab it');
      expect(result).toContain('nehmen Sie es');
    });

    it('should respect tone settings', async () => {
      const result = await CulturalAdaptationConnectorConfig.tools.ANALYZE_STRING.handler(
        { text: 'Hey, click here', targetLocale: 'de-DE', tone: 'formal' },
        mockContext
      );
      
      expect(result).toContain('👔 **formality**');
      expect(result).toContain('Hey');
      expect(result).toContain('Bitte klicken Sie hier');
    });
  });

  describe('ANALYZE_BUNDLE tool', () => {
    it('should analyze bundle successfully', async () => {
      const bundle = {
        cta: { buy: 'Grab it now!' },
        marketing: { slogan: 'A silver bullet for your workflow' }
      };
      
      const result = await CulturalAdaptationConnectorConfig.tools.ANALYZE_BUNDLE.handler(
        { bundleJson: bundle, targetLocale: 'ru-RU' },
        mockContext
      );
      
      expect(result).toContain('🌍 **Bundle Cultural Adaptation Analysis Complete**');
      expect(result).toContain('**Total Keys:** 2');
      expect(result).toContain('**Keys with Issues:** 2');
    });

    it('should handle nested bundle structures', async () => {
      const bundle = {
        ui: {
          buttons: {
            primary: 'Hit the ground running',
            secondary: 'Touch base with us'
          }
        }
      };
      
      const result = await CulturalAdaptationConnectorConfig.tools.ANALYZE_BUNDLE.handler(
        { bundleJson: bundle, targetLocale: 'zh-CN' },
        mockContext
      );
      
      expect(result).toContain('**Total Keys:** 2');
      expect(result).toContain('**Keys with Issues:** 2');
    });
  });

  describe('GET_SUPPORTED_LOCALES tool', () => {
    it('should return all supported locales', async () => {
      const result = await CulturalAdaptationConnectorConfig.tools.GET_SUPPORTED_LOCALES.handler(
        {},
        mockContext
      );
      
      expect(result).toContain('🌍 **Supported Locales for Cultural Adaptation**');
      expect(result).toContain('en-GB');
      expect(result).toContain('de-DE');
      expect(result).toContain('zh-CN');
      expect(result).toContain('ru-RU');
    });
  });

  describe('GET_LOCALE_INFO tool', () => {
    it('should return detailed locale information', async () => {
      const result = await CulturalAdaptationConnectorConfig.tools.GET_LOCALE_INFO.handler(
        { targetLocale: 'de-DE' },
        mockContext
      );
      
      expect(result).toContain('🌍 **Locale Information: German (de-DE)**');
      expect(result).toContain('**Default Formality:** formal');
      expect(result).toContain('**Requires Formal Language:** Yes');
      expect(result).toContain('**Date Format:** DD.MM.YYYY');
      expect(result).toContain('**Estimated Expansion:** 25%');
    });

    it('should handle different locales', async () => {
      const result = await CulturalAdaptationConnectorConfig.tools.GET_LOCALE_INFO.handler(
        { targetLocale: 'zh-CN' },
        mockContext
      );
      
      expect(result).toContain('🌍 **Locale Information: Chinese (Simplified) (zh-CN)**');
      expect(result).toContain('**Default Formality:** formal');
      expect(result).toContain('**Estimated Expansion:** -20%');
    });
  });

  describe('EXPLAIN_RULE tool', () => {
    it('should explain idiom rules', async () => {
      const result = await CulturalAdaptationConnectorConfig.tools.EXPLAIN_RULE.handler(
        { ruleId: 'idiom.break-a-leg' },
        mockContext
      );
      
      expect(result).toContain('📋 **Rule Explanation: idiom.break-a-leg**');
      expect(result).toContain('**Category:** IDIOM');
      expect(result).toContain('Theater idiom meaning "good luck"');
    });

    it('should explain culture reference rules', async () => {
      const result = await CulturalAdaptationConnectorConfig.tools.EXPLAIN_RULE.handler(
        { ruleId: 'culture.black-friday' },
        mockContext
      );
      
      expect(result).toContain('📋 **Rule Explanation: culture.black-friday**');
      expect(result).toContain('**Category:** CULTURE REFERENCE');
      expect(result).toContain('US shopping holiday reference');
    });

    it('should handle unknown rule IDs', async () => {
      const result = await CulturalAdaptationConnectorConfig.tools.EXPLAIN_RULE.handler(
        { ruleId: 'unknown.rule' },
        mockContext
      );
      
      expect(result).toContain('❌ **Rule Not Found**');
    });
  });

  describe('GENERATE_CULTURAL_GUIDE tool', () => {
    it('should generate guide for German locale', async () => {
      const result = await CulturalAdaptationConnectorConfig.tools.GENERATE_CULTURAL_GUIDE.handler(
        { targetLocale: 'de-DE' },
        mockContext
      );
      
      expect(result).toContain('# Cultural Adaptation Guide: German (de-DE)');
      expect(result).toContain('**Default Formality:** formal');
      expect(result).toContain('**Date Format:** DD.MM.YYYY');
      expect(result).toContain('**Estimated Expansion:** 25%');
    });

    it('should generate guide for Chinese locale', async () => {
      const result = await CulturalAdaptationConnectorConfig.tools.GENERATE_CULTURAL_GUIDE.handler(
        { targetLocale: 'zh-CN' },
        mockContext
      );
      
      expect(result).toContain('# Cultural Adaptation Guide: Chinese (Simplified) (zh-CN)');
      expect(result).toContain('**Default Formality:** formal');
      expect(result).toContain('**Date Format:** YYYY年MM月DD日');
      expect(result).toContain('**Estimated Expansion:** -20%');
    });
  });

  describe('GET_CULTURAL_ADAPTATION_REPORT tool', () => {
    it('should return no reports when memory is empty', async () => {
      const result = await CulturalAdaptationConnectorConfig.tools.GET_CULTURAL_ADAPTATION_REPORT.handler(
        {},
        mockContext
      );
      
      expect(result).toContain('📝 No cultural adaptation reports found in memory');
    });

    it('should filter reports by type', async () => {
      const result = await CulturalAdaptationConnectorConfig.tools.GET_CULTURAL_ADAPTATION_REPORT.handler(
        { reportType: 'string' },
        mockContext
      );
      
      expect(result).toContain('📝 No cultural adaptation reports found in memory');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle very short text', async () => {
      const result = await CulturalAdaptationConnectorConfig.tools.ANALYZE_STRING.handler(
        { text: 'Hi', targetLocale: 'en-US' },
        mockContext
      );
      
      expect(result).toContain('✅ **No cultural adaptation issues found!**');
    });

    it('should handle text with only punctuation', async () => {
      const result = await CulturalAdaptationConnectorConfig.tools.ANALYZE_STRING.handler(
        { text: '!!!', targetLocale: 'en-US' },
        mockContext
      );
      
      expect(result).toContain('✅ **No cultural adaptation issues found!**');
    });

    it('should handle very long text', async () => {
      const longText = 'This is a very long text that contains multiple sentences. '.repeat(50);
      const result = await CulturalAdaptationConnectorConfig.tools.ANALYZE_STRING.handler(
        { text: longText, targetLocale: 'en-US' },
        mockContext
      );
      
      expect(result).toContain('🌍 **Cultural Adaptation Analysis Complete**');
    });
  });

  describe('Integration scenarios', () => {
    it('should work with localization connector workflow', async () => {
      // Test that cultural adaptation can work with translated text
      const result = await CulturalAdaptationConnectorConfig.tools.ANALYZE_STRING.handler(
        { text: 'Viel Erfolg beim Hackathon!', targetLocale: 'de-DE' },
        mockContext
      );
      
      expect(result).toContain('🌍 **Cultural Adaptation Analysis Complete**');
    });

    it('should handle mixed content types', async () => {
      const bundle = {
        welcome: 'Hey there! 🙏',
        cta: 'Break a leg with our Black Friday deals!',
        info: 'Touch base with us for more details'
      };
      
      const result = await CulturalAdaptationConnectorConfig.tools.ANALYZE_BUNDLE.handler(
        { bundleJson: bundle, targetLocale: 'ru-RU' },
        mockContext
      );
      
      expect(result).toContain('Bundle Cultural Adaptation Analysis Complete');
      expect(result).toContain('**Keys with Issues:** 3');
    });
  });
});
