# Clueless AI Integration

This directory contains the integration of the Clueless AI browser extension functionality into the MCP connectors framework.

## What is Clueless AI?

Clueless AI is an AI-powered browser extension that provides intelligent web guidance and page summarization capabilities. The original browser extension helps users navigate websites by:

- **Visual Guidance**: Finding specific elements on web pages using natural language descriptions
- **Page Summarization**: Analyzing and summarizing webpage content
- **Keyword Extraction**: Extracting meaningful terms from user requests
- **CSS Selector Generation**: Creating CSS selectors to locate web elements

## Integration Overview

The `clueless-ai.ts` connector brings these capabilities to the MCP (Model Context Protocol) framework, allowing AI assistants to:

1. **Generate CSS Selectors**: Convert natural language requests like "find the search bar" into specific CSS selectors
2. **Analyze Page Content**: Process webpage structure and generate summaries
3. **Create Guidance Messages**: Generate user-friendly instructions for web navigation
4. **Extract Keywords**: Parse natural language for meaningful terms

## Available Tools

### GENERATE_ELEMENT_SELECTORS
- **Purpose**: Generate CSS selectors from natural language descriptions
- **Input**: User request (e.g., "find the login button") and optional page snippet
- **Output**: Array of CSS selectors that can be used with `document.querySelectorAll()`

### ANALYZE_PAGE_CONTENT
- **Purpose**: Analyze webpage structure and content
- **Input**: Page title, URL, headings, text content, links, buttons, forms, images
- **Output**: Structured analysis with summary, key points, and interactive elements

### GENERATE_GUIDANCE_MESSAGE
- **Purpose**: Create user-friendly guidance for web interaction
- **Input**: User request, found element types, optional context
- **Output**: Guidance message with action suggestions

### EXTRACT_KEYWORDS
- **Purpose**: Extract meaningful keywords from natural language text
- **Input**: Text to analyze, option to include multi-word phrases
- **Output**: Categorized keywords (phrases vs single words) for further processing

## Features Included from Original Project

### Smart Element Detection
- Multi-word phrase recognition (e.g., "pull request", "sign in")
- Stop word filtering to focus on meaningful terms
- GitHub-specific patterns for development workflows
- Interactive element prioritization

### Page Content Analysis
- Title and heading extraction
- Main text summarization
- Interactive element identification (buttons, links, forms)
- Navigation structure analysis

### Natural Language Processing
- Local keyword extraction (no API required)
- Pattern-based element matching
- Context-aware selector generation

## Original Browser Extension Files Integrated

The following functionality from the original Clueless AI browser extension has been adapted:

- **content-script.js**: Element detection and page analysis logic
- **popup.js**: Natural language processing and keyword extraction
- **background.js**: Page summarization algorithms (simplified for MCP)

## Usage Examples

```javascript
// Generate selectors for finding a search bar
await tools.GENERATE_ELEMENT_SELECTORS({
  request: "find the search bar",
  pageSnippet: "GitHub homepage with search functionality"
});

// Analyze a webpage's content
await tools.ANALYZE_PAGE_CONTENT({
  title: "GitHub - Home",
  url: "https://github.com",
  headings: [{ level: 1, text: "Welcome to GitHub" }],
  buttons: ["Sign up", "Learn more"]
});

// Extract keywords from user input
await tools.EXTRACT_KEYWORDS({
  text: "find the pull request and sign in button"
});
```

## Technical Notes

- **Runtime Compatibility**: Designed to work with Node.js, Bun, and Cloudflare Workers
- **No External Dependencies**: Core functionality works without API keys
- **Local Processing**: All analysis happens locally for reliability
- **Error Handling**: Graceful fallbacks for all operations

## Future Enhancements

The current implementation focuses on local processing. Future versions could add:

- GROQ API integration for advanced AI-powered selector generation
- ElevenLabs TTS integration for accessibility features
- Machine learning models for better element detection
- Site-specific optimization patterns

## Original Project Structure

The original Clueless AI browser extension included:
- Chrome extension manifest and popup UI
- Content scripts for webpage interaction
- Background service worker for API integrations
- Test server for development
- Comprehensive documentation and examples

This MCP connector preserves the core intelligence and functionality while adapting it for use in AI assistant contexts.
