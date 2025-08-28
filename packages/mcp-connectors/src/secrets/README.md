# SecretResolver for MCP Connectors

A secure, extensible system for resolving secret references in MCP connectors, starting with AWS SSM Parameter Store support.

## Overview

SecretResolver allows connectors to accept secret handles instead of raw plaintext tokens when configuring integrations in Disco. This provides:

- **Security**: Secrets are no longer embedded directly into configs or prompts
- **Rotation**: Updating secrets in the store automatically propagates after cache expiry
- **Extensibility**: Provider-agnostic design supports multiple secret stores
- **Backward Compatibility**: Plain strings continue to work unchanged

## Usage

### Basic Setup

```typescript
import { SecretResolver, SSMProvider } from '../secrets';

// Initialize resolver with providers
const resolver = new SecretResolver();
resolver.registerProvider(new SSMProvider());

// Resolve secrets (works with both plain strings and URIs)
const apiToken = await resolver.resolve(credentialValue);
```

### In Connectors

```typescript
// Helper function to resolve all credentials
async function resolveJiraCredentials(credentials: JiraCredentials) {
  const resolver = new SecretResolver();
  resolver.registerProvider(new SSMProvider());
  
  return {
    baseUrl: credentials.baseUrl,
    email: credentials.email,
    apiToken: await resolver.resolve(credentials.apiToken), // Resolves both plain strings and secret URIs
  };
}

// Use in tool handlers
const credentials = await context.getCredentials();
const { baseUrl, email, apiToken } = await resolveJiraCredentials(credentials);
const client = new JiraClient(baseUrl, email, apiToken);
```

## Supported Providers

### AWS SSM Parameter Store

**URI Format**: `ssm:///parameter-name?params`

**Parameters**:
- `decrypt=true` - Enable KMS decryption for SecureString parameters
- `version=N` - Fetch specific parameter version
- `ttl=300` - Cache duration in seconds (default: 300)
- `region=us-west-2` - AWS region override

**Examples**:
```
ssm:///disco/jira/api-token?decrypt=true&ttl=600
ssm:///myapp/database/password?decrypt=true&region=eu-west-1
ssm:///shared/api-keys/github?version=5
```

**IAM Requirements**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter"
      ],
      "Resource": "arn:aws:ssm:*:*:parameter/disco/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": "arn:aws:kms:*:*:key/*",
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "ssm.*.amazonaws.com"
        }
      }
    }
  ]
}
```

## Caching

SecretResolver includes built-in caching with TTL support:

- Values are cached in memory only (never persisted to disk)
- Default TTL is 300 seconds (5 minutes)
- TTL can be customized per secret via `ttl` parameter
- Cache automatically cleans up expired entries
- No logging of cached values for security

## Security Features

- **No Logging**: Resolved secret values are never logged
- **Memory Only**: Secrets are only cached in memory, never written to disk
- **KMS Support**: Full support for AWS KMS-encrypted parameters
- **IAM Integration**: Uses standard AWS IAM authentication
- **Error Handling**: Clear error messages that don't expose secret values

## Extensibility

Adding new providers is straightforward:

```typescript
import type { SecretProvider, ParsedSecretUri } from './secret-resolver';

class MyProvider implements SecretProvider {
  readonly scheme = 'myprovider';
  
  async resolve(uri: ParsedSecretUri): Promise<string> {
    // Implementation here
    return 'resolved-secret';
  }
}

// Register the provider
resolver.registerProvider(new MyProvider());
```

## Example Flow

1. **User Configuration** (in Disco UI):
   ```
   API Token: ssm:///disco/jira/api-token?decrypt=true&ttl=300
   ```

2. **Connector Resolution**:
   ```typescript
   const resolver = new SecretResolver();
   resolver.registerProvider(new SSMProvider());
   const actualToken = await resolver.resolve('ssm:///disco/jira/api-token?decrypt=true&ttl=300');
   // actualToken = "ATATT3xFfGF0..." (actual Jira API token from SSM)
   ```

3. **API Usage**:
   ```typescript
   const client = new JiraClient(baseUrl, email, actualToken);
   // All API calls use the resolved token
   ```

## Future Providers

The system is designed to support additional providers:

- **1Password Connect**: `op:///vault/item/field`
- **AWS Secrets Manager**: `aws-sm:///secret-name`
- **HashiCorp Vault**: `vault:///secret/path`
- **Google Secret Manager**: `gsm:///projects/project/secrets/secret`
- **Doppler**: `doppler:///project/environment/secret`

## Testing

Run tests with:
```bash
npm test -- src/secrets
```

Tests cover:
- Core SecretResolver functionality
- Cache behavior and TTL
- AWS SSM provider with various parameters
- Error handling and edge cases
- Backward compatibility with plain strings