import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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

  const resultElements = root.querySelectorAll('.result');

  for (let i = 0; i < resultElements.length && results.length < maxResults; i++) {
    const element = resultElements[i];

    const titleElem = element?.querySelector('.result__title a');
    if (!titleElem) continue;

    const title = titleElem.text.trim();
    let link = titleElem.getAttribute('href') || '';

    if (link.includes('y.js')) continue;

    if (link.startsWith('//duckduckgo.com/l/?uddg=')) {
      const encodedUrl = link.split('uddg=')[1]?.split('&')[0] || '';
      link = decodeURIComponent(encodedUrl);
    }

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
    output.push('');
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

    for (const el of root.querySelectorAll('script, style, nav, header, footer')) {
      el.remove();
    }

    let text = root.text.trim();
    text = text.replace(/\s+/g, ' ').trim();

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

export interface DuckDuckGoCredentials {}

export function createDuckDuckGoServer(_credentials: DuckDuckGoCredentials): McpServer {
  const server = new McpServer({
    name: 'DuckDuckGo',
    version: '1.0.0',
  });

  server.tool(
    'search',
    'Search DuckDuckGo and return formatted results',
    {
      query: z.string().describe('The search query string'),
      maxResults: z
        .number()
        .default(10)
        .describe('Maximum number of results to return'),
    },
    async (args) => {
      try {
        const results = await performSearch(args.query, args.maxResults);
        return {
          content: [{
            type: 'text',
            text: formatResultsForLLM(results),
          }],
        };
      } catch (error) {
        console.error('Error during search:', error);
        return {
          content: [{
            type: 'text',
            text: `An error occurred while searching: ${error instanceof Error ? error.message : String(error)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'fetch_content',
    'Fetch and parse content from a webpage URL',
    {
      url: z.string().url().describe('The webpage URL to fetch content from'),
    },
    async (args) => {
      try {
        const content = await fetchAndParse(args.url);
        return {
          content: [{
            type: 'text',
            text: content,
          }],
        };
      } catch (error) {
        console.error('Error fetching content:', error);
        return {
          content: [{
            type: 'text',
            text: `Error: Could not fetch the webpage (${error instanceof Error ? error.message : String(error)})`,
          }],
        };
      }
    }
  );

  return server;
}
