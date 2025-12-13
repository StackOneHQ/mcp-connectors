# Available Connectors

This document lists all available MCP connectors and their basic configurations.

## Infrastructure & DevOps

### [HStacks](./connectors/hstacks.md)
Deploy and manage cloud infrastructure using hstacks.dev's API.

**Credentials:** `accessToken`

**Key Features:**
- Deploy Ubuntu/Debian/Rocky/CentOS servers
- Multi-region deployment (US, Germany, Finland)
- Firewall management
- Volume storage
- Stack lifecycle management

## Development & Code

### GitHub
Connect to GitHub repositories and manage issues, pull requests, and code.

**Credentials:** `token`

### GitLab
GitLab integration for repository and project management.

**Credentials:** `token`

## Project Management

### Asana
Task and project management with Asana.

**Credentials:** `apiKey`

### Jira
Issue tracking and project management with Atlassian Jira.

**Credentials:** `email`, `apiToken`, `domain`

### Linear
Modern issue tracking and project management.

**Credentials:** `apiKey`

### Todoist
Personal and team task management.

**Credentials:** `apiToken`

## Communication

### Slack
Team communication and workflow automation.

**Credentials:** `botToken`

## Documentation & Knowledge

### Notion
Knowledge management and documentation.

**Credentials:** `apiKey`

### Google Drive
File storage and document management.

**Credentials:** `clientId`, `clientSecret`, `refreshToken`

## Database & Backend

### Supabase
Backend-as-a-service with database, auth, and storage.

**Credentials:** `url`, `anonKey`

## Analytics & Monitoring

### Datadog
Infrastructure monitoring and analytics.

**Credentials:** `apiKey`, `appKey`

## HR & People

### HiBob
HR management and employee data.

**Credentials:** `apiKey`

### Deel
Global payroll and compliance management.

**Credentials:** `apiKey`

## CRM & Sales

### HubSpot
Customer relationship management and marketing automation.

**Credentials:** `accessToken`

### Attio
Modern CRM for growing businesses.

**Credentials:** `apiKey`

## Testing & Development Tools

### Test
Basic test connector for development and testing.

**Credentials:** None required

---

## Usage

To start any connector:

```bash
# Without credentials (test connector)
bun start --connector test

# With credentials
bun start --connector <connector-name> --credentials '{"key":"value"}'
```

The server will be available at `http://localhost:3000/mcp`

For detailed configuration and usage examples, see the individual connector documentation pages.