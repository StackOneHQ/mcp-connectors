import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

const searchDocumentation = async (keywords: string): Promise<string> => {
  const res = await fetch('https://docs.stackone.com/llms-full.txt');
  const text = await res.text();

  const searchTerms = keywords
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 1);

  if (searchTerms.length === 0) {
    return 'No valid search terms provided. Please provide keywords to search for.';
  }

  const chunks = splitIntoChunks(text);

  const scoredChunks = chunks.map((chunk) => ({
    chunk,
    score: scoreChunk(chunk, searchTerms),
  }));

  const relevantChunks = scoredChunks
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (relevantChunks.length === 0) {
    return `No relevant documentation found for keywords: "${keywords}". Try different or more general search terms.`;
  }

  const results = relevantChunks
    .map(
      (item, idx) =>
        `### Search Result ${idx + 1} (Score: ${item.score.toFixed(
          2
        )})\n\n${item.chunk.trim()}`
    )
    .join(`\n\n${'---'.repeat(20)}\n\n`);

  return `Found ${relevantChunks.length} relevant sections for "${keywords}":\n\n${results}`;
};

const splitIntoChunks = (text: string): string[] => {
  const chunks = text.split(/\n\s*\n/);

  const maxChunkSize = 2000;
  const finalChunks: string[] = [];

  for (const chunk of chunks) {
    if (chunk.length <= maxChunkSize) {
      finalChunks.push(chunk);
    } else {
      const sentences = chunk.split(/[.!?]\s+|\n/);
      let currentChunk = '';

      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length <= maxChunkSize) {
          currentChunk += (currentChunk ? '. ' : '') + sentence;
        } else {
          if (currentChunk) finalChunks.push(currentChunk);
          currentChunk = sentence;
        }
      }

      if (currentChunk) finalChunks.push(currentChunk);
    }
  }

  return finalChunks.filter((chunk) => chunk.trim().length > 50);
};

const scoreChunk = (chunk: string, searchTerms: string[]): number => {
  const lowerChunk = chunk.toLowerCase();
  let score = 0;

  for (const term of searchTerms) {
    const exactMatches = (lowerChunk.match(new RegExp(`\\b${term}\\b`, 'g')) || [])
      .length;
    score += exactMatches * 10;

    const partialMatches =
      (lowerChunk.match(new RegExp(term, 'g')) || []).length - exactMatches;
    score += partialMatches * 3;

    if (exactMatches > 0 || partialMatches > 0) {
      score += 2;
    }
  }

  const uniqueTermsFound = searchTerms.filter((term) => lowerChunk.includes(term)).length;

  if (uniqueTermsFound > 1) {
    score += uniqueTermsFound * 5;
  }

  return score;
};

export const StackOneConnectorConfig = mcpConnectorConfig({
  name: 'StackOne',
  key: 'stackone',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/stackone/filled/svg',
  credentials: z.object({}),
  setup: z.object({}),
  description:
    'StackOne is an integrations platform for building AI agents. It allows you to read and write to various APIs and third party services with a single unified interface.',
  examplePrompt:
    'Search the StackOne documentation for information about authentication methods, API endpoints, and integration best practices.',
  tools: (tool) => ({
    SEARCH_STACKONE_DOCS: tool({
      name: 'stackone_search_docs',
      description:
        'Search StackOne documentation using fuzzy search over keywords. Returns relevant large chunks of documentation.',
      schema: z.object({
        keywords: z
          .string()
          .describe('Keywords or search terms to find in the StackOne documentation'),
      }),
      handler: async (args, _context) => {
        try {
          return await searchDocumentation(args.keywords);
        } catch (error) {
          return `Error searching StackOne documentation: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`;
        }
      },
    }),
  }),
});
