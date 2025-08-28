import type { LocaleMetadata, Locale, Tone } from '../../types/cultural-adaptation';

// Locale metadata for cultural adaptation analysis
export const LOCALE_METADATA: Record<Locale, LocaleMetadata> = {
  'en-GB': {
    locale: 'en-GB',
    name: 'British English',
    nativeName: 'British English',
    formality: {
      default: 'neutral',
      requiresFormal: false,
      formalPronouns: ['you', 'one'],
      informalPronouns: ['you', 'mate', 'pal']
    },
    formatting: {
      dateFormat: 'DD/MM/YYYY',
      decimalSeparator: '.',
      thousandsSeparator: ',',
      currencyFormat: '£X.XX',
      timeFormat: '24-hour'
    },
    culturalNotes: {
      colorSymbolism: {
        red: 'danger, stop, passion',
        green: 'go, safety, nature',
        blue: 'trust, calm, professional',
        white: 'purity, cleanliness, peace',
        black: 'mourning, elegance, power'
      },
      emojiContext: {
        '🙏': 'prayer, please, thank you',
        '👍': 'approval, good job',
        '👎': 'disapproval, bad',
        '✌️': 'peace, victory',
        '👌': 'okay, perfect'
      },
      taboos: ['religion', 'politics', 'gestures'],
      formalityTriggers: ['please', 'thank you', 'would you', 'could you']
    },
    expansionRisk: {
      estimatedExpansion: 0,
      highRiskElements: [],
      densityNotes: ['Standard Latin script density']
    }
  },

  'en-US': {
    locale: 'en-US',
    name: 'American English',
    nativeName: 'American English',
    formality: {
      default: 'neutral',
      requiresFormal: false,
      formalPronouns: ['you'],
      informalPronouns: ['you', 'dude', 'buddy']
    },
    formatting: {
      dateFormat: 'MM/DD/YYYY',
      decimalSeparator: '.',
      thousandsSeparator: ',',
      currencyFormat: '$X.XX',
      timeFormat: '12-hour'
    },
    culturalNotes: {
      colorSymbolism: {
        red: 'danger, stop, passion',
        green: 'go, safety, money',
        blue: 'trust, calm, professional',
        white: 'purity, cleanliness, peace',
        black: 'mourning, elegance, power'
      },
      emojiContext: {
        '🙏': 'prayer, please, thank you',
        '👍': 'approval, good job',
        '👎': 'disapproval, bad',
        '✌️': 'peace, victory',
        '👌': 'okay, perfect'
      },
      taboos: ['religion', 'politics', 'gestures'],
      formalityTriggers: ['please', 'thank you', 'would you', 'could you']
    },
    expansionRisk: {
      estimatedExpansion: 0,
      highRiskElements: [],
      densityNotes: ['Standard Latin script density']
    }
  },

  'de-DE': {
    locale: 'de-DE',
    name: 'German',
    nativeName: 'Deutsch',
    formality: {
      default: 'formal',
      requiresFormal: true,
      formalPronouns: ['Sie', 'Ihnen', 'Ihr'],
      informalPronouns: ['du', 'dir', 'dein']
    },
    formatting: {
      dateFormat: 'DD.MM.YYYY',
      decimalSeparator: ',',
      thousandsSeparator: '.',
      currencyFormat: 'X,XX €',
      timeFormat: '24-hour'
    },
    culturalNotes: {
      colorSymbolism: {
        red: 'danger, stop, love',
        green: 'go, safety, nature',
        blue: 'trust, calm, professional',
        white: 'purity, cleanliness, peace',
        black: 'mourning, elegance, power'
      },
      emojiContext: {
        '🙏': 'prayer, please, thank you',
        '👍': 'approval, good job',
        '👎': 'disapproval, bad',
        '✌️': 'peace, victory',
        '👌': 'okay, perfect'
      },
      taboos: ['Nazi references', 'religion', 'politics'],
      formalityTriggers: ['bitte', 'danke', 'könnten Sie', 'würden Sie']
    },
    expansionRisk: {
      estimatedExpansion: 25,
      highRiskElements: ['compound words', 'formal pronouns'],
      densityNotes: ['Higher density due to compound words']
    }
  },

  'ru-RU': {
    locale: 'ru-RU',
    name: 'Russian',
    nativeName: 'Русский',
    formality: {
      default: 'formal',
      requiresFormal: true,
      formalPronouns: ['вы', 'вам', 'ваш'],
      informalPronouns: ['ты', 'тебе', 'твой']
    },
    formatting: {
      dateFormat: 'DD.MM.YYYY',
      decimalSeparator: ',',
      thousandsSeparator: ' ',
      currencyFormat: 'X,XX ₽',
      timeFormat: '24-hour'
    },
    culturalNotes: {
      colorSymbolism: {
        red: 'beauty, love, communism',
        green: 'nature, hope, youth',
        blue: 'trust, calm, professional',
        white: 'purity, cleanliness, peace',
        black: 'mourning, elegance, power'
      },
      emojiContext: {
        '🙏': 'prayer, please, thank you',
        '👍': 'approval, good job',
        '👎': 'disapproval, bad',
        '✌️': 'peace, victory',
        '👌': 'okay, perfect'
      },
      taboos: ['politics', 'religion', 'gestures'],
      formalityTriggers: ['пожалуйста', 'спасибо', 'не могли бы вы']
    },
    expansionRisk: {
      estimatedExpansion: 30,
      highRiskElements: ['Cyrillic script', 'formal pronouns'],
      densityNotes: ['Cyrillic script has different density than Latin']
    }
  },

  'zh-CN': {
    locale: 'zh-CN',
    name: 'Chinese (Simplified)',
    nativeName: '简体中文',
    formality: {
      default: 'formal',
      requiresFormal: true,
      formalPronouns: ['您', '您们'],
      informalPronouns: ['你', '你们']
    },
    formatting: {
      dateFormat: 'YYYY年MM月DD日',
      decimalSeparator: '.',
      thousandsSeparator: ',',
      currencyFormat: '¥X.XX',
      timeFormat: '24-hour'
    },
    culturalNotes: {
      colorSymbolism: {
        red: 'luck, happiness, celebration',
        green: 'nature, growth, harmony',
        blue: 'trust, calm, professional',
        white: 'purity, cleanliness, peace',
        black: 'mourning, elegance, power'
      },
      emojiContext: {
        '🙏': 'prayer, please, thank you',
        '👍': 'approval, good job',
        '👎': 'disapproval, bad',
        '✌️': 'peace, victory',
        '👌': 'okay, perfect'
      },
      taboos: ['politics', 'religion', 'gestures', 'numbers'],
      formalityTriggers: ['请', '谢谢', '麻烦您', '劳驾']
    },
    expansionRisk: {
      estimatedExpansion: -20,
      highRiskElements: ['Hanzi characters', 'tone marks'],
      densityNotes: ['Hanzi characters are more compact than Latin script']
    }
  },

  'es-ES': {
    locale: 'es-ES',
    name: 'Spanish (Spain)',
    nativeName: 'Español',
    formality: {
      default: 'neutral',
      requiresFormal: false,
      formalPronouns: ['usted', 'ustedes'],
      informalPronouns: ['tú', 'vosotros']
    },
    formatting: {
      dateFormat: 'DD/MM/YYYY',
      decimalSeparator: ',',
      thousandsSeparator: '.',
      currencyFormat: 'X,XX €',
      timeFormat: '24-hour'
    },
    culturalNotes: {
      colorSymbolism: {
        red: 'passion, love, danger',
        green: 'nature, hope, youth',
        blue: 'trust, calm, professional',
        white: 'purity, cleanliness, peace',
        black: 'mourning, elegance, power'
      },
      emojiContext: {
        '🙏': 'prayer, please, thank you',
        '👍': 'approval, good job',
        '👎': 'disapproval, bad',
        '✌️': 'peace, victory',
        '👌': 'okay, perfect'
      },
      taboos: ['religion', 'politics', 'gestures'],
      formalityTriggers: ['por favor', 'gracias', '¿podría usted?']
    },
    expansionRisk: {
      estimatedExpansion: 15,
      highRiskElements: ['formal pronouns', 'polite expressions'],
      densityNotes: ['Standard Latin script density']
    }
  },

  'fr-FR': {
    locale: 'fr-FR',
    name: 'French',
    nativeName: 'Français',
    formality: {
      default: 'formal',
      requiresFormal: true,
      formalPronouns: ['vous', 'votre'],
      informalPronouns: ['tu', 'ton']
    },
    formatting: {
      dateFormat: 'DD/MM/YYYY',
      decimalSeparator: ',',
      thousandsSeparator: ' ',
      currencyFormat: 'X,XX €',
      timeFormat: '24-hour'
    },
    culturalNotes: {
      colorSymbolism: {
        red: 'passion, love, danger',
        green: 'nature, hope, youth',
        blue: 'trust, calm, professional',
        white: 'purity, cleanliness, peace',
        black: 'mourning, elegance, power'
      },
      emojiContext: {
        '🙏': 'prayer, please, thank you',
        '👍': 'approval, good job',
        '👎': 'disapproval, bad',
        '✌️': 'peace, victory',
        '👌': 'okay, perfect'
      },
      taboos: ['religion', 'politics', 'gestures'],
      formalityTriggers: ['s\'il vous plaît', 'merci', 'pourriez-vous']
    },
    expansionRisk: {
      estimatedExpansion: 20,
      highRiskElements: ['formal pronouns', 'polite expressions'],
      densityNotes: ['Standard Latin script density']
    }
  },

  'ja-JP': {
    locale: 'ja-JP',
    name: 'Japanese',
    nativeName: '日本語',
    formality: {
      default: 'formal',
      requiresFormal: true,
      formalPronouns: ['あなた', 'お客様', 'お客様方'],
      informalPronouns: ['きみ', 'おまえ']
    },
    formatting: {
      dateFormat: 'YYYY年MM月DD日',
      decimalSeparator: '.',
      thousandsSeparator: ',',
      currencyFormat: '¥X.XX',
      timeFormat: '24-hour'
    },
    culturalNotes: {
      colorSymbolism: {
        red: 'luck, happiness, celebration',
        green: 'nature, growth, harmony',
        blue: 'trust, calm, professional',
        white: 'purity, cleanliness, peace',
        black: 'mourning, elegance, power'
      },
      emojiContext: {
        '🙏': 'prayer, please, thank you',
        '👍': 'approval, good job',
        '👎': 'disapproval, bad',
        '✌️': 'peace, victory',
        '👌': 'okay, perfect'
      },
      taboos: ['politics', 'religion', 'gestures', 'numbers'],
      formalityTriggers: ['お願いします', 'ありがとうございます', 'お客様']
    },
    expansionRisk: {
      estimatedExpansion: -15,
      highRiskElements: ['Hiragana/Katakana', 'Kanji', 'honorifics'],
      densityNotes: ['Japanese script has different density than Latin']
    }
  },

  'ko-KR': {
    locale: 'ko-KR',
    name: 'Korean',
    nativeName: '한국어',
    formality: {
      default: 'formal',
      requiresFormal: true,
      formalPronouns: ['당신', '고객님', '손님'],
      informalPronouns: ['너', '네']
    },
    formatting: {
      dateFormat: 'YYYY년 MM월 DD일',
      decimalSeparator: '.',
      thousandsSeparator: ',',
      currencyFormat: '₩X.XX',
      timeFormat: '24-hour'
    },
    culturalNotes: {
      colorSymbolism: {
        red: 'luck, happiness, celebration',
        green: 'nature, growth, harmony',
        blue: 'trust, calm, professional',
        white: 'purity, cleanliness, peace',
        black: 'mourning, elegance, power'
      },
      emojiContext: {
        '🙏': 'prayer, please, thank you',
        '👍': 'approval, good job',
        '👎': 'disapproval, bad',
        '✌️': 'peace, victory',
        '👌': 'okay, perfect'
      },
      taboos: ['politics', 'religion', 'gestures', 'numbers'],
      formalityTriggers: ['부탁드립니다', '감사합니다', '고객님']
    },
    expansionRisk: {
      estimatedExpansion: -10,
      highRiskElements: ['Hangul script', 'honorifics'],
      densityNotes: ['Hangul script has different density than Latin']
    }
  }
};

/**
 * Get locale metadata for a specific locale
 */
export function getLocaleMetadata(locale: Locale): LocaleMetadata {
  return LOCALE_METADATA[locale];
}

/**
 * Check if a locale requires formal language by default
 */
export function requiresFormalLanguage(locale: Locale): boolean {
  return LOCALE_METADATA[locale].formality.requiresFormal;
}

/**
 * Get the default tone for a locale
 */
export function getDefaultTone(locale: Locale): Tone {
  return LOCALE_METADATA[locale].formality.default;
}

/**
 * Get estimated text expansion percentage for a locale
 */
export function getExpansionRisk(locale: Locale): number {
  return LOCALE_METADATA[locale].expansionRisk.estimatedExpansion;
}

/**
 * Get cultural notes for a locale
 */
export function getCulturalNotes(locale: Locale) {
  return LOCALE_METADATA[locale].culturalNotes;
}

/**
 * Get formatting rules for a locale
 */
export function getFormattingRules(locale: Locale) {
  return LOCALE_METADATA[locale].formatting;
}
