import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiImageConnectorConfig } from './gemini-image';

// Mock fetch
global.fetch = vi.fn();

describe('GeminiImageConnectorConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct configuration', () => {
    expect(GeminiImageConnectorConfig.name).toBe('Gemini Image Generation');
    expect(GeminiImageConnectorConfig.key).toBe('gemini-image');
    expect(GeminiImageConnectorConfig.version).toBe('1.0.0');
  });

  it('should have required tools', () => {
    const tools = GeminiImageConnectorConfig.tools;
    expect(tools.GENERATE_IMAGE).toBeDefined();
    expect(tools.EDIT_IMAGE).toBeDefined();
    expect(tools.ANALYZE_IMAGE).toBeDefined();
    expect(tools.LIST_MODELS).toBeDefined();
  });

  it('should have correct credentials schema', () => {
    const credentials = GeminiImageConnectorConfig.credentials;
    expect(credentials).toBeDefined();
  });

  it('should have example prompt', () => {
    expect(GeminiImageConnectorConfig.examplePrompt).toContain('Generate a beautiful image');
  });

  describe('GENERATE_IMAGE tool', () => {
    it('should have correct schema', () => {
      const tool = GeminiImageConnectorConfig.tools.GENERATE_IMAGE;
      expect(tool?.name).toBe('gemini_generate_image');
      expect(tool?.description).toContain('Generate images using Google Gemini AI');
      
      const schema = tool?.schema;
      expect(schema).toBeDefined();
    });
  });

  describe('EDIT_IMAGE tool', () => {
    it('should have correct schema', () => {
      const tool = GeminiImageConnectorConfig.tools.EDIT_IMAGE;
      expect(tool?.name).toBe('gemini_edit_image');
      expect(tool?.description).toContain('Edit images using text prompts');
      
      const schema = tool?.schema;
      expect(schema).toBeDefined();
    });
  });

  describe('ANALYZE_IMAGE tool', () => {
    it('should have correct schema', () => {
      const tool = GeminiImageConnectorConfig.tools.ANALYZE_IMAGE;
      expect(tool?.name).toBe('gemini_analyze_image');
      expect(tool?.description).toContain('Analyze images using text prompts');
      
      const schema = tool?.schema;
      expect(schema).toBeDefined();
    });
  });

  describe('LIST_MODELS tool', () => {
    it('should have correct schema', () => {
      const tool = GeminiImageConnectorConfig.tools.LIST_MODELS;
      expect(tool?.name).toBe('gemini_list_models');
      expect(tool?.description).toContain('List available Gemini models');
      
      const schema = tool?.schema;
      expect(schema).toBeDefined();
    });
  });
});
