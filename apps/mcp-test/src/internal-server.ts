#!/usr/bin/env node

import { faker } from '@faker-js/faker';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Define the input schema for the test data generator
const generateTestDataSchema = z.object({
  type: z
    .enum([
      // Person
      'email',
      'name',
      'fullname',
      'firstName',
      'lastName',
      'username',
      'password',
      'avatar',
      'jobTitle',

      // Contact
      'phone',
      'phoneNumber',

      // Location
      'address',
      'city',
      'state',
      'country',
      'zipCode',
      'latitude',
      'longitude',
      'timezone',

      // Internet
      'url',
      'domainName',
      'ipaddress',
      'ip',
      'ipv6',
      'mac',
      'userAgent',
      'protocol',
      'httpMethod',
      'httpStatusCode',

      // Identifiers
      'uuid',
      'nanoid',
      'cuid',

      // Time
      'date',
      'recentDate',
      'futureDate',
      'pastDate',
      'birthdate',
      'weekday',
      'month',

      // Numbers
      'number',
      'float',
      'integer',
      'bigint',
      'binary',
      'octal',
      'hexadecimal',

      // Text
      'string',
      'word',
      'words',
      'sentence',
      'paragraph',
      'slug',
      'text',

      // Business
      'company',
      'productName',
      'price',
      'creditCardNumber',
      'iban',
      'bic',
      'currencyCode',
      'currencySymbol',

      // Misc
      'boolean',
      'color',
      'hexColor',
      'rgbColor',
      'emoji',
      'fileName',
      'fileExtension',
      'mimeType',
      'locale',
      'alpha',
      'alphanumeric',
      'numeric',
    ])
    .describe('Data type to generate'),
  length: z
    .number()
    .optional()
    .describe('Length of data to generate (for strings, words, or numeric strings)'),
});

// Generate test data function
async function generateTestData(input: z.infer<typeof generateTestDataSchema>) {
  const { type, length } = input;

  try {
    let data: unknown;

    switch (type) {
      // Person
      case 'email':
        data = faker.internet.email();
        break;
      case 'name':
      case 'fullname':
        data = faker.person.fullName();
        break;
      case 'firstName':
        data = faker.person.firstName();
        break;
      case 'lastName':
        data = faker.person.lastName();
        break;
      case 'username':
        data = faker.internet.username();
        break;
      case 'password':
        data = faker.internet.password();
        break;
      case 'avatar':
        data = faker.image.avatar();
        break;
      case 'jobTitle':
        data = faker.person.jobTitle();
        break;

      // Contact
      case 'phone':
      case 'phoneNumber':
        data = faker.phone.number();
        break;

      // Location
      case 'address':
        data = faker.location.streetAddress(true);
        break;
      case 'city':
        data = faker.location.city();
        break;
      case 'state':
        data = faker.location.state();
        break;
      case 'country':
        data = faker.location.country();
        break;
      case 'zipCode':
        data = faker.location.zipCode();
        break;
      case 'latitude':
        data = faker.location.latitude();
        break;
      case 'longitude':
        data = faker.location.longitude();
        break;
      case 'timezone':
        data = faker.location.timeZone();
        break;

      // Internet
      case 'url':
        data = faker.internet.url();
        break;
      case 'domainName':
        data = faker.internet.domainName();
        break;
      case 'ipaddress':
      case 'ip':
        data = faker.internet.ip();
        break;
      case 'ipv6':
        data = faker.internet.ipv6();
        break;
      case 'mac':
        data = faker.internet.mac();
        break;
      case 'userAgent':
        data = faker.internet.userAgent();
        break;
      case 'protocol':
        data = faker.internet.protocol();
        break;
      case 'httpMethod':
        data = faker.internet.httpMethod();
        break;
      case 'httpStatusCode':
        data = faker.internet.httpStatusCode();
        break;

      // Identifiers
      case 'uuid':
        data = faker.string.uuid();
        break;
      case 'nanoid':
        data = faker.string.nanoid();
        break;
      case 'cuid':
        data = faker.git.commitSha(); // Using as alternative for cuid
        break;

      // Time
      case 'date':
        data = faker.date.recent().toISOString();
        break;
      case 'recentDate':
        data = faker.date.recent().toISOString();
        break;
      case 'futureDate':
        data = faker.date.future().toISOString();
        break;
      case 'pastDate':
        data = faker.date.past().toISOString();
        break;
      case 'birthdate':
        data = faker.date.birthdate().toISOString();
        break;
      case 'weekday':
        data = faker.date.weekday();
        break;
      case 'month':
        data = faker.date.month();
        break;

      // Numbers
      case 'number':
      case 'integer':
        data = faker.number.int({ min: 1, max: length || 1000 });
        break;
      case 'float':
        data = faker.number.float({ min: 0, max: length || 1000, fractionDigits: 2 });
        break;
      case 'bigint':
        data = faker.number
          .bigInt({ min: 1n, max: BigInt(length || 1000000) })
          .toString();
        break;
      case 'binary':
        data = faker.string.binary({ length: length || 8 });
        break;
      case 'octal':
        data = faker.string.octal({ length: length || 8 });
        break;
      case 'hexadecimal':
        data = faker.string.hexadecimal({ length: length || 8 });
        break;

      // Text
      case 'string':
      case 'text':
        data = faker.lorem.text();
        break;
      case 'word':
        data = faker.lorem.word();
        break;
      case 'words':
        data = faker.lorem.words(length || 5);
        break;
      case 'sentence':
        data = faker.lorem.sentence();
        break;
      case 'paragraph':
        data = faker.lorem.paragraph(length || 3);
        break;
      case 'slug':
        data = faker.lorem.slug(length || 3);
        break;

      // Business
      case 'company':
        data = faker.company.name();
        break;
      case 'productName':
        data = faker.commerce.productName();
        break;
      case 'price':
        data = faker.commerce.price();
        break;
      case 'creditCardNumber':
        data = faker.finance.creditCardNumber();
        break;
      case 'iban':
        data = faker.finance.iban();
        break;
      case 'bic':
        data = faker.finance.bic();
        break;
      case 'currencyCode':
        data = faker.finance.currencyCode();
        break;
      case 'currencySymbol':
        data = faker.finance.currencySymbol();
        break;

      // Misc
      case 'boolean':
        data = faker.datatype.boolean();
        break;
      case 'color':
        data = faker.color.human();
        break;
      case 'hexColor':
        data = faker.color.rgb({ format: 'hex' });
        break;
      case 'rgbColor':
        data = faker.color.rgb();
        break;
      case 'emoji':
        data = faker.internet.emoji();
        break;
      case 'fileName':
        data = faker.system.fileName();
        break;
      case 'fileExtension':
        data = faker.system.fileExt();
        break;
      case 'mimeType':
        data = faker.system.mimeType();
        break;
      case 'locale':
        data = faker.location.countryCode();
        break;
      case 'alpha':
        data = faker.string.alpha({ length: length || 10 });
        break;
      case 'alphanumeric':
        data = faker.string.alphanumeric({ length: length || 10 });
        break;
      case 'numeric':
        data = faker.string.numeric({ length: length || 10 });
        break;

      default:
        data = faker.lorem.word();
    }

    return { data };
  } catch (error) {
    return {
      error: `Failed to generate test data: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Create and configure the MCP server
const server = new McpServer(
  {
    name: 'test-data-generator',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register the generate_test_data tool
server.tool(
  'generate_test_data',
  'Generate realistic test data for basic data types using faker-js',
  {
    type: {
      type: 'string',
      enum: generateTestDataSchema.shape.type.options,
      description: 'Data type to generate',
    },
    length: {
      type: 'number',
      description: 'Length of data to generate (for strings, words, or numeric strings)',
    },
  },
  async (args: unknown) => {
    const input = generateTestDataSchema.parse(args);
    const result = await generateTestData(input);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Using console.error for stdio server to avoid interfering with stdio transport
  console.error('Test Data Generator MCP Server running on stdio');
}

main().catch((error) => {
  // Using console.error for stdio server to avoid interfering with stdio transport
  console.error('Server error:', error);
  process.exit(1);
});
