import { describe, expect, it } from "vitest";
import type { MCPToolDefinition } from "@stackone/mcp-config-types";
import { createMockConnectorContext } from "../__mocks__/context";
import { SlackJiraGitHubConnectorConfig } from "./slack-jira-github";

describe("#SlackJiraGitHubConnector", () => {
  describe(".CREATE_TICKET_FROM_SLACK_MESSAGE", () => {
    describe("when all parameters are valid", () => {
      describe("and Slack message exists", () => {
        it("returns success with created ticket and issue details", async () => {
          const tool = SlackJiraGitHubConnectorConfig.tools.CREATE_TICKET_FROM_SLACK_MESSAGE as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          
          // Mock credentials
          mockContext.getCredentials.mockResolvedValue({
            slackBotToken: "xoxb-test-token",
            slackTeamId: "T1234567890",
            jiraBaseUrl: "https://test.atlassian.net",
            jiraEmail: "test@example.com",
            jiraApiToken: "test-jira-token",
            githubToken: "ghp_test-token",
          });

          // Mock global fetch
          const mockFetch = vi.fn();
          global.fetch = mockFetch;

          // Mock Slack message response
          mockFetch.mockImplementationOnce(() =>
            Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                ok: true,
                messages: [{
                  text: "We need to implement user authentication",
                  user: "U12345",
                  ts: "1234567890.123456",
                  channel: "C12345"
                }]
              }),
            })
          );

          // Mock Slack user info response
          mockFetch.mockImplementationOnce(() =>
            Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                ok: true,
                user: {
                  name: "testuser",
                  profile: { real_name: "Test User" }
                }
              }),
            })
          );

          // Mock JIRA create issue response
          mockFetch.mockImplementationOnce(() =>
            Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                id: "10001",
                key: "PROJ-123"
              }),
            })
          );

          // Mock GitHub create issue response
          mockFetch.mockImplementationOnce(() =>
            Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                id: 1001,
                number: 42,
                html_url: "https://github.com/owner/repo/issues/42"
              }),
            })
          );

          // Mock GitHub get base branch response
          mockFetch.mockImplementationOnce(() =>
            Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                object: { sha: "abc123" }
              }),
            })
          );

          // Mock GitHub create branch response
          mockFetch.mockImplementationOnce(() =>
            Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                ref: "refs/heads/feature/proj-123",
                object: { sha: "def456" }
              }),
            })
          );

          const args = {
            channelId: "C12345",
            messageTs: "1234567890.123456",
            jiraProjectKey: "PROJ",
            jiraIssueType: "Story",
            githubOwner: "testowner",
            githubRepo: "testrepo",
          };

          const actual = await tool.handler(args, mockContext);
          const result = JSON.parse(actual);

          expect(result.success).toBe(true);
          expect(result.data.jiraTicket.key).toBe("PROJ-123");
          expect(result.data.githubIssue.number).toBe(42);
          expect(result.data.githubBranch.name).toBe("feature/proj-123");
        });
      });

      describe("and includes optional GitHub labels and assignees", () => {
        it("returns success with labels and assignees applied", async () => {
          const tool = SlackJiraGitHubConnectorConfig.tools.CREATE_TICKET_FROM_SLACK_MESSAGE as MCPToolDefinition;
          const mockContext = createMockConnectorContext();
          
          mockContext.getCredentials.mockResolvedValue({
            slackBotToken: "xoxb-test-token",
            slackTeamId: "T1234567890",
            jiraBaseUrl: "https://test.atlassian.net",
            jiraEmail: "test@example.com",
            jiraApiToken: "test-jira-token",
            githubToken: "ghp_test-token",
          });

          const mockFetch = vi.fn();
          global.fetch = mockFetch;

          // Mock all required API calls
          mockFetch
            .mockResolvedValueOnce({ // Slack message
              ok: true,
              json: () => Promise.resolve({
                ok: true,
                messages: [{ text: "Bug fix needed", user: "U12345", ts: "1234567890.123456" }]
              })
            })
            .mockResolvedValueOnce({ // Slack user info
              ok: true,
              json: () => Promise.resolve({
                ok: true,
                user: { name: "testuser", profile: { real_name: "Test User" } }
              })
            })
            .mockResolvedValueOnce({ // JIRA create
              ok: true,
              json: () => Promise.resolve({ id: "10001", key: "PROJ-124" })
            })
            .mockResolvedValueOnce({ // GitHub create issue
              ok: true,
              json: () => Promise.resolve({ id: 1002, number: 43, html_url: "https://github.com/owner/repo/issues/43" })
            })
            .mockResolvedValueOnce({ // GitHub get base branch
              ok: true,
              json: () => Promise.resolve({ object: { sha: "abc123" } })
            })
            .mockResolvedValueOnce({ // GitHub create branch
              ok: true,
              json: () => Promise.resolve({ ref: "refs/heads/feature/proj-124", object: { sha: "def456" } })
            });

          const args = {
            channelId: "C12345",
            messageTs: "1234567890.123456",
            jiraProjectKey: "PROJ",
            jiraIssueType: "Bug",
            githubOwner: "testowner",
            githubRepo: "testrepo",
            githubLabels: ["bug", "urgent"],
            githubAssignees: ["testuser"],
            baseBranch: "develop"
          };

          const actual = await tool.handler(args, mockContext);
          const result = JSON.parse(actual);

          expect(result.success).toBe(true);
          expect(result.data.jiraTicket.key).toBe("PROJ-124");
        });
      });
    });

    describe("when Slack message does not exist", () => {
      it("returns failure with appropriate error message", async () => {
        const tool = SlackJiraGitHubConnectorConfig.tools.CREATE_TICKET_FROM_SLACK_MESSAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        
        mockContext.getCredentials.mockResolvedValue({
          slackBotToken: "xoxb-test-token",
          slackTeamId: "T1234567890",
          jiraBaseUrl: "https://test.atlassian.net",
          jiraEmail: "test@example.com",
          jiraApiToken: "test-jira-token",
          githubToken: "ghp_test-token",
        });

        const mockFetch = vi.fn();
        global.fetch = mockFetch;

        // Mock Slack API returning no messages
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            messages: []
          })
        });

        const args = {
          channelId: "C12345",
          messageTs: "invalid-timestamp",
          jiraProjectKey: "PROJ",
          jiraIssueType: "Story",
          githubOwner: "testowner",
          githubRepo: "testrepo",
        };

        const actual = await tool.handler(args, mockContext);
        const result = JSON.parse(actual);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Message not found");
      });
    });

    describe("when JIRA API fails", () => {
      it("returns failure with JIRA error message", async () => {
        const tool = SlackJiraGitHubConnectorConfig.tools.CREATE_TICKET_FROM_SLACK_MESSAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        
        mockContext.getCredentials.mockResolvedValue({
          slackBotToken: "xoxb-test-token",
          slackTeamId: "T1234567890",
          jiraBaseUrl: "https://test.atlassian.net",
          jiraEmail: "test@example.com",
          jiraApiToken: "test-jira-token",
          githubToken: "ghp_test-token",
        });

        const mockFetch = vi.fn();
        global.fetch = mockFetch;

        // Mock successful Slack calls
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
              ok: true,
              messages: [{ text: "Test message", user: "U12345", ts: "1234567890.123456" }]
            })
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
              ok: true,
              user: { name: "testuser", profile: { real_name: "Test User" } }
            })
          })
          // Mock JIRA API failure
          .mockResolvedValueOnce({
            ok: false,
            status: 400,
            statusText: "Bad Request",
            json: () => Promise.resolve({ errorMessages: ["Project INVALID does not exist"] })
          });

        const args = {
          channelId: "C12345",
          messageTs: "1234567890.123456",
          jiraProjectKey: "INVALID",
          jiraIssueType: "Story",
          githubOwner: "testowner",
          githubRepo: "testrepo",
        };

        const actual = await tool.handler(args, mockContext);
        const result = JSON.parse(actual);

        expect(result.success).toBe(false);
        expect(result.error).toContain("JIRA API Error");
      });
    });

    describe("when GitHub API fails", () => {
      it("returns failure with GitHub error message", async () => {
        const tool = SlackJiraGitHubConnectorConfig.tools.CREATE_TICKET_FROM_SLACK_MESSAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        
        mockContext.getCredentials.mockResolvedValue({
          slackBotToken: "xoxb-test-token",
          slackTeamId: "T1234567890",
          jiraBaseUrl: "https://test.atlassian.net",
          jiraEmail: "test@example.com",
          jiraApiToken: "test-jira-token",
          githubToken: "ghp_test-token",
        });

        const mockFetch = vi.fn();
        global.fetch = mockFetch;

        // Mock successful Slack and JIRA calls
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
              ok: true,
              messages: [{ text: "Test message", user: "U12345", ts: "1234567890.123456" }]
            })
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
              ok: true,
              user: { name: "testuser", profile: { real_name: "Test User" } }
            })
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ id: "10001", key: "PROJ-123" })
          })
          // Mock GitHub API failure
          .mockResolvedValueOnce({
            ok: false,
            status: 404,
            statusText: "Not Found"
          });

        const args = {
          channelId: "C12345",
          messageTs: "1234567890.123456",
          jiraProjectKey: "PROJ",
          jiraIssueType: "Story",
          githubOwner: "nonexistent",
          githubRepo: "nonexistent",
        };

        const actual = await tool.handler(args, mockContext);
        const result = JSON.parse(actual);

        expect(result.success).toBe(false);
        expect(result.error).toContain("GitHub API Error");
      });
    });
  });

  describe(".GET_SLACK_MESSAGE", () => {
    describe("when message exists", () => {
      it("returns message details with user information", async () => {
        const tool = SlackJiraGitHubConnectorConfig.tools.GET_SLACK_MESSAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        
        mockContext.getCredentials.mockResolvedValue({
          slackBotToken: "xoxb-test-token",
          slackTeamId: "T1234567890",
          jiraBaseUrl: "https://test.atlassian.net",
          jiraEmail: "test@example.com",
          jiraApiToken: "test-jira-token",
          githubToken: "ghp_test-token",
        });

        const mockFetch = vi.fn();
        global.fetch = mockFetch;

        // Mock Slack message response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            messages: [{
              text: "This is a test message",
              user: "U12345",
              ts: "1234567890.123456",
              channel: "C12345"
            }]
          })
        });

        // Mock Slack user info response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            user: {
              name: "testuser",
              profile: { real_name: "Test User" }
            }
          })
        });

        const args = {
          channelId: "C12345",
          messageTs: "1234567890.123456",
        };

        const actual = await tool.handler(args, mockContext);
        const result = JSON.parse(actual);

        expect(result.text).toBe("This is a test message");
        expect(result.user).toBe("U12345");
        expect(result.userName).toBe("Test User");
        expect(result.timestamp).toBe("1234567890.123456");
      });
    });

    describe("when message does not exist", () => {
      it("returns error message", async () => {
        const tool = SlackJiraGitHubConnectorConfig.tools.GET_SLACK_MESSAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        
        mockContext.getCredentials.mockResolvedValue({
          slackBotToken: "xoxb-test-token",
          slackTeamId: "T1234567890",
          jiraBaseUrl: "https://test.atlassian.net",
          jiraEmail: "test@example.com",
          jiraApiToken: "test-jira-token",
          githubToken: "ghp_test-token",
        });

        const mockFetch = vi.fn();
        global.fetch = mockFetch;

        // Mock Slack API returning no messages
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            messages: []
          })
        });

        const args = {
          channelId: "C12345",
          messageTs: "invalid-timestamp",
        };

        const actual = await tool.handler(args, mockContext);

        expect(actual).toContain("Failed to get Slack message");
        expect(actual).toContain("Message not found");
      });
    });

    describe("when Slack API returns error", () => {
      it("returns error message from Slack API", async () => {
        const tool = SlackJiraGitHubConnectorConfig.tools.GET_SLACK_MESSAGE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();
        
        mockContext.getCredentials.mockResolvedValue({
          slackBotToken: "xoxb-test-token",
          slackTeamId: "T1234567890",
          jiraBaseUrl: "https://test.atlassian.net",
          jiraEmail: "test@example.com",
          jiraApiToken: "test-jira-token",
          githubToken: "ghp_test-token",
        });

        const mockFetch = vi.fn();
        global.fetch = mockFetch;

        // Mock Slack API error
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ok: false,
            error: "channel_not_found"
          })
        });

        const args = {
          channelId: "INVALID",
          messageTs: "1234567890.123456",
        };

        const actual = await tool.handler(args, mockContext);

        expect(actual).toContain("Failed to get Slack message");
        expect(actual).toContain("channel_not_found");
      });
    });
  });
});



