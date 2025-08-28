# Browserbase MCP Connector

The Browserbase MCP Connector provides comprehensive web automation capabilities through the Browserbase headless browser service. This connector enables AI agents to interact with websites, take screenshots, fill forms, execute JavaScript, and perform various web automation tasks.

## 🚀 Features

- **Session Management**: Create, monitor, and manage browser sessions
- **Web Navigation**: Navigate to URLs and interact with web pages
- **Screenshot Capture**: Take full-page or element-specific screenshots
- **Form Automation**: Intelligent form filling with AI-powered element detection
- **Content Extraction**: Extract page content, titles, and metadata
- **JavaScript Execution**: Run custom JavaScript code in browser sessions
- **Element Interaction**: Click elements and type text using CSS selectors
- **Base64 Image Support**: Optional base64 image data return for screenshots
- **Session Persistence**: Context-based session management for continuity

## 📋 Prerequisites

1. **Browserbase Account**: Sign up at [Browserbase](https://browserbase.com)
2. **API Credentials**: Obtain your API Key and Project ID from your Browserbase dashboard
3. **MCP Environment**: disco.dev or compatible MCP server environment

## 🔧 Setup

### 1. Environment Variables

Create a `.env` file or set environment variables:

```bash
# Browserbase API Credentials
BROWSERBASE_API_KEY=bb_your_actual_api_key_here
BROWSERBASE_PROJECT_ID=proj_your_actual_project_id_here
```

### 2. Configuration

The connector supports advanced configuration through the setup schema:

```json
{
  "defaultBrowserWidth": 1280,
  "defaultBrowserHeight": 720,
  "enableProxies": false,
  "enableStealth": false,
  "sessionTimeout": 300000,
  "contextId": "ctx_your_context_id"
}
```

## 🛠️ Available Tools

### Session Management

#### `browserbase_create_session`
Create a new browser session for web automation.

```typescript
// Basic usage
{
  "sessionId": "session-123",
  "status": "RUNNING",
  "startedAt": "2024-01-01T10:00:00Z",
  "message": "Browser session created successfully"
}
```

#### `browserbase_get_session`
Get information about a specific browser session.

```typescript
// Input
{
  "sessionId": "session-123"
}

// Output
{
  "id": "session-123",
  "status": "RUNNING",
  "startedAt": "2024-01-01T10:00:00Z",
  "url": "https://example.com",
  "logs": ["Navigated to https://example.com"]
}
```

#### `browserbase_list_sessions`
List recent browser sessions.

```typescript
// Input
{
  "limit": 10
}

// Output
[
  {
    "id": "session-123",
    "status": "RUNNING",
    "startedAt": "2024-01-01T10:00:00Z",
    "url": "https://example.com"
  }
]
```

#### `browserbase_complete_session`
Complete and close a browser session.

```typescript
// Input
{
  "sessionId": "session-123"
}

// Output
{
  "sessionId": "session-123",
  "status": "COMPLETED",
  "endedAt": "2024-01-01T11:00:00Z",
  "message": "Session completed successfully"
}
```

### Web Interaction

#### `browserbase_navigate`
Navigate to a URL in a browser session.

```typescript
// Input
{
  "sessionId": "session-123",
  "url": "https://example.com"
}

// Output
{
  "success": true,
  "url": "https://example.com",
  "title": "Example Domain"
}
```

#### `browserbase_get_page_content`
Get the content of the current page.

```typescript
// Input
{
  "sessionId": "session-123"
}

// Output
{
  "url": "https://example.com",
  "title": "Example Domain",
  "contentLength": 1256,
  "contentPreview": "Example Domain This domain is for use in...",
  "hasScreenshot": true
}
```

### Screenshot & Visual

#### `browserbase_take_screenshot`
Take a screenshot of the current page or specific element.

```typescript
// Full page screenshot
{
  "sessionId": "session-123",
  "returnImage": false
}

// Element-specific screenshot
{
  "sessionId": "session-123",
  "element": ".header",
  "returnImage": true
}

// Output
{
  "url": "https://example.com",
  "image": "base64imagedata", // Only if returnImage: true
  "screenshotSize": 1234,
  "element": "full-page",
  "message": "Screenshot captured successfully"
}
```

### Form Automation

#### `browserbase_smart_fill_form`
Intelligently fill out forms using AI-powered element detection.

```typescript
// Input
{
  "sessionId": "session-123",
  "formData": {
    "username": "testuser",
    "password": "securepass123",
    "email": "test@example.com"
  },
  "submitAfter": true
}

// Output
{
  "username": "filled",
  "password": "filled",
  "email": "filled",
  "submit": "clicked"
}
```

### Element Interaction

#### `browserbase_click_element`
Click on an element using a CSS selector.

```typescript
// Input
{
  "sessionId": "session-123",
  "selector": ".submit-button"
}

// Output
{
  "success": true,
  "message": "Element clicked successfully"
}
```

#### `browserbase_type_text`
Type text into an input element.

```typescript
// Input
{
  "sessionId": "session-123",
  "selector": "#username",
  "text": "testuser"
}

// Output
{
  "success": true,
  "message": "Text typed successfully"
}
```

### Advanced Scripting

#### `browserbase_execute_script`
Execute JavaScript code in a browser session.

```typescript
// Input
{
  "sessionId": "session-123",
  "script": "return document.title;"
}

// Output
{
  "result": "Example Domain"
}
```

## 📚 Example Workflows

### Basic Web Scraping

```typescript
// 1. Create a session
const session = await create_session();

// 2. Navigate to a website
await navigate({
  sessionId: session.sessionId,
  url: "https://news.ycombinator.com"
});

// 3. Take a screenshot
await take_screenshot({
  sessionId: session.sessionId,
  returnImage: false
});

// 4. Extract page content
const content = await get_page_content({
  sessionId: session.sessionId
});

// 5. Complete the session
await complete_session({
  sessionId: session.sessionId
});
```

### Form Automation

```typescript
// 1. Create a session
const session = await create_session();

// 2. Navigate to login page
await navigate({
  sessionId: session.sessionId,
  url: "https://example.com/login"
});

// 3. Fill out the login form
await smart_fill_form({
  sessionId: session.sessionId,
  formData: {
    "username": "myusername",
    "password": "mypassword"
  },
  submitAfter: true
});

// 4. Take screenshot of logged-in page
await take_screenshot({
  sessionId: session.sessionId,
  returnImage: true
});
```

### Advanced Element Interaction

```typescript
// 1. Create a session
const session = await create_session();

// 2. Navigate to a page
await navigate({
  sessionId: session.sessionId,
  url: "https://example.com"
});

// 3. Click on a specific button
await click_element({
  sessionId: session.sessionId,
  selector: "button[data-action='expand']"
});

// 4. Type into a search box
await type_text({
  sessionId: session.sessionId,
  selector: "#search-input",
  text: "web automation"
});

// 5. Execute custom JavaScript
const result = await execute_script({
  sessionId: session.sessionId,
  script: `
    const links = Array.from(document.querySelectorAll('a'));
    return links.map(link => ({
      text: link.textContent,
      href: link.href
    }));
  `
});
```

## 🔍 MCP Resources

The connector provides MCP resources for better AI context:

### `browserbase://sessions`
Lists all active browser sessions and their current state.

### `browserbase://sessions/{sessionId}/history`
Provides navigation history and page visits for a specific session.

## ⚙️ Configuration Options

### Setup Schema

```typescript
{
  // Browser viewport dimensions
  defaultBrowserWidth: number,  // Default: 1280
  defaultBrowserHeight: number, // Default: 720

  // Browserbase features
  enableProxies: boolean,       // Default: false
  enableStealth: boolean,       // Default: false

  // Session management
  sessionTimeout: number,       // Default: 300000 (5 minutes)
  contextId?: string            // Optional context for session persistence
}
```

### Environment Variables

```bash
# Required
BROWSERBASE_API_KEY=bb_your_api_key
BROWSERBASE_PROJECT_ID=proj_your_project_id

# Optional
BROWSERBASE_API_URL=https://api.browserbase.com
```

## 🧪 Testing

Run the test suite to validate the connector:

```bash
# Run all tests
bun test

# Run browserbase connector tests specifically
bun test packages/mcp-connectors/src/connectors/browserbase.spec.ts

# Run with verbose output
bun test --reporter=verbose
```

## 🚨 Error Handling

The connector provides comprehensive error handling with structured error responses:

```json
{
  "success": false,
  "operation": "create_session",
  "error": "Browserbase API error (401): Invalid API key",
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

Common error scenarios:
- **401 Unauthorized**: Invalid API key or project ID
- **404 Not Found**: Session or element not found
- **408 Request Timeout**: Navigation or action timed out
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Browserbase service error

## 🔐 Security Best Practices

1. **API Key Management**: Store API keys securely, never in code
2. **Session Cleanup**: Always complete sessions when done
3. **Input Validation**: Validate URLs and selectors before use
4. **Rate Limiting**: Implement appropriate delays between requests
5. **Error Logging**: Log errors without exposing sensitive data

## 🎯 Best Practices

### Performance
- Reuse sessions when possible to reduce overhead
- Use element-specific screenshots for faster capture
- Implement proper error handling and retries

### Reliability
- Always check session status before operations
- Use smart form filling for better element detection
- Implement timeouts for long-running operations

### Monitoring
- Log session creation and completion
- Monitor API usage and rate limits
- Track error patterns for debugging

## 📞 Support

For issues with the Browserbase MCP Connector:

1. Check the [Browserbase Documentation](https://docs.browserbase.com)
2. Review the test suite for usage examples
3. Verify your API credentials and configuration
4. Check the MCP server logs for detailed error messages

## 🤝 Contributing

Contributions are welcome! Please:

1. Add tests for new features
2. Update documentation for changes
3. Follow the existing code style and patterns
4. Test thoroughly before submitting

## 📄 License

This connector is part of the MCP Connectors project and follows the same license terms.
