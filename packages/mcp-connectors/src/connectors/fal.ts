import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface FalResult {
  images: Array<{
    url: string;
    width: number;
    height: number;
    content_type: string;
  }>;
  timings?: Record<string, number>;
  seed?: number;
  nsfw_content_detected?: boolean;
}

interface FalClient {
  run(model: string, options: { input: Record<string, unknown> }): Promise<FalResult>;
}

// Create a simple FAL client implementation
class SimpleFalClient implements FalClient {
  constructor(private apiKey: string) {}

  async run(
    model: string,
    options: { input: Record<string, unknown> }
  ): Promise<FalResult> {
    const response = await fetch('https://fal.run/fal-ai/flux-schnell', {
      method: 'POST',
      headers: {
        Authorization: `Key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: options.input,
      }),
    });

    if (!response.ok) {
      throw new Error(`FAL API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<FalResult>;
  }
}

export const FalConnectorConfig = mcpConnectorConfig({
  name: 'FAL.ai',
  key: 'fal',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/fal/filled/svg',
  credentials: z.object({
    apiKey: z
      .string()
      .describe(
        'FAL.ai API Key from https://fal.ai/dashboard/keys :: fal_1234567890abcdefghijklmnopqrstuvwxyz'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'Generate a high-quality image of "a futuristic city skyline at sunset with flying cars" using the FLUX model, then upscale it to 4x resolution.',
  tools: (tool) => ({
    GENERATE_IMAGE: tool({
      name: 'fal_generate_image',
      description: 'Generate images using FAL.ai models like FLUX, SDXL, and others',
      schema: z.object({
        model: z
          .string()
          .default('fal-ai/flux-schnell')
          .describe(
            'Model to use (e.g., fal-ai/flux-schnell, fal-ai/flux-dev, stability-ai/stable-diffusion-xl-base-1-0)'
          ),
        prompt: z.string().describe('Text description of the image to generate'),
        image_size: z
          .enum([
            'square_hd',
            'square',
            'portrait_4_3',
            'portrait_16_9',
            'landscape_4_3',
            'landscape_16_9',
          ])
          .default('square_hd')
          .describe('Image aspect ratio and size'),
        num_inference_steps: z
          .number()
          .min(1)
          .max(50)
          .default(4)
          .describe('Number of denoising steps (more steps = higher quality but slower)'),
        guidance_scale: z
          .number()
          .min(0)
          .max(20)
          .default(3.5)
          .describe(
            'How closely to follow the prompt (higher = more adherence to prompt)'
          ),
        num_images: z
          .number()
          .min(1)
          .max(4)
          .default(1)
          .describe('Number of images to generate'),
        enable_safety_checker: z
          .boolean()
          .default(true)
          .describe('Enable NSFW content detection'),
        seed: z.number().optional().describe('Random seed for reproducible results'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new SimpleFalClient(apiKey);

          const input = {
            prompt: args.prompt,
            image_size: args.image_size,
            num_inference_steps: args.num_inference_steps,
            guidance_scale: args.guidance_scale,
            num_images: args.num_images,
            enable_safety_checker: args.enable_safety_checker,
            ...(args.seed && { seed: args.seed }),
          };

          const result = await client.run(args.model, { input });

          // Format response with image URLs and metadata
          const imageResults = result.images.map((image, index) => ({
            url: image.url,
            width: image.width,
            height: image.height,
            content_type: image.content_type,
            index: index + 1,
          }));

          // Return as formatted JSON string
          return `## Image Generation Results

**Model:** ${args.model}
**Prompt:** "${args.prompt}"
**Images Generated:** ${result.images.length}

### Generated Images:
${imageResults
  .map(
    (img) =>
      `**Image ${img.index}:**
- URL: ${img.url}
- Size: ${img.width}x${img.height}
- Type: ${img.content_type}`
  )
  .join('\n\n')}

### Metadata:
- Seed: ${result.seed || 'random'}
- NSFW Detected: ${result.nsfw_content_detected ? 'Yes' : 'No'}
- Generation Time: ${
            result.timings
              ? Object.entries(result.timings)
                  .map(([k, v]) => `${k}: ${v}s`)
                  .join(', ')
              : 'N/A'
          }

**Image URLs for direct access:**
${imageResults.map((img) => img.url).join('\n')}`;
        } catch (error) {
          return `Failed to generate image: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    UPSCALE_IMAGE: tool({
      name: 'fal_upscale_image',
      description: 'Upscale images using FAL.ai Real-ESRGAN model',
      schema: z.object({
        image_url: z.string().url().describe('URL of the image to upscale'),
        scale: z.number().min(1).max(4).default(2).describe('Upscaling factor (1-4x)'),
        model: z
          .string()
          .default('fal-ai/real-esrgan')
          .describe('Upscaling model to use'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new SimpleFalClient(apiKey);

          const input = {
            image: args.image_url,
            scale: args.scale,
          };

          const result = await client.run(args.model, { input });

          if (result.images && result.images.length > 0) {
            const upscaledImage = result.images[0];

            return `## Image Upscaling Results

**Original Image:** ${args.image_url}
**Upscaling Factor:** ${args.scale}x
**Model:** ${args.model}

### Upscaled Image:
- URL: ${upscaledImage?.url}
- Size: ${upscaledImage?.width}x${upscaledImage?.height}
- Type: ${upscaledImage?.content_type}

**Direct Image URL:** ${upscaledImage?.url}`;
          }
          return 'No upscaled image was generated.';
        } catch (error) {
          return `Failed to upscale image: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    LIST_MODELS: tool({
      name: 'fal_list_models',
      description: 'List available FAL.ai models for image generation and processing',
      schema: z.object({
        category: z
          .enum(['image-generation', 'image-upscaling', 'image-editing', 'all'])
          .default('all')
          .describe('Filter models by category'),
      }),
      handler: async (args, _context) => {
        // Static list of popular FAL models
        const models = {
          'image-generation': [
            {
              id: 'fal-ai/flux-schnell',
              name: 'FLUX Schnell',
              description: 'Fast high-quality image generation',
              speed: 'Very Fast',
            },
            {
              id: 'fal-ai/flux-dev',
              name: 'FLUX Dev',
              description: 'High-quality image generation with more control',
              speed: 'Fast',
            },
            {
              id: 'stability-ai/stable-diffusion-xl-base-1-0',
              name: 'Stable Diffusion XL',
              description: 'Popular general-purpose image generation',
              speed: 'Medium',
            },
            {
              id: 'fal-ai/aura-flow',
              name: 'Aura Flow',
              description: 'Artistic style image generation',
              speed: 'Medium',
            },
          ],
          'image-upscaling': [
            {
              id: 'fal-ai/real-esrgan',
              name: 'Real-ESRGAN',
              description: 'High-quality image upscaling',
              speed: 'Fast',
            },
          ],
          'image-editing': [
            {
              id: 'fal-ai/instruct-pix2pix',
              name: 'InstructPix2Pix',
              description: 'Edit images using text instructions',
              speed: 'Medium',
            },
          ],
        };

        let selectedModels: Array<{
          id: string;
          name: string;
          description: string;
          speed: string;
        }> = [];

        if (args.category === 'all') {
          selectedModels = [
            ...models['image-generation'],
            ...models['image-upscaling'],
            ...models['image-editing'],
          ];
        } else {
          selectedModels = models[args.category] || [];
        }

        const response = `## Available FAL.ai Models

**Category:** ${args.category}
**Total Models:** ${selectedModels.length}

${selectedModels
  .map(
    (model) =>
      `### ${model.name}
- **ID:** \`${model.id}\`
- **Description:** ${model.description}
- **Speed:** ${model.speed}
`
  )
  .join('\n')}

**Usage:** Use the model ID in the \`model\` parameter when calling image generation tools.`;

        return response;
      },
    }),
  }),
});
