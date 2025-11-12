import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ConnectorMetadata } from '../types/metadata';

const SEQUENTIAL_STAGES = [
  'Problem Definition',
  'Research',
  'Analysis',
  'Synthesis',
  'Conclusion',
] as const;

type SequentialStage = (typeof SEQUENTIAL_STAGES)[number];

interface SequentialThought {
  thoughtNumber: number;
  totalThoughts: number;
  thought: string;
  nextThoughtNeeded: boolean;
  stage: SequentialStage;
  tags: string[];
  axiomsUsed: string[];
  assumptionsChallenged: string[];
  createdAt: string;
}

const formatStageCounts = (thoughts: SequentialThought[]): string => {
  const counts = thoughts.reduce<Record<SequentialStage, number>>(
    (acc, thought) => {
      acc[thought.stage] = (acc[thought.stage] ?? 0) + 1;
      return acc;
    },
    {
      'Problem Definition': 0,
      Research: 0,
      Analysis: 0,
      Synthesis: 0,
      Conclusion: 0,
    }
  );

  return SEQUENTIAL_STAGES.map((stage) => `- ${stage}: ${counts[stage]}`).join('\n');
};

const formatTimeline = (thoughts: SequentialThought[]): string => {
  if (thoughts.length === 0) {
    return '- No thoughts recorded yet.';
  }

  return thoughts
    .map(
      (thought) =>
        `- #${thought.thoughtNumber}/${thought.totalThoughts} (${thought.stage})${thought.nextThoughtNeeded ? ' → Next thought expected' : ''}`
    )
    .join('\n');
};

const describeNextSteps = (thoughts: SequentialThought[]): string => {
  if (thoughts.length === 0) {
    return 'No thoughts recorded yet. Start with the Problem Definition stage.';
  }

  const latest = thoughts.at(-1);

  if (!latest) {
    return 'Unable to determine the latest thought.';
  }

  if (!latest.nextThoughtNeeded) {
    return 'The sequence is marked as complete. You can generate a summary or clear the history.';
  }

  const remaining = Math.max(latest.totalThoughts - latest.thoughtNumber, 0);
  return remaining > 0
    ? `Plan to capture ${remaining} more thought${remaining === 1 ? '' : 's'} to reach your target of ${latest.totalThoughts}.`
    : 'Consider recording additional thoughts to elaborate the sequence or mark the process as complete.';
};

const formatThoughtDetails = (thought: SequentialThought): string => {
  const optionalSections = [
    thought.tags.length ? `- Tags: ${thought.tags.join(', ')}` : '',
    thought.axiomsUsed.length
      ? `- Axioms referenced: ${thought.axiomsUsed.join(', ')}`
      : '',
    thought.assumptionsChallenged.length
      ? `- Assumptions challenged: ${thought.assumptionsChallenged.join(', ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  return `Thought #${thought.thoughtNumber}/${thought.totalThoughts}
- Stage: ${thought.stage}
- Created: ${thought.createdAt}
- Next thought needed: ${thought.nextThoughtNeeded ? 'Yes' : 'No'}
- Content: ${thought.thought}
${optionalSections ? `${optionalSections}\n` : ''}`.trimEnd();
};

const formatHistory = (thoughts: SequentialThought[]): string => {
  if (thoughts.length === 0) {
    return 'No thoughts recorded yet.';
  }

  return thoughts.map((thought) => formatThoughtDetails(thought)).join('\n\n---\n\n');
};

const validateThoughtNumber = (
  thoughtNumber: number,
  totalThoughts: number
): string | null => {
  if (thoughtNumber > totalThoughts) {
    return `Thought number ${thoughtNumber} exceeds the declared total of ${totalThoughts}. Please adjust one of the values.`;
  }

  if (thoughtNumber < 1) {
    return 'Thought number must be at least 1.';
  }

  return null;
};

export const SequentialThinkingConnectorMetadata = {
  key: 'sequential-thinking',
  name: 'Sequential Thinking',
  description: 'Structured reasoning',
  version: '1.0.0',
  examplePrompt: 'Think through a problem step by step',
  categories: ['thinking', 'reasoning'],
} as const satisfies ConnectorMetadata;

export type SequentialThinkingCredentials = Record<string, never>;

export function createSequentialThinkingServer(
  _credentials: SequentialThinkingCredentials = {}
): McpServer {
  const server = new McpServer({
    name: 'Sequential Thinking',
    version: '1.0.0',
  });

  const thoughts: SequentialThought[] = [];

  server.tool(
    'sequential_thinking_process_thought',
    'Record or update a thought within the sequential thinking workflow',
    {
      thought: z.string().min(1).describe('Narrative content of the thought'),
      thoughtNumber: z
        .number()
        .int()
        .min(1)
        .describe('Position of the thought in the sequence (starting at 1)'),
      totalThoughts: z
        .number()
        .int()
        .min(1)
        .describe('Total number of thoughts planned for this sequence'),
      nextThoughtNeeded: z
        .boolean()
        .default(true)
        .describe('Whether additional thoughts are expected after this entry'),
      stage: z
        .enum(SEQUENTIAL_STAGES)
        .describe('Cognitive stage associated with the thought'),
      tags: z
        .array(z.string().min(1))
        .default([])
        .describe('Optional categorisation tags'),
      axiomsUsed: z
        .array(z.string().min(1))
        .default([])
        .describe('Foundational principles referenced in the thought'),
      assumptionsChallenged: z
        .array(z.string().min(1))
        .default([])
        .describe('Assumptions questioned or challenged by the thought'),
    },
    async (args) => {
      const validationError = validateThoughtNumber(
        args.thoughtNumber,
        args.totalThoughts
      );
      if (validationError) {
        return {
          content: [
            {
              type: 'text',
              text: `Unable to record thought: ${validationError}`,
            },
          ],
        };
      }

      const entry: SequentialThought = {
        thoughtNumber: args.thoughtNumber,
        totalThoughts: args.totalThoughts,
        thought: args.thought,
        nextThoughtNeeded: args.nextThoughtNeeded,
        stage: args.stage,
        tags: args.tags,
        axiomsUsed: args.axiomsUsed,
        assumptionsChallenged: args.assumptionsChallenged,
        createdAt: new Date().toISOString(),
      };

      const existingIndex = thoughts.findIndex(
        (thought) => thought.thoughtNumber === entry.thoughtNumber
      );

      if (existingIndex >= 0) {
        thoughts[existingIndex] = entry;
      } else {
        thoughts.push(entry);
      }

      thoughts.sort((a, b) => a.thoughtNumber - b.thoughtNumber);

      const progressPercentage = Math.min(
        100,
        Math.round((thoughts.length / entry.totalThoughts) * 100)
      );

      const response = `Captured sequential thought #${entry.thoughtNumber}/${entry.totalThoughts}

- Stage: ${entry.stage}
- Next thought needed: ${entry.nextThoughtNeeded ? 'Yes' : 'No'}
- Progress: ${progressPercentage}% (${thoughts.length} of ${entry.totalThoughts} recorded)

Thought content:
${entry.thought}

Next steps:
${describeNextSteps(thoughts)}`;

      return {
        content: [
          {
            type: 'text',
            text: response,
          },
        ],
      };
    }
  );

  server.tool(
    'sequential_thinking_generate_summary',
    'Produce a structured summary of the current sequential thinking session',
    {
      includeThoughts: z
        .boolean()
        .default(false)
        .describe('Whether to include the full text of each recorded thought'),
    },
    async (args) => {
      if (thoughts.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No thoughts have been recorded yet. Use sequential_thinking_process_thought to begin.',
            },
          ],
        };
      }

      const latest = thoughts.at(-1);

      const summaryHeader = [
        `Sequential Thinking Summary (${thoughts.length} recorded thought${thoughts.length === 1 ? '' : 's'})`,
        '',
        'Stage distribution:',
        formatStageCounts(thoughts),
        '',
        'Timeline:',
        formatTimeline(thoughts),
        '',
        'Next steps:',
        describeNextSteps(thoughts),
      ].join('\n');

      if (!args.includeThoughts) {
        return {
          content: [
            {
              type: 'text',
              text: summaryHeader,
            },
          ],
        };
      }

      const historySection = ['\nDetailed thoughts:', formatHistory(thoughts)].join(
        '\n\n'
      );

      const summaryFooter = latest
        ? `\nLast recorded thought: #${latest.thoughtNumber}/${latest.totalThoughts} (${latest.stage})`
        : '';

      return {
        content: [
          {
            type: 'text',
            text: `${summaryHeader}${historySection}${summaryFooter}`,
          },
        ],
      };
    }
  );

  server.tool(
    'sequential_thinking_get_history',
    'Retrieve every recorded thought with metadata in chronological order',
    {},
    async () => {
      return {
        content: [
          {
            type: 'text',
            text: formatHistory(thoughts),
          },
        ],
      };
    }
  );

  server.tool(
    'sequential_thinking_clear_history',
    'Reset the sequential thinking session by clearing all stored thoughts',
    {},
    async () => {
      thoughts.splice(0, thoughts.length);

      return {
        content: [
          {
            type: 'text',
            text: 'Sequential thinking history cleared. You can start a fresh sequence now.',
          },
        ],
      };
    }
  );

  return server;
}
