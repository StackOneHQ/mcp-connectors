import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface GeminiImageGenerationResult {
  images: Array<{
    url: string;
    width: number;
    height: number;
    mimeType: string;
  }>;
  prompt: string;
  model: string;
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
  };
}

interface GeminiImageEditResult {
  image: {
    url: string;
    width: number;
    height: number;
    mimeType: string;
  };
  prompt: string;
  model: string;
}

class GeminiImageClient {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateImage(
    prompt: string,
    model: string = 'gemini-1.5-flash',
    generationConfig?: {
      temperature?: number;
      topK?: number;
      topP?: number;
      maxOutputTokens?: number;
    }
  ): Promise<GeminiImageGenerationResult> {
    const response = await fetch(
      `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: generationConfig || {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as any;
    
    // Extract image data from the response
    const images = data.candidates?.[0]?.content?.parts
      ?.filter((part: any) => part.inlineData?.mimeType?.startsWith('image/'))
      ?.map((part: any) => ({
        url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
        width: 1024, // Default size for Gemini generated images
        height: 1024,
        mimeType: part.inlineData.mimeType,
      })) || [];

    return {
      images,
      prompt,
      model,
      generationConfig,
    };
  }

  async editImage(
    prompt: string,
    imageUrl: string,
    model: string = 'gemini-1.5-flash'
  ): Promise<GeminiImageEditResult> {
    // For image editing, we need to encode the image as base64
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

    const response = await fetch(
      `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as any;
    
    // Extract edited image data from the response
    const editedImage = data.candidates?.[0]?.content?.parts
      ?.find((part: any) => part.inlineData?.mimeType?.startsWith('image/'));
    
    if (!editedImage) {
      throw new Error('No edited image was generated');
    }

    return {
      image: {
        url: `data:${editedImage.inlineData.mimeType};base64,${editedImage.inlineData.data}`,
        width: 1024,
        height: 1024,
        mimeType: editedImage.inlineData.mimeType,
      },
      prompt,
      model,
    };
  }

  async analyzeImage(
    prompt: string,
    imageUrl: string,
    model: string = 'gemini-1.5-flash'
  ): Promise<string> {
    // For image analysis, we need to encode the image as base64
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

    const response = await fetch(
      `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as any;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis generated';
  }
}

export const GeminiImageConnectorConfig = mcpConnectorConfig({
  name: 'Gemini Image Generation',
  key: 'gemini-image',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/google/filled/svg',
  credentials: z.object({
    apiKey: z
      .string()
      .describe(
        'Google AI Studio API Key from https://makersuite.google.com/app/apikey :: AIzaSyC...'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'Generate a beautiful image of "a serene mountain landscape at sunset with a crystal clear lake reflecting the sky" using Gemini.',
  tools: (tool) => ({
    GENERATE_IMAGE: tool({
      name: 'gemini_generate_image',
      description: 'Generate images using Google Gemini AI models',
      schema: z.object({
        prompt: z.string().describe('Detailed description of the image to generate'),
        model: z
          .enum(['gemini-1.5-flash', 'gemini-1.5-pro'])
          .default('gemini-1.5-flash')
          .describe('Gemini model to use for image generation'),
        temperature: z
          .number()
          .min(0)
          .max(2)
          .default(0.7)
          .describe('Controls randomness in generation (0 = deterministic, 2 = very random)'),
        topK: z
          .number()
          .min(1)
          .max(100)
          .default(40)
          .describe('Limits the number of tokens considered for each step'),
        topP: z
          .number()
          .min(0)
          .max(1)
          .default(0.95)
          .describe('Controls diversity via nucleus sampling'),
        maxOutputTokens: z
          .number()
          .min(1)
          .max(8192)
          .default(2048)
          .describe('Maximum number of tokens in the response'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new GeminiImageClient(apiKey);

          const generationConfig = {
            temperature: args.temperature,
            topK: args.topK,
            topP: args.topP,
            maxOutputTokens: args.maxOutputTokens,
          };

          const result = await client.generateImage(args.prompt, args.model, generationConfig);

          if (result.images.length === 0) {
            return 'No images were generated. Please try with a different prompt or model.';
          }

          // Format response with image data and metadata
          const imageResults = result.images.map((image, index) => ({
            url: image.url,
            width: image.width,
            height: image.height,
            mimeType: image.mimeType,
            index: index + 1,
          }));

          return `## Gemini Image Generation Results

**Model:** ${result.model}
**Prompt:** "${result.prompt}"
**Images Generated:** ${result.images.length}

### Generated Images:
${imageResults
  .map(
    (img) =>
      `**Image ${img.index}:**
- Data URL: ${img.url.substring(0, 100)}... (truncated)
- Size: ${img.width}x${img.height}
- Type: ${img.mimeType}`
  )
  .join('\n\n')}

### Generation Configuration:
- Temperature: ${generationConfig.temperature}
- Top-K: ${generationConfig.topK}
- Top-P: ${generationConfig.topP}
- Max Output Tokens: ${generationConfig.maxOutputTokens}

**Note:** Images are returned as base64 data URLs. You can copy the full data URL to view the image in a browser.`;
        } catch (error) {
          return `Failed to generate image: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    EDIT_IMAGE: tool({
      name: 'gemini_edit_image',
      description: 'Edit images using text prompts with Gemini AI',
      schema: z.object({
        prompt: z.string().describe('Text description of how to edit the image'),
        imageUrl: z.string().url().describe('URL of the image to edit'),
        model: z
          .enum(['gemini-1.5-flash', 'gemini-1.5-pro'])
          .default('gemini-1.5-flash')
          .describe('Gemini model to use for image editing'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new GeminiImageClient(apiKey);

          const result = await client.editImage(args.prompt, args.imageUrl, args.model);

          return `## Gemini Image Editing Results

**Model:** ${result.model}
**Edit Prompt:** "${result.prompt}"
**Original Image:** ${args.imageUrl}

### Edited Image:
- Data URL: ${result.image.url.substring(0, 100)}... (truncated)
- Size: ${result.image.width}x${result.image.height}
- Type: ${result.image.mimeType}

**Note:** The edited image is returned as a base64 data URL. You can copy the full data URL to view the image in a browser.`;
        } catch (error) {
          return `Failed to edit image: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    ANALYZE_IMAGE: tool({
      name: 'gemini_analyze_image',
      description: 'Analyze images using text prompts with Gemini AI',
      schema: z.object({
        prompt: z.string().describe('What you want to know about the image (e.g., "Describe this image", "What objects do you see?")'),
        imageUrl: z.string().url().describe('URL of the image to analyze'),
        model: z
          .enum(['gemini-1.5-flash', 'gemini-1.5-pro'])
          .default('gemini-1.5-flash')
          .describe('Gemini model to use for image analysis'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new GeminiImageClient(apiKey);

          const analysis = await client.analyzeImage(args.prompt, args.imageUrl, args.model);

          return `## Gemini Image Analysis Results

**Model:** ${args.model}
**Analysis Prompt:** "${args.prompt}"
**Image URL:** ${args.imageUrl}

### Analysis:
${analysis}`;
        } catch (error) {
          return `Failed to analyze image: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    LIST_MODELS: tool({
      name: 'gemini_list_models',
      description: 'List available Gemini models for image generation and analysis',
      schema: z.object({
        category: z
          .enum(['image-generation', 'image-analysis', 'all'])
          .default('all')
          .describe('Filter models by category'),
      }),
      handler: async (args, _context) => {
        const models = {
          'image-generation': [
            {
              id: 'gemini-1.5-flash',
              name: 'Gemini 1.5 Flash',
              description: 'Fast and efficient model for image generation',
              capabilities: ['Image Generation', 'Image Editing'],
              speed: 'Fast',
            },
            {
              id: 'gemini-1.5-pro',
              name: 'Gemini 1.5 Pro',
              description: 'Advanced model with enhanced image generation capabilities',
              capabilities: ['Image Generation', 'Image Editing', 'Image Analysis'],
              speed: 'Medium',
            },
          ],
          'image-analysis': [
            {
              id: 'gemini-1.5-flash',
              name: 'Gemini 1.5 Flash',
              description: 'Fast image analysis and understanding',
              capabilities: ['Image Analysis', 'Object Detection', 'Text Recognition'],
              speed: 'Fast',
            },
            {
              id: 'gemini-1.5-pro',
              name: 'Gemini 1.5 Pro',
              description: 'Advanced image analysis with detailed understanding',
              capabilities: ['Image Analysis', 'Object Detection', 'Text Recognition', 'Complex Reasoning'],
              speed: 'Medium',
            },
          ],
        };

        let selectedModels: Array<{
          id: string;
          name: string;
          description: string;
          capabilities: string[];
          speed: string;
        }> = [];

        if (args.category === 'all') {
          selectedModels = [
            ...models['image-generation'],
            ...models['image-analysis'],
          ];
          // Remove duplicates
          selectedModels = selectedModels.filter((model, index, self) => 
            index === self.findIndex(m => m.id === model.id)
          );
        } else {
          selectedModels = models[args.category] || [];
        }

        const response = `## Available Gemini Models

**Category:** ${args.category}
**Total Models:** ${selectedModels.length}

${selectedModels
  .map(
    (model) =>
      `### ${model.name}
- **ID:** \`${model.id}\`
- **Description:** ${model.description}
- **Capabilities:** ${model.capabilities.join(', ')}
- **Speed:** ${model.speed}
`
  )
  .join('\n')}

**Usage:** Use the model ID in the \`model\` parameter when calling image generation or analysis tools.`;

        return response;
      },
    }),
  }),
});
