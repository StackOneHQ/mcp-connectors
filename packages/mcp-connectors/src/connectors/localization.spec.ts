import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalizationConnectorConfig } from './localization';

// Mock context
const mockContext = {
  getCredentials: vi.fn().mockResolvedValue({}),
  getSetup: vi.fn().mockResolvedValue({
    defaultSourceLanguage: 'en',
    enableAdvancedFeatures: false,
    translationMemory: true,
  }),
  setData: vi.fn().mockResolvedValue(undefined),
  getData: vi.fn().mockResolvedValue(undefined),
  getAllData: vi.fn().mockResolvedValue({}),
};

describe('LocalizationConnectorConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct basic configuration', () => {
    expect(LocalizationConnectorConfig.name).toBe('Localization');
    expect(LocalizationConnectorConfig.key).toBe('localization');
    expect(LocalizationConnectorConfig.version).toBe('1.0.0');
  });

  it('should have all required tools', () => {
    const tools = LocalizationConnectorConfig.tools;
    expect(tools).toBeDefined();
    
    const toolNames = Object.keys(tools);
    expect(toolNames).toContain('LIST_SUPPORTED_LANGUAGES');
    expect(toolNames).toContain('TRANSLATE_TEXT');
    expect(toolNames).toContain('BATCH_TRANSLATE');
    expect(toolNames).toContain('GET_TRANSLATION_MEMORY');
    expect(toolNames).toContain('VALIDATE_LOCALIZATION');
    expect(toolNames).toContain('GENERATE_LOCALIZATION_GUIDE');
  });

  describe('LIST_SUPPORTED_LANGUAGES tool', () => {
    it('should list all languages when no tier specified', async () => {
      const tool = LocalizationConnectorConfig.tools.LIST_SUPPORTED_LANGUAGES;
      const result = await tool.handler({}, mockContext);
      
      expect(result).toContain('Latin Alphabet Languages');
      expect(result).toContain('Non-Latin Script Languages');
      expect(result).toContain('Fun Languages');
      expect(result).toContain('🇪🇸 Spanish (es)');
      expect(result).toContain('🇨🇳 Chinese (Simplified) (zh-CN) - Hanzi');
      expect(result).toContain('🧝 Elvish (Quenya) (elvish) - Tengwar');
    });

    it('should list only Latin languages when tier is latin', async () => {
      const tool = LocalizationConnectorConfig.tools.LIST_SUPPORTED_LANGUAGES;
      const result = await tool.handler({ tier: 'latin' }, mockContext);
      
      expect(result).toContain('Latin Alphabet Languages');
      expect(result).not.toContain('Non-Latin Script Languages');
      expect(result).not.toContain('Fun Languages');
      expect(result).toContain('🇪🇸 Spanish (es)');
    });

    it('should list only non-Latin languages when tier is non-latin', async () => {
      const tool = LocalizationConnectorConfig.tools.LIST_SUPPORTED_LANGUAGES;
      const result = await tool.handler({ tier: 'non-latin' }, mockContext);
      
      expect(result).toContain('Non-Latin Script Languages');
      expect(result).not.toContain('Latin Alphabet Languages');
      expect(result).not.toContain('Fun Languages');
      expect(result).toContain('🇨🇳 Chinese (Simplified) (zh-CN) - Hanzi');
    });

    it('should list only fun languages when tier is fun', async () => {
      const tool = LocalizationConnectorConfig.tools.LIST_SUPPORTED_LANGUAGES;
      const result = await tool.handler({ tier: 'fun' }, mockContext);
      
      expect(result).toContain('Fun Languages');
      expect(result).not.toContain('Latin Alphabet Languages');
      expect(result).not.toContain('Non-Latin Script Languages');
      expect(result).toContain('🧝 Elvish (Quenya) (elvish) - Tengwar');
    });
  });

  describe('TRANSLATE_TEXT tool', () => {
    it('should translate to Latin language', async () => {
      const tool = LocalizationConnectorConfig.tools.TRANSLATE_TEXT;
      const result = await tool.handler({
        text: 'Hello World',
        targetLanguage: 'es',
        context: 'UI button'
      }, mockContext);
      
      expect(result).toContain('✅ **Translation Complete**');
      expect(result).toContain('**Source (auto):** Hello World');
      expect(result).toContain('**Target (es):**');
      expect(result).toContain('**Context:** UI button');
    });

    it('should translate to non-Latin language', async () => {
      const tool = LocalizationConnectorConfig.tools.TRANSLATE_TEXT;
      const result = await tool.handler({
        text: 'Hello World',
        targetLanguage: 'zh-CN',
        context: 'UI button'
      }, mockContext);
      
      expect(result).toContain('✅ **Translation Complete**');
      expect(result).toContain('**Target (zh-CN):**');
    });

    it('should translate to fun language', async () => {
      const tool = LocalizationConnectorConfig.tools.TRANSLATE_TEXT;
      const result = await tool.handler({
        text: 'Hello World',
        targetLanguage: 'elvish',
        context: 'UI button'
      }, mockContext);
      
      expect(result).toContain('✅ **Translation Complete**');
      expect(result).toContain('**Target (elvish):**');
    });

    it('should handle unsupported language', async () => {
      const tool = LocalizationConnectorConfig.tools.TRANSLATE_TEXT;
      const result = await tool.handler({
        text: 'Hello World',
        targetLanguage: 'unsupported',
        context: 'UI button'
      }, mockContext);
      
      expect(result).toContain('❌ Unsupported target language');
      expect(result).toContain('Use list_supported_languages to see available options');
    });
  });

  describe('BATCH_TRANSLATE tool', () => {
    it('should handle batch translation', async () => {
      const tool = LocalizationConnectorConfig.tools.BATCH_TRANSLATE;
      const result = await tool.handler({
        texts: [
          { key: 'greeting', text: 'Hello', context: 'UI button' },
          { key: 'goodbye', text: 'Goodbye', context: 'UI button' }
        ],
        targetLanguage: 'es'
      }, mockContext);
      
      expect(result).toContain('✅ **Batch Translation Complete**');
      expect(result).toContain('**Target Language:** es');
      expect(result).toContain('**Total Items:** 2');
      expect(result).toContain('**Successful:** 2');
      expect(result).toContain('**Failed:** 0');
    });
  });

  describe('VALIDATE_LOCALIZATION tool', () => {
    it('should pass validation for good translation', async () => {
      const tool = LocalizationConnectorConfig.tools.VALIDATE_LOCALIZATION;
      const result = await tool.handler({
        originalText: 'Hello {name}',
        translatedText: 'Hola {name}',
        targetLanguage: 'es',
        context: 'UI button'
      }, mockContext);
      
      expect(result).toContain('**Status:** ✅ PASSED');
      expect(result).toContain('**Issues Found:** 0');
    });

    it('should fail validation for missing placeholder', async () => {
      const tool = LocalizationConnectorConfig.tools.VALIDATE_LOCALIZATION;
      const result = await tool.handler({
        originalText: 'Hello {name}',
        translatedText: 'Hola',
        targetLanguage: 'es',
        context: 'UI button'
      }, mockContext);
      
      expect(result).toContain('❌ FAILED');
      expect(result).toContain('Missing placeholder: {name}');
    });

    it('should warn for identical translation', async () => {
      const tool = LocalizationConnectorConfig.tools.VALIDATE_LOCALIZATION;
      const result = await tool.handler({
        originalText: 'Hello',
        translatedText: 'Hello',
        targetLanguage: 'es',
        context: 'UI button'
      }, mockContext);
      
      expect(result).toContain('⚠️ Translation appears to be identical to original');
    });
  });

  describe('GENERATE_LOCALIZATION_GUIDE tool', () => {
    it('should generate guide for Latin language', async () => {
      const tool = LocalizationConnectorConfig.tools.GENERATE_LOCALIZATION_GUIDE;
      const result = await tool.handler({
        targetLanguage: 'es',
        includeExamples: true,
        includeCulturalNotes: true
      }, mockContext);
      
      expect(result).toContain('# Localization Guide: es');
      expect(result).toContain('**Script:** Latin Alphabet');
      expect(result).toContain('Common Phrases');
      expect(result).toContain('Cultural Considerations');
    });

    it('should generate guide for non-Latin language', async () => {
      const tool = LocalizationConnectorConfig.tools.GENERATE_LOCALIZATION_GUIDE;
      const result = await tool.handler({
        targetLanguage: 'zh-CN',
        includeExamples: true,
        includeCulturalNotes: true
      }, mockContext);
      
      expect(result).toContain('# Localization Guide: zh-CN');
      expect(result).toContain('**Script:** Hanzi');
    });

    it('should generate guide for fun language', async () => {
      const tool = LocalizationConnectorConfig.tools.GENERATE_LOCALIZATION_GUIDE;
      const result = await tool.handler({
        targetLanguage: 'elvish',
        includeExamples: true,
        includeCulturalNotes: true
      }, mockContext);
      
      expect(result).toContain('# Localization Guide: elvish');
      expect(result).toContain('**Script:** Tengwar');
      expect(result).toContain('**Type:** Constructed Language');
    });

    it('should handle unsupported language', async () => {
      const tool = LocalizationConnectorConfig.tools.GENERATE_LOCALIZATION_GUIDE;
      const result = await tool.handler({
        targetLanguage: 'unsupported',
        includeExamples: true,
        includeCulturalNotes: true
      }, mockContext);
      
      expect(result).toContain('❌ Unsupported language: unsupported');
    });
  });

  describe('GET_TRANSLATION_MEMORY tool', () => {
    it('should return no translations when memory is empty', async () => {
      const tool = LocalizationConnectorConfig.tools.GET_TRANSLATION_MEMORY;
      const result = await tool.handler({}, mockContext);
      
      expect(result).toContain('📝 No translations found in memory');
    });

    it('should filter translations by source language', async () => {
      mockContext.getAllData.mockResolvedValue({
        'en_es_hello': 'Hola',
        'fr_es_bonjour': 'Hola'
      });
      
      const tool = LocalizationConnectorConfig.tools.GET_TRANSLATION_MEMORY;
      const result = await tool.handler({ sourceLanguage: 'en' }, mockContext);
      
      expect(result).toContain('en → es');
      expect(result).not.toContain('fr → es');
    });
  });
});
