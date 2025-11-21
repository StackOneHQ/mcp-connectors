import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  input: Record<string, unknown>;
  output: unknown;
  error?: string;
  logs?: string;
  metrics?: Record<string, unknown>;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

interface ReplicateClient {
  run(model: string, options: { input: Record<string, unknown> }): Promise<unknown>;
  predictions: {
    create(options: Record<string, unknown>): Promise<ReplicatePrediction>;
    get(id: string): Promise<ReplicatePrediction>;
  };
}

// Simple Replicate client implementation
class SimpleReplicateClient implements ReplicateClient {
  constructor(private apiToken: string) {}

  async run(
    model: string,
    options: { input: Record<string, unknown> }
  ): Promise<unknown> {
    const prediction = await this.predictions.create({
      version: model,
      input: options.input,
    });

    // Poll for completion
    let result = prediction;
    while (result.status === 'starting' || result.status === 'processing') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      result = await this.predictions.get(result.id);
    }

    if (result.status === 'failed') {
      throw new Error(result.error || 'Prediction failed');
    }

    return result.output;
  }

  predictions = {
    create: async (options: Record<string, unknown>): Promise<ReplicatePrediction> => {
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          Authorization: `Token ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error(`Replicate API error: ${response.status} ${response.statusText}`);
      }

      return response.json() as Promise<ReplicatePrediction>;
    },

    get: async (id: string): Promise<ReplicatePrediction> => {
      const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
        headers: {
          Authorization: `Token ${this.apiToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Replicate API error: ${response.status} ${response.statusText}`);
      }

      return response.json() as Promise<ReplicatePrediction>;
    },
  };
}

export const ReplicateConnectorConfig = mcpConnectorConfig({
  name: 'Replicate',
  key: 'replicate',
  version: '1.0.0',
  logo: 'https://stackone-logos.com/api/replicate/filled/svg',
  credentials: z.object({
    apiToken: z
      .string()
      .describe(
        'Replicate API Token from https://replicate.com/account/api-tokens :: r8_1234567890abcdefghijklmnopqrstuvwxyz'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'Generate a FLUX image of "a serene mountain landscape at sunset", upscale an existing image, and remove the background from a product photo.',
  tools: (tool) => ({
    GENERATE_IMAGE_FLUX: tool({
      name: 'replicate_generate_image_flux',
      description: 'Generate images using FLUX Schnell on Replicate (fastest)',
      schema: z.object({
        prompt: z.string().describe('Text description of the image to generate'),
        aspect_ratio: z
          .enum([
            '1:1',
            '16:9',
            '21:9',
            '3:2',
            '2:3',
            '4:5',
            '5:4',
            '3:4',
            '4:3',
            '9:16',
            '9:21',
          ])
          .default('1:1')
          .describe('Aspect ratio of the generated image'),
        num_outputs: z
          .number()
          .min(1)
          .max(4)
          .default(1)
          .describe('Number of images to generate'),
        guidance_scale: z
          .number()
          .min(0)
          .max(10)
          .default(3.5)
          .describe('How closely to follow the prompt'),
        num_inference_steps: z
          .number()
          .min(1)
          .max(50)
          .default(4)
          .describe('Number of denoising steps'),
        seed: z.number().optional().describe('Random seed for reproducible results'),
        output_format: z
          .enum(['webp', 'jpg', 'png'])
          .default('webp')
          .describe('Output image format'),
        output_quality: z
          .number()
          .min(0)
          .max(100)
          .default(80)
          .describe('Output image quality (0-100)'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new SimpleReplicateClient(apiToken);

          const input = {
            prompt: args.prompt,
            aspect_ratio: args.aspect_ratio,
            num_outputs: args.num_outputs,
            guidance: args.guidance_scale,
            num_inference_steps: args.num_inference_steps,
            output_format: args.output_format,
            output_quality: args.output_quality,
            ...(args.seed && { seed: args.seed }),
          };

          const output = await client.run('black-forest-labs/flux-schnell', { input });

          // Handle both single image and array outputs
          const images = Array.isArray(output) ? output : [output];

          const imageResults = images.map((imageUrl: string, index: number) => ({
            url: imageUrl,
            index: index + 1,
          }));

          return `## FLUX Image Generation Results

**Model:** FLUX Schnell (Black Forest Labs)
**Prompt:** "${args.prompt}"
**Aspect Ratio:** ${args.aspect_ratio}
**Images Generated:** ${imageResults.length}

### Generated Images:
${imageResults
  .map(
    (img) =>
      `**Image ${img.index}:**
- URL: ${img.url}`
  )
  .join('\n\n')}

### Settings Used:
- Guidance Scale: ${args.guidance_scale}
- Inference Steps: ${args.num_inference_steps}
- Output Format: ${args.output_format}
- Quality: ${args.output_quality}%
- Seed: ${args.seed || 'random'}

**Image URLs for direct access:**
${imageResults.map((img) => img.url).join('\n')}`;
        } catch (error) {
          return `Failed to generate image with FLUX: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    GENERATE_IMAGE_SDXL: tool({
      name: 'replicate_generate_image_sdxl',
      description: 'Generate images using Stable Diffusion XL on Replicate',
      schema: z.object({
        prompt: z.string().describe('Text description of the image to generate'),
        negative_prompt: z
          .string()
          .default('')
          .describe('Text description of what to avoid in the image'),
        width: z
          .number()
          .min(128)
          .max(1024)
          .default(1024)
          .describe('Width of the generated image'),
        height: z
          .number()
          .min(128)
          .max(1024)
          .default(1024)
          .describe('Height of the generated image'),
        num_outputs: z
          .number()
          .min(1)
          .max(4)
          .default(1)
          .describe('Number of images to generate'),
        guidance_scale: z
          .number()
          .min(1)
          .max(20)
          .default(7.5)
          .describe('How closely to follow the prompt'),
        num_inference_steps: z
          .number()
          .min(1)
          .max(100)
          .default(20)
          .describe('Number of denoising steps'),
        seed: z.number().optional().describe('Random seed for reproducible results'),
        scheduler: z
          .enum([
            'DDIM',
            'DPMSolverMultistep',
            'HeunDiscrete',
            'KarrasDPM',
            'K_EULER_ANCESTRAL',
            'K_EULER',
            'PNDM',
          ])
          .default('K_EULER')
          .describe('Scheduler algorithm'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new SimpleReplicateClient(apiToken);

          const input = {
            prompt: args.prompt,
            negative_prompt: args.negative_prompt,
            width: args.width,
            height: args.height,
            num_outputs: args.num_outputs,
            guidance_scale: args.guidance_scale,
            num_inference_steps: args.num_inference_steps,
            scheduler: args.scheduler,
            ...(args.seed && { seed: args.seed }),
          };

          const output = await client.run(
            'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
            { input }
          );

          const images = Array.isArray(output) ? output : [output];

          const imageResults = images.map((imageUrl: string, index: number) => ({
            url: imageUrl,
            index: index + 1,
          }));

          return `## Stable Diffusion XL Results

**Model:** Stable Diffusion XL
**Prompt:** "${args.prompt}"
**Negative Prompt:** "${args.negative_prompt || 'None'}"
**Resolution:** ${args.width}x${args.height}
**Images Generated:** ${imageResults.length}

### Generated Images:
${imageResults
  .map(
    (img) =>
      `**Image ${img.index}:**
- URL: ${img.url}`
  )
  .join('\n\n')}

### Settings Used:
- Guidance Scale: ${args.guidance_scale}
- Inference Steps: ${args.num_inference_steps}
- Scheduler: ${args.scheduler}
- Seed: ${args.seed || 'random'}

**Image URLs for direct access:**
${imageResults.map((img) => img.url).join('\n')}`;
        } catch (error) {
          return `Failed to generate image with SDXL: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    UPSCALE_IMAGE: tool({
      name: 'replicate_upscale_image',
      description: 'Upscale images using Real-ESRGAN on Replicate',
      schema: z.object({
        image_url: z.string().url().describe('URL of the image to upscale'),
        scale: z.number().min(1).max(4).default(2).describe('Upscaling factor (1-4x)'),
        face_enhance: z.boolean().default(false).describe('Enable face enhancement'),
        tile: z
          .number()
          .min(0)
          .max(1000)
          .default(0)
          .describe('Tile size for large images (0 = auto)'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new SimpleReplicateClient(apiToken);

          const input = {
            image: args.image_url,
            scale: args.scale,
            face_enhance: args.face_enhance,
            tile: args.tile,
          };

          const output = await client.run(
            'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
            { input }
          );

          if (typeof output === 'string') {
            return `## Image Upscaling Results

**Original Image:** ${args.image_url}
**Upscaling Factor:** ${args.scale}x
**Face Enhancement:** ${args.face_enhance ? 'Enabled' : 'Disabled'}

### Upscaled Image:
- URL: ${output}

**Direct Image URL:** ${output}`;
          }
          return 'No upscaled image was generated.';
        } catch (error) {
          return `Failed to upscale image: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    REMOVE_BACKGROUND: tool({
      name: 'replicate_remove_background',
      description: 'Remove background from images using REMBG on Replicate',
      schema: z.object({
        image_url: z
          .string()
          .url()
          .describe('URL of the image to remove background from'),
        model: z
          .enum(['u2net', 'u2netp', 'u2net_human_seg', 'silueta', 'isnet-general-use'])
          .default('u2net')
          .describe('Background removal model'),
        alpha_matting: z
          .boolean()
          .default(false)
          .describe('Enable alpha matting for better edges'),
        alpha_matting_foreground_threshold: z
          .number()
          .min(0)
          .max(1)
          .default(0.27)
          .describe('Foreground threshold for alpha matting'),
        alpha_matting_background_threshold: z
          .number()
          .min(0)
          .max(1)
          .default(0.1)
          .describe('Background threshold for alpha matting'),
        alpha_matting_erode_size: z
          .number()
          .min(0)
          .max(40)
          .default(10)
          .describe('Erosion size for alpha matting'),
      }),
      handler: async (args, context) => {
        try {
          const { apiToken } = await context.getCredentials();
          const client = new SimpleReplicateClient(apiToken);

          const input = {
            image: args.image_url,
            model: args.model,
            alpha_matting: args.alpha_matting,
            alpha_matting_foreground_threshold: args.alpha_matting_foreground_threshold,
            alpha_matting_background_threshold: args.alpha_matting_background_threshold,
            alpha_matting_erode_size: args.alpha_matting_erode_size,
          };

          const output = await client.run(
            'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003',
            { input }
          );

          if (typeof output === 'string') {
            return `## Background Removal Results

**Original Image:** ${args.image_url}
**Model Used:** ${args.model}
**Alpha Matting:** ${args.alpha_matting ? 'Enabled' : 'Disabled'}

### Processed Image:
- URL: ${output}
- Background: Removed (transparent PNG)

**Direct Image URL:** ${output}`;
          }
          return 'No processed image was generated.';
        } catch (error) {
          return `Failed to remove background: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),

    LIST_POPULAR_MODELS: tool({
      name: 'replicate_list_popular_models',
      description: 'List popular Replicate models for image generation and processing',
      schema: z.object({
        category: z
          .enum([
            'image-generation',
            'image-upscaling',
            'image-editing',
            'background-removal',
            'all',
          ])
          .default('all')
          .describe('Filter models by category'),
      }),
      handler: async (args, _context) => {
        const models = {
          'image-generation': [
            {
              id: 'black-forest-labs/flux-schnell',
              name: 'FLUX Schnell',
              description: 'Fast, high-quality image generation',
              creator: 'Black Forest Labs',
            },
            {
              id: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
              name: 'Stable Diffusion XL',
              description: 'Popular general-purpose image generation',
              creator: 'Stability AI',
            },
            {
              id: 'bytedance/sdxl-lightning-4step:5f24084160c9089501c1b3545d9be3c27883ae2239b6f412990e82d4a6210f8f',
              name: 'SDXL Lightning',
              description: 'Ultra-fast 4-step image generation',
              creator: 'ByteDance',
            },
          ],
          'image-upscaling': [
            {
              id: 'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
              name: 'Real-ESRGAN',
              description: 'High-quality image upscaling',
              creator: 'NightmareAI',
            },
          ],
          'image-editing': [
            {
              id: 'timothybrooks/instruct-pix2pix:30c1d0b916a6f8efce20493a5d61ee27491ab2a60437c13c588468b9810ec23f',
              name: 'InstructPix2Pix',
              description: 'Edit images using text instructions',
              creator: 'Timothy Brooks',
            },
          ],
          'background-removal': [
            {
              id: 'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003',
              name: 'REMBG',
              description: 'Remove image backgrounds',
              creator: 'cjwbw',
            },
          ],
        };

        let selectedModels: Array<{
          id: string;
          name: string;
          description: string;
          creator: string;
        }> = [];

        if (args.category === 'all') {
          selectedModels = [
            ...models['image-generation'],
            ...models['image-upscaling'],
            ...models['image-editing'],
            ...models['background-removal'],
          ];
        } else {
          selectedModels = models[args.category] || [];
        }

        return `## Popular Replicate Models

**Category:** ${args.category}
**Total Models:** ${selectedModels.length}

${selectedModels
  .map(
    (model) =>
      `### ${model.name}
- **Creator:** ${model.creator}
- **ID:** \`${model.id}\`
- **Description:** ${model.description}
`
  )
  .join('\n')}

**Usage:** Use the model ID when calling specific model endpoints, or use the dedicated tools for popular models.`;
      },
    }),
  }),
});
