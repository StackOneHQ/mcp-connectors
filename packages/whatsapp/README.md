# WhatsApp MCP (Twilio) -- Send & Read

Minimal WhatsApp connector for Disco MCP. BYO credentials. Two tools: send_message, get_messages.

## Env

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
WHATSAPP_PROVIDER=twilio
```

## Quick Start

```bash
# from repo root
bun install

# local sanity: list tools
cd packages/whatsapp
TWILIO_ACCOUNT_SID=ACxxx \
TWILIO_AUTH_TOKEN=xxx \
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886 \
bun src/index.ts tools

# send a message
TWILIO_ACCOUNT_SID=ACxxx \
TWILIO_AUTH_TOKEN=xxx \
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886 \
bun src/index.ts call '{"name":"send_message","args":{"to":"whatsapp:+44YOURNUMBER","body":"disco mcp hello 👋"}}'
```

## Using in Claude Code / Postman MCP

Provide credentials (same keys as above) in the server config/credentials section. Then call:

- send_message({ "to":"whatsapp:+44...", "body":"doors open at 6:15 🎶" })
- get_messages({ "limit": 5 })

## Notes

- For fast demos use **Twilio WhatsApp Sandbox**: join the sandbox from your phone in Twilio console; you'll then receive messages from your own number.
- This package is BYO-secrets; each user provides their own credentials. No centralized hosting required.
- WHATSAPP_PROVIDER=cloudapi reserved for future Meta WhatsApp Cloud API support.

## API Reference

### send_message

Send a WhatsApp message via Twilio.

**Input:**
```json
{
  "to": "whatsapp:+1234567890",
  "body": "Hello from MCP!"
}
```

**Output:**
```json
{
  "sid": "SM1234567890123456789012345678901234",
  "status": "queued"
}
```

### get_messages

Retrieve WhatsApp message history via Twilio. Messages are sorted newest first.

**Input:**
```json
{
  "limit": 10,
  "from": "whatsapp:+1234567890",
  "to": "whatsapp:+0987654321"
}
```

**Output:**
```json
{
  "messages": [
    {
      "sid": "SM1234567890123456789012345678901234",
      "from": "whatsapp:+1234567890",
      "to": "whatsapp:+0987654321",
      "body": "Hello!",
      "dateCreated": "2024-01-01T12:00:00.000Z",
      "direction": "outbound-api",
      "status": "delivered"
    }
  ]
}
```

## Error Handling

- Missing or invalid environment variables will throw clear error messages at startup
- Invalid tool inputs (wrong format, missing fields) return structured validation errors
- WhatsApp numbers must start with `whatsapp:` prefix
- Message body cannot be empty

## Development

```bash
# Install dependencies
bun install

# Start with file watching
bun run dev

# Run locally
bun run start
```