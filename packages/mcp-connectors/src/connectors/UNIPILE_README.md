# Unipile MCP Connector

A comprehensive Model Context Protocol (MCP) connector for the Unipile API, enabling multi-platform messaging integration with intelligent contact management, smart search capabilities, and persistent contact frequency tracking.

## Overview

The Unipile MCP Connector provides seamless access to messaging across multiple platforms including WhatsApp, LinkedIn, Slack, Twitter, Telegram, Instagram, and Facebook Messenger through a unified API. It features intelligent contact management with smart search capabilities, persistent memory for contact frequency tracking, and automated contact saving workflows.

## Features

### 🚀 Core Messaging Capabilities
- **Multi-platform support**: WhatsApp, LinkedIn, Slack, Twitter, Telegram, Instagram, Messenger
- **Account management**: Retrieve connected messaging accounts
- **Chat operations**: List chats, get messages, send messages
- **Email integration**: Access and manage emails
- **Real-time messaging**: Send messages with immediate delivery

### 🧠 Intelligent Contact Management
- **Smart contact search**: Find contacts by name using advanced lexical search with BM25-like scoring
- **Progressive chat search**: Automatically searches recent chats when contacts aren't found locally
- **Contact CRUD operations**: Save, update, and manage contact information with rich fields
- **Persistent frequency tracking**: Automatically tracks message frequency using MCP's built-in persistence
- **Smart ranking**: Sorts contacts by message count and recent activity
- **Memory management**: Clear or view stored contact data with complete field information

### 🔍 Advanced Search Capabilities
- **Lexical search engine**: Powered by Orama with intelligent relevance scoring
- **Multi-stage search**: Searches stored contacts first, then progressively searches chat history
- **Time-based search**: Configurable time ranges (last week → last month) for chat history search
- **High-confidence matching**: Automatic confidence scoring for search results
- **Smart recommendations**: Provides next steps when no matches are found

### 🔧 Technical Features
- **LLM-optimized responses**: API responses are cleaned and filtered to include only relevant fields
- **Client-side batch limiting**: Implements custom batch_size filtering for efficient data retrieval
- **Correct API integration**: Uses `X-API-Key` authentication (not Bearer token)
- **Proper response handling**: Updated interfaces match real Unipile API responses
- **Error handling**: Comprehensive error reporting and recovery
- **Type safety**: Full TypeScript support with proper interfaces
- **Schema consistency**: Unified contact data structure across all tools

## Installation

```bash
npm install @stackone/mcp-connectors
```

## Configuration

### Credentials Required

1. **Unipile DSN**: Your Unipile endpoint (e.g., `your-endpoint.unipile.com:port/api/v1`)
2. **API Key**: Your Unipile API key from the dashboard

### Example Setup

```json
{
  "dsn": "your-endpoint.unipile.com:port/api/v1",
  "apiKey": "your-api-key-here"
}
```

## Available Tools

### 📋 Account & Chat Management

#### `unipile_get_accounts`
Get all connected messaging accounts from supported platforms.

```typescript
// No parameters required
// Returns: List of connected accounts with sources and connection details
```

#### `unipile_get_chats`
Get all available chats for a specific account.

```typescript
{
  account_id: string,  // Account ID to get chats from
  limit?: number       // Max chats to return (default: 10)
}
```

#### `unipile_get_chat_messages`
Get messages from a specific chat with LLM-optimized filtering.

```typescript
{
  chat_id: string,      // Chat ID to get messages from
  batch_size?: number   // Number of messages (default: 100, applied client-side)
}
```

**Filtered Response**: Returns only essential fields (`id`, `text`, `timestamp`, `is_sender`, `has_attachments`, `quoted_text`) for cleaner LLM consumption.

#### `unipile_get_recent_messages`
Get recent messages from all chats in an account.

```typescript
{
  account_id: string,    // Account ID for messages
  batch_size?: number    // Messages per chat (default: 20)
}
```

#### `unipile_get_emails`
Get recent emails from a specific account.

```typescript
{
  account_id: string,   // Account ID for emails
  limit?: number        // Max emails to return (default: 10)
}
```

### 💬 Messaging

#### `unipile_send_message`
Send a text message with intelligent contact tracking. **IMPORTANT**: LLMs should use `unipile_search_contacts` first when user says "message [person name]".

```typescript
{
  chat_id: string,          // Chat ID to send message to
  text: string,             // Message text to send
  contact_name?: string,    // Contact name (automatically tracked)
  platform?: string,       // Platform type (stored in custom_fields if provided)
  account_id?: string       // Account ID (stored in custom_fields if provided)
}
```

**Automatic Features**:
- Increments `message_count` for existing contacts
- Creates minimal contact entries for new chats
- Preserves all existing contact data during updates

**Example:**
```typescript
{
  "chat_id": "hxkfCnylUGmwBJy2nRvkSw",
  "text": "Hello! How are you?",
  "contact_name": "Marco Hack Hack",
  "platform": "WHATSAPP",
  "account_id": "your-account-id"
}
```

### 🧠 Contact Management Tools

#### `unipile_search_contacts`
Intelligent contact search using lexical search with progressive fallback to chat history.

```typescript
{
  query: string,                    // Search query (name, email, etc.)
  account_type?: string,           // Filter by platform (WHATSAPP, LINKEDIN, etc.)
  account_id?: string              // Filter by specific account
}
```

**Search Strategy**:
1. **Stage 1**: Search stored contacts using lexical search on name, phone, notes
2. **Stage 2**: Search recent chats (last 7 days, limit 20) if no high-confidence match
3. **Stage 3**: Search more chats (last 7 days, limit 100) if still no match
4. **Stage 4**: Search older chats (last 30 days, limit 100) as final attempt

**Returns**:
```json
{
  "found_contacts": true,
  "best_match": {
    "id": "contact_id",
    "name": "Felix Enslin", 
    "confidence": "high",
    "source": "stored_contacts"
  },
  "recommendation": "Use chat_id: contact_id to send messages",
  "search_summary": "Found 1 high-confidence match in stored contacts"
}
```

#### `unipile_save_contact`
Save or update contact information with rich field support.

```typescript
{
  name: string,                    // Contact name (required)
  phone_number?: string,           // Phone number
  whatsapp_chat_id?: string,       // WhatsApp chat ID (used as contact ID)
  linkedin_chat_id?: string,       // LinkedIn chat ID
  email?: string,                  // Email address
  notes?: string,                  // Personal notes
  custom_fields?: object           // Any additional fields
}
```

**Features**:
- Auto-generates contact ID from `whatsapp_chat_id`, `linkedin_chat_id`, `email`, or name
- Preserves existing `message_count` and `created_at` when updating
- Clean data storage (removes undefined fields)

#### `unipile_update_contact`
Update specific fields of an existing contact by ID.

```typescript
{
  contact_id: string,              // Contact ID to update (required)
  name?: string,                   // Updated name
  phone_number?: string,           // Updated phone
  email?: string,                  // Updated email
  notes?: string,                  // Updated notes
  custom_fields?: object           // Updated custom fields
}
```

**Features**:
- Updates only provided fields, preserves others
- Maintains `message_count` and contact history
- Returns error with available contact IDs if contact not found

#### `unipile_get_all_stored_contacts`
Get all stored contacts with complete field information.

```typescript
// No parameters required
```

**Returns**:
```json
{
  "contacts": [
    {
      "id": "contact_id",
      "name": "Felix Enslin",
      "phone_number": "+1234567890",
      "whatsapp_chat_id": "chat_id",
      "email": "felix@example.com",
      "notes": "Great contact",
      "message_count": 15,
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-02T15:30:00Z",
      "custom_fields": {}
    }
  ],
  "count": 1,
  "fields_available": ["id", "name", "phone_number", "whatsapp_chat_id", "linkedin_chat_id", "email", "notes", "message_count", "created_at", "updated_at", "custom_fields"]
}
```

#### `unipile_clear_contact_memory`
Clear all stored contact data from persistent memory.

```typescript
// No parameters required
// Returns: Success confirmation
```

## Usage Examples

### Smart Contact Search & Messaging

```typescript
// Step 1: Search for a contact by name
const searchResult = await unipile_search_contacts({
  query: "Felix",
  account_type: "WHATSAPP"
});

// Step 2: Use the found contact to send message
if (searchResult.found_contacts) {
  await unipile_send_message({
    chat_id: searchResult.best_match.id,
    text: "Hello Felix! How are you?",
    contact_name: searchResult.best_match.name
  });
}
```

### Contact Management Workflow

```typescript
// Save a new contact with rich information
await unipile_save_contact({
  name: "Felix Enslin",
  phone_number: "+1234567890",
  whatsapp_chat_id: "chat_felix_123",
  email: "felix@example.com",
  notes: "Met at conference, interested in AI",
  custom_fields: {
    company: "TechCorp",
    role: "CTO"
  }
});

// Update contact information
await unipile_update_contact({
  contact_id: "chat_felix_123",
  notes: "Now working on MCP connectors",
  custom_fields: {
    company: "NewCorp",
    role: "CEO",
    last_project: "MCP Integration"
  }
});

// Search and find the contact
const result = await unipile_search_contacts({
  query: "Felix TechCorp"
});
```

### Batch Operations

```typescript
// Get all contacts to review
const allContacts = await unipile_get_all_stored_contacts();
console.log(`Managing ${allContacts.count} contacts`);

// Clear memory when needed (for privacy)
await unipile_clear_contact_memory();
```

### Account Discovery

```typescript
// Get all connected accounts
const accounts = await unipile_get_accounts();

// Get chats for specific account
const chats = await unipile_get_chats({
  account_id: "your-account-id",
  limit: 20
});
```

## Data Persistence

The connector uses MCP's built-in persistence system (`context.setData` and `context.getData`) to store contact frequency data. This ensures:

- **Persistence across sessions**: Data survives application restarts
- **Automatic synchronization**: Changes are immediately persisted
- **Memory efficiency**: Only active contact data is stored
- **Privacy focused**: Data stays local to your MCP instance

### Storage Structure

```json
{
  "unipile_contacts": {
    "contact_id_1": {
      "id": "contact_id_1",
      "name": "Felix Enslin",
      "phone_number": "+1234567890",
      "whatsapp_chat_id": "chat_felix_123",
      "linkedin_chat_id": null,
      "email": "felix@example.com",
      "notes": "Met at AI conference, works on MCP",
      "message_count": 15,
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-02T15:30:00Z",
      "custom_fields": {
        "company": "TechCorp",
        "role": "CTO",
        "platform": "WHATSAPP",
        "account_id": "account_123"
        ...
      }
    }
  }
}
```

**Schema Features**:
- **Unified structure**: All contact tools use the same schema
- **Rich fields**: Support for multiple contact methods and custom data
- **Automatic tracking**: `message_count`, `created_at`, `updated_at` managed automatically
- **Flexible storage**: `custom_fields` allows any additional data
- **Clean data**: Undefined fields are automatically removed

## API Response Formats

All responses are filtered and optimized for LLM consumption, removing unnecessary fields and providing clean, relevant data.

### Cleaned Accounts Response
```json
{
  "accounts": [
    {
      "id": "account_id",
      "name": "Phone Number", 
      "type": "WHATSAPP",
      "status": "OK",
      "source_id": "source_id_MESSAGING",
      "created_at": "2025-08-28T17:21:14.163Z"
    }
  ],
  "count": 1
}
```

### Cleaned Chats Response  
```json
{
  "chats": [
    {
      "id": "chat_id",
      "name": "Felix Enslin",
      "unread": 6,
      "timestamp": "2025-08-28T17:49:58.000Z"
    }
  ],
  "count": 1
}
```

### Cleaned Messages Response
```json
{
  "messages": [
    {
      "id": "msg_id",
      "text": "Hello world",
      "timestamp": "2025-08-28T17:49:58.000Z",
      "is_sender": false,
      "has_attachments": false,
      "quoted_text": null
    }
  ],
  "count": 1,
  "total_available": 5
}
```

**Filtering Benefits**:
- **Reduced noise**: Only essential fields for LLM processing
- **Consistent naming**: Standardized field names across tools  
- **Better performance**: Smaller response sizes
- **Cleaner data**: Boolean conversions, fallback values for missing data

## Authentication

The connector uses `X-API-Key` header authentication (not Bearer tokens):

```javascript
headers: {
  'X-API-Key': 'your-api-key',
  'Content-Type': 'application/json'
}
```

## Error Handling

All tools return structured error responses:

```json
{
  "error": "Failed to send message: Unauthorized"
}
```

Common error scenarios:
- Invalid API credentials
- Chat/account not found
- Network connectivity issues
- API rate limits
- Invalid message format

## Platform Support

| Platform | Send Messages | Read Messages | Account Info |
|----------|---------------|---------------|---------------|
| WhatsApp | ✅ | ✅ | ✅ |
| LinkedIn | ✅ | ✅ | ✅ |
| Slack | ✅ | ✅ | ✅ |
| Twitter/X | ✅ | ✅ | ✅ |
| Telegram | ✅ | ✅ | ✅ |
| Instagram | ✅ | ✅ | ✅ |
| Messenger | ✅ | ✅ | ✅ |
| Email | ❌ | ✅ | ✅ |

## Best Practices

### Smart Messaging Workflow
1. **Always search first**: Use `unipile_search_contacts` before sending messages to find the right contact
2. **Use progressive search**: The search automatically escalates from stored contacts to recent chats
3. **Save important contacts**: Use `unipile_save_contact` for frequently messaged people with rich information
4. **Handle search results**: Check `found_contacts` boolean and use the `recommendation` field

### Contact Management
1. **Rich contact data**: Include phone numbers, emails, and notes when saving contacts
2. **Use custom fields**: Store additional context like company, role, or relationship
3. **Update incrementally**: Use `unipile_update_contact` to modify specific fields without losing data
4. **Regular maintenance**: Review all contacts periodically with `unipile_get_all_stored_contacts`

### Search Optimization
1. **Specific queries**: Use names, companies, or unique identifiers for better search results
2. **Account filtering**: Use `account_type` to narrow search scope when needed
3. **Trust confidence scores**: High-confidence matches are usually accurate
4. **Follow recommendations**: The search provides next steps when no matches are found

### Error Handling
1. **Parse JSON responses** to check for error fields
2. **Implement retry logic** for temporary failures
3. **Validate chat IDs** before attempting operations
4. **Log errors appropriately** for debugging

## Troubleshooting

### Common Issues

**"Invalid credentials" error:**
- Verify your API key is correct
- Check that DSN format is correct (without `https://`)
- Ensure account has proper permissions

**"Chat not found" error:**
- Verify chat ID exists and is accessible  
- Check that account is properly connected
- Refresh chat list to get current IDs

**Search not finding contacts:**
- Use `unipile_get_all_stored_contacts` to see what contacts are saved
- Try broader search terms or check spelling
- Use progressive search by not providing `account_type` filter
- Check if contact exists in recent chats with different variations

**Contact data not saving:**
- Verify required `name` field is provided to `unipile_save_contact`
- Check that contact ID generation is working (uses whatsapp_chat_id, linkedin_chat_id, email, or name)
- Use `unipile_get_all_stored_contacts` to verify storage
- Ensure persistence is enabled in your MCP setup

### Debug Mode

Enable verbose logging to debug issues:
```javascript
console.log('CONTEXT', context);  // In tool handlers
console.log('CREDENTIALS', credentials);
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add comprehensive tests
4. Update documentation
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Check the [Unipile API documentation](https://developer.unipile.com)
- Review the MCP framework documentation
- Open an issue in the repository

---

**Version**: 2.0.0  
**Last Updated**: January 15, 2025  
**MCP Framework**: Compatible with MCP 1.0+

### Recent Updates (v2.0.0)
- ✅ **Smart Contact Search**: Lexical search with progressive fallback to chat history
- ✅ **Complete Contact Management**: Save, update, and manage contacts with rich fields
- ✅ **LLM-Optimized Responses**: Cleaned and filtered API responses
- ✅ **Client-side Batch Limiting**: Custom batch_size implementation
- ✅ **Schema Consistency**: Unified contact data structure across all tools
- ✅ **Automatic Message Tracking**: Intelligent contact frequency tracking