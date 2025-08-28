# Unipile MCP Connector

A comprehensive Model Context Protocol (MCP) connector for the Unipile API, enabling multi-platform messaging integration with persistent contact frequency tracking.

## Overview

The Unipile MCP Connector provides seamless access to messaging across multiple platforms including WhatsApp, LinkedIn, Slack, Twitter, Telegram, Instagram, and Facebook Messenger through a unified API. It features intelligent contact frequency tracking with persistent memory to identify your most frequently messaged contacts.

## Features

### 🚀 Core Messaging Capabilities
- **Multi-platform support**: WhatsApp, LinkedIn, Slack, Twitter, Telegram, Instagram, Messenger
- **Account management**: Retrieve connected messaging accounts
- **Chat operations**: List chats, get messages, send messages
- **Email integration**: Access and manage emails
- **Real-time messaging**: Send messages with immediate delivery

### 🧠 Intelligent Contact Memory
- **Persistent frequency tracking**: Automatically tracks message frequency using MCP's built-in persistence
- **Smart ranking**: Sorts contacts by message count and recent activity
- **Top contacts**: Get your most frequently messaged contacts (configurable limit)
- **Memory management**: Clear or view stored contact data

### 🔧 Technical Features
- **Correct API integration**: Uses `X-API-Key` authentication (not Bearer token)
- **Proper response handling**: Updated interfaces match real Unipile API responses
- **Error handling**: Comprehensive error reporting and recovery
- **Type safety**: Full TypeScript support with proper interfaces

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
Get all messages from a specific chat.

```typescript
{
  chat_id: string,      // Chat ID to get messages from
  batch_size?: number   // Number of messages (default: 100)
}
```

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
Send a text message to a specific chat with automatic frequency tracking.

```typescript
{
  chat_id: string,          // Chat ID to send message to
  text: string,             // Message text to send
  contact_name?: string,    // Contact name (for frequency tracking)
  platform?: string,       // Platform type (e.g., WHATSAPP, LINKEDIN)
  account_id?: string       // Account ID (for frequency tracking)
}
```

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

### 🧠 Persistent Memory Tools

#### `unipile_get_top_contacts`
Get the most frequently messaged contacts based on persistent memory.

```typescript
{
  limit?: number    // Max contacts to return (default: 10)
}
```

**Returns:**
```json
{
  "contacts": [
    {
      "id": "chat_id",
      "name": "Contact Name",
      "messageCount": 15,
      "lastMessageTime": "2025-08-28T18:20:49.623Z",
      "platform": "WHATSAPP",
      "accountId": "account_id"
    }
  ]
}
```

#### `unipile_get_all_stored_contacts`
Get all stored contacts from persistent memory with frequency data.

```typescript
// No parameters required
// Returns: All contacts with their frequency data and total count
```

#### `unipile_clear_contact_memory`
Clear all stored contact frequency data from persistent memory.

```typescript
// No parameters required
// Returns: Success confirmation
```

## Usage Examples

### Basic Message Sending

```typescript
// Send a simple message
await unipile_send_message({
  chat_id: "chat_123",
  text: "Hello there!"
});

// Send with frequency tracking
await unipile_send_message({
  chat_id: "chat_123", 
  text: "Hello there!",
  contact_name: "John Doe",
  platform: "WHATSAPP",
  account_id: "account_456"
});
```

### Get Top Contacts

```typescript
// Get top 10 most frequent contacts
const topContacts = await unipile_get_top_contacts({ limit: 10 });

// Get top 5 contacts
const top5 = await unipile_get_top_contacts({ limit: 5 });
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
    "chat_id_1": {
      "id": "chat_id_1",
      "name": "Contact Name",
      "messageCount": 15,
      "lastMessageTime": "2025-08-28T18:20:49.623Z", 
      "platform": "WHATSAPP",
      "accountId": "account_id"
    }
  }
}
```

## API Response Formats

### Accounts Response
```json
{
  "items": [
    {
      "id": "account_id",
      "name": "Phone Number",
      "type": "WHATSAPP",
      "created_at": "2025-08-28T17:21:14.163Z",
      "sources": [
        {
          "id": "source_id_MESSAGING",
          "status": "OK"
        }
      ]
    }
  ]
}
```

### Chats Response
```json
{
  "items": [
    {
      "id": "chat_id",
      "name": "Chat Name",
      "type": 1,
      "folder": ["INBOX"],
      "unread": 0,
      "timestamp": "2025-08-28T17:49:58.000Z",
      "account_id": "account_id",
      "account_type": "WHATSAPP",
      "unread_count": 6
    }
  ]
}
```

### Messages Response
```json
{
  "items": [
    {
      "id": "msg_id",
      "text": "Hello world",
      "timestamp": "2025-08-28T17:49:58.000Z",
      "sender_id": "sender@example.com", 
      "chat_id": "chat_id",
      "account_id": "account_id",
      "is_sender": 0,
      "attachments": []
    }
  ]
}
```

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

### Message Sending
1. **Always provide contact info** for frequency tracking
2. **Use descriptive contact names** for better memory organization  
3. **Check chat existence** before sending messages
4. **Handle rate limits** gracefully in production

### Memory Management
1. **Regularly check top contacts** to understand communication patterns
2. **Clear memory periodically** if needed for privacy
3. **Use appropriate limits** when fetching contacts to avoid large responses

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

**Messages not being tracked:**
- Ensure all optional parameters are provided to `send_message`
- Check that contact data is being stored with `get_all_stored_contacts`
- Verify persistence is working with `get_top_contacts`

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

**Version**: 1.0.0  
**Last Updated**: August 28, 2025  
**MCP Framework**: Compatible with MCP 1.0+