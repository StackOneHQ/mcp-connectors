# Accessibility Checker MCP Connector

> **Built for the Disco Disco Hack Hack Hackathon - Team 9** 🚀

A powerful MCP connector that automatically scans text strings and reports accessibility issues for inclusive app development. This connector complements the localization connector by ensuring that translated content is also accessible to all users.

## 🎯 Project Overview

This connector was built for the **Disco Disco Hack Hack** hackathon focused on AI integrations. It addresses the critical need for accessibility in application development by providing automated text analysis and WCAG compliance checking.

### 🌟 Why Accessibility Matters
- **Inclusive Design**: Ensures apps work for users with disabilities
- **Legal Compliance**: Meets WCAG guidelines and accessibility standards
- **Better UX**: Clear, readable text improves experience for everyone
- **Global Reach**: Works alongside localization for truly inclusive apps

## 🏗️ Three-Tier Implementation

### **Tier 1 (MVP) - Basic Text Analysis** ✅
- Accept plain text input
- Run readability analysis (Flesch-Kincaid scoring)
- Detect overly long strings
- Return JSON with issues and suggestions

### **Tier 2 (Advanced) - Multi-Text & Consistency** ✅
- Handle JSON input with multiple keys
- Check for consistency (capitalization, tone)
- Add rules for common WCAG text-level guidelines
- Batch analysis capabilities

### **Tier 3 (Stretch) - Advanced Compliance** ✅
- Detect missing alt-text in structured content
- Add tone checker (formal vs informal consistency)
- Configurable target reading grade levels
- Strict mode for pass/fail scoring

## 🛠️ Core Features

### **Text Analysis Tools**
- **`analyze_text`** - Single text accessibility analysis
- **`analyze_multiple_texts`** - Batch analysis with consistency checking
- **`validate_accessibility`** - Custom rule validation and scoring

### **WCAG Compliance**
- **`check_wcag_compliance`** - Structured content compliance checking
- **Alt-text detection** for image metadata
- **Length guidelines** for buttons, labels, headings
- **Accessibility scoring** with pass/fail results

### **Guidance & Reporting**
- **`generate_accessibility_guide`** - Best practices and examples
- **`get_accessibility_report`** - Retrieve stored analysis results
- **Comprehensive recommendations** for each issue type

### **Advanced Analysis**
- **Readability scoring** using Flesch-Kincaid formula
- **Jargon detection** for technical terms
- **Idiom detection** for non-native speakers
- **Consistency checking** across interface elements
- **Tone analysis** (formal vs informal)

## 🚀 Quick Start

### 1. **Start the Accessibility Server**

```bash
# Basic functionality (no credentials needed)
cd apps/server
bun run spawn --connector accessibility

# With custom configuration
bun run spawn --connector accessibility --setup '{"targetReadabilityGrade": 6, "strictMode": true}'
```

### 2. **Basic Text Analysis**

```typescript
// Analyze a simple button text
await analyze_text({
  text: "Click here to proceed with the authentication process",
  context: "button"
});

// Result: Detects length issues, suggests "Sign In" instead
```

### 3. **Batch Analysis**

```typescript
// Analyze multiple UI elements
await analyze_multiple_texts({
  texts: {
    "login_button": "Sign In",
    "welcome_message": "Hello, welcome to our revolutionary hyperconverged platform!",
    "error_message": "An error occurred during the execution of the requested operation"
  }
});

// Result: Detects jargon, length issues, and tone inconsistencies
```

### 4. **WCAG Compliance Check**

```typescript
// Check structured content for accessibility
await check_wcag_compliance({
  content: {
    profile_image: { src: "profile.jpg" }, // Missing alt-text
    logo: { src: "logo.png", alt: "Company Logo" } // Has alt-text
  }
});

// Result: Flags missing alt-text for profile_image
```

## 🔧 Configuration Options

### **Setup Configuration**
```json
{
  "targetReadabilityGrade": 8,
  "strictMode": false,
  "enableAdvancedChecks": true,
  "maxIssuesBeforeFail": 5
}
```

### **Target Reading Levels**
- **Grade 1-5**: Very Easy (children's content)
- **Grade 6-8**: Easy (general public)
- **Grade 9-12**: Standard (high school level)
- **Grade 13+**: Difficult (college level)

## 📚 Use Cases & Examples

### **1. Button Text Optimization**
```typescript
// ❌ Problematic
"Click here to proceed with the authentication process and gain access to your account dashboard"

// ✅ Accessible
"Sign In"
```

**Issues Detected:**
- Length: 108 characters (exceeds 50 character limit)
- Readability: College level (too complex for general users)

### **2. Technical Content Simplification**
```typescript
// ❌ Problematic
"Leverage our hyperconverged infrastructure paradigm for synergistic orchestration"

// ✅ Accessible
"Use our integrated system to manage all your resources efficiently"
```

**Issues Detected:**
- Jargon: "hyperconverged", "paradigm", "synergistic", "orchestration"
- Readability: College graduate level

### **3. Consistency Checking**
```typescript
// ❌ Inconsistent
{
  "button1": "CLICK HERE",
  "button2": "Click here", 
  "button3": "click here"
}

// ✅ Consistent
{
  "button1": "Sign In",
  "button2": "Sign Up",
  "button3": "Continue"
}
```

**Issues Detected:**
- Capitalization inconsistency
- Mixed tone (all caps vs sentence case)

## 🧪 Testing Your Connector

### **Run the Test Suite**
```bash
# Test the accessibility connector
bun test accessibility.spec.ts

# Test all connectors
bun test
```

### **Test Coverage**
- ✅ **20+ test cases** covering all tools
- ✅ **Edge case handling** (empty text, very long text)
- ✅ **Error scenarios** and validation
- ✅ **Mock context** testing

## 🌍 Integration with Localization

This accessibility connector works perfectly with your localization connector:

### **Workflow Example**
1. **Localize** your app to Spanish using the localization connector
2. **Check accessibility** of the Spanish text using this connector
3. **Ensure** translated content meets accessibility standards
4. **Maintain** inclusive design across all languages

### **Multi-Language Accessibility**
```typescript
// Localize first
const spanishText = await translate_text({
  text: "Welcome to our platform",
  targetLanguage: "es"
});

// Then check accessibility
const accessibilityReport = await analyze_text({
  text: spanishText,
  context: "heading",
  targetGrade: 8
});
```

## 🏆 Hackathon Features

### **What Makes This Special**
1. **Three-Tier Implementation** - Progressive complexity from basic to advanced
2. **WCAG Compliance** - Real accessibility standards, not just suggestions
3. **Smart Detection** - Jargon, idioms, consistency issues
4. **Configurable Rules** - Custom validation for specific needs
5. **Integration Ready** - Works with localization and other connectors

### **Technical Achievements**
- **Flesch-Kincaid Algorithm** - Industry-standard readability scoring
- **Pattern Recognition** - Detects jargon, idioms, and inconsistencies
- **WCAG Guidelines** - Implements actual accessibility standards
- **Type Safety** - Full TypeScript + Zod validation
- **Comprehensive Testing** - Full test coverage with edge cases

### **Innovation Points**
- **Context-Aware Analysis** - Different rules for buttons vs paragraphs
- **Consistency Checking** - Cross-element analysis for UI coherence
- **Custom Rule Engine** - Configurable validation rules
- **Strict Mode** - Pass/fail scoring for CI/CD integration

## 🚀 Future Enhancements

### **Potential Extensions**
- **Real-time API Integration** - OpenAI for advanced suggestions
- **Multi-language Support** - Accessibility rules for different languages
- **Visual Analysis** - Color contrast, font size checking
- **CI/CD Integration** - Automated accessibility testing in pipelines
- **Community Rules** - User-contributed accessibility patterns

### **Advanced Features**
- **Machine Learning** - Learn from user corrections
- **Cultural Context** - Region-specific accessibility guidelines
- **Industry Standards** - Healthcare, finance, education specific rules
- **Performance Metrics** - Accessibility improvement tracking

## 📖 Resources & Learning

### **Accessibility Standards**
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Flesch-Kincaid Readability](https://en.wikipedia.org/wiki/Flesch%E2%80%93Kincaid_readability_tests)
- [Inclusive Design Principles](https://www.microsoft.com/design/inclusive/)

### **Best Practices**
- **Text Length**: Keep buttons under 50 characters
- **Readability**: Aim for Grade 8-10 reading level
- **Consistency**: Use consistent capitalization and tone
- **Clarity**: Avoid jargon and idioms
- **Context**: Provide clear, actionable text

## 🎯 Getting Started

### **1. Build the Project**
```bash
bun run build
```

### **2. Test the Connector**
```bash
bun test accessibility.spec.ts
```

### **3. Start the Server**
```bash
cd apps/server
bun run spawn --connector accessibility
```

### **4. Test with Example**
```typescript
// Test the example from your spec
const result = await analyze_text({
  text: "Welcome to our revolutionary hyperconverged platform experience!",
  context: "heading"
});

// Should detect jargon and suggest improvements
```

## 🤝 Contributing

This connector demonstrates how MCP can solve real-world accessibility challenges:

1. **Add New Rules** - Extend the accessibility checking logic
2. **Improve Detection** - Enhance jargon and idiom detection
3. **Add Languages** - Support for non-English accessibility rules
4. **Integration Examples** - Show how to use with other connectors

## 🏆 Hackathon Impact

This accessibility connector shows:
- **Technical Skills** - Complex algorithms, pattern recognition
- **Real-World Value** - Solves actual accessibility problems
- **Innovation** - Automated WCAG compliance checking
- **Integration** - Works with your localization connector
- **Quality** - Comprehensive testing and documentation

---

**Built with ❤️ for the Disco Disco Hack Hack Hackathon - Team 9**

*Making the web accessible, one text at a time* ♿✨
