Rules:

- Use the `mcpConnectorConfig` function to create a connector config
- Export it from the file.
- Keep the connector config fully enclosed in the file.

- there are some util functions you can use in connectors in /utils.
- use fetch to make api calls. do not use external libraries unless you have to.
- use javascript code which will run on modern versions of node, bun and cloudflare workers.
- do not use any niche features which may not be supported by all three of those runtimes.

- write good descriptions for all capabilities on the connector config.
- describes for the credentials and setup will be user facing so keep them short and descriptive for a user.

## Naming Conventions

- connectors keys should be named all lower case with no .io or .ai for example `incident` not `Incident` or `incident_io`
- connectors keys which are known as a product of an already established company should be named like <company name>\_<product name> for example `google_drive` not `GoogleDrive` or `googledrive`
- connector names should be human readable with capital letters. They should resemble the name the company or product is known by. For example `Google Drive` not `GoogleDrive` or `googledrive` but `Incident.io` not `IncidentIo` or `incident` since Incident.io is the common name for the company.
- connector files should take the same name as the connector key. the exception maybe if the name starts with a number which is illegal in a file name. In that case turn the number into a word eg. `onepassword` not `1password`

- capabilities should be named like `<connector name>_<tool name>` or `<connector name>_<resource name>`

## Testing Requirements

### File Organization

- Write a test file for each connector in the same directory: `/connectors/{connector-name}.spec.ts`
- All tests for a connector should be in a single file
- Every tool in a connector must be tested for happy path, error and edge cases

### Testing Framework

- Use `vitest` exclusively for all testing
- Never use `vi.mock()` - always use `vitest-mock-extended` library instead
- Use `msw` (Mock Service Worker) instead of mocking global fetch
- Import mock context: `import { createMockConnectorContext } from '../__mocks__/context'`

### Test Structure

Tests must follow this exact structure pattern:

```typescript
import { describe, expect, it } from "vitest";
import type { MCPToolDefinition } from "@stackone/mcp-config-types";
import { createMockConnectorContext } from "../__mocks__/context";
import { YourConnectorConfig } from "./your-connector";

describe("#YourConnector", () => {
  describe(".TOOL_NAME", () => {
    describe("when condition is met", () => {
      describe("and another condition is true", () => {
        it("returns expected result", () => {
          const tool = YourConnectorConfig.tools.TOOL_NAME as MCPToolDefinition;
          const mockContext = createMockConnectorContext();

          const actual = tool.handler({ args }, mockContext);

          expect(actual).toBe(expected);
        });
      });
    });
  });
});
```

### Critical Testing Rules

#### Naming Conventions

- **Global describe**: Use `#` prefix with connector name (e.g., `#SlackConnector`)
- **Tool describes**: Use `.` prefix with tool name (e.g., `.SEND_MESSAGE`)
- **Condition describes**: Start with "when..." (e.g., `when message is valid`)
- **Nested conditions**: Start with "and..." (e.g., `and channel exists`)
- **Test descriptions**: Describe the outcome, not implementation

#### Tool Access Pattern

**✅ Correct:**

```typescript
const tool = ConnectorConfig.tools.TOOL_NAME as MCPToolDefinition;
const result = await tool.handler(args, context);
```

**❌ Incorrect:**

```typescript
// Never use non-null assertion
const result = await ConnectorConfig.tools.TOOL_NAME!.handler(args, context);
```

#### Test Independence

- Each test must be able to run independently
- No shared state between tests
- No dependencies on test execution order
- No `beforeEach`, `afterEach`, `beforeAll`, or `afterAll` hooks
- Tests must be self-contained with no external dependencies

#### Mocking Guidelines

**✅ Correct MSW Setup:**

```typescript
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const server = setupServer(
  http.get("https://api.example.com/data", () => {
    return HttpResponse.json({ data: "test" });
  })
);

// Use server.listen(), server.close(), etc.
```

**❌ Never do this:**

```typescript
vi.mock("./some-module"); // Never use vi.mock
const spy = vi.spyOn(service, "method"); // Avoid spying unless absolutely necessary
```

#### Assertion Guidelines

- One primary assertion per test (additional context assertions are OK)
- Name test result variables as `actual`
- Be specific about what you're testing
- Test the behavior, not the implementation

- run check, test and build before submitting a PR.
