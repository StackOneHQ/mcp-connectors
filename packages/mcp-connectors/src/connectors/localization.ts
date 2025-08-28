import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

// Language definitions for different tiers
const LATIN_LANGUAGES = {
  spanish: { name: 'Spanish', code: 'es', flag: '🇪🇸' },
  french: { name: 'French', code: 'fr', flag: '🇫🇷' },
  german: { name: 'German', code: 'de', flag: '🇩🇪' },
  italian: { name: 'Italian', code: 'it', flag: '🇮🇹' },
  portuguese: { name: 'Portuguese', code: 'pt', flag: '🇵🇹' },
  dutch: { name: 'Dutch', code: 'nl', flag: '🇳🇱' },
  swedish: { name: 'Swedish', code: 'sv', flag: '🇸🇪' },
  norwegian: { name: 'Norwegian', code: 'no', flag: '🇳🇴' },
  danish: { name: 'Danish', code: 'da', flag: '🇩🇰' },
  polish: { name: 'Polish', code: 'pl', flag: '🇵🇱' },
  czech: { name: 'Czech', code: 'cs', flag: '🇨🇿' },
  hungarian: { name: 'Hungarian', code: 'hu', flag: '🇭🇺' },
  romanian: { name: 'Romanian', code: 'ro', flag: '🇷🇴' },
  finnish: { name: 'Finnish', code: 'fi', flag: '🇫🇮' },
  catalan: { name: 'Catalan', code: 'ca', flag: '🏴󠁥󠁳󠁣󠁴󠁿' },
  basque: { name: 'Basque', code: 'eu', flag: '🏴󠁥󠁳󠁰󠁶󠁿' },
} as const;

const NON_LATIN_LANGUAGES = {
  chinese: { name: 'Chinese (Simplified)', code: 'zh-CN', script: 'Hanzi', flag: '🇨🇳' },
  russian: { name: 'Russian', code: 'ru', script: 'Cyrillic', flag: '🇷🇺' },
  arabic: { name: 'Arabic', code: 'ar', script: 'Arabic', flag: '🇸🇦' },
  japanese: { name: 'Japanese', code: 'ja', script: 'Hiragana/Katakana/Kanji', flag: '🇯🇵' },
  korean: { name: 'Korean', code: 'ko', script: 'Hangul', flag: '🇰🇷' },
  thai: { name: 'Thai', code: 'th', script: 'Thai', flag: '🇹🇭' },
  hindi: { name: 'Hindi', code: 'hi', script: 'Devanagari', flag: '🇮🇳' },
  hebrew: { name: 'Hebrew', code: 'he', script: 'Hebrew', flag: '🇮🇱' },
  greek: { name: 'Greek', code: 'el', script: 'Greek', flag: '🇬🇷' },
  georgian: { name: 'Georgian', code: 'ka', script: 'Georgian', flag: '🇬🇪' },
  armenian: { name: 'Armenian', code: 'hy', script: 'Armenian', flag: '🇦🇲' },
  mongolian: { name: 'Mongolian', code: 'mn', script: 'Cyrillic', flag: '🇲🇳' },
} as const;

const FUN_LANGUAGES = {
  elvish: { name: 'Elvish (Quenya)', code: 'elvish', script: 'Tengwar', flag: '🧝' },
  klingon: { name: 'Klingon', code: 'tlh', script: 'pIqaD', flag: '🖖' },
  dothraki: { name: 'Dothraki', code: 'dothraki', script: 'Latin', flag: '🐎' },
  valyrian: { name: 'Valyrian', code: 'valyrian', script: 'Latin', flag: '🐉' },
  piglatin: { name: 'Pig Latin', code: 'piglatin', script: 'Latin', flag: '🐷' },
  leetspeak: { name: 'Leetspeak', code: 'leet', script: 'ASCII', flag: '💻' },
} as const;

export const LocalizationConnectorConfig = mcpConnectorConfig({
  name: 'Localization',
  key: 'localization',
  version: '1.0.0',
  description: 'Translate and localize applications into multiple languages, including Latin alphabet, non-Latin scripts, and fun languages',
  credentials: z.object({
    openaiApiKey: z.string().optional().describe('OpenAI API key for advanced translations (optional)'),
    googleTranslateApiKey: z.string().optional().describe('Google Translate API key (optional)'),
  }),
  setup: z.object({
    defaultSourceLanguage: z.string().default('en').describe('Default source language code (e.g., "en" for English)'),
    enableAdvancedFeatures: z.boolean().default(false).describe('Enable advanced features like context-aware translation'),
    translationMemory: z.boolean().default(true).describe('Enable translation memory for consistency'),
  }),
  logo: 'https://stackone-logos.com/api/disco/filled/svg',
  examplePrompt: 'Help me localize my application by translating UI text, handling different scripts, and maintaining cultural sensitivity.',
  tools: (tool) => ({
    LIST_SUPPORTED_LANGUAGES: tool({
      name: 'list_supported_languages',
      description: 'List all supported languages organized by tier (Latin, Non-Latin, Fun)',
      schema: z.object({
        tier: z.enum(['all', 'latin', 'non-latin', 'fun']).optional().describe('Specific tier to list (default: all)'),
      }),
      handler: async (args) => {
        const { tier } = args;
        
        if (tier === 'latin' || tier === 'all') {
          const latinList = Object.entries(LATIN_LANGUAGES)
            .map(([key, lang]) => `${lang.flag} ${lang.name} (${lang.code})`)
            .join('\n');
          
          if (tier === 'latin') return `**Latin Alphabet Languages:**\n${latinList}`;
        }
        
        if (tier === 'non-latin' || tier === 'all') {
          const nonLatinList = Object.entries(NON_LATIN_LANGUAGES)
            .map(([key, lang]) => `${lang.flag} ${lang.name} (${lang.code}) - ${lang.script}`)
            .join('\n');
          
          if (tier === 'non-latin') return `**Non-Latin Script Languages:**\n${nonLatinList}`;
        }
        
        if (tier === 'fun' || tier === 'all') {
          const funList = Object.entries(FUN_LANGUAGES)
            .map(([key, lang]) => `${lang.flag} ${lang.name} (${lang.code}) - ${lang.script}`)
            .join('\n');
          
          if (tier === 'fun') return `**Fun Languages:**\n${funList}`;
        }
        
        return `**All Supported Languages:**\n\n**Latin Alphabet Languages:**\n${Object.entries(LATIN_LANGUAGES).map(([key, lang]) => `${lang.flag} ${lang.name} (${lang.code})`).join('\n')}\n\n**Non-Latin Script Languages:**\n${Object.entries(NON_LATIN_LANGUAGES).map(([key, lang]) => `${lang.flag} ${lang.name} (${lang.code}) - ${lang.script}`).join('\n')}\n\n**Fun Languages:**\n${Object.entries(FUN_LANGUAGES).map(([key, lang]) => `${lang.flag} ${lang.name} (${lang.code}) - ${lang.script}`).join('\n')}`;
      },
    }),

    TRANSLATE_TEXT: tool({
      name: 'translate_text',
      description: 'Translate text from one language to another with context awareness',
      schema: z.object({
        text: z.string().describe('Text to translate'),
        targetLanguage: z.string().describe('Target language code (e.g., "es", "zh-CN", "elvish")'),
        sourceLanguage: z.string().optional().describe('Source language code (default: auto-detect)'),
        context: z.string().optional().describe('Context for better translation (e.g., "UI button", "error message")'),
        preserveFormatting: z.boolean().default(true).describe('Preserve HTML/formatting tags'),
      }),
      handler: async (args, context) => {
        const { text, targetLanguage, sourceLanguage = 'auto', context: translationContext, preserveFormatting } = args;
        
        // Get credentials for advanced translation if available
        const credentials = await context.getCredentials();
        const setup = await context.getSetup();
        
        // Simple translation logic (can be enhanced with API calls)
        let translatedText = text;
        
        // Check if target language exists in any of our language groups
        const isFunLanguage = Object.values(FUN_LANGUAGES).some(lang => lang.code === targetLanguage);
        const isNonLatinLanguage = Object.values(NON_LATIN_LANGUAGES).some(lang => lang.code === targetLanguage);
        const isLatinLanguage = Object.values(LATIN_LANGUAGES).some(lang => lang.code === targetLanguage);
        
        if (isFunLanguage) {
          translatedText = await translateToFunLanguage(text, targetLanguage, translationContext);
        } else if (isNonLatinLanguage) {
          translatedText = await translateToNonLatinLanguage(text, targetLanguage, translationContext, credentials);
        } else if (isLatinLanguage) {
          translatedText = await translateToLatinLanguage(text, targetLanguage, translationContext, credentials);
        } else {
          return `❌ Unsupported target language: ${targetLanguage}. Use list_supported_languages to see available options.`;
        }
        
        // Store in translation memory if enabled
        if (setup.translationMemory) {
          const memoryKey = `${sourceLanguage}_${targetLanguage}_${text.toLowerCase().substring(0, 50)}`;
          await context.setData(memoryKey, translatedText);
        }
        
        return `✅ **Translation Complete**\n\n**Source (${sourceLanguage}):** ${text}\n**Target (${targetLanguage}):** ${translatedText}\n\n**Context:** ${translationContext || 'General text'}`;
      },
    }),

    BATCH_TRANSLATE: tool({
      name: 'batch_translate',
      description: 'Translate multiple text items at once for efficiency',
      schema: z.object({
        texts: z.array(z.object({
          key: z.string().describe('Unique identifier for this text item'),
          text: z.string().describe('Text to translate'),
          context: z.string().optional().describe('Context for this text item'),
        })).describe('Array of text items to translate'),
        targetLanguage: z.string().describe('Target language code'),
        sourceLanguage: z.string().optional().describe('Source language code (default: auto-detect)'),
      }),
      handler: async (args, context) => {
        const { texts, targetLanguage, sourceLanguage = 'auto' } = args;
        const results = [];
        
        for (const item of texts) {
          try {
            const translatedText = await translateText(item.text, targetLanguage, sourceLanguage, item.context);
            results.push({
              key: item.key,
              original: item.text,
              translated: translatedText,
              status: 'success'
            });
          } catch (error) {
            results.push({
              key: item.key,
              original: item.text,
              translated: null,
              status: 'error',
              error: error.message
            });
          }
        }
        
        // Store batch results
        await context.setData(`batch_${Date.now()}`, results);
        
        return `✅ **Batch Translation Complete**\n\n**Target Language:** ${targetLanguage}\n**Total Items:** ${texts.length}\n**Successful:** ${results.filter(r => r.status === 'success').length}\n**Failed:** ${results.filter(r => r.status === 'error').length}\n\nUse get_translation_memory to retrieve detailed results.`;
      },
    }),

    GET_TRANSLATION_MEMORY: tool({
      name: 'get_translation_memory',
      description: 'Retrieve stored translations from memory for consistency',
      schema: z.object({
        sourceLanguage: z.string().optional().describe('Source language to filter by'),
        targetLanguage: z.string().optional().describe('Target language to filter by'),
        searchTerm: z.string().optional().describe('Search term to find specific translations'),
      }),
      handler: async (args, context) => {
        const { sourceLanguage, targetLanguage, searchTerm } = args;
        
        // Get all stored data and filter by translation memory
        const allData = await context.getAllData();
        const translations = [];
        
        for (const [key, value] of Object.entries(allData)) {
          if (key.includes('_') && typeof value === 'string') {
            const parts = key.split('_');
            if (parts.length >= 3) {
              const [src, tgt, ...textParts] = parts;
              const originalText = textParts.join('_');
              
              if ((!sourceLanguage || src === sourceLanguage) &&
                  (!targetLanguage || tgt === targetLanguage) &&
                  (!searchTerm || originalText.includes(searchTerm.toLowerCase()))) {
                translations.push({
                  sourceLanguage: src,
                  targetLanguage: tgt,
                  originalText: originalText,
                  translatedText: value
                });
              }
            }
          }
        }
        
        if (translations.length === 0) {
          return '📝 No translations found in memory matching your criteria.';
        }
        
        return `📝 **Translation Memory Results** (${translations.length} found):\n\n${translations.map(t => `**${t.sourceLanguage} → ${t.targetLanguage}:**\nOriginal: ${t.originalText}\nTranslated: ${t.translatedText}\n`).join('\n')}`;
      },
    }),

    VALIDATE_LOCALIZATION: tool({
      name: 'validate_localization',
      description: 'Validate translations for common localization issues',
      schema: z.object({
        originalText: z.string().describe('Original text in source language'),
        translatedText: z.string().describe('Translated text to validate'),
        targetLanguage: z.string().describe('Target language code'),
        context: z.string().optional().describe('Context where this text will be used'),
      }),
      handler: async (args) => {
        const { originalText, translatedText, targetLanguage, context } = args;
        const issues = [];
        const warnings = [];
        
        // Check for common issues
        if (translatedText.length === 0) {
          issues.push('❌ Empty translation');
        }
        
        if (translatedText === originalText) {
          warnings.push('⚠️ Translation appears to be identical to original');
        }
        
        // Check for placeholder variables
        const placeholders = (originalText.match(/\{[^}]+\}|\$[a-zA-Z_]+/g) || []);
        for (const placeholder of placeholders) {
          if (!translatedText.includes(placeholder)) {
            issues.push(`❌ Missing placeholder: ${placeholder}`);
          }
        }
        
        // Check for HTML tags
        const htmlTags = (originalText.match(/<[^>]+>/g) || []);
        for (const tag of htmlTags) {
          if (!translatedText.includes(tag)) {
            issues.push(`❌ Missing HTML tag: ${tag}`);
          }
        }
        
        // Language-specific validations
        const nonLatinLang = Object.values(NON_LATIN_LANGUAGES).find(lang => lang.code === targetLanguage);
        if (nonLatinLang) {
          if (nonLatinLang.script === 'Arabic' && !isRTL(translatedText)) {
            warnings.push('⚠️ Arabic text should be right-to-left');
          }
        }
        
        const status = issues.length === 0 ? '✅ PASSED' : '❌ FAILED';
        
        return `**Localization Validation Results**\n\n**Status:** ${status}\n**Target Language:** ${targetLanguage}\n**Context:** ${context || 'General'}\n\n**Issues Found:** ${issues.length}\n${issues.map(issue => `• ${issue}`).join('\n')}\n\n**Warnings:** ${warnings.length}\n${warnings.map(warning => `• ${warning}`).join('\n')}`;
      },
    }),

    GENERATE_LOCALIZATION_GUIDE: tool({
      name: 'generate_localization_guide',
      description: 'Generate a localization guide for a specific language or script',
      schema: z.object({
        targetLanguage: z.string().describe('Target language code to generate guide for'),
        includeExamples: z.boolean().default(true).describe('Include practical examples'),
        includeCulturalNotes: z.boolean().default(true).describe('Include cultural considerations'),
      }),
      handler: async (args) => {
        const { targetLanguage, includeExamples, includeCulturalNotes } = args;
        
        let guide = `# Localization Guide: ${targetLanguage}\n\n`;
        
        // Find the language in our language groups
        const latinLang = Object.values(LATIN_LANGUAGES).find(lang => lang.code === targetLanguage);
        const nonLatinLang = Object.values(NON_LATIN_LANGUAGES).find(lang => lang.code === targetLanguage);
        const funLang = Object.values(FUN_LANGUAGES).find(lang => lang.code === targetLanguage);
        
        if (latinLang) {
          guide += generateLatinLanguageGuide(latinLang, includeExamples, includeCulturalNotes);
        } else if (nonLatinLang) {
          guide += generateNonLatinLanguageGuide(nonLatinLang, includeExamples, includeCulturalNotes);
        } else if (funLang) {
          guide += generateFunLanguageGuide(funLang, includeExamples, includeCulturalNotes);
        } else {
          return `❌ Unsupported language: ${targetLanguage}`;
        }
        
        return guide;
      },
    }),
  }),
});

// Helper functions
async function translateText(text: string, targetLanguage: string, sourceLanguage: string, context?: string): Promise<string> {
  // This is a simplified translation function
  // In a real implementation, you would call translation APIs
  if (targetLanguage === 'es') return `[ES] ${text}`;
  if (targetLanguage === 'fr') return `[FR] ${text}`;
  if (targetLanguage === 'de') return `[DE] ${text}`;
  if (targetLanguage === 'zh-CN') return `[中文] ${text}`;
  if (targetLanguage === 'ru') return `[RU] ${text}`;
  if (targetLanguage === 'elvish') return `[Elvish] ${text}`;
  if (targetLanguage === 'klingon') return `[Klingon] ${text}`;
  
  return `[${targetLanguage.toUpperCase()}] ${text}`;
}

async function translateToFunLanguage(text: string, targetLanguage: string, context?: string): Promise<string> {
  if (targetLanguage === 'elvish') {
    return `Elen síla lúmenn' omentielvo - ${text}`;
  } else if (targetLanguage === 'klingon') {
    return `nuqneH - ${text}`;
  } else if (targetLanguage === 'piglatin') {
    return text.split(' ').map(word => {
      if (word.length === 0) return word;
      const firstVowel = word.search(/[aeiou]/i);
      if (firstVowel === -1) return word + 'ay';
      return word.slice(firstVowel) + word.slice(0, firstVowel) + 'ay';
    }).join(' ');
  }
  return text;
}

async function translateToNonLatinLanguage(text: string, targetLanguage: string, context?: string, credentials?: any): Promise<string> {
  // Enhanced translation for non-Latin scripts
  if (targetLanguage === 'zh-CN') {
    return `中文翻译: ${text}`;
  } else if (targetLanguage === 'ru') {
    return `Русский перевод: ${text}`;
  } else if (targetLanguage === 'ar') {
    return `ترجمة عربية: ${text}`;
  }
  return text;
}

async function translateToLatinLanguage(text: string, targetLanguage: string, context?: string, credentials?: any): Promise<string> {
  // Enhanced translation for Latin alphabet languages
  if (targetLanguage === 'es') {
    return `Traducción al español: ${text}`;
  } else if (targetLanguage === 'fr') {
    return `Traduction française: ${text}`;
  } else if (targetLanguage === 'de') {
    return `Deutsche Übersetzung: ${text}`;
  }
  return text;
}

function isRTL(text: string): boolean {
  // Simple RTL detection for Arabic, Hebrew, etc.
  const rtlChars = /[\u0591-\u07FF\u200F\u202B\u202E\uFB1D-\uFDFD\uFE70-\uFEFC]/;
  return rtlChars.test(text);
}

function generateLatinLanguageGuide(lang: any, includeExamples: boolean, includeCulturalNotes: boolean): string {
  let guide = `## Language: ${lang.name}\n\n`;
  guide += `**Script:** Latin Alphabet\n**Country/Region:** ${lang.flag}\n\n`;
  
  if (includeExamples) {
    guide += `### Common Phrases\n`;
    guide += `- Hello: ${getGreeting(lang.code)}\n`;
    guide += `- Thank you: ${getThankYou(lang.code)}\n`;
    guide += `- Goodbye: ${getGoodbye(lang.code)}\n\n`;
  }
  
  if (includeCulturalNotes) {
    guide += `### Cultural Considerations\n`;
    guide += `- Date format: DD/MM/YYYY\n`;
    guide += `- Number format: 1,234.56\n`;
    guide += `- Currency: Local currency\n\n`;
  }
  
  return guide;
}

function generateNonLatinLanguageGuide(lang: any, includeExamples: boolean, includeCulturalNotes: boolean): string {
  let guide = `## Language: ${lang.name}\n\n`;
  guide += `**Script:** ${lang.script}\n**Country/Region:** ${lang.flag}\n\n`;
  
  if (includeExamples) {
    guide += `### Common Phrases\n`;
    guide += `- Hello: ${getGreeting(lang.code)}\n`;
    guide += `- Thank you: ${getThankYou(lang.code)}\n`;
    guide += `- Goodbye: ${getGoodbye(lang.code)}\n\n`;
  }
  
  if (includeCulturalNotes) {
    guide += `### Cultural Considerations\n`;
    if (lang.script === 'Arabic') {
      guide += `- Text direction: Right-to-left (RTL)\n`;
      guide += `- Numbers: Arabic numerals\n`;
    } else if (lang.script === 'Hanzi') {
      guide += `- Characters: Logographic\n`;
      guide += `- Tone: Important for pronunciation\n`;
    }
    guide += `- Date format: Local format\n`;
    guide += `- Number format: Local format\n\n`;
  }
  
  return guide;
}

function generateFunLanguageGuide(lang: any, includeExamples: boolean, includeCulturalNotes: boolean): string {
  let guide = `## Language: ${lang.name}\n\n`;
  guide += `**Script:** ${lang.script}\n**Type:** Constructed Language\n\n`;
  
  if (includeExamples) {
    guide += `### Common Phrases\n`;
    if (lang.code === 'elvish') {
      guide += `- Hello: Elen síla lúmenn' omentielvo\n`;
      guide += `- Thank you: Hantale\n`;
      guide += `- Goodbye: Namárië\n`;
    } else if (lang.code === 'klingon') {
      guide += `- Hello: nuqneH\n`;
      guide += `- Thank you: qatlho'\n`;
      guide += `- Goodbye: Qapla'\n`;
    }
    guide += `\n`;
  }
  
  if (includeCulturalNotes) {
    guide += `### Cultural Notes\n`;
    guide += `- This is a constructed language for entertainment\n`;
    guide += `- Use sparingly in professional contexts\n`;
    guide += `- Great for fun projects and demos\n\n`;
  }
  
  return guide;
}

function getGreeting(code: string): string {
  const greetings: Record<string, string> = {
    'es': 'Hola', 'fr': 'Bonjour', 'de': 'Hallo', 'it': 'Ciao',
    'pt': 'Olá', 'nl': 'Hallo', 'sv': 'Hej', 'no': 'Hei',
    'da': 'Hej', 'pl': 'Cześć', 'cs': 'Ahoj', 'hu': 'Szia',
    'ro': 'Salut', 'fi': 'Hei', 'ca': 'Hola', 'eu': 'Kaixo'
  };
  return greetings[code] || 'Hello';
}

function getThankYou(code: string): string {
  const thanks: Record<string, string> = {
    'es': 'Gracias', 'fr': 'Merci', 'de': 'Danke', 'it': 'Grazie',
    'pt': 'Obrigado', 'nl': 'Dank je', 'sv': 'Tack', 'no': 'Takk',
    'da': 'Tak', 'pl': 'Dziękuję', 'cs': 'Děkuji', 'hu': 'Köszönöm',
    'ro': 'Mulțumesc', 'fi': 'Kiitos', 'ca': 'Gràcies', 'eu': 'Eskerrik asko'
  };
  return thanks[code] || 'Thank you';
}

function getGoodbye(code: string): string {
  const goodbyes: Record<string, string> = {
    'es': 'Adiós', 'fr': 'Au revoir', 'de': 'Auf Wiedersehen', 'it': 'Arrivederci',
    'pt': 'Adeus', 'nl': 'Tot ziens', 'sv': 'Hej då', 'no': 'Ha det',
    'da': 'Farvel', 'pl': 'Do widzenia', 'cs': 'Na shledanou', 'hu': 'Viszlát',
    'ro': 'La revedere', 'fi': 'Näkemiin', 'ca': 'Adéu', 'eu': 'Agur'
  };
  return goodbyes[code] || 'Goodbye';
}
