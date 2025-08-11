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

- write a test file for the connector in the same directory.
- never use vi.mock() always use the vitest-mock-extended library.
- use msw instead of mocking global fetch
- all tests should be self contained and not depend on any external state or mocks.
- all tests for the connector should be in the same file `/connectors/{connector-name}.spec.ts`
- every tool in a connector should be tested in happy path, error and edge cases.
- use following format:

```typescript
describe("#ConnectorName", () => {
  describe(".toolName", () => {
    describe("when condition is met", () => {
      it("returns expected result", () => {
        const mockContext = createMockContext();
        const actual = connector.toolName.handler(args, mockContext);
        expect(actual).toBe(expected);
      });
    });
  });
});
```

- run check, test and build before submitting a PR.
