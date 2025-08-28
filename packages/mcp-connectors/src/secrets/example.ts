/**
 * Example usage of SecretResolver with AWS SSM
 * 
 * This demonstrates how to use SecretResolver in MCP connectors
 * to resolve both plain strings and AWS SSM parameter references.
 */

import { SecretResolver, SSMProvider } from './index';

export async function demonstrateSecretResolver() {
  // Initialize resolver with SSM provider
  const resolver = new SecretResolver();
  resolver.registerProvider(new SSMProvider());

  console.log('🔒 SecretResolver Demo');
  console.log('====================\n');

  // Example 1: Plain string (backward compatibility)
  console.log('1. Plain API token (backward compatible):');
  const plainToken = await resolver.resolve('my-plain-api-token');
  console.log(`   Input:  'my-plain-api-token'`);
  console.log(`   Output: '${plainToken}'\n`);

  // Example 2: SSM parameter reference
  console.log('2. SSM parameter reference:');
  const ssmUri = 'ssm:///disco/jira/api-token?decrypt=true&ttl=300&region=us-east-1';
  console.log(`   Input:  '${ssmUri}'`);
  
  try {
    const resolvedToken = await resolver.resolve(ssmUri);
    console.log(`   Output: '[RESOLVED_SECRET_FROM_SSM]' (length: ${resolvedToken.length})`);
  } catch (error) {
    console.log(`   Error:  ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log('\n3. How it works in Jira connector:');
  console.log(`   // User enters in Disco UI:`);
  console.log(`   // API Token: ssm:///disco/jira/api-token?decrypt=true`);
  console.log(`   `);
  console.log(`   // Connector code:`);
  console.log(`   const credentials = await context.getCredentials();`);
  console.log(`   const { apiToken } = await resolveJiraCredentials(credentials);`);
  console.log(`   // apiToken is now the resolved secret value from SSM`);

  console.log('\n✅ SecretResolver successfully integrated!');
  console.log('   - Backward compatible with plain strings');
  console.log('   - Supports AWS SSM with encryption');
  console.log('   - Built-in caching with configurable TTL');
  console.log('   - Extensible for other providers (1Password, Vault, etc.)');

  // Clean up
  resolver.destroy();
}

// Uncomment to run the demo:
// demonstrateSecretResolver().catch(console.error);