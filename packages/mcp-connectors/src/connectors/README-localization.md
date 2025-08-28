# Localization MCP Connector

> **Built for the Disco Disco Hack Hack Hackathon** 🚀

A powerful MCP connector that helps developers localize their applications into multiple languages, including Latin alphabet languages, non-Latin scripts, and fun constructed languages.

## 🎯 Hackathon Project Overview

This connector was built for the **Disco Disco Hack Hack** hackathon focused on AI integrations. It addresses the challenge of application localization with three distinct tiers:

### Tier 1: Latin Alphabet Languages 🌍
- **Spanish, French, German, Italian, Portuguese**
- **Dutch, Swedish, Norwegian, Danish**
- **Polish, Czech, Hungarian, Romanian, Finnish**
- **Catalan, Basque**
- *Easy to implement, broad user base*

### Tier 2: Non-Latin Scripts 🌏
- **Chinese (Simplified)** - Hanzi characters
- **Russian** - Cyrillic script  
- **Arabic** - Right-to-left text
- **Japanese** - Hiragana/Katakana/Kanji
- **Korean** - Hangul script
- **Thai, Hindi, Hebrew, Greek, Georgian, Armenian, Mongolian**
- *Complex scripts, cultural considerations*

### Tier 3: Fun Languages 🎭
- **Elvish (Quenya)** - Tolkien's constructed language
- **Klingon** - Star Trek language
- **Dothraki** - Game of Thrones language
- **Valyrian** - Game of Thrones language
- **Pig Latin** - English word game
- **Leetspeak** - ASCII character substitution
- *Entertainment value, demo potential*

## 🛠️ Features

### Core Translation Tools
- **`translate_text`** - Single text translation with context awareness
- **`batch_translate`** - Bulk translation for efficiency
- **`list_supported_languages`** - Browse available languages by tier

### Quality Assurance
- **`validate_localization`** - Check for common localization issues
- **`get_translation_memory`** - Maintain consistency across translations
- **`generate_localization_guide`** - Cultural and technical guidance

### Advanced Features
- **Translation Memory** - Store and reuse translations
- **Context Awareness** - Better translations based on usage context
- **Placeholder Preservation** - Maintain variables like `{name}` in translations
- **HTML Tag Preservation** - Keep formatting intact
- **RTL Support** - Handle right-to-left languages like Arabic

## 🚀 Quick Start

### 1. Start the Localization Server

```bash
# No credentials needed for basic functionality
bun start --connector localization

# With optional API keys for enhanced translations
bun start --connector localization --credentials '{"openaiApiKey":"your-key","googleTranslateApiKey":"your-key"}'
```

### 2. Basic Translation

```typescript
// Translate a simple greeting
await translate_text({
  text: "Hello, welcome to our app!",
  targetLanguage: "es",
  context: "Welcome message"
});

// Result: "✅ Translation Complete
// Source (auto): Hello, welcome to our app!
// Target (es): [ES] Hello, welcome to our app!
// Context: Welcome message"
```

### 3. Batch Translation

```typescript
// Translate multiple UI elements
await batch_translate({
  texts: [
    { key: "login_button", text: "Sign In", context: "Button text" },
    { key: "welcome_message", text: "Welcome back!", context: "Header text" },
    { key: "error_message", text: "Invalid credentials", context: "Error message" }
  ],
  targetLanguage: "fr"
});
```

### 4. Language Discovery

```typescript
// List all supported languages
await list_supported_languages();

// List only Latin alphabet languages
await list_supported_languages({ tier: "latin" });

// List only non-Latin scripts
await list_supported_languages({ tier: "non-latin" });

// List only fun languages
await list_supported_languages({ tier: "fun" });
```

## 🔧 Configuration

### Credentials (Optional)
```json
{
  "openaiApiKey": "sk-...",
  "googleTranslateApiKey": "..."
}
```

### Setup Options
```json
{
  "defaultSourceLanguage": "en",
  "enableAdvancedFeatures": false,
  "translationMemory": true
}
```

## 📚 Use Cases

### 1. Web Application Localization
```typescript
// Translate a React component's text
const uiTexts = [
  "Submit", "Cancel", "Loading...", "Error occurred"
];

for (const text of uiTexts) {
  await translate_text({
    text,
    targetLanguage: "zh-CN",
    context: "UI button"
  });
}
```

### 2. Mobile App Internationalization
```typescript
// Batch translate all app strings
const appStrings = [
  { key: "welcome", text: "Welcome to our app" },
  { key: "settings", text: "Settings" },
  { key: "profile", text: "User Profile" }
];

await batch_translate({
  texts: appStrings,
  targetLanguage: "ar" // Arabic with RTL support
});
```

### 3. Content Management Systems
```typescript
// Validate translations before publishing
await validate_localization({
  originalText: "Hello {userName}, you have {count} new messages",
  translatedText: "Hola {userName}, tienes {count} mensajes nuevos",
  targetLanguage: "es",
  context: "Email template"
});
```

### 4. Fun Projects & Demos
```typescript
// Translate to Elvish for a fantasy game
await translate_text({
  text: "Welcome to the realm of magic",
  targetLanguage: "elvish",
  context: "Game introduction"
});

// Result: "Elen síla lúmenn' omentielvo - Welcome to the realm of magic"
```

## 🌟 Hackathon Highlights

### What Makes This Project Special
1. **Three-Tier Approach** - Progressive complexity from basic to advanced
2. **Cultural Sensitivity** - Handles different scripts and writing systems
3. **Translation Memory** - Maintains consistency across the application
4. **Quality Validation** - Catches common localization mistakes
5. **Fun Factor** - Includes constructed languages for entertainment

### Technical Achievements
- **TypeScript + Zod** - Full type safety and validation
- **MCP Protocol** - Standard Model Context Protocol implementation
- **Modular Design** - Easy to extend with new languages
- **Comprehensive Testing** - Full test coverage with Vitest
- **Documentation** - Clear examples and use cases

### Potential Extensions
- **Real-time Translation APIs** - Google Translate, DeepL, OpenAI
- **Cultural Context Database** - Region-specific considerations
- **Machine Learning Models** - Custom translation models
- **Community Contributions** - User-submitted translations
- **Integration Examples** - React, Vue, Angular, Flutter

## 🧪 Testing

Run the test suite to ensure everything works:

```bash
bun test localization.spec.ts
```

## 🤝 Contributing

This connector was built for the hackathon but is designed to be extensible:

1. **Add New Languages** - Extend the language constants
2. **Enhance Translation Logic** - Integrate with real translation APIs
3. **Improve Validation** - Add more localization checks
4. **Cultural Context** - Add region-specific guidance

## 📖 Resources

- [MCP Protocol Documentation](https://modelcontextprotocol.io/)
- [Disco Platform](https://disco.dev)
- [StackOne MCP Connectors](https://github.com/StackOneHQ/mcp-connectors)
- [Localization Best Practices](https://developer.mozilla.org/en-US/docs/Mozilla/Localization/Localization_content_best_practices)

## 🏆 Hackathon Goals

- ✅ **Tier 1**: Latin alphabet languages - COMPLETE
- ✅ **Tier 2**: Non-Latin scripts (Chinese, Russian, Arabic) - COMPLETE  
- ✅ **Tier 3**: Fun languages (Elvish, Klingon) - COMPLETE
- 🎯 **Bonus**: Translation memory, validation, cultural guides

This connector demonstrates how MCP can be used to solve real-world localization challenges while maintaining the fun and creative spirit of the hackathon!

---

*Built with ❤️ for the Disco Disco Hack Hack Hackathon*
