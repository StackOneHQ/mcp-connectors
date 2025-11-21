import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { parse as parseHTML } from 'node-html-parser';
import { z } from 'zod';

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

const BASE_URL = 'https://html.duckduckgo.com/html';
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
};

const performSearch = async (
  query: string,
  maxResults: number
): Promise<SearchResult[]> => {
  console.info(`Searching DuckDuckGo for: ${query}`);

  try {
    const formData = new URLSearchParams();
    formData.append('q', query);
    formData.append('b', '');
    formData.append('kl', '');

    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        ...HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const html = await response.text();
    const results = parseSearchResults(html, maxResults);

    console.info(`Successfully found ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Search request failed:', error);
    throw error;
  }
};

const parseSearchResults = (html: string, maxResults: number): SearchResult[] => {
  const results: SearchResult[] = [];
  const root = parseHTML(html);

  // Find all search result elements
  const resultElements = root.querySelectorAll('.result');

  for (let i = 0; i < resultElements.length && results.length < maxResults; i++) {
    const element = resultElements[i];

    // Find title and link
    const titleElem = element?.querySelector('.result__title a');
    if (!titleElem) continue;

    const title = titleElem.text.trim();
    let link = titleElem.getAttribute('href') || '';

    // Skip ad results
    if (link.includes('y.js')) continue;

    // Clean up DuckDuckGo redirect URLs
    if (link.startsWith('//duckduckgo.com/l/?uddg=')) {
      const encodedUrl = link.split('uddg=')[1]?.split('&')[0] || '';
      link = decodeURIComponent(encodedUrl);
    }

    // Find snippet
    const snippetElem = element?.querySelector('.result__snippet');
    const snippet = snippetElem ? snippetElem.text.trim() : '';

    results.push({
      title,
      link,
      snippet,
      position: results.length + 1,
    });
  }

  return results;
};

const formatResultsForLLM = (results: SearchResult[]): string => {
  if (results.length === 0) {
    return "No results were found for your search query. This could be due to DuckDuckGo's bot detection or the query returned no matches. Please try rephrasing your search or try again in a few minutes.";
  }

  const output = [`Found ${results.length} search results:\n`];

  for (const result of results) {
    output.push(`${result.position}. ${result.title}`);
    output.push(`   URL: ${result.link}`);
    output.push(`   Summary: ${result.snippet}`);
    output.push(''); // Empty line between results
  }

  return output.join('\n');
};

const fetchAndParse = async (url: string): Promise<string> => {
  console.info(`Fetching content from: ${url}`);

  try {
    const response = await fetch(url, {
      headers: HEADERS,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const html = await response.text();
    const root = parseHTML(html);

    // Remove script, style, and nav elements
    for (const el of root.querySelectorAll('script, style, nav, header, footer')) {
      el.remove();
    }

    // Get the text content
    let text = root.text.trim();

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();

    // Truncate if too long
    if (text.length > 8000) {
      text = `${text.substring(0, 8000)}... [content truncated]`;
    }

    console.info(`Successfully fetched and parsed content (${text.length} characters)`);
    return text;
  } catch (error) {
    console.error(`Error fetching content from ${url}:`, error);
    throw error;
  }
};

export const DuckDuckGoConnectorConfig = mcpConnectorConfig({
  name: 'DuckDuckGo',
  key: 'duckduckgo',
  logo: 'https://stackone-logos.com/api/duckduckgo/filled/svg',
  version: '1.0.0',
  credentials: z.object({}),
  setup: z.object({}),
  examplePrompt:
    'Search for "TypeScript generics tutorial" and then fetch the content from the most relevant result to get detailed information.',
  tools: (tool) => ({
    SEARCH: tool({
      name: 'search',
      description: 'Search DuckDuckGo and return formatted results',
      schema: z.object({
        query: z.string().describe('The search query string'),
        maxResults: z
          .number()
          .default(10)
          .describe('Maximum number of results to return'),
      }),
      handler: async (args, _context) => {
        try {
          const results = await performSearch(args.query, args.maxResults);
          return formatResultsForLLM(results);
        } catch (error) {
          console.error('Error during search:', error);
          return `An error occurred while searching: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    FETCH_CONTENT: tool({
      name: 'fetch_content',
      description: 'Fetch and parse content from a webpage URL',
      schema: z.object({
        url: z.string().url().describe('The webpage URL to fetch content from'),
      }),
      handler: async (args, _context) => {
        try {
          const content = await fetchAndParse(args.url);
          return content;
        } catch (error) {
          console.error('Error fetching content:', error);
          return `Error: Could not fetch the webpage (${error instanceof Error ? error.message : String(error)})`;
        }
      },
    }),
  }),
});
