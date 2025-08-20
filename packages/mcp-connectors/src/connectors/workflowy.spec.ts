import { describe, expect, it } from "vitest";
import type { MCPToolDefinition } from "@stackone/mcp-config-types";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createMockConnectorContext } from "../__mocks__/context";
import { WorkFlowyConnectorConfig } from "./workflowy";

const mockLoginResponse = {
  success: true,
  username: 'test@example.com',
  user_id: 'user-123'
};

const mockOutlineResponse = {
  results: [
    {
      id: 'work-node',
      name: 'Work',
      children: [
        {
          id: 'tasks-node',
          name: 'Tasks',
          children: []
        }
      ]
    }
  ],
  polling_interval_ms: 1000
};

const mockTasksResponse = {
  results: [
    {
      id: 'task1',
      name: 'First task',
      completed: false,
      last_modified: 1234567890
    },
    {
      id: 'task2',
      name: 'Completed task',
      completed: true,
      last_modified: 1234567891
    }
  ],
  polling_interval_ms: 1000
};

const server = setupServer();

describe("#WorkFlowyConnector", () => {
  describe(".CREATE_BULLET", () => {
    describe("when valid bullet data is provided", () => {
      describe("and authentication succeeds", () => {
        it("creates bullet point successfully", async () => {
          server.use(
            http.post('https://workflowy.com/ajax_login', () => {
              return new HttpResponse(JSON.stringify(mockLoginResponse), {
                status: 200,
                headers: {
                  'Set-Cookie': 'sessionid=test-session-123; path=/',
                  'Content-Type': 'application/json',
                },
              });
            }),
            http.post('https://workflowy.com/get_initialization_data', () => {
              return HttpResponse.json(mockOutlineResponse);
            }),
            http.post('https://workflowy.com/push_and_poll', () => {
              return HttpResponse.json({ success: true });
            })
          );
          
          server.listen();

          const tool = WorkFlowyConnectorConfig.tools.CREATE_BULLET as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          mockContext.getCredentials.mockResolvedValue({
            username: "test@example.com",
            password: "password123"
          });

          mockContext.getSetup.mockResolvedValue({
            defaultLocation: "Work/Tasks"
          });

          const result = await tool.handler({
            name: "Test bullet",
            location: "Work/Tasks",
            description: "Test description"
          }, mockContext);

          server.close();

          expect(result).toContain('Successfully created bullet point "Test bullet"');
          expect(result).toContain("under Work/Tasks");
          expect(result).toContain("with description: Test description");
        });
      });

      describe("and no location is provided", () => {
        it("uses default location from setup", async () => {
          server.use(
            http.post('https://workflowy.com/ajax_login', () => {
              return new HttpResponse(JSON.stringify(mockLoginResponse), {
                status: 200,
                headers: {
                  'Set-Cookie': 'sessionid=test-session-123; path=/',
                  'Content-Type': 'application/json',
                },
              });
            }),
            http.post('https://workflowy.com/get_initialization_data', () => {
              return HttpResponse.json({
                results: [
                  {
                    id: 'personal-node',
                    name: 'Personal',
                    children: []
                  }
                ],
                polling_interval_ms: 1000
              });
            }),
            http.post('https://workflowy.com/push_and_poll', () => {
              return HttpResponse.json({ success: true });
            })
          );
          
          server.listen();

          const tool = WorkFlowyConnectorConfig.tools.CREATE_BULLET as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          mockContext.getCredentials.mockResolvedValue({
            username: "test@example.com",
            password: "password123"
          });

          mockContext.getSetup.mockResolvedValue({
            defaultLocation: "Personal"
          });

          const result = await tool.handler({
            name: "Test bullet"
          }, mockContext);

          server.close();

          expect(result).toContain('Successfully created bullet point "Test bullet"');
          expect(result).toContain("under Personal");
        });
      });
    });

    describe("when authentication fails", () => {
      it("returns error message", async () => {
        server.use(
          http.post('https://workflowy.com/ajax_login', () => {
            return new HttpResponse(null, { status: 401 });
          })
        );
        
        server.listen();

        const tool = WorkFlowyConnectorConfig.tools.CREATE_BULLET as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        mockContext.getCredentials.mockResolvedValue({
          username: "test@example.com",
          password: "wrong-password"
        });

        mockContext.getSetup.mockResolvedValue({});

        const result = await tool.handler({
          name: "Test bullet"
        }, mockContext);

        server.close();

        expect(result).toContain("Error: Login failed: 401");
      });
    });

    describe("when location is not found", () => {
      it("returns error message", async () => {
        server.use(
          http.post('https://workflowy.com/ajax_login', () => {
            return new HttpResponse(JSON.stringify(mockLoginResponse), {
              status: 200,
              headers: {
                'Set-Cookie': 'sessionid=test-session-123; path=/',
                'Content-Type': 'application/json',
              },
            });
          }),
          http.post('https://workflowy.com/get_initialization_data', () => {
            return HttpResponse.json({
              results: [
                {
                  id: 'work-node',
                  name: 'Work',
                  children: []
                }
              ],
              polling_interval_ms: 1000
            });
          })
        );
        
        server.listen();

        const tool = WorkFlowyConnectorConfig.tools.CREATE_BULLET as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        mockContext.getCredentials.mockResolvedValue({
          username: "test@example.com",
          password: "password123"
        });

        mockContext.getSetup.mockResolvedValue({});

        const result = await tool.handler({
          name: "Test bullet",
          location: "NonExistent/Location"
        }, mockContext);

        server.close();

        expect(result).toContain('Error: Location "NonExistent/Location" not found');
      });
    });
  });

  describe(".READ_TASKS", () => {
    describe("when tasks exist", () => {
      describe("and no location is specified", () => {
        it("returns all tasks from document", async () => {
          server.use(
            http.post('https://workflowy.com/ajax_login', () => {
              return new HttpResponse(JSON.stringify(mockLoginResponse), {
                status: 200,
                headers: {
                  'Set-Cookie': 'sessionid=test-session-123; path=/',
                  'Content-Type': 'application/json',
                },
              });
            }),
            http.post('https://workflowy.com/get_initialization_data', () => {
              return HttpResponse.json(mockTasksResponse);
            })
          );
          
          server.listen();

          const tool = WorkFlowyConnectorConfig.tools.READ_TASKS as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          mockContext.getCredentials.mockResolvedValue({
            username: "test@example.com",
            password: "password123"
          });

          const result = await tool.handler({
            includeCompleted: false
          }, mockContext);

          server.close();

          expect(result).toContain("Found 1 task(s)");
          expect(result).toContain("• First task");
          expect(result).not.toContain("Completed task");
        });
      });

      describe("and including completed tasks", () => {
        it("returns all tasks including completed ones", async () => {
          server.use(
            http.post('https://workflowy.com/ajax_login', () => {
              return new HttpResponse(JSON.stringify(mockLoginResponse), {
                status: 200,
                headers: {
                  'Set-Cookie': 'sessionid=test-session-123; path=/',
                  'Content-Type': 'application/json',
                },
              });
            }),
            http.post('https://workflowy.com/get_initialization_data', () => {
              return HttpResponse.json(mockTasksResponse);
            })
          );
          
          server.listen();

          const tool = WorkFlowyConnectorConfig.tools.READ_TASKS as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          mockContext.getCredentials.mockResolvedValue({
            username: "test@example.com",
            password: "password123"
          });

          const result = await tool.handler({
            includeCompleted: true
          }, mockContext);

          server.close();

          expect(result).toContain("Found 2 task(s)");
          expect(result).toContain("• First task");
          expect(result).toContain("✓ Completed task");
        });
      });

      describe("and specific location is provided", () => {
        it("returns tasks from that location", async () => {
          server.use(
            http.post('https://workflowy.com/ajax_login', () => {
              return new HttpResponse(JSON.stringify(mockLoginResponse), {
                status: 200,
                headers: {
                  'Set-Cookie': 'sessionid=test-session-123; path=/',
                  'Content-Type': 'application/json',
                },
              });
            }),
            http.post('https://workflowy.com/get_initialization_data', () => {
              return HttpResponse.json({
                results: [
                  {
                    id: 'work-node',
                    name: 'Work',
                    children: [
                      {
                        id: 'task1',
                        name: 'Work task',
                        completed: false,
                        last_modified: 1234567890
                      }
                    ]
                  }
                ],
                polling_interval_ms: 1000
              });
            })
          );
          
          server.listen();

          const tool = WorkFlowyConnectorConfig.tools.READ_TASKS as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          mockContext.getCredentials.mockResolvedValue({
            username: "test@example.com",
            password: "password123"
          });

          const result = await tool.handler({
            location: "Work",
            includeCompleted: false
          }, mockContext);

          server.close();

          expect(result).toContain("Found 1 task(s) in Work");
          expect(result).toContain("• Work task");
        });
      });
    });

    describe("when no tasks exist", () => {
      it("returns no tasks found message", async () => {
        server.use(
          http.post('https://workflowy.com/ajax_login', () => {
            return new HttpResponse(JSON.stringify(mockLoginResponse), {
              status: 200,
              headers: {
                'Set-Cookie': 'sessionid=test-session-123; path=/',
                'Content-Type': 'application/json',
              },
            });
          }),
          http.post('https://workflowy.com/get_initialization_data', () => {
            return HttpResponse.json({
              results: [],
              polling_interval_ms: 1000
            });
          })
        );
        
        server.listen();

        const tool = WorkFlowyConnectorConfig.tools.READ_TASKS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        mockContext.getCredentials.mockResolvedValue({
          username: "test@example.com",
          password: "password123"
        });

        const result = await tool.handler({}, mockContext);

        server.close();

        expect(result).toBe("No tasks found in the specified location.");
      });
    });
  });

  describe(".SEARCH_TASKS", () => {
    describe("when matching tasks exist", () => {
      it("returns matching tasks", async () => {
        server.use(
          http.post('https://workflowy.com/ajax_login', () => {
            return new HttpResponse(JSON.stringify(mockLoginResponse), {
              status: 200,
              headers: {
                'Set-Cookie': 'sessionid=test-session-123; path=/',
                'Content-Type': 'application/json',
              },
            });
          }),
          http.post('https://workflowy.com/get_initialization_data', () => {
            return HttpResponse.json({
              results: [
                {
                  id: 'task1',
                  name: 'Urgent task to complete',
                  completed: false,
                  last_modified: 1234567890
                },
                {
                  id: 'task2',
                  name: 'Regular task',
                  description: 'This is urgent',
                  completed: false,
                  last_modified: 1234567891
                }
              ],
              polling_interval_ms: 1000
            });
          })
        );
        
        server.listen();

        const tool = WorkFlowyConnectorConfig.tools.SEARCH_TASKS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        mockContext.getCredentials.mockResolvedValue({
          username: "test@example.com",
          password: "password123"
        });

        const result = await tool.handler({
          query: "urgent",
          includeCompleted: false
        }, mockContext);

        server.close();

        expect(result).toContain('Found 2 task(s) matching "urgent"');
        expect(result).toContain("• Urgent task to complete");
        expect(result).toContain("• Regular task");
        expect(result).toContain("This is urgent");
      });
    });

    describe("when no matching tasks exist", () => {
      it("returns no tasks found message", async () => {
        server.use(
          http.post('https://workflowy.com/ajax_login', () => {
            return new HttpResponse(JSON.stringify(mockLoginResponse), {
              status: 200,
              headers: {
                'Set-Cookie': 'sessionid=test-session-123; path=/',
                'Content-Type': 'application/json',
              },
            });
          }),
          http.post('https://workflowy.com/get_initialization_data', () => {
            return HttpResponse.json({
              results: [
                {
                  id: 'task1',
                  name: 'Regular task',
                  completed: false,
                  last_modified: 1234567890
                }
              ],
              polling_interval_ms: 1000
            });
          })
        );
        
        server.listen();

        const tool = WorkFlowyConnectorConfig.tools.SEARCH_TASKS as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        mockContext.getCredentials.mockResolvedValue({
          username: "test@example.com",
          password: "password123"
        });

        const result = await tool.handler({
          query: "nonexistent",
          includeCompleted: false
        }, mockContext);

        server.close();

        expect(result).toBe('No tasks found matching "nonexistent".');
      });
    });
  });

  describe(".GET_STRUCTURE", () => {
    describe("when document has structure", () => {
      it("returns hierarchical structure with item counts", async () => {
        server.use(
          http.post('https://workflowy.com/ajax_login', () => {
            return new HttpResponse(JSON.stringify(mockLoginResponse), {
              status: 200,
              headers: {
                'Set-Cookie': 'sessionid=test-session-123; path=/',
                'Content-Type': 'application/json',
              },
            });
          }),
          http.post('https://workflowy.com/get_initialization_data', () => {
            return HttpResponse.json({
              results: [
                {
                  id: 'work-node',
                  name: 'Work',
                  completed: false,
                  children: [
                    {
                      id: 'task1',
                      name: 'Project A',
                      completed: false,
                      children: []
                    },
                    {
                      id: 'task2',
                      name: 'Project B',
                      completed: true,
                      children: []
                    }
                  ]
                }
              ],
              polling_interval_ms: 1000
            });
          })
        );
        
        server.listen();

        const tool = WorkFlowyConnectorConfig.tools.GET_STRUCTURE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        mockContext.getCredentials.mockResolvedValue({
          username: "test@example.com",
          password: "password123"
        });

        const result = await tool.handler({
          showItemCounts: true,
          maxDepth: 2
        }, mockContext);

        server.close();

        expect(result).toContain("Document structure:");
        expect(result).toContain("Work (2 items)");
        expect(result).toContain("  Project A (0 items)");
        expect(result).toContain("  ✓ Project B (0 items)");
      });
    });

    describe("when no structure exists", () => {
      it("returns no items found message", async () => {
        server.use(
          http.post('https://workflowy.com/ajax_login', () => {
            return new HttpResponse(JSON.stringify(mockLoginResponse), {
              status: 200,
              headers: {
                'Set-Cookie': 'sessionid=test-session-123; path=/',
                'Content-Type': 'application/json',
              },
            });
          }),
          http.post('https://workflowy.com/get_initialization_data', () => {
            return HttpResponse.json({
              results: [],
              polling_interval_ms: 1000
            });
          })
        );
        
        server.listen();

        const tool = WorkFlowyConnectorConfig.tools.GET_STRUCTURE as MCPToolDefinition;
        const mockContext = createMockConnectorContext();

        mockContext.getCredentials.mockResolvedValue({
          username: "test@example.com",
          password: "password123"
        });

        const result = await tool.handler({}, mockContext);

        server.close();

        expect(result).toBe("No items found in the specified location.");
      });
    });
  });
});