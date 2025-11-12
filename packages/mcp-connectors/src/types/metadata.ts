/**
 * Metadata for a connector, used by platforms like Disco to display information
 * about the connector to users.
 */
export interface ConnectorMetadata {
  /**
   * Unique key identifying the connector (e.g., 'github', 'slack')
   */
  key: string;

  /**
   * Display name of the connector (e.g., 'GitHub', 'Slack')
   */
  name: string;

  /**
   * Brief description of what the connector does
   */
  description: string;

  /**
   * Connector version
   */
  version: string;

  /**
   * URL to the connector's logo/icon (optional)
   */
  logo?: string;

  /**
   * Example prompt that demonstrates how to use the connector (optional)
   */
  examplePrompt?: string;

  /**
   * Categories for filtering connectors (optional)
   */
  categories?: readonly string[];
}
