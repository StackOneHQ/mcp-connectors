import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface WebPageContent {
  title: string;
  url: string;
  headings: Array<{ level: number; text: string }>;
  mainText: string;
  links: Array<{ text: string; href: string }>;
  buttons: string[];
  forms: Array<{ inputs: Array<{ type: string; label: string }> }>;
  images: string[];
}

interface PageSummary {
  summary: string;
  keyPoints: string[];
  interactiveElements: {
    buttons: string[];
    links: string[];
    forms: number;
  };
}

class CluelessAIClient {
  constructor() {
    // Note: GROQ API integration can be added later when needed
  }

  async generateElementSelectors(request: string, _pageSnippet: string): Promise<string[]> {
    // For now, always use local processing to avoid fetch compatibility issues
    // TODO: Add GROQ API integration when fetch types are available
    return this.generateLocalSelectors(request);
  }

  private generateLocalSelectors(request: string): string[] {
    const keywords = this.extractKeywords(request);
    const selectors: string[] = [];

    keywords.forEach(keyword => {
      // Direct text content searches
      selectors.push(`a:contains("${keyword}")`);
      selectors.push(`button:contains("${keyword}")`);
      selectors.push(`*[role="tab"]:contains("${keyword}")`);
      selectors.push(`nav *:contains("${keyword}")`);
      
      // Attribute-based searches
      selectors.push(`[aria-label*="${keyword}" i]`);
      selectors.push(`[title*="${keyword}" i]`);
      selectors.push(`[href*="${keyword}" i]`);
      selectors.push(`[class*="${keyword}" i]`);
    });

    return selectors;
  }

  extractKeywords(request: string): string[] {
    const phrases = [
      'pull request', 'pull requests', 
      'merge request', 'merge requests',
      'sign in', 'sign up', 'log in', 'log out',
      'shopping cart', 'contact us', 'about us'
    ];
    
    let cleanRequest = request.toLowerCase();
    const foundPhrases: string[] = [];
    
    phrases.forEach(phrase => {
      if (cleanRequest.includes(phrase)) {
        foundPhrases.push(phrase);
        cleanRequest = cleanRequest.replace(new RegExp(phrase, 'g'), '');
      }
    });
    
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'how', 'where', 'what', 'when', 'why', 'can', 'could', 'should', 'would', 'find', 'show', 'help', 'me', 'i', 'want', 'need']);
    
    const words = cleanRequest
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
    
    return [...new Set([...foundPhrases, ...words])];
  }

  async generatePageSummary(pageContent: WebPageContent): Promise<PageSummary> {
    let summary = '';
    const keyPoints: string[] = [];
    
    // Generate summary from title and headings
    if (pageContent.title) {
      summary = `This page is titled "${pageContent.title}"`;
      
      if (pageContent.headings?.length > 0) {
        const mainHeadings = pageContent.headings.slice(0, 3).map(h => h.text).join(', ');
        summary += ` and covers topics including: ${mainHeadings}.`;
      } else {
        summary += '.';
      }
      
      // Add main text context if available
      if (pageContent.mainText?.length > 50) {
        const firstSentence = pageContent.mainText.split('.')[0];
        if (firstSentence && firstSentence.length > 10 && firstSentence.length < 200) {
          summary += ` ${firstSentence}.`;
        }
      }
    } else {
      summary = 'This webpage contains various content and functionality.';
    }
    
    // Generate key points from available actions
    if (pageContent.buttons?.length > 0) {
      keyPoints.push(`Interactive buttons: ${pageContent.buttons.slice(0, 3).join(', ')}`);
    }
    
    if (pageContent.links?.length > 0) {
      const linkTexts = pageContent.links.slice(0, 3).map(l => l.text).filter(t => t);
      if (linkTexts.length > 0) {
        keyPoints.push(`Navigation links: ${linkTexts.join(', ')}`);
      }
    }
    
    if (pageContent.forms?.length > 0) {
      keyPoints.push('Forms available for user input');
    }
    
    // Add URL context
    if (pageContent.url) {
      try {
        // Use basic URL parsing instead of URL constructor for better compatibility
        const domain = pageContent.url.split('/')[2] || pageContent.url;
        keyPoints.push(`Visit ${domain} for more information`);
      } catch (e) {
        // Invalid URL, skip
      }
    }
    
    // Ensure we have at least some key points
    if (keyPoints.length === 0) {
      keyPoints.push(
        'Browse the content on this page',
        'Use navigation links to explore',
        'Look for interactive elements to engage with'
      );
    }
    
    return {
      summary,
      keyPoints,
      interactiveElements: {
        buttons: pageContent.buttons || [],
        links: (pageContent.links || []).map(l => l.text),
        forms: (pageContent.forms || []).length
      }
    };
  }
}

export const CluelessAIConnectorConfig = mcpConnectorConfig({
  name: 'Clueless AI',
  key: 'clueless_ai',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/robot/filled/svg',
  credentials: z.object({
    groq_api_key: z
      .string()
      .optional()
      .describe('GROQ API Key for advanced AI features :: gsk_1234567890 :: https://console.groq.com'),
  }),
  setup: z.object({}),
  examplePrompt: 'Generate CSS selectors to find the search bar on a webpage, summarize page content, and provide guidance for web navigation.',
  tools: (tool: any) => ({
    GENERATE_ELEMENT_SELECTORS: tool({
      name: 'clueless_ai_generate_element_selectors',
      description: 'Generate CSS selectors to find specific elements on a webpage based on natural language descriptions',
      schema: z.object({
        request: z.string().describe('Natural language description of what to find (e.g., "find the search bar", "locate the login button")'),
        pageSnippet: z.string().optional().describe('Optional snippet of page content to provide context for better selector generation'),
      }),
      handler: async (args: any, _context: any) => {
        try {
          const client = new CluelessAIClient();
          
          const selectors = await client.generateElementSelectors(args.request, args.pageSnippet || '');
          
          return JSON.stringify({
            request: args.request,
            selectors: selectors,
            count: selectors.length,
            usage_tip: 'Use these CSS selectors with document.querySelectorAll() to find matching elements on the webpage'
          }, null, 2);
        } catch (error) {
          return `Failed to generate element selectors: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    ANALYZE_PAGE_CONTENT: tool({
      name: 'clueless_ai_analyze_page_content',
      description: 'Analyze and summarize webpage content structure and interactive elements',
      schema: z.object({
        title: z.string().describe('Page title'),
        url: z.string().describe('Page URL'),
        headings: z.array(z.object({
          level: z.number().describe('Heading level (1-6)'),
          text: z.string().describe('Heading text content')
        })).optional().describe('Page headings'),
        mainText: z.string().optional().describe('Main text content of the page'),
        links: z.array(z.object({
          text: z.string().describe('Link text'),
          href: z.string().describe('Link URL')
        })).optional().describe('Navigation and content links'),
        buttons: z.array(z.string()).optional().describe('Button texts'),
        forms: z.array(z.object({
          inputs: z.array(z.object({
            type: z.string().describe('Input type'),
            label: z.string().describe('Input label or placeholder')
          }))
        })).optional().describe('Form structures'),
        images: z.array(z.string()).optional().describe('Image alt texts'),
      }),
      handler: async (args: any, _context: any) => {
        try {
          const client = new CluelessAIClient();
          
          const pageContent: WebPageContent = {
            title: args.title,
            url: args.url,
            headings: args.headings || [],
            mainText: args.mainText || '',
            links: args.links || [],
            buttons: args.buttons || [],
            forms: args.forms || [],
            images: args.images || []
          };
          
          const summary = await client.generatePageSummary(pageContent);
          
          return JSON.stringify({
            page_analysis: {
              url: args.url,
              title: args.title,
              summary: summary.summary,
              key_points: summary.keyPoints,
              interactive_elements: summary.interactiveElements,
              content_stats: {
                headings_count: pageContent.headings.length,
                links_count: pageContent.links.length,
                buttons_count: pageContent.buttons.length,
                forms_count: pageContent.forms.length,
                images_count: pageContent.images.length
              }
            }
          }, null, 2);
        } catch (error) {
          return `Failed to analyze page content: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GENERATE_GUIDANCE_MESSAGE: tool({
      name: 'clueless_ai_generate_guidance_message',
      description: 'Generate user-friendly guidance messages for web navigation and interaction',
      schema: z.object({
        request: z.string().describe('User\'s original request for help'),
        foundElements: z.array(z.string()).describe('Types of elements found (e.g., "button", "link", "form")'),
        context: z.string().optional().describe('Additional context about the page or elements'),
      }),
      handler: async (args: any, _context: any) => {
        try {
          const elementTypes = args.foundElements;
          const isInteractive = elementTypes.some((type: string) => 
            ['button', 'link', 'input', 'select', 'textarea'].includes(type.toLowerCase())
          );
          
          let guidance = `Found ${elementTypes.length} element(s) matching "${args.request}".`;
          
          if (isInteractive) {
            guidance += ' These are interactive elements you can click or use.';
          } else {
            guidance += ' These elements contain the content you\'re looking for.';
          }
          
          if (args.context) {
            guidance += ` ${args.context}`;
          }
          
          const actionSuggestions = [];
          if (elementTypes.includes('button')) {
            actionSuggestions.push('Click the button to proceed');
          }
          if (elementTypes.includes('link')) {
            actionSuggestions.push('Click the link to navigate');
          }
          if (elementTypes.includes('input')) {
            actionSuggestions.push('Enter text in the input field');
          }
          if (elementTypes.includes('form')) {
            actionSuggestions.push('Fill out the form with your information');
          }
          
          return JSON.stringify({
            guidance_message: guidance,
            action_suggestions: actionSuggestions,
            interactive: isInteractive,
            element_count: elementTypes.length
          }, null, 2);
        } catch (error) {
          return `Failed to generate guidance message: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    EXTRACT_KEYWORDS: tool({
      name: 'clueless_ai_extract_keywords',
      description: 'Extract meaningful keywords from natural language requests for element finding',
      schema: z.object({
        text: z.string().describe('Natural language text to extract keywords from'),
        includePhases: z.boolean().optional().default(true).describe('Whether to detect multi-word phrases'),
      }),
      handler: async (args: any, _context: any) => {
        try {
          const client = new CluelessAIClient();
          const keywords = client.extractKeywords(args.text);
          
          // Separate single words from phrases
          const singleWords = keywords.filter((k: string) => !k.includes(' '));
          const phrases = keywords.filter((k: string) => k.includes(' '));
          
          return JSON.stringify({
            original_text: args.text,
            all_keywords: keywords,
            single_words: singleWords,
            phrases: phrases,
            total_count: keywords.length,
            usage_tip: 'Use these keywords to generate CSS selectors or search for elements'
          }, null, 2);
        } catch (error) {
          return `Failed to extract keywords: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});