# AppleScript Remote Builder

This directory contains a serverless AppleScript generation system that uses AI (Google Gemini) to generate AppleScript code remotely, then executes it locally on macOS.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MCP Client    │───▶│  Vercel Function │───▶│   Gemini LLM    │
│  (macOS)        │    │  (Serverless)    │    │  (Generation)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌──────────────────┐
│ Local AppleScript│    │  HMAC Security   │
│   Execution     │    │   Validation     │
└─────────────────┘    └──────────────────┘
```

## Components

### API Function (`api/make-applescript.ts`)
- Vercel serverless function for AppleScript generation
- Handles HMAC signature verification
- Validates requests against security policies
- Calls Google Gemini for code generation
- Returns safe, validated AppleScript code

### Security Layer (`lib/guard.ts`)
- Comprehensive denylist of dangerous patterns
- Validates AppleScript authenticity
- Prevents shell access and system modifications
- Warning system for suspicious patterns

### LLM Integration (`lib/llm_gemini.ts`)
- Google Gemini API wrapper
- Optimized prompts for safe AppleScript generation
- Error handling and response validation

### Signing System (`lib/signer.ts`)
- HMAC-SHA256 request authentication
- Timestamp validation to prevent replay attacks
- Timing-safe signature comparison

### Client (`remote_builder.ts`)
- Handles remote API communication
- Signs requests with HMAC
- Executes generated scripts locally

## Setup Instructions

### 1. Vercel Deployment

```bash
# Navigate to the AppleScript connector directory
cd packages/mcp-connectors/src/connectors/AppleScript

# Install Vercel CLI if needed
npm install -g vercel

# Deploy to Vercel
vercel

# Set root directory in Vercel dashboard:
# Project Settings → Build & Output Settings → Root Directory
# Set to: packages/mcp-connectors/src/connectors/AppleScript
```

### 2. Environment Variables

Set these in your Vercel project dashboard:

```bash
# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# HMAC signing secret (generate with: openssl rand -hex 32)
APPLESCRIPT_SIGNING_SECRET=your_64_character_hex_secret
```

### 3. Local Configuration

Set these environment variables on your macOS machine:

```bash
# Your deployed Vercel function URL
export APPLESCRIPT_REMOTE_ENDPOINT=https://your-project.vercel.app/AppleScript/make-applescript

# Same secret as used in Vercel
export APPLESCRIPT_SIGNING_SECRET=your_64_character_hex_secret
```

### 4. Vercel Project Settings

In the Vercel dashboard:

**Build & Output Settings:**
- Root Directory: `packages/mcp-connectors/src/connectors/AppleScript`
- Install Command: `bun install --frozen-lockfile`
- Build Command: `bun run build`
- Output Directory: (leave empty)
- Node.js Version: 20

## Usage

### Via MCP Tools

Once deployed and configured, two new tools are available:

#### `compose_and_execute`
Generate and execute AppleScript using AI:

```json
{
  "prompt": "Create a new note in Apple Notes with the title 'Meeting Notes' and add today's date",
  "context": "This is for a weekly team meeting",
  "dryRun": false
}
```

#### `execute_applescript` 
Execute raw AppleScript code locally:

```json
{
  "script": "tell application \"Finder\" to display dialog \"Hello World\"",
  "dryRun": false
}
```

### Direct API Usage

```typescript
import { createRemoteBuilder } from './remote_builder';

const builder = createRemoteBuilder();
const result = await builder.composeAndExecute(
  "Show a dialog with the current time",
  "Make it user-friendly"
);
```

## Security Features

### Request Security
- HMAC-SHA256 signature verification
- Timestamp validation (5-minute window)
- Request size limits (2KB prompt, 1KB context)

### Code Security
- Comprehensive denylist of dangerous patterns
- Shell access completely blocked
- System directory access prevented
- AppleScript validation checks

### Execution Security
- Local execution only (no remote code execution)
- Standard macOS permissions apply
- Existing AppleScript security model maintained

## Development

### Local Testing

```bash
# Install dependencies
bun install

# Test the serverless function locally
vercel dev

# Test a request
curl -X POST http://localhost:3000/api/make-applescript \
  -H "Content-Type: application/json" \
  -d '{"prompt":"display dialog \"test\"","signature":"...","timestamp":1234567890}'
```

### Adding Security Rules

Edit `lib/guard.ts` to add new dangerous patterns:

```typescript
const DANGEROUS_PATTERNS = [
  // Add new patterns here
  /new_dangerous_pattern/gi,
];
```

## Troubleshooting

### Common Issues

**"Missing environment variables"**
- Ensure `GEMINI_API_KEY` and `APPLESCRIPT_SIGNING_SECRET` are set in Vercel
- Verify local environment variables are exported

**"Invalid signature"**
- Check that the signing secret matches between Vercel and local
- Verify system clock is accurate (±30 seconds tolerance)

**"Chrome not found" (local execution)**
- Install Google Chrome or provide `chromePath` parameter
- This error appears when using web-related AppleScript tools

**"Permission denied" (AppleScript execution)**
- Grant Automation permissions in System Settings
- See main AppleScript connector README for detailed permissions

### Logs

Check Vercel function logs:
```bash
vercel logs your-project-url
```

## File Structure

```
AppleScript/
├── api/
│   └── make-applescript.ts         # Vercel serverless function
├── lib/
│   ├── llm_gemini.ts              # Gemini API wrapper
│   ├── guard.ts                   # Security validation
│   ├── signer.ts                  # HMAC signing utilities
│   └── types.ts                   # TypeScript interfaces
├── tools/
│   └── remote_builder.ts          # MCP tool definitions
├── remote_builder.ts              # Client implementation
├── package.json                   # Vercel dependencies
├── tsconfig.json                  # TypeScript configuration
├── vercel.json                    # Vercel routing
└── REMOTE_BUILDER_README.md      # This file
```

## Contributing

1. Test security changes thoroughly
2. Update dangerous pattern lists as needed
3. Maintain backward compatibility with existing tools
4. Follow existing code style and patterns

## License

Same as parent MCP connectors project.