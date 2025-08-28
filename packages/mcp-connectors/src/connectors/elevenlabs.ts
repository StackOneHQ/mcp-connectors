import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

// Type definitions for ElevenLabs API responses
interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  preview_url?: string;
  available_for_tiers: string[];
  settings?: {
    stability: number;
    similarity_boost: number;
  };
  samples?: ElevenLabsSample[];
}

interface ElevenLabsSample {
  sample_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  hash: string;
}

interface ElevenLabsVoicesResponse {
  voices: ElevenLabsVoice[];
}

interface ElevenLabsUser {
  user_id: string;
  subscription: Record<string, unknown>;
  available_characters: number;
  used_characters: number;
  can_extend_character_limit: boolean;
  can_use_instant_voice_cloning: boolean;
  can_use_professional_voice_cloning: boolean;
  api_tier: string;
}

interface ElevenLabsTranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  speakers?: unknown[];
}

// Conversational AI interfaces
interface ConversationConfig {
  agent?: {
    prompt?: {
      prompt?: string;
    };
    first_message?: string;
    language?: string;
  };
  asr?: {
    quality?: string;
    provider?: string;
  };
  tts?: {
    model_id?: string;
    voice_id?: string;
  };
  transcriber?: {
    model?: string;
    language?: string;
  };
  llm?: {
    model?: string;
    provider?: string;
  };
}

interface AgentCreateResponse {
  agent_id: string;
}

interface PhoneCallResponse {
  success: boolean;
  message: string;
  conversation_id?: string;
  callSid?: string;
}

interface PhoneNumber {
  phone_number_id: string;
  phone_number: string;
  name?: string;
  status: string;
  provider: string;
  country_code: string;
}

interface PhoneNumbersResponse {
  phone_numbers: PhoneNumber[];
}

// Helper function to make API calls to ElevenLabs
const makeElevenLabsRequest = async (
  endpoint: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = `${ELEVENLABS_API_BASE}${endpoint}`;

  return fetch(url, {
    ...options,
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};

// Helper function to convert audio stream to base64
const streamToBase64 = async (stream: ReadableStream): Promise<string> => {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  // Combine all chunks into a single Uint8Array
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  // Convert to base64
  const binary = String.fromCharCode(...combined);
  return btoa(binary);
};

export const ElevenLabsConnectorConfig = mcpConnectorConfig({
  name: 'ElevenLabs',
  key: 'elevenlabs',
  logo: 'https://stackone-logos.com/api/elevenlabs/filled/svg',
  version: '1.0.0',
  credentials: z.object({
    apiKey: z
      .string()
      .describe(
        'ElevenLabs API Key :: xi_1234567890abcdefghijklmnopqrstuv :: https://elevenlabs.io/docs/api-reference/authentication'
      ),
  }),
  setup: z.object({}),
  examplePrompt:
    'First list available phone numbers to see what Twilio numbers are configured, then create a conversational AI agent that introduces itself as a customer service representative, and finally use it to make a phone call to +1234567890 with a brief greeting message.',
  tools: (tool) => ({
    TEXT_TO_SPEECH: tool({
      name: 'text-to-speech',
      description:
        'Convert text to speech using ElevenLabs. Returns base64-encoded audio data.',
      schema: z.object({
        text: z.string().describe('The text to convert to speech'),
        voice_id: z.string().optional().describe('Voice ID to use (default: Rachel)'),
        model_id: z
          .string()
          .optional()
          .describe('Model ID to use (default: eleven_multilingual_v2)'),
        output_format: z
          .enum([
            'mp3_44100_128',
            'mp3_44100_64',
            'mp3_22050_32',
            'pcm_16000',
            'pcm_22050',
            'pcm_24000',
            'pcm_44100',
          ])
          .optional()
          .describe('Audio output format'),
        stability: z.number().min(0).max(1).optional().describe('Voice stability (0-1)'),
        similarity_boost: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe('Voice similarity boost (0-1)'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();

          const voiceId = args.voice_id || 'EXAVITQu4vr4xnSDxMaL'; // Rachel voice
          const requestBody = {
            text: args.text,
            model_id: args.model_id || 'eleven_multilingual_v2',
            voice_settings: {
              stability: args.stability || 0.5,
              similarity_boost: args.similarity_boost || 0.75,
            },
          };

          const response = await makeElevenLabsRequest(
            `/text-to-speech/${voiceId}?output_format=${args.output_format || 'mp3_44100_128'}`,
            apiKey,
            {
              method: 'POST',
              body: JSON.stringify(requestBody),
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
          }

          if (!response.body) {
            throw new Error('No audio data received from ElevenLabs API');
          }

          const base64Audio = await streamToBase64(response.body);

          return JSON.stringify({
            success: true,
            audio_base64: base64Audio,
            format: args.output_format || 'mp3_44100_128',
            voice_id: voiceId,
            text_length: args.text.length,
            message:
              'Audio generated successfully. Use the audio_base64 field to access the audio data.',
          });
        } catch (error) {
          console.error('Text-to-speech error:', error);
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
          });
        }
      },
    }),

    LIST_VOICES: tool({
      name: 'list-voices',
      description: 'Get a list of available voices from ElevenLabs',
      schema: z.object({
        include_shared: z
          .boolean()
          .optional()
          .describe('Include shared voices from the library'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();

          const response = await makeElevenLabsRequest('/voices', apiKey);

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
          }

          const data = (await response.json()) as ElevenLabsVoicesResponse;

          const voices =
            data.voices?.map((voice) => ({
              voice_id: voice.voice_id,
              name: voice.name,
              category: voice.category,
              description: voice.description || '',
              preview_url: voice.preview_url,
              available_for_tiers: voice.available_for_tiers,
              settings: voice.settings,
            })) || [];

          // If include_shared is true, also fetch shared voices
          if (args.include_shared) {
            try {
              const sharedResponse = await makeElevenLabsRequest(
                '/shared-voices',
                apiKey
              );
              if (sharedResponse.ok) {
                const sharedData =
                  (await sharedResponse.json()) as ElevenLabsVoicesResponse;
                const sharedVoices =
                  sharedData.voices?.map((voice) => ({
                    voice_id: voice.voice_id,
                    name: voice.name,
                    category: 'shared',
                    description: voice.description || '',
                    preview_url: voice.preview_url,
                    available_for_tiers: voice.available_for_tiers,
                    settings: voice.settings,
                  })) || [];
                voices.push(...sharedVoices);
              }
            } catch (sharedError) {
              console.warn('Failed to fetch shared voices:', sharedError);
            }
          }

          return JSON.stringify({
            success: true,
            voices,
            count: voices.length,
          });
        } catch (error) {
          console.error('List voices error:', error);
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
          });
        }
      },
    }),

    GET_VOICE: tool({
      name: 'get-voice',
      description: 'Get detailed information about a specific voice',
      schema: z.object({
        voice_id: z.string().describe('The voice ID to get information for'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();

          const response = await makeElevenLabsRequest(
            `/voices/${args.voice_id}`,
            apiKey
          );

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
          }

          const voice = (await response.json()) as ElevenLabsVoice;

          return JSON.stringify({
            success: true,
            voice: {
              voice_id: voice.voice_id,
              name: voice.name,
              category: voice.category,
              description: voice.description || '',
              preview_url: voice.preview_url,
              available_for_tiers: voice.available_for_tiers,
              settings: voice.settings,
              samples:
                voice.samples?.map((sample) => ({
                  sample_id: sample.sample_id,
                  file_name: sample.file_name,
                  mime_type: sample.mime_type,
                  size_bytes: sample.size_bytes,
                  hash: sample.hash,
                })) || [],
            },
          });
        } catch (error) {
          console.error('Get voice error:', error);
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
          });
        }
      },
    }),

    SPEECH_TO_TEXT: tool({
      name: 'speech-to-text',
      description:
        'Convert speech to text using ElevenLabs. Requires audio file URL or base64 data.',
      schema: z.object({
        audio_base64: z.string().optional().describe('Base64-encoded audio data'),
        audio_url: z.string().optional().describe('URL to audio file'),
        model_id: z
          .string()
          .optional()
          .describe('Model to use for transcription (default: scribe)'),
        language: z
          .string()
          .optional()
          .describe('Language code (auto-detected if not provided)'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();

          if (!args.audio_base64 && !args.audio_url) {
            throw new Error('Either audio_base64 or audio_url must be provided');
          }

          let audioData: Uint8Array;

          if (args.audio_base64) {
            // Decode base64 to binary
            const binaryString = atob(args.audio_base64);
            audioData = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              audioData[i] = binaryString.charCodeAt(i);
            }
          } else if (args.audio_url) {
            // Fetch audio from URL
            const audioResponse = await fetch(args.audio_url);
            if (!audioResponse.ok) {
              throw new Error(`Failed to fetch audio from URL: ${audioResponse.status}`);
            }
            const arrayBuffer = await audioResponse.arrayBuffer();
            audioData = new Uint8Array(arrayBuffer);
          } else {
            throw new Error('No audio data provided');
          }

          // Create FormData for multipart request
          const formData = new FormData();
          const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
          formData.append('audio', audioBlob, 'audio.mp3');
          formData.append('model', args.model_id || 'scribe');

          if (args.language) {
            formData.append('language', args.language);
          }

          const response = await fetch(`${ELEVENLABS_API_BASE}/speech-to-text`, {
            method: 'POST',
            headers: {
              'xi-api-key': apiKey,
            },
            body: formData,
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
          }

          const result = (await response.json()) as ElevenLabsTranscriptionResult;

          return JSON.stringify({
            success: true,
            transcript: result.text || '',
            language: result.language,
            duration: result.duration,
            speakers: result.speakers,
          });
        } catch (error) {
          console.error('Speech-to-text error:', error);
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
          });
        }
      },
    }),

    GENERATE_SOUND_EFFECTS: tool({
      name: 'generate-sound-effects',
      description: 'Generate sound effects from text description using ElevenLabs',
      schema: z.object({
        text: z.string().describe('Description of the sound effect to generate'),
        duration_seconds: z
          .number()
          .optional()
          .describe('Duration in seconds (default: auto)'),
        prompt_influence: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe('How closely to follow the prompt (0-1)'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();

          const requestBody = {
            text: args.text,
            duration_seconds: args.duration_seconds,
            prompt_influence: args.prompt_influence || 0.3,
          };

          const response = await makeElevenLabsRequest('/sound-generation', apiKey, {
            method: 'POST',
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
          }

          if (!response.body) {
            throw new Error('No audio data received from ElevenLabs API');
          }

          const base64Audio = await streamToBase64(response.body);

          return JSON.stringify({
            success: true,
            audio_base64: base64Audio,
            description: args.text,
            duration: args.duration_seconds,
            message:
              'Sound effect generated successfully. Use the audio_base64 field to access the audio data.',
          });
        } catch (error) {
          console.error('Sound effects generation error:', error);
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
          });
        }
      },
    }),

    GET_USER_INFO: tool({
      name: 'get-user-info',
      description: 'Get user account information and usage statistics',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { apiKey } = await context.getCredentials();

          const response = await makeElevenLabsRequest('/user', apiKey);

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
          }

          const user = (await response.json()) as ElevenLabsUser;

          return JSON.stringify({
            success: true,
            user: {
              user_id: user.user_id,
              subscription: user.subscription,
              available_characters: user.available_characters,
              used_characters: user.used_characters,
              can_extend_character_limit: user.can_extend_character_limit,
              can_use_instant_voice_cloning: user.can_use_instant_voice_cloning,
              can_use_professional_voice_cloning: user.can_use_professional_voice_cloning,
              api_tier: user.api_tier,
            },
          });
        } catch (error) {
          console.error('Get user info error:', error);
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
          });
        }
      },
    }),

    CREATE_AGENT: tool({
      name: 'create-agent',
      description:
        'Create a conversational AI agent for voice interactions and phone calls',
      schema: z.object({
        name: z
          .string()
          .optional()
          .describe('Name for the agent to make it easier to find'),
        agent_prompt: z
          .string()
          .describe("The system prompt that guides the agent's behavior and personality"),
        first_message: z
          .string()
          .describe(
            'The first message the agent will speak when starting a conversation'
          ),
        voice_id: z
          .string()
          .optional()
          .describe('Voice ID to use for the agent (default: Rachel)'),
        language: z
          .string()
          .optional()
          .describe('Language code for the agent (default: en)'),
        model_id: z
          .string()
          .optional()
          .describe('TTS model ID (default: eleven_turbo_v2)'),

        asr_quality: z
          .enum(['low', 'medium', 'high'])
          .optional()
          .describe('ASR quality setting'),
        llm_model: z.string().optional().describe('LLM model to use (default: gpt-4)'),
        tags: z
          .array(z.string())
          .optional()
          .describe('Tags to help classify and filter the agent'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();

          const conversationConfig: ConversationConfig = {
            agent: {
              prompt: {
                prompt: args.agent_prompt,
              },
              first_message: args.first_message,
              language: args.language || 'en',
            },
            asr: {
              quality: args.asr_quality || 'high',
              provider: 'elevenlabs',
            },
            tts: {
              model_id: args.model_id || 'eleven_turbo_v2',
              voice_id: args.voice_id || 'EXAVITQu4vr4xnSDxMaL', // Rachel voice
            },
            llm: {
              model: args.llm_model || 'gpt-4',
              provider: 'openai',
            },
          };

          const requestBody = {
            conversation_config: conversationConfig,
            name: args.name || null,
            tags: args.tags || null,
          };

          const response = await makeElevenLabsRequest('/convai/agents/create', apiKey, {
            method: 'POST',
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
          }

          const result = (await response.json()) as AgentCreateResponse;

          return JSON.stringify({
            success: true,
            agent_id: result.agent_id,
            name: args.name || 'Unnamed Agent',
            voice_id: args.voice_id || 'EXAVITQu4vr4xnSDxMaL',
            language: args.language || 'en',
            message:
              'Conversational AI agent created successfully. Use this agent_id to make phone calls.',
          });
        } catch (error) {
          console.error('Create agent error:', error);
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
          });
        }
      },
    }),

    LIST_PHONE_NUMBERS: tool({
      name: 'list-phone-numbers',
      description:
        'List all phone numbers (Twilio numbers) available for making outbound calls with conversational AI agents',
      schema: z.object({}),
      handler: async (_args, context) => {
        try {
          const { apiKey } = await context.getCredentials();

          const response = await makeElevenLabsRequest('/convai/phone-numbers', apiKey);

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
          }

          const result = await response.json();

          // Handle different possible response structures
          let phoneNumbers = [];
          if (result.phone_numbers && Array.isArray(result.phone_numbers)) {
            phoneNumbers = result.phone_numbers;
          } else if (Array.isArray(result)) {
            phoneNumbers = result;
          } else {
            // Log the actual response structure for debugging
            console.log('Unexpected API response structure:', JSON.stringify(result, null, 2));
          }

          return JSON.stringify({
            success: true,
            phone_numbers: phoneNumbers.map((phone: any) => ({
              phone_number_id: phone.phone_number_id || phone.id,
              phone_number: phone.phone_number || phone.number,
              name: phone.name || 'Unnamed',
              status: phone.status || 'unknown',
              provider: phone.provider || 'unknown',
              country_code: phone.country_code || phone.country,
            })),
            count: phoneNumbers.length,
            raw_response: result,
            message:
              phoneNumbers.length > 0
                ? 'Use the phone_number_id from this list as the from_phone_number_id parameter when making phone calls.'
                : 'No phone numbers found. You may need to add a phone number to your ElevenLabs account first.',
          });
        } catch (error) {
          console.error('List phone numbers error:', error);
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
          });
        }
      },
    }),

    MAKE_PHONE_CALL: tool({
      name: 'make-phone-call',
      description:
        'Initiate an outbound phone call using a conversational AI agent to deliver a message',
      schema: z.object({
        agent_id: z
          .string()
          .describe('The ID of the conversational AI agent to use for the call'),
        to_number: z
          .string()
          .describe(
            'The phone number to call (in international format, e.g., +1234567890)'
          ),
        message: z
          .string()
          .optional()
          .describe(
            'Additional context or message for the agent (will be part of the conversation flow)'
          ),
        from_phone_number_id: z
          .string()
          .describe(
            'The ID of the phone number (Twilio number) to use for making the outbound call. You must first import your Twilio number into ElevenLabs via the dashboard.'
          ),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();

          const requestBody: Record<string, unknown> = {
            agent_id: args.agent_id,
            agent_phone_number_id: args.from_phone_number_id,
            to_number: args.to_number,
          };

          // Add any additional context message
          if (args.message) {
            requestBody.additional_context = args.message;
          }

          const response = await makeElevenLabsRequest(
            `/convai/twilio/outbound-call`,
            apiKey,
            {
              method: 'POST',
              body: JSON.stringify(requestBody),
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
          }

          const result = (await response.json()) as PhoneCallResponse;

          return JSON.stringify({
            success: true,
            conversation_id: result.conversation_id,
            callSid: result.callSid,
            agent_id: args.agent_id,
            to_number: args.to_number,
            from_phone_number_id: args.from_phone_number_id,
            message: result.message || 'Phone call initiated successfully via Twilio.',
          });
        } catch (error) {
          console.error('Make phone call error:', error);
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
          });
        }
      },
    }),
  }),
});
