import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { extractToolsFromServer } from '../__mocks__/server-tools';
import { createZapierServer } from './zapier';

const server = setupServer();

function getToolOrThrow<T>(tool: T | undefined, name: string): T {
  if (!tool) {
    throw new Error(`Expected tool ${name} to be registered`);
  }
  return tool;
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('#ZapierConnector', () => {
  describe('.LIST_ACTIONS', () => {
    describe('when request is successful', () => {
      it('returns list of available actions', async () => {
        server.use(
          http.get('https://nla.zapier.com/api/v1/exposed/', () => {
            return HttpResponse.json({
              actions: [
                {
                  id: 'action-1',
                  app: 'Gmail',
                  label: 'Send Email',
                  noun: 'Email',
                  description: 'Send a new email via Gmail',
                  important: true,
                  premium: false,
                },
                {
                  id: 'action-2',
                  app: 'Slack',
                  label: 'Send Channel Message',
                  noun: 'Message',
                  description: 'Send a message to a Slack channel',
                  important: false,
                  premium: false,
                },
              ],
            });
          })
        );

        const mcpServer = createZapierServer({ apiKey: 'test-api-key' });
        const tools = extractToolsFromServer(mcpServer);
        const zapierListActions = getToolOrThrow(
          tools.zapier_list_actions,
          'zapier_list_actions'
        );
        const actual = await zapierListActions.handler({});
        const parsed = JSON.parse(actual);

        expect(parsed.actions).toHaveLength(2);
        expect(parsed.actions[0].app).toBe('Gmail');
        expect(parsed.actions[0].label).toBe('Send Email');
        expect(parsed.actions[1].app).toBe('Slack');
      });
    });

    describe('when authentication fails', () => {
      it('returns authentication error', async () => {
        server.use(
          http.get('https://nla.zapier.com/api/v1/exposed/', () => {
            return HttpResponse.json({ error: 'Invalid API key' }, { status: 401 });
          })
        );

        const mcpServer = createZapierServer({ apiKey: 'invalid-key' });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.zapier_list_actions?.handler({});

        expect(actual).toContain('Failed to list actions');
        expect(actual).toContain('Unauthorized');
      });
    });
  });

  describe('.SEARCH_ACTIONS', () => {
    describe('when searching with valid query', () => {
      it('returns filtered actions', async () => {
        server.use(
          http.get('https://nla.zapier.com/api/v1/exposed/', ({ request }) => {
            const url = new URL(request.url);
            const query = url.searchParams.get('q');

            expect(query).toBe('gmail');

            return HttpResponse.json({
              actions: [
                {
                  id: 'gmail-send',
                  app: 'Gmail',
                  label: 'Send Email',
                  noun: 'Email',
                  description: 'Send email via Gmail',
                  important: true,
                  premium: false,
                },
              ],
            });
          })
        );

        const mcpServer = createZapierServer({ apiKey: 'test-api-key' });
        const tools = extractToolsFromServer(mcpServer);
        const zapierSearchActions = getToolOrThrow(
          tools.zapier_search_actions,
          'zapier_search_actions'
        );
        const actual = await zapierSearchActions.handler({ query: 'gmail' });
        const parsed = JSON.parse(actual);

        expect(parsed.actions).toHaveLength(1);
        expect(parsed.actions[0].app).toBe('Gmail');
        expect(parsed.actions[0].id).toBe('gmail-send');
      });
    });

    describe('when search returns no results', () => {
      it('returns empty actions array', async () => {
        server.use(
          http.get('https://nla.zapier.com/api/v1/exposed/', () => {
            return HttpResponse.json({ actions: [] });
          })
        );

        const mcpServer = createZapierServer({ apiKey: 'test-api-key' });
        const tools = extractToolsFromServer(mcpServer);
        const zapierSearchActions = getToolOrThrow(
          tools.zapier_search_actions,
          'zapier_search_actions'
        );
        const actual = await zapierSearchActions.handler({
          query: 'nonexistent',
        });
        const parsed = JSON.parse(actual);

        expect(parsed.actions).toHaveLength(0);
      });
    });
  });

  describe('.EXECUTE_ACTION', () => {
    describe('when execution is successful', () => {
      it('returns execution results', async () => {
        server.use(
          http.post('https://nla.zapier.com/api/v1/exposed/gmail-send/execute/', () => {
            return HttpResponse.json({
              status: 'success',
              attempt: 'attempt-123',
              id: 'execution-456',
              request_id: 'req-789',
              results: [
                {
                  message_id: 'msg-abc123',
                  thread_id: 'thread-def456',
                  status: 'sent',
                },
              ],
            });
          })
        );

        const mcpServer = createZapierServer({ apiKey: 'test-api-key' });
        const tools = extractToolsFromServer(mcpServer);
        const zapierExecuteAction = getToolOrThrow(
          tools.zapier_execute_action,
          'zapier_execute_action'
        );
        const actual = await zapierExecuteAction.handler({
          action_id: 'gmail-send',
          parameters: {
            to: 'test@example.com',
            subject: 'Test Email',
            body: 'This is a test email',
          },
        });
        const parsed = JSON.parse(actual);

        expect(parsed.status).toBe('success');
        expect(parsed.results).toHaveLength(1);
        expect(parsed.results[0].message_id).toBe('msg-abc123');
      });
    });

    describe('when execution fails', () => {
      it('returns error details', async () => {
        server.use(
          http.post(
            'https://nla.zapier.com/api/v1/exposed/invalid-action/execute/',
            () => {
              return HttpResponse.json({ error: 'Action not found' }, { status: 404 });
            }
          )
        );

        const mcpServer = createZapierServer({ apiKey: 'test-api-key' });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.zapier_execute_action?.handler({
          action_id: 'invalid-action',
          parameters: {},
        });

        expect(actual).toContain('Failed to execute action');
        expect(actual).toContain('Not Found');
      });
    });

    describe('when parameters are invalid', () => {
      it('returns validation error', async () => {
        server.use(
          http.post('https://nla.zapier.com/api/v1/exposed/gmail-send/execute/', () => {
            return HttpResponse.json({
              status: 'error',
              attempt: 'attempt-123',
              id: 'execution-456',
              request_id: 'req-789',
              errors: ['Missing required field: to'],
            });
          })
        );

        const mcpServer = createZapierServer({ apiKey: 'test-api-key' });
        const tools = extractToolsFromServer(mcpServer);
        const zapierExecuteAction = getToolOrThrow(
          tools.zapier_execute_action,
          'zapier_execute_action'
        );
        const actual = await zapierExecuteAction.handler({
          action_id: 'gmail-send',
          parameters: { subject: 'Test' },
        });
        const parsed = JSON.parse(actual);

        expect(parsed.status).toBe('error');
        expect(parsed.errors).toContain('Missing required field: to');
      });
    });
  });

  describe('.GET_ACTION_DETAILS', () => {
    describe('when action exists', () => {
      it('returns action details with input fields', async () => {
        server.use(
          http.get('https://nla.zapier.com/api/v1/exposed/gmail-send/', () => {
            return HttpResponse.json({
              id: 'gmail-send',
              app: 'Gmail',
              label: 'Send Email',
              noun: 'Email',
              description: 'Send a new email via Gmail',
              important: true,
              premium: false,
              input_fields: [
                {
                  key: 'to',
                  label: 'To',
                  type: 'string',
                  required: true,
                  helpText: 'The recipient email address',
                },
                {
                  key: 'subject',
                  label: 'Subject',
                  type: 'string',
                  required: true,
                  helpText: 'The email subject line',
                },
                {
                  key: 'body',
                  label: 'Body',
                  type: 'text',
                  required: false,
                  helpText: 'The email body content',
                },
              ],
            });
          })
        );

        const mcpServer = createZapierServer({ apiKey: 'test-api-key' });
        const tools = extractToolsFromServer(mcpServer);
        const zapierGetActionDetails = getToolOrThrow(
          tools.zapier_get_action_details,
          'zapier_get_action_details'
        );
        const actual = await zapierGetActionDetails.handler({
          action_id: 'gmail-send',
        });
        const parsed = JSON.parse(actual);

        expect(parsed.id).toBe('gmail-send');
        expect(parsed.app).toBe('Gmail');
        expect(parsed.input_fields).toHaveLength(3);
        expect(parsed.input_fields[0].key).toBe('to');
        expect(parsed.input_fields[0].required).toBe(true);
      });
    });

    describe('when action does not exist', () => {
      it('returns not found error', async () => {
        server.use(
          http.get('https://nla.zapier.com/api/v1/exposed/nonexistent/', () => {
            return HttpResponse.json({ error: 'Action not found' }, { status: 404 });
          })
        );

        const mcpServer = createZapierServer({ apiKey: 'test-api-key' });
        const tools = extractToolsFromServer(mcpServer);
        const actual = await tools.zapier_get_action_details?.handler({
          action_id: 'nonexistent',
        });

        expect(actual).toContain('Failed to get action details');
        expect(actual).toContain('Not Found');
      });
    });
  });
});
