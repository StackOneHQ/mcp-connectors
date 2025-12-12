import { describe, expect, it, beforeAll, afterAll, afterEach } from "vitest";
import type { MCPToolDefinition } from "@stackone/mcp-config-types";
import { createMockConnectorContext } from "../__mocks__/context";
import { ElevenLabsConnectorConfig } from "./elevenlabs";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const server = setupServer();

describe("#ElevenLabsConnector", () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });
  describe(".TEXT_TO_SPEECH", () => {
    describe("when text is provided", () => {
      describe("and API key is valid", () => {
        it("returns base64 audio data successfully", async () => {
          server.use(
            http.post("https://api.elevenlabs.io/v1/text-to-speech/*", () => {
              // Mock audio binary data
              const mockAudio = new Uint8Array([1, 2, 3, 4, 5]);
              return new HttpResponse(mockAudio, {
                status: 200,
                headers: { "Content-Type": "audio/mpeg" },
              });
            })
          );

          const tool = ElevenLabsConnectorConfig.tools.TEXT_TO_SPEECH as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler({ text: "Hello world" }, mockContext);
          const result = JSON.parse(actual);

          expect(result.success).toBe(true);
          expect(result.audio_base64).toBeDefined();
          expect(result.format).toBe("mp3_44100_128");
        });
      });

      describe("and API key is invalid", () => {
        it("returns error message", async () => {
          server.use(
            http.post("https://api.elevenlabs.io/v1/text-to-speech/*", () => {
              return HttpResponse.json(
                { detail: { status: "invalid_api_key", message: "Invalid API key" } },
                { status: 401 }
              );
            })
          );

          const tool = ElevenLabsConnectorConfig.tools.TEXT_TO_SPEECH as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler({ text: "Hello world" }, mockContext);
          const result = JSON.parse(actual);

          expect(result.success).toBe(false);
          expect(result.error).toContain("401");
        });
      });

      describe("and no audio data is returned", () => {
        it("returns error message", async () => {
          server.use(
            http.post("https://api.elevenlabs.io/v1/text-to-speech/*", () => {
              return new HttpResponse(null, { status: 200 });
            })
          );

          const tool = ElevenLabsConnectorConfig.tools.TEXT_TO_SPEECH as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler({ text: "Hello world" }, mockContext);
          const result = JSON.parse(actual);

          expect(result.success).toBe(false);
          expect(result.error).toContain("No audio data received");
        });
      });
    });
  });

  describe(".LIST_VOICES", () => {
    describe("when API call succeeds", () => {
      describe("and voices are returned", () => {
        it("returns list of voices successfully", async () => {
          server.use(
            http.get("https://api.elevenlabs.io/v1/voices", () => {
              return HttpResponse.json({
                voices: [
                  {
                    voice_id: "voice1",
                    name: "Rachel",
                    category: "premade",
                    description: "A calm voice",
                    available_for_tiers: ["free", "pro"],
                  },
                ],
              });
            })
          );

          const tool = ElevenLabsConnectorConfig.tools.LIST_VOICES as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler({}, mockContext);
          const result = JSON.parse(actual);

          expect(result.success).toBe(true);
          expect(result.voices).toHaveLength(1);
          expect(result.voices[0].voice_id).toBe("voice1");
          expect(result.voices[0].name).toBe("Rachel");
        });
      });

      describe("and include_shared is true", () => {
        it("includes shared voices in the response", async () => {
          server.use(
            http.get("https://api.elevenlabs.io/v1/voices", () => {
              return HttpResponse.json({ voices: [] });
            }),
            http.get("https://api.elevenlabs.io/v1/shared-voices", () => {
              return HttpResponse.json({
                voices: [
                  {
                    voice_id: "shared1",
                    name: "Community Voice",
                    category: "shared",
                  },
                ],
              });
            })
          );

          const tool = ElevenLabsConnectorConfig.tools.LIST_VOICES as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler({ include_shared: true }, mockContext);
          const result = JSON.parse(actual);

          expect(result.success).toBe(true);
          expect(result.voices).toHaveLength(1);
          expect(result.voices[0].category).toBe("shared");
        });
      });
    });

    describe("when API call fails", () => {
      it("returns error message", async () => {
        server.use(
          http.get("https://api.elevenlabs.io/v1/voices", () => {
            return HttpResponse.json({ detail: "Not Found" }, { status: 404 });
          })
        );

        const tool = ElevenLabsConnectorConfig.tools.LIST_VOICES as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler({}, mockContext);
        const result = JSON.parse(actual);

        expect(result.success).toBe(false);
        expect(result.error).toContain("404");
      });
    });
  });

  describe(".CREATE_AGENT", () => {
    describe("when required parameters are provided", () => {
      describe("and API call succeeds", () => {
        it("returns agent ID successfully", async () => {
          server.use(
            http.post("https://api.elevenlabs.io/v1/convai/agents/create", () => {
              return HttpResponse.json({
                agent_id: "agent_123",
              });
            })
          );

          const tool = ElevenLabsConnectorConfig.tools.CREATE_AGENT as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler(
            {
              agent_prompt: "You are a helpful assistant",
              first_message: "Hello! How can I help you?",
            },
            mockContext
          );
          const result = JSON.parse(actual);

          expect(result.success).toBe(true);
          expect(result.agent_id).toBe("agent_123");
          expect(result.voice_id).toBe("EXAVITQu4vr4xnSDxMaL");
        });
      });

      describe("and optional parameters are provided", () => {
        it("uses the provided optional parameters", async () => {
          server.use(
            http.post("https://api.elevenlabs.io/v1/convai/agents/create", () => {
              return HttpResponse.json({
                agent_id: "agent_456",
              });
            })
          );

          const tool = ElevenLabsConnectorConfig.tools.CREATE_AGENT as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler(
            {
              name: "Test Agent",
              agent_prompt: "You are a test assistant",
              first_message: "Test greeting",
              voice_id: "custom_voice",
              language: "es",
            },
            mockContext
          );
          const result = JSON.parse(actual);

          expect(result.success).toBe(true);
          expect(result.name).toBe("Test Agent");
          expect(result.voice_id).toBe("custom_voice");
          expect(result.language).toBe("es");
        });
      });
    });

    describe("when API call fails", () => {
      it("returns error message for validation errors", async () => {
        server.use(
          http.post("https://api.elevenlabs.io/v1/convai/agents/create", () => {
            return HttpResponse.json(
              {
                detail: [
                  {
                    type: "missing",
                    loc: ["body", "conversation_config", "agent", "prompt"],
                    msg: "Field required",
                  },
                ],
              },
              { status: 422 }
            );
          })
        );

        const tool = ElevenLabsConnectorConfig.tools.CREATE_AGENT as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler(
          {
            agent_prompt: "",
            first_message: "Hello",
          },
          mockContext
        );
        const result = JSON.parse(actual);

        expect(result.success).toBe(false);
        expect(result.error).toContain("422");
      });
    });
  });

  describe(".LIST_PHONE_NUMBERS", () => {
    describe("when phone numbers exist", () => {
      describe("and API returns standard format", () => {
        it("returns phone numbers successfully", async () => {
          server.use(
            http.get("https://api.elevenlabs.io/v1/convai/phone-numbers", () => {
              return HttpResponse.json({
                phone_numbers: [
                  {
                    phone_number_id: "phnum_123",
                    phone_number: "+1234567890",
                    name: "Main Line",
                    status: "active",
                    provider: "twilio",
                    country_code: "US",
                  },
                ],
              });
            })
          );

          const tool = ElevenLabsConnectorConfig.tools.LIST_PHONE_NUMBERS as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler({}, mockContext);
          const result = JSON.parse(actual);

          expect(result.success).toBe(true);
          expect(result.phone_numbers).toHaveLength(1);
          expect(result.phone_numbers[0].phone_number_id).toBe("phnum_123");
          expect(result.count).toBe(1);
        });
      });

      describe("and API returns array directly", () => {
        it("handles array response format", async () => {
          server.use(
            http.get("https://api.elevenlabs.io/v1/convai/phone-numbers", () => {
              return HttpResponse.json([
                {
                  id: "phnum_456",
                  number: "+9876543210",
                  name: "Support Line",
                },
              ]);
            })
          );

          const tool = ElevenLabsConnectorConfig.tools.LIST_PHONE_NUMBERS as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler({}, mockContext);
          const result = JSON.parse(actual);

          expect(result.success).toBe(true);
          expect(result.phone_numbers).toHaveLength(1);
          expect(result.phone_numbers[0].phone_number_id).toBe("phnum_456");
          expect(result.phone_numbers[0].phone_number).toBe("+9876543210");
        });
      });

      describe("and no phone numbers exist", () => {
        it("returns empty list with helpful message", async () => {
          server.use(
            http.get("https://api.elevenlabs.io/v1/convai/phone-numbers", () => {
              return HttpResponse.json({ phone_numbers: [] });
            })
          );

          const tool = ElevenLabsConnectorConfig.tools.LIST_PHONE_NUMBERS as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler({}, mockContext);
          const result = JSON.parse(actual);

          expect(result.success).toBe(true);
          expect(result.phone_numbers).toHaveLength(0);
          expect(result.message).toContain("No phone numbers found");
        });
      });
    });
  });

  describe(".MAKE_PHONE_CALL", () => {
    describe("when all required parameters are provided", () => {
      describe("and call is successful", () => {
        it("returns call details successfully", async () => {
          server.use(
            http.post("https://api.elevenlabs.io/v1/convai/twilio/outbound-call", () => {
              return HttpResponse.json({
                success: true,
                message: "Call initiated",
                conversation_id: "conv_123",
                callSid: "CA123456789",
              });
            })
          );

          const tool = ElevenLabsConnectorConfig.tools.MAKE_PHONE_CALL as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler(
            {
              agent_id: "agent_123",
              from_phone_number_id: "phnum_123",
              to_number: "+1234567890",
            },
            mockContext
          );
          const result = JSON.parse(actual);

          expect(result.success).toBe(true);
          expect(result.conversation_id).toBe("conv_123");
          expect(result.callSid).toBe("CA123456789");
          expect(result.agent_id).toBe("agent_123");
          expect(result.to_number).toBe("+1234567890");
        });
      });

      describe("and optional message is provided", () => {
        it("includes the additional context", async () => {
          let requestBody: any;
          server.use(
            http.post("https://api.elevenlabs.io/v1/convai/twilio/outbound-call", async (req) => {
              // Capture and verify the request body includes additional_context
              requestBody = await req.request.json();
              return HttpResponse.json({
                success: true,
                message: "Call initiated with context",
                conversation_id: "conv_456",
                callSid: "CA987654321",
              });
            })
          );

          const tool = ElevenLabsConnectorConfig.tools.MAKE_PHONE_CALL as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler(
            {
              agent_id: "agent_123",
              from_phone_number_id: "phnum_123",
              to_number: "+1234567890",
              message: "This is a test call",
            },
            mockContext
          );
          const result = JSON.parse(actual);

          expect(result.success).toBe(true);
          expect(result.conversation_id).toBe("conv_456");
          expect(requestBody.additional_context).toBe("This is a test call");
        });
      });
    });

    describe("when API call fails", () => {
      describe("and agent is not found", () => {
        it("returns error message", async () => {
          server.use(
            http.post("https://api.elevenlabs.io/v1/convai/twilio/outbound-call", () => {
              return HttpResponse.json({ detail: "Agent not found" }, { status: 404 });
            })
          );

          const tool = ElevenLabsConnectorConfig.tools.MAKE_PHONE_CALL as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler(
            {
              agent_id: "invalid_agent",
              from_phone_number_id: "phnum_123",
              to_number: "+1234567890",
            },
            mockContext
          );
          const result = JSON.parse(actual);

          expect(result.success).toBe(false);
          expect(result.error).toContain("404");
        });
      });

      describe("and phone number is invalid", () => {
        it("returns validation error", async () => {
          server.use(
            http.post("https://api.elevenlabs.io/v1/convai/twilio/outbound-call", () => {
              return HttpResponse.json(
                {
                  detail: [
                    {
                      type: "value_error",
                      loc: ["body", "to_number"],
                      msg: "Invalid phone number format",
                    },
                  ],
                },
                { status: 422 }
              );
            })
          );

          const tool = ElevenLabsConnectorConfig.tools.MAKE_PHONE_CALL as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler(
            {
              agent_id: "agent_123",
              from_phone_number_id: "phnum_123",
              to_number: "invalid_number",
            },
            mockContext
          );
          const result = JSON.parse(actual);

          expect(result.success).toBe(false);
          expect(result.error).toContain("422");
        });
      });
    });
  });

  describe(".GET_USER_INFO", () => {
    describe("when API call succeeds", () => {
      it("returns user information successfully", async () => {
        server.use(
          http.get("https://api.elevenlabs.io/v1/user", () => {
            return HttpResponse.json({
              user_id: "user_123",
              subscription: { tier: "pro" },
              available_characters: 10000,
              used_characters: 2500,
              can_extend_character_limit: false,
              can_use_instant_voice_cloning: true,
              can_use_professional_voice_cloning: true,
              api_tier: "pro",
            });
          })
        );

        const tool = ElevenLabsConnectorConfig.tools.GET_USER_INFO as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler({}, mockContext);
        const result = JSON.parse(actual);

        expect(result.success).toBe(true);
        expect(result.user.user_id).toBe("user_123");
        expect(result.user.available_characters).toBe(10000);
        expect(result.user.api_tier).toBe("pro");
      });
    });
  });

  describe(".SPEECH_TO_TEXT", () => {
    describe("when audio data is provided", () => {
      describe("and base64 audio is provided", () => {
        it("returns transcription successfully", async () => {
          server.use(
            http.post("https://api.elevenlabs.io/v1/speech-to-text", () => {
              return HttpResponse.json({
                text: "Hello world",
                language: "en",
                duration: 2.5,
              });
            })
          );

          const tool = ElevenLabsConnectorConfig.tools.SPEECH_TO_TEXT as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          // Mock base64 audio data
          const mockAudioBase64 = btoa("mock audio data");

          const actual = await tool.handler(
            {
              audio_base64: mockAudioBase64,
            },
            mockContext
          );
          const result = JSON.parse(actual);

          expect(result.success).toBe(true);
          expect(result.transcript).toBe("Hello world");
          expect(result.language).toBe("en");
        });
      });

      describe("and no audio data is provided", () => {
        it("returns error message", async () => {
          const tool = ElevenLabsConnectorConfig.tools.SPEECH_TO_TEXT as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = await tool.handler({}, mockContext);
          const result = JSON.parse(actual);

          expect(result.success).toBe(false);
          expect(result.error).toContain("audio_base64 or audio_url must be provided");
        });
      });
    });
  });

  describe(".GENERATE_SOUND_EFFECTS", () => {
    describe("when text description is provided", () => {
      it("returns generated sound effect successfully", async () => {
        server.use(
          http.post("https://api.elevenlabs.io/v1/sound-generation", () => {
            const mockAudio = new Uint8Array([10, 20, 30, 40, 50]);
            return new HttpResponse(mockAudio, {
              status: 200,
              headers: { "Content-Type": "audio/mpeg" },
            });
          })
        );

        const tool = ElevenLabsConnectorConfig.tools.GENERATE_SOUND_EFFECTS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        const actual = await tool.handler(
          {
            text: "Sound of rain falling",
            duration_seconds: 5,
          },
          mockContext
        );
        const result = JSON.parse(actual);

        expect(result.success).toBe(true);
        expect(result.audio_base64).toBeDefined();
        expect(result.description).toBe("Sound of rain falling");
      });
    });
  });
});
