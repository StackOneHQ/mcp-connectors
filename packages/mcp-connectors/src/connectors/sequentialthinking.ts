import { mcpConnectorConfig } from '@stackone/mcp-config-types';
import { z } from 'zod';

interface ThoughtData {
  thought: string;
  thoughtNumber: number;
  totalThoughts: number;
  isRevision?: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string;
  needsMoreThoughts?: boolean;
  nextThoughtNeeded: boolean;
}

// Simple state storage for thought history
const thoughtState = {
  thoughtHistory: [] as ThoughtData[],
  branches: {} as Record<string, ThoughtData[]>,
};

const validateThoughtData = (input: Record<string, unknown>): ThoughtData => {
  if (!input.thought || typeof input.thought !== 'string') {
    throw new Error('Invalid thought: must be a string');
  }
  if (!input.thoughtNumber || typeof input.thoughtNumber !== 'number') {
    throw new Error('Invalid thoughtNumber: must be a number');
  }
  if (!input.totalThoughts || typeof input.totalThoughts !== 'number') {
    throw new Error('Invalid totalThoughts: must be a number');
  }
  if (typeof input.nextThoughtNeeded !== 'boolean') {
    throw new Error('Invalid nextThoughtNeeded: must be a boolean');
  }

  return {
    thought: input.thought as string,
    thoughtNumber: input.thoughtNumber as number,
    totalThoughts: input.totalThoughts as number,
    nextThoughtNeeded: input.nextThoughtNeeded as boolean,
    isRevision: input.isRevision as boolean | undefined,
    revisesThought: input.revisesThought as number | undefined,
    branchFromThought: input.branchFromThought as number | undefined,
    branchId: input.branchId as string | undefined,
    needsMoreThoughts: input.needsMoreThoughts as boolean | undefined,
  };
};

const formatThought = (thoughtData: ThoughtData): string => {
  const {
    thoughtNumber,
    totalThoughts,
    thought,
    isRevision,
    revisesThought,
    branchFromThought,
    branchId,
  } = thoughtData;

  let prefix = '';
  let context = '';

  if (isRevision) {
    prefix = '🔄 Revision';
    context = ` (revising thought ${revisesThought})`;
  } else if (branchFromThought) {
    prefix = '🌿 Branch';
    context = ` (from thought ${branchFromThought}, ID: ${branchId})`;
  } else {
    prefix = '💭 Thought';
    context = '';
  }

  const header = `${prefix} ${thoughtNumber}/${totalThoughts}${context}`;
  const border = '─'.repeat(Math.max(header.length, thought.length) + 4);

  return `
┌${border}┐
│ ${header} │
├${border}┤
│ ${thought.padEnd(border.length - 2)} │
└${border}┘`;
};

const processThought = (input: Record<string, unknown>): string => {
  try {
    const validatedInput = validateThoughtData(input);

    if (validatedInput.thoughtNumber > validatedInput.totalThoughts) {
      validatedInput.totalThoughts = validatedInput.thoughtNumber;
    }

    thoughtState.thoughtHistory.push(validatedInput);

    if (validatedInput.branchFromThought && validatedInput.branchId) {
      if (!thoughtState.branches[validatedInput.branchId]) {
        thoughtState.branches[validatedInput.branchId] = [];
      }
      thoughtState.branches[validatedInput.branchId]?.push(validatedInput);
    }

    const formattedThought = formatThought(validatedInput);
    console.log(formattedThought);

    return JSON.stringify(
      {
        thoughtNumber: validatedInput.thoughtNumber,
        totalThoughts: validatedInput.totalThoughts,
        nextThoughtNeeded: validatedInput.nextThoughtNeeded,
        branches: Object.keys(thoughtState.branches),
        thoughtHistoryLength: thoughtState.thoughtHistory.length,
      },
      null,
      2
    );
  } catch (error) {
    return JSON.stringify(
      {
        error: error instanceof Error ? error.message : String(error),
        status: 'failed',
      },
      null,
      2
    );
  }
};

export const SequentialThinkingConnectorConfig = mcpConnectorConfig({
  name: 'Sequential Thinking',
  key: 'sequential-thinking',
  logo: 'https://stackone-logos.com/api/disco/filled/svg',
  version: '1.0.0',
  credentials: z.object({}),
  setup: z.object({}),
  examplePrompt:
    'Help me think through implementing a new feature by breaking it down into steps, considering potential challenges, and revising my approach as needed.',
  tools: (tool) => ({
    THINKING: tool({
      name: 'sequential_thinking',
      description: `A detailed tool for dynamic and reflective problem-solving through thoughts.
This tool helps analyze problems through a flexible thinking process that can adapt and evolve.
Each thought can build on, question, or revise previous insights as understanding deepens.

When to use this tool:
- Breaking down complex problems into steps
- Planning and design with room for revision
- Analysis that might need course correction
- Problems where the full scope might not be clear initially
- Problems that require a multi-step solution
- Tasks that need to maintain context over multiple steps
- Situations where irrelevant information needs to be filtered out

Key features:
- You can adjust total_thoughts up or down as you progress
- You can question or revise previous thoughts
- You can add more thoughts even after reaching what seemed like the end
- You can express uncertainty and explore alternative approaches
- Not every thought needs to build linearly - you can branch or backtrack
- Generates a solution hypothesis
- Verifies the hypothesis based on the Chain of Thought steps
- Repeats the process until satisfied
- Provides a correct answer

Parameters explained:
- thought: Your current thinking step, which can include:
* Regular analytical steps
* Revisions of previous thoughts
* Questions about previous decisions
* Realizations about needing more analysis
* Changes in approach
* Hypothesis generation
* Hypothesis verification
- next_thought_needed: True if you need more thinking, even if at what seemed like the end
- thought_number: Current number in sequence (can go beyond initial total if needed)
- total_thoughts: Current estimate of thoughts needed (can be adjusted up/down)
- is_revision: A boolean indicating if this thought revises previous thinking
- revises_thought: If is_revision is true, which thought number is being reconsidered
- branch_from_thought: If branching, which thought number is the branching point
- branch_id: Identifier for the current branch (if any)
- needs_more_thoughts: If reaching end but realizing more thoughts needed`,
      schema: z.object({
        thought: z.string().describe('Your current thinking step'),
        nextThoughtNeeded: z.boolean().describe('Whether another thought step is needed'),
        thoughtNumber: z.number().int().min(1).describe('Current thought number'),
        totalThoughts: z
          .number()
          .int()
          .min(1)
          .describe('Estimated total thoughts needed'),
        isRevision: z
          .boolean()
          .optional()
          .describe('Whether this revises previous thinking'),
        revisesThought: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe('Which thought is being reconsidered'),
        branchFromThought: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe('Branching point thought number'),
        branchId: z.string().optional().describe('Branch identifier'),
        needsMoreThoughts: z.boolean().optional().describe('If more thoughts are needed'),
      }),
      handler: async (args, _context) => {
        return processThought(args);
      },
    }),
  }),
});
