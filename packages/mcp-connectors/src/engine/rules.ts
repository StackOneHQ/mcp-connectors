import type { 
  Finding, 
  Category, 
  Severity, 
  Confidence, 
  Locale, 
  Tone,
  BrandStyle 
} from '../../types/cultural-adaptation';
import { getLocaleMetadata, requiresFormalLanguage } from './locale';

// Cultural adaptation rules and heuristics
export interface CulturalRule {
  id: string;
  category: Category;
  pattern: RegExp | string;
  severity: Severity;
  confidence: Confidence;
  description: string;
  suggestions: Record<Locale, string[]>;
  rationale: Record<Locale, string>;
  metadata?: Record<string, any>;
}

// English idioms and metaphors that may not translate well
const IDIOM_RULES: CulturalRule[] = [
  {
    id: 'idiom.break-a-leg',
    category: 'idiom',
    pattern: /\bbreak\s+a\s+leg\b/i,
    severity: 'warning',
    confidence: 'high',
    description: 'Theater idiom meaning "good luck"',
    suggestions: {
      'de-DE': ['Viel Erfolg!', 'Viel Glück!'],
      'ru-RU': ['Удачи!', 'Успехов!'],
      'zh-CN': ['祝你好运！', '祝你成功！'],
      'es-ES': ['¡Buena suerte!', '¡Que tengas éxito!'],
      'fr-FR': ['Bonne chance!', 'Bonne réussite!'],
      'ja-JP': ['頑張って！', '成功を祈っています！'],
      'ko-KR': ['행운을 빕니다!', '성공하세요!'],
      'en-GB': ['Good luck!', 'Best of luck!'],
      'en-US': ['Good luck!', 'Best of luck!']
    },
    rationale: {
      'de-DE': 'Idioms often fail to translate; literal meaning is confusing in German.',
      'ru-RU': 'Idioms often fail to translate; literal meaning is confusing in Russian.',
      'zh-CN': 'Idioms often fail to translate; literal meaning is confusing in Chinese.',
      'es-ES': 'Idioms often fail to translate; literal meaning is confusing in Spanish.',
      'fr-FR': 'Idioms often fail to translate; literal meaning is confusing in French.',
      'ja-JP': 'Idioms often fail to translate; literal meaning is confusing in Japanese.',
      'ko-KR': 'Idioms often fail to translate; literal meaning is confusing in Korean.',
      'en-GB': 'Idiom is understood but may be too casual for formal contexts.',
      'en-US': 'Idiom is understood but may be too casual for formal contexts.'
    }
  },
  {
    id: 'idiom.silver-bullet',
    category: 'idiom',
    pattern: /\bsilver\s+bullet\b/i,
    severity: 'warning',
    confidence: 'high',
    description: 'Metaphor for a simple solution to a complex problem',
    suggestions: {
      'de-DE': ['einfache Lösung', 'Wundermittel'],
      'ru-RU': ['простое решение', 'панацея'],
      'zh-CN': ['简单解决方案', '万能药'],
      'es-ES': ['solución simple', 'remedio milagroso'],
      'fr-FR': ['solution simple', 'remède miracle'],
      'ja-JP': ['簡単な解決策', '万能薬'],
      'ko-KR': ['간단한 해결책', '만능약'],
      'en-GB': ['simple solution', 'miracle cure'],
      'en-US': ['simple solution', 'miracle cure']
    },
    rationale: {
      'de-DE': 'Metaphor may not be understood; suggest literal alternatives.',
      'ru-RU': 'Metaphor may not be understood; suggest literal alternatives.',
      'zh-CN': 'Metaphor may not be understood; suggest literal alternatives.',
      'es-ES': 'Metaphor may not be understood; suggest literal alternatives.',
      'fr-FR': 'Metaphor may not be understood; suggest literal alternatives.',
      'ja-JP': 'Metaphor may not be understood; suggest literal alternatives.',
      'ko-KR': 'Metaphor may not be understood; suggest literal alternatives.',
      'en-GB': 'Metaphor is understood but may be too casual for formal contexts.',
      'en-US': 'Metaphor is understood but may be too casual for formal contexts.'
    }
  },
  {
    id: 'idiom.ballpark',
    category: 'idiom',
    pattern: /\b(ballpark|in\s+the\s+ballpark)\b/i,
    severity: 'warning',
    confidence: 'high',
    description: 'Baseball metaphor for approximate estimate',
    suggestions: {
      'de-DE': ['ungefähre Schätzung', 'grobe Schätzung'],
      'ru-RU': ['примерная оценка', 'грубая оценка'],
      'zh-CN': ['大致估计', '粗略估计'],
      'es-ES': ['estimación aproximada', 'estimación aproximada'],
      'fr-FR': ['estimation approximative', 'estimation approximative'],
      'ja-JP': ['大まかな見積もり', '概算'],
      'ko-KR': ['대략적인 추정', '대략적인 추정'],
      'en-GB': ['rough estimate', 'approximate figure'],
      'en-US': ['rough estimate', 'approximate figure']
    },
    rationale: {
      'de-DE': 'Baseball metaphor is US-specific; low familiarity in Germany.',
      'ru-RU': 'Baseball metaphor is US-specific; low familiarity in Russia.',
      'zh-CN': 'Baseball metaphor is US-specific; low familiarity in China.',
      'es-ES': 'Baseball metaphor is US-specific; low familiarity in Spain.',
      'fr-FR': 'Baseball metaphor is US-specific; low familiarity in France.',
      'ja-JP': 'Baseball metaphor is US-specific; low familiarity in Japan.',
      'ko-KR': 'Baseball metaphor is US-specific; low familiarity in Korea.',
      'en-GB': 'Baseball metaphor is US-specific; cricket would be more familiar.',
      'en-US': 'Baseball metaphor is understood but may be too casual for formal contexts.'
    }
  },
  {
    id: 'idiom.home-run',
    category: 'idiom',
    pattern: /\b(home\s+run|hit\s+a\s+home\s+run)\b/i,
    severity: 'warning',
    confidence: 'high',
    description: 'Baseball metaphor for great success',
    suggestions: {
      'de-DE': ['großer Erfolg', 'Volltreffer'],
      'ru-RU': ['большой успех', 'полный успех'],
      'zh-CN': ['巨大成功', '完全成功'],
      'es-ES': ['gran éxito', 'éxito total'],
      'fr-FR': ['grand succès', 'succès total'],
      'ja-JP': ['大成功', '完全な成功'],
      'ko-KR': ['큰 성공', '완전한 성공'],
      'en-GB': ['great success', 'complete success'],
      'en-US': ['great success', 'complete success']
    },
    rationale: {
      'de-DE': 'Baseball metaphor is US-specific; low familiarity in Germany.',
      'ru-RU': 'Baseball metaphor is US-specific; low familiarity in Russia.',
      'zh-CN': 'Baseball metaphor is US-specific; low familiarity in China.',
      'es-ES': 'Baseball metaphor is US-specific; low familiarity in Spain.',
      'fr-FR': 'Baseball metaphor is US-specific; low familiarity in France.',
      'ja-JP': 'Baseball metaphor is US-specific; low familiarity in Japan.',
      'ko-KR': 'Baseball metaphor is US-specific; low familiarity in Korea.',
      'en-GB': 'Baseball metaphor is US-specific; cricket would be more familiar.',
      'en-US': 'Baseball metaphor is understood but may be too casual for formal contexts.'
    }
  },
  {
    id: 'idiom.touch-base',
    category: 'idiom',
    pattern: /\btouch\s+base\b/i,
    severity: 'warning',
    confidence: 'high',
    description: 'Baseball metaphor for making contact',
    suggestions: {
      'de-DE': ['Kontakt aufnehmen', 'sich melden'],
      'ru-RU': ['связаться', 'написать'],
      'zh-CN': ['联系', '沟通'],
      'es-ES': ['ponerse en contacto', 'contactar'],
      'fr-FR': ['prendre contact', 'contacter'],
      'ja-JP': ['連絡を取る', '連絡する'],
      'ko-KR': ['연락하다', '연락하다'],
      'en-GB': ['make contact', 'get in touch'],
      'en-US': ['make contact', 'get in touch']
    },
    rationale: {
      'de-DE': 'Baseball metaphor is US-specific; low familiarity in Germany.',
      'ru-RU': 'Baseball metaphor is US-specific; low familiarity in Russia.',
      'zh-CN': 'Baseball metaphor is US-specific; low familiarity in China.',
      'es-ES': 'Baseball metaphor is US-specific; low familiarity in Spain.',
      'fr-FR': 'Baseball metaphor is US-specific; low familiarity in France.',
      'ja-JP': 'Baseball metaphor is US-specific; low familiarity in Japan.',
      'ko-KR': 'Baseball metaphor is US-specific; low familiarity in Korea.',
      'en-GB': 'Baseball metaphor is US-specific; cricket would be more familiar.',
      'en-US': 'Baseball metaphor is understood but may be too casual for formal contexts.'
    }
  },
  {
    id: 'idiom.piece-of-cake',
    category: 'idiom',
    pattern: /\bpiece\s+of\s+cake\b/i,
    severity: 'warning',
    confidence: 'high',
    description: 'Idiom meaning something is very easy',
    suggestions: {
      'de-DE': ['sehr einfach', 'kinderleicht'],
      'ru-RU': ['очень просто', 'проще простого'],
      'zh-CN': ['非常简单', '轻而易举'],
      'es-ES': ['muy fácil', 'pan comido'],
      'fr-FR': ['très facile', 'du gâteau'],
      'ja-JP': ['とても簡単', '朝飯前'],
      'ko-KR': ['매우 간단', '식은 죽 먹기'],
      'en-GB': ['very easy', 'simple'],
      'en-US': ['very easy', 'simple']
    },
    rationale: {
      'de-DE': 'Idiom may not be understood; suggest literal alternatives.',
      'ru-RU': 'Idiom may not be understood; suggest literal alternatives.',
      'zh-CN': 'Idiom may not be understood; suggest literal alternatives.',
      'es-ES': 'Idiom may not be understood; suggest literal alternatives.',
      'fr-FR': 'Idiom may not be understood; suggest literal alternatives.',
      'ja-JP': 'Idiom may not be understood; suggest literal alternatives.',
      'ko-KR': 'Idiom may not be understood; suggest literal alternatives.',
      'en-GB': 'Idiom is understood but may be too casual for formal contexts.',
      'en-US': 'Idiom is understood but may be too casual for formal contexts.'
    }
  },
  {
    id: 'idiom.hit-ground-running',
    category: 'idiom',
    pattern: /\bhit\s+the\s+ground\s+running\b/i,
    severity: 'warning',
    confidence: 'high',
    description: 'Idiom meaning to start something quickly and energetically',
    suggestions: {
      'de-DE': ['sofort loslegen', 'energisch starten'],
      'ru-RU': ['сразу начать', 'энергично стартовать'],
      'zh-CN': ['立即开始', '快速启动'],
      'es-ES': ['empezar inmediatamente', 'comenzar con energía'],
      'fr-FR': ['commencer immédiatement', 'démarrer avec énergie'],
      'ja-JP': ['すぐに始める', 'エネルギッシュにスタート'],
      'ko-KR': ['즉시 시작하다', '에너지 넘치게 시작하다'],
      'en-GB': ['start immediately', 'begin energetically'],
      'en-US': ['start immediately', 'begin energetically']
    },
    rationale: {
      'de-DE': 'Idiom may not be understood; suggest literal alternatives.',
      'ru-RU': 'Idiom may not be understood; suggest literal alternatives.',
      'zh-CN': 'Idiom may not be understood; suggest literal alternatives.',
      'es-ES': 'Idiom may not be understood; suggest literal alternatives.',
      'fr-FR': 'Idiom may not be understood; suggest literal alternatives.',
      'ja-JP': 'Idiom may not be understood; suggest literal alternatives.',
      'ko-KR': 'Idiom may not be understood; suggest literal alternatives.',
      'en-GB': 'Idiom is understood but may be too casual for formal contexts.',
      'en-US': 'Idiom is understood but may be too casual for formal contexts.'
    }
  },
  {
    id: 'idiom.low-hanging-fruit',
    category: 'idiom',
    pattern: /\blow\s+hanging\s+fruit\b/i,
    severity: 'warning',
    confidence: 'high',
    description: 'Metaphor for easy-to-achieve goals',
    suggestions: {
      'de-DE': ['einfach zu erreichende Ziele', 'naheliegende Erfolge'],
      'ru-RU': ['легко достижимые цели', 'близкие успехи'],
      'zh-CN': ['容易实现的目标', '唾手可得的成果'],
      'es-ES': ['objetivos fáciles de alcanzar', 'éxitos cercanos'],
      'fr-FR': ['objectifs faciles à atteindre', 'succès proches'],
      'ja-JP': ['達成しやすい目標', '手近な成功'],
      'ko-KR': ['달성하기 쉬운 목표', '가까운 성공'],
      'en-GB': ['easy-to-achieve goals', 'low-effort wins'],
      'en-US': ['easy-to-achieve goals', 'low-effort wins']
    },
    rationale: {
      'de-DE': 'Metaphor may not be understood; suggest literal alternatives.',
      'ru-RU': 'Metaphor may not be understood; suggest literal alternatives.',
      'zh-CN': 'Metaphor may not be understood; suggest literal alternatives.',
      'es-ES': 'Metaphor may not be understood; suggest literal alternatives.',
      'fr-FR': 'Metaphor may not be understood; suggest literal alternatives.',
      'ja-JP': 'Metaphor may not be understood; suggest literal alternatives.',
      'ko-KR': 'Metaphor may not be understood; suggest literal alternatives.',
      'en-GB': 'Metaphor is understood but may be too casual for formal contexts.',
      'en-US': 'Metaphor is understood but may be too casual for formal contexts.'
    }
  }
];

// Culture-specific references
const CULTURE_REFERENCE_RULES: CulturalRule[] = [
  {
    id: 'culture.black-friday',
    category: 'culture_reference',
    pattern: /\bblack\s+friday\b/i,
    severity: 'info',
    confidence: 'high',
    description: 'US shopping holiday reference',
    suggestions: {
      'de-DE': ['große Saison-Angebote', 'große Verkaufsaktion'],
      'ru-RU': ['большие сезонные скидки', 'большая распродажа'],
      'zh-CN': ['大型季节性促销', '大型促销活动'],
      'es-ES': ['grandes ofertas de temporada', 'gran rebaja'],
      'fr-FR': ['grandes offres de saison', 'grande vente'],
      'ja-JP': ['大型シーズンセール', '大型セール'],
      'ko-KR': ['대형 시즌 세일', '대형 세일'],
      'en-GB': ['big seasonal sale', 'major sale event'],
      'en-US': ['Black Friday deals', 'holiday sale']
    },
    rationale: {
      'de-DE': 'Black Friday is not widely recognized in Germany; suggest neutral alternatives.',
      'ru-RU': 'Black Friday is not widely recognized in Russia; suggest neutral alternatives.',
      'zh-CN': 'Black Friday is not widely recognized in China; suggest neutral alternatives.',
      'es-ES': 'Black Friday is not widely recognized in Spain; suggest neutral alternatives.',
      'fr-FR': 'Black Friday is not widely recognized in France; suggest neutral alternatives.',
      'ja-JP': 'Black Friday is not widely recognized in Japan; suggest neutral alternatives.',
      'ko-KR': 'Black Friday is not widely recognized in Korea; suggest neutral alternatives.',
      'en-GB': 'Black Friday is US-specific; suggest more general terms.',
      'en-US': 'Black Friday is widely recognized in the US.'
    }
  },
  {
    id: 'culture.thanksgiving',
    category: 'culture_reference',
    pattern: /\bthanksgiving\b/i,
    severity: 'info',
    confidence: 'high',
    description: 'US holiday reference',
    suggestions: {
      'de-DE': ['Erntedankfest', 'Familienfest'],
      'ru-RU': ['День благодарения', 'семейный праздник'],
      'zh-CN': ['感恩节', '家庭节日'],
      'es-ES': ['Día de Acción de Gracias', 'fiesta familiar'],
      'fr-FR': ['Action de grâce', 'fête familiale'],
      'ja-JP': ['感謝祭', '家族の祝日'],
      'ko-KR': ['추수감사절', '가족의 명절'],
      'en-GB': ['harvest festival', 'family celebration'],
      'en-US': ['Thanksgiving', 'family holiday']
    },
    rationale: {
      'de-DE': 'Thanksgiving is US-specific; suggest local alternatives.',
      'ru-RU': 'Thanksgiving is US-specific; suggest local alternatives.',
      'zh-CN': 'Thanksgiving is US-specific; suggest local alternatives.',
      'es-ES': 'Thanksgiving is US-specific; suggest local alternatives.',
      'fr-FR': 'Thanksgiving is US-specific; suggest local alternatives.',
      'ja-JP': 'Thanksgiving is US-specific; suggest local alternatives.',
      'ko-KR': 'Thanksgiving is US-specific; suggest local alternatives.',
      'en-GB': 'Thanksgiving is US-specific; suggest local alternatives.',
      'en-US': 'Thanksgiving is widely recognized in the US.'
    }
  }
];

// Slang and informal language
const SLANG_RULES: CulturalRule[] = [
  {
    id: 'slang.grab-it',
    category: 'slang',
    pattern: /\bgrab\s+it\b/i,
    severity: 'warning',
    confidence: 'high',
    description: 'Informal language for "take it" or "get it"',
    suggestions: {
      'de-DE': ['nehmen Sie es', 'holen Sie es'],
      'ru-RU': ['возьмите это', 'получите это'],
      'zh-CN': ['拿走吧', '得到它'],
      'es-ES': ['tómelo', 'obténgalo'],
      'fr-FR': ['prenez-le', 'obtenez-le'],
      'ja-JP': ['お取りください', 'お受け取りください'],
      'ko-KR': ['가져가세요', '받으세요'],
      'en-GB': ['take it', 'get it'],
      'en-US': ['take it', 'get it']
    },
    rationale: {
      'de-DE': 'Too casual for German UI; consider formal alternatives.',
      'ru-RU': 'Too casual for Russian UI; consider formal alternatives.',
      'zh-CN': 'Too casual for Chinese UI; consider formal alternatives.',
      'es-ES': 'Too casual for Spanish UI; consider formal alternatives.',
      'fr-FR': 'Too casual for French UI; consider formal alternatives.',
      'ja-JP': 'Too casual for Japanese UI; consider formal alternatives.',
      'ko-KR': 'Too casual for Korean UI; consider formal alternatives.',
      'en-GB': 'Too casual for formal contexts; consider alternatives.',
      'en-US': 'Too casual for formal contexts; consider alternatives.'
    }
  },
  {
    id: 'slang.hey',
    category: 'slang',
    pattern: /\bhey\b/i,
    severity: 'warning',
    confidence: 'medium',
    description: 'Informal greeting',
    suggestions: {
      'de-DE': ['Hallo', 'Guten Tag'],
      'ru-RU': ['Привет', 'Здравствуйте'],
      'zh-CN': ['你好', '您好'],
      'es-ES': ['Hola', 'Buenos días'],
      'fr-FR': ['Bonjour', 'Salut'],
      'ja-JP': ['こんにちは', 'こんにちは'],
      'ko-KR': ['안녕하세요', '안녕하세요'],
      'en-GB': ['Hello', 'Hi there'],
      'en-US': ['Hello', 'Hi there']
    },
    rationale: {
      'de-DE': 'Too casual for German UI; consider formal alternatives.',
      'ru-RU': 'Too casual for Russian UI; consider formal alternatives.',
      'zh-CN': 'Too casual for Chinese UI; consider formal alternatives.',
      'es-ES': 'Too casual for Spanish UI; consider formal alternatives.',
      'fr-FR': 'Too casual for French UI; consider formal alternatives.',
      'ja-JP': 'Too casual for Japanese UI; consider formal alternatives.',
      'ko-KR': 'Too casual for Korean UI; consider formal alternatives.',
      'en-GB': 'Too casual for formal contexts; consider alternatives.',
      'en-US': 'Too casual for formal contexts; consider alternatives.'
    }
  }
];

// Emoji and symbol rules
const EMOJI_RULES: CulturalRule[] = [
  {
    id: 'emoji.prayer-hands',
    category: 'emoji_symbol',
    pattern: '🙏',
    severity: 'info',
    confidence: 'medium',
    description: 'Prayer hands emoji - meaning varies by culture',
    suggestions: {
      'de-DE': ['bitte', 'danke'],
      'ru-RU': ['пожалуйста', 'спасибо'],
      'zh-CN': ['请', '谢谢'],
      'es-ES': ['por favor', 'gracias'],
      'fr-FR': ['s\'il vous plaît', 'merci'],
      'ja-JP': ['お願いします', 'ありがとうございます'],
      'ko-KR': ['부탁드립니다', '감사합니다'],
      'en-GB': ['please', 'thank you'],
      'en-US': ['please', 'thank you']
    },
    rationale: {
      'de-DE': 'Emoji meaning may vary; consider explicit text.',
      'ru-RU': 'Emoji meaning may vary; consider explicit text.',
      'zh-CN': 'Emoji meaning may vary; consider explicit text.',
      'es-ES': 'Emoji meaning may vary; consider explicit text.',
      'fr-FR': 'Emoji meaning may vary; consider explicit text.',
      'ja-JP': 'Emoji meaning may vary; consider explicit text.',
      'ko-KR': 'Emoji meaning may vary; consider explicit text.',
      'en-GB': 'Emoji meaning may vary; consider explicit text.',
      'en-US': 'Emoji meaning may vary; consider explicit text.'
    }
  }
];

// Formality rules
const FORMALITY_RULES: CulturalRule[] = [
  {
    id: 'formality.german-casual',
    category: 'formality',
    pattern: /\b(hey|hi|klick|mal)\b/i,
    severity: 'error',
    confidence: 'high',
    description: 'Too casual for German UI',
    suggestions: {
      'de-DE': ['Bitte klicken Sie hier', 'Klicken Sie bitte hier'],
      'ru-RU': ['Пожалуйста, нажмите здесь', 'Нажмите, пожалуйста, здесь'],
      'zh-CN': ['请点击这里', '请点击这里'],
      'es-ES': ['Por favor, haga clic aquí', 'Haga clic, por favor, aquí'],
      'fr-FR': ['Veuillez cliquer ici', 'Cliquez, s\'il vous plaît, ici'],
      'ja-JP': ['ここをクリックしてください', 'ここをクリックしてください'],
      'ko-KR': ['여기를 클릭해 주세요', '여기를 클릭해 주세요'],
      'en-GB': ['Please click here', 'Click here, please'],
      'en-US': ['Please click here', 'Click here, please']
    },
    rationale: {
      'de-DE': 'Too casual for default German UI; consider Sie-Form.',
      'ru-RU': 'Too casual for default Russian UI; consider formal alternatives.',
      'zh-CN': 'Too casual for default Chinese UI; consider formal alternatives.',
      'es-ES': 'Too casual for default Spanish UI; consider formal alternatives.',
      'fr-FR': 'Too casual for default French UI; consider formal alternatives.',
      'ja-JP': 'Too casual for default Japanese UI; consider formal alternatives.',
      'ko-KR': 'Too casual for default Korean UI; consider formal alternatives.',
      'en-GB': 'Too casual for formal contexts; consider alternatives.',
      'en-US': 'Too casual for formal contexts; consider alternatives.'
    }
  }
];

// Combine all rules
export const ALL_RULES: CulturalRule[] = [
  ...IDIOM_RULES,
  ...CULTURE_REFERENCE_RULES,
  ...SLANG_RULES,
  ...EMOJI_RULES,
  ...FORMALITY_RULES
];

/**
 * Apply all cultural adaptation rules to a text
 */
export function applyRules(
  text: string, 
  targetLocale: Locale, 
  tone: Tone = 'neutral',
  brandStyle?: BrandStyle
): Finding[] {
  const findings: Finding[] = [];
  const localeMeta = getLocaleMetadata(targetLocale);
  
  // Apply idiom and metaphor rules
  for (const rule of IDIOM_RULES) {
    const matches = text.match(rule.pattern);
    if (matches) {
      findings.push({
        category: rule.category,
        ruleId: rule.id,
        severity: rule.severity,
        confidence: rule.confidence,
        snippet: matches[0],
        rationale: rule.rationale[targetLocale] || rule.rationale['en-US'],
        suggestions: rule.suggestions[targetLocale] || rule.suggestions['en-US'],
        notes: [rule.description]
      });
    }
  }
  
  // Apply culture reference rules
  for (const rule of CULTURE_REFERENCE_RULES) {
    const matches = text.match(rule.pattern);
    if (matches) {
      findings.push({
        category: rule.category,
        ruleId: rule.id,
        severity: rule.severity,
        confidence: rule.confidence,
        snippet: matches[0],
        rationale: rule.rationale[targetLocale] || rule.rationale['en-US'],
        suggestions: rule.suggestions[targetLocale] || rule.suggestions['en-US'],
        notes: [rule.description]
      });
    }
  }
  
  // Apply slang rules
  for (const rule of SLANG_RULES) {
    const matches = text.match(rule.pattern);
    if (matches) {
      findings.push({
        category: rule.category,
        ruleId: rule.id,
        severity: rule.severity,
        confidence: rule.confidence,
        snippet: matches[0],
        rationale: rule.rationale[targetLocale] || rule.rationale['en-US'],
        suggestions: rule.suggestions[targetLocale] || rule.suggestions['en-US'],
        notes: [rule.description]
      });
    }
  }
  
  // Apply emoji rules
  for (const rule of EMOJI_RULES) {
    if (text.includes(rule.pattern as string)) {
      findings.push({
        category: rule.category,
        ruleId: rule.id,
        severity: rule.severity,
        confidence: rule.confidence,
        snippet: rule.pattern as string,
        rationale: rule.rationale[targetLocale] || rule.rationale['en-US'],
        suggestions: rule.suggestions[targetLocale] || rule.suggestions['en-US'],
        notes: [rule.description]
      });
    }
  }
  
  // Apply formality rules
  if (requiresFormalLanguage(targetLocale) && tone !== 'friendly') {
    for (const rule of FORMALITY_RULES) {
      const matches = text.match(rule.pattern);
      if (matches) {
        findings.push({
          category: rule.category,
          ruleId: rule.id,
          severity: rule.severity,
          confidence: rule.confidence,
          snippet: matches[0],
          rationale: rule.rationale[targetLocale] || rule.rationale['en-US'],
          suggestions: rule.suggestions[targetLocale] || rule.suggestions['en-US'],
          notes: [rule.description, `Target locale requires formal language`]
        });
      }
    }
  }
  
  // Check for length expansion risk
  if (localeMeta.expansionRisk.estimatedExpansion > 0) {
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 3) { // Only warn for longer texts
      findings.push({
        category: 'length_risk',
        ruleId: 'length.expansion-risk',
        severity: 'info',
        confidence: 'medium',
        snippet: text,
        rationale: `Text may expand by ${localeMeta.expansionRisk.estimatedExpansion}% when translated to ${localeMeta.name}`,
        suggestions: ['Consider shorter alternatives', 'Plan for text expansion'],
        notes: localeMeta.expansionRisk.densityNotes
      });
    }
  }
  
  return findings;
}

/**
 * Get a rule explanation by ID
 */
export function getRuleExplanation(ruleId: string): CulturalRule | null {
  return ALL_RULES.find(rule => rule.id === ruleId) || null;
}

/**
 * Get rules by category
 */
export function getRulesByCategory(category: Category): CulturalRule[] {
  return ALL_RULES.filter(rule => rule.category === category);
}

/**
 * Get rules by severity
 */
export function getRulesBySeverity(severity: Severity): CulturalRule[] {
  return ALL_RULES.filter(rule => rule.severity === severity);
}
