# How to Run _macOS as a Service_ (AppleScript MCP)

## Build via Bun

```
kenny@Kennys-MacBook-Pro  ~/GitHub/mcp-connectors/packages   practice ±  bun run build && bun start --connector applescript
```

## Add to Gemini

```
gemini mcp add applescript http://localhost:3000/mcp --transport http --scope user
```

## Add to Claude Code

```
claude mcp add --transport http applescript http://localhost:3000/mcp
```

## Ngrok

```
ngrok http 3000
```

## Add to Claude Desktop

> Use the ngrok URL
