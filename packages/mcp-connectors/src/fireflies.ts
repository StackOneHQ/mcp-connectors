import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface FirefliesTranscript {
  id: string;
  title: string;
  date: number;
  duration: number;
  organizer_email: string;
  participants: string[];
  meeting_attendees: Array<{
    displayName: string;
    email: string;
  }>;
  summary?: {
    keywords: string[];
    action_items: string;
    overview: string;
    short_summary: string;
    topics_discussed?: string[];
    meeting_type?: string;
    outline?: string;
    bullet_gist?: string;
    gist?: string;
  };
}

interface FirefliesResponse {
  data: {
    transcripts: FirefliesTranscript[];
  };
}

class FirefliesClient {
  private headers: { 'Content-Type': string; Authorization: string };

  constructor(apiKey: string) {
    this.headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };
  }

  private async executeGraphQLQuery(
    query: string,
    variables: Record<string, unknown> = {}
  ): Promise<unknown> {
    const url = 'https://api.fireflies.ai/graphql';

    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        query: query.trim(),
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to execute Fireflies GraphQL query: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as { data: unknown; errors: unknown };

    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data.data;
  }

  async getMeetingsByEmail(email: string): Promise<FirefliesResponse> {
    const query = `
      query Transcripts($participantEmail: String) {
        transcripts(participant_email: $participantEmail) {
          id
          title
          date
          duration
          organizer_email
          participants
          meeting_attendees {
            displayName
            email
          }
          summary {
            keywords
            action_items
            overview
            short_summary
          }
        }
      }
    `;

    const data = await this.executeGraphQLQuery(query, { participantEmail: email });
    return data as FirefliesResponse;
  }

  async getTranscriptDetails(transcriptId: string): Promise<unknown> {
    const query = `
      query Transcript($transcriptId: String!) {
        transcript(id: $transcriptId) {
          id
          dateString
          privacy
          speakers {
            id
            name
          }
          title
          host_email
          organizer_email
          participants
          date
          transcript_url
          duration
          meeting_attendees {
            displayName
            email
            phoneNumber
            name
            location
          }
          summary {
            keywords
            action_items
            outline
            shorthand_bullet
            overview
            bullet_gist
            gist
            short_summary
            short_overview
            meeting_type
            topics_discussed
            transcript_chapters
          }
        }
      }
    `;

    const data = (await this.executeGraphQLQuery(query, { transcriptId })) as {
      transcript: FirefliesTranscript;
    };

    if (!data.transcript) {
      throw new Error(`Transcript with ID ${transcriptId} not found`);
    }

    return data.transcript;
  }

  async searchTranscripts(
    searchQuery: string,
    limit?: number,
    fromDate?: string,
    toDate?: string
  ): Promise<unknown[]> {
    const query = `
      query Transcripts(
        $title: String
        $limit: Int
        $skip: Int
        $fromDate: DateTime
        $toDate: DateTime
      ) {
        transcripts(
          title: $title
          limit: $limit
          skip: $skip
          fromDate: $fromDate
          toDate: $toDate
        ) {
          id
          title
          date
          dateString
          duration
          transcript_url
          speakers {
            id
            name
          }
          summary {
            keywords
            overview
          }
        }
      }
    `;

    const actualLimit = limit || 20;

    const variables: Record<string, unknown> = {
      title: searchQuery,
      limit: actualLimit,
      skip: 0,
    };

    if (fromDate) {
      variables.fromDate = fromDate;
    }

    if (toDate) {
      variables.toDate = toDate;
    }

    const data = (await this.executeGraphQLQuery(query, variables)) as {
      transcripts: FirefliesTranscript[];
    };
    return data.transcripts || [];
  }
}

export const FirefliesConnectorConfig = mcpConnectorConfig({
  name: 'Fireflies',
  key: 'fireflies',
  version: '1.0.0',
  credentials: z.object({
    apiKey: z
      .string()
      .describe('Fireflies API Key from Settings > API Keys :: ff_api_1234567890abcdef'),
  }),
  logo: 'https://stackone-logos.com/api/fireflies/filled/svg',
  setup: z.object({
    userEmail: z
      .string()
      .optional()
      .describe('Default user email for searching meetings :: user@example.com'),
  }),
  examplePrompt:
    'Find all meetings I attended last week, search for meetings about "product roadmap", and get detailed transcript summaries with action items.',
  tools: (tool) => ({
    GET_MEETINGS_BY_EMAIL: tool({
      name: 'get_meetings_by_email',
      description:
        'Gets meetings by participant email address. Returns full transcript data for meetings where the specified email was a participant. Uses the default user email from setup if no email is provided. Essential for finding all meetings involving a specific person, tracking participant involvement, or analyzing meeting patterns by attendee.',
      schema: z.object({
        email: z
          .string()
          .optional()
          .describe(
            'Email address to filter meetings by (uses default user email from setup if not provided)'
          ),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const setup = await context.getSetup();

          // Use provided email or fall back to setup default
          const emailToUse = args.email || setup.userEmail;

          if (!emailToUse) {
            return 'Error: No email provided and no default user email configured in setup';
          }

          const client = new FirefliesClient(apiKey);
          const response = await client.getMeetingsByEmail(emailToUse);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get meetings by email: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    GET_TRANSCRIPT_DETAILS: tool({
      name: 'get_transcript_details',
      description:
        'Retrieve comprehensive summary and metadata about a specific transcript. Returns meeting details, participant info, and extensive summary data including overview, action items, topics discussed, and meeting insights. Optimized for extracting actionable information and meeting outcomes without full conversation text.',
      schema: z.object({
        transcriptId: z.string().describe('ID of the transcript to retrieve'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new FirefliesClient(apiKey);
          const response = await client.getTranscriptDetails(args.transcriptId);
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to get transcript details: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
    SEARCH_TRANSCRIPTS: tool({
      name: 'search_transcripts',
      description:
        'Search for transcripts containing specific keywords in the title, with optional date filtering. Returns a list of matching transcripts with metadata and summary information. Perfect for finding meetings about specific topics, projects, or containing particular keywords.',
      schema: z.object({
        query: z.string().describe('Search query to find relevant transcripts'),
        limit: z
          .number()
          .optional()
          .describe('Maximum number of transcripts to return (default: 20)'),
        fromDate: z.string().optional().describe('Start date in ISO format (YYYY-MM-DD)'),
        toDate: z.string().optional().describe('End date in ISO format (YYYY-MM-DD)'),
      }),
      handler: async (args, context) => {
        try {
          const { apiKey } = await context.getCredentials();
          const client = new FirefliesClient(apiKey);
          const response = await client.searchTranscripts(
            args.query,
            args.limit,
            args.fromDate,
            args.toDate
          );
          return JSON.stringify(response);
        } catch (error) {
          return `Failed to search transcripts: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    }),
  }),
});
