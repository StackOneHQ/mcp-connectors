import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import type { SecretProvider, ParsedSecretUri } from '../secret-resolver';

export class SSMProvider implements SecretProvider {
  readonly scheme = 'ssm';
  private clients = new Map<string, SSMClient>();

  async resolve(uri: ParsedSecretUri): Promise<string> {
    const region = uri.params.get('region') || process.env.AWS_REGION || 'us-east-1';
    const decrypt = uri.params.get('decrypt') === 'true';
    const version = uri.params.get('version');

    const client = this.getClient(region);
    
    const parameterName = uri.path.startsWith('/') ? uri.path : `/${uri.path}`;
    
    try {
      const command = new GetParameterCommand({
        Name: parameterName,
        WithDecryption: decrypt,
        ...(version && { VersionId: Number.parseInt(version, 10) }),
      });

      const response = await client.send(command);
      
      if (!response.Parameter?.Value) {
        throw new Error(`Parameter ${parameterName} not found or has no value`);
      }

      return response.Parameter.Value;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'ParameterNotFound') {
          throw new Error(`SSM parameter not found: ${parameterName}`);
        }
        if (error.name === 'AccessDeniedException') {
          throw new Error(`Access denied to SSM parameter: ${parameterName}`);
        }
        if (error.name === 'InvalidKeyId') {
          throw new Error(`Invalid KMS key for parameter: ${parameterName}`);
        }
      }
      throw error;
    }
  }

  private getClient(region: string): SSMClient {
    if (!this.clients.has(region)) {
      this.clients.set(region, new SSMClient({ region }));
    }
    return this.clients.get(region)!;
  }
}