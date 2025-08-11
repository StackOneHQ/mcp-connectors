# Connector Utilities

This directory contains utility functions for MCP connectors.

## Lexical Search

The lexical search utility provides BM25-based search functionality for structured data objects.

### Overview

The search utility uses the industry-standard **Okapi BM25** algorithm to provide relevant search results across structured data. It automatically extracts searchable text from objects and scores results based on term frequency, document length, and field importance.

### Quick Start

```typescript
import { createIndex, search } from "./utils/lexical-search";

const items = [
  { title: "Document 1", content: "This is about search algorithms" },
  { title: "Document 2", content: "This covers machine learning" },
  { title: "Document 3", content: "Advanced search techniques" },
];

// Create a search index once
const index = await createIndex(items, {
  fields: ["title", "content"],
  threshold: 0.1,
});

// Search multiple times efficiently
const results1 = await search(index, "search algorithms");
const results2 = await search(index, "machine learning");
// Returns SearchResult objects with items and scores
```

### API Reference

#### `createIndex<T>(items: T[], options?: SearchOptions): Promise<SearchIndex<T>>`

**Create a search index** - Build an optimized search index for your data.

**Parameters:**

- `items`: Array of objects to make searchable
- `options`: Search configuration object

**Returns:** Promise resolving to a `SearchIndex<T>` that can be searched repeatedly

The `SearchIndex` contains:

- `db`: Properly typed Orama database instance (`AnyOrama`)
- `items`: Your original data array
- `options`: Search configuration used to create the index

#### `search<T>(index: SearchIndex<T>, query: string, overrideOptions?: Partial<SearchOptions>): Promise<SearchResult<T>[]>`

**Search the index** - Find relevant items with BM25 scoring.

**Parameters:**

- `index`: Previously created search index
- `query`: Search query string
- `overrideOptions`: Optional search options to override index defaults

**Returns:** Array of `SearchResult` objects containing:

- `item`: The original item from your data
- `score`: BM25 relevance score (higher = more relevant)

**Benefits:**

- **Performance**: Index created once, searched many times
- **Type Safety**: Properly typed with Orama's `AnyOrama` interface
- **Flexibility**: Override options per search
- **Clean separation**: Index creation separate from searching

### Types

```typescript
interface SearchableItem {
  [key: string]: unknown;
}

// Helper type for clean type casting - extends SearchableItem
type AnySearchableObject = Record<string, unknown>;

interface SearchIndex<T extends SearchableItem> {
  db: AnyOrama; // Properly typed Orama database instance
  items: T[]; // Your original data
  options: SearchOptions; // Configuration used to create index
}

interface SearchResult<T extends SearchableItem> {
  item: T; // Original item with full type safety
  score: number; // BM25 relevance score
}
```

### Search Options

```typescript
interface SearchOptions {
  fields?: string[]; // Optional: specific fields to search (default: auto-discover all string fields)
  threshold?: number; // Minimum score threshold (default: 0)
  maxResults?: number; // Maximum results to return (default: 50)

  sortBy?: {
    // Sort results by property (leverages Orama's native sorting)
    property: string; // Property name to sort by
    order?: "ASC" | "DESC"; // Sort order (default: 'ASC')
  };

  boost?: Record<string, number>; // Custom field weights (e.g., { title: 2.0, description: 1.2 })

  k1?: number; // BM25 k1 parameter (default: 1.2)
  b?: number; // BM25 b parameter (default: 0.75)
}
```

### Examples

#### Basic Usage

```typescript
import { createIndex, search } from "./utils/lexical-search";

const items = [
  { name: "John Doe", email: "john@example.com", role: "developer" },
  { name: "Jane Smith", email: "jane@example.com", role: "designer" },
  { name: "Bob Johnson", email: "bob@example.com", role: "developer" },
];

// Option 1: Auto-discover all string fields (recommended for most cases)
const autoIndex = await createIndex(items, {
  threshold: 0.1,
  maxResults: 10,
});

// Option 2: Specify exact fields to search (for performance optimization)
const focusedIndex = await createIndex(items, {
  fields: ["name", "role"], // Only search these specific fields
  threshold: 0.1,
  maxResults: 10,
});

// Search efficiently, reusing the index
const developers1 = await search(autoIndex, "developer"); // Searches all string fields
const developers2 = await search(focusedIndex, "developer"); // Searches only name, role

// Clean Type-Safe Usage with specific interfaces
interface User extends AnySearchableObject {
  name: string;
  email: string;
  role: string;
}

const users: User[] = [
  { name: "John", email: "john@example.com", role: "developer" },
  { name: "Jane", email: "jane@example.com", role: "designer" },
];

const userIndex = await createIndex(users, { fields: ["name", "role"] });
const results = await search(userIndex, "developer"); // Clean, no type casting needed!
```

#### Specialized Indices

```typescript
// Create different indices for different needs
const nameIndex = await createIndex(items, {
  fields: ["name"],
  sortBy: { property: "name", order: "ASC" },
});

const relevanceIndex = await createIndex(items, {
  threshold: 0.2,
  maxResults: 5,
  boost: { title: 2.0, name: 1.5 }, // Boost important fields
  sortBy: { property: "score", order: "DESC" },
});

// Search each index as needed
const nameResults = await search(nameIndex, "john");
const relevantResults = await search(relevanceIndex, "developer experience");
```

#### Sorting Results

Leverage Orama's native sorting to order results by any property:

```typescript
// Sort by name ascending
const sortedResults = await lexicalSearch(items, "developer", {
  sortBy: { property: "name", order: "ASC" },
});

// Sort by score descending (most relevant first)
const scoreResults = await lexicalSearch(items, "developer", {
  sortBy: { property: "score", order: "DESC" },
});

// Sort by nested property
const projectItems = [
  { name: "Project A", stats: { priority: 3, created: "2023-01-01" } },
  { name: "Project B", stats: { priority: 1, created: "2023-02-01" } },
];

const priorityResults = await lexicalSearch(projectItems, "project", {
  sortBy: { property: "stats.priority", order: "DESC" }, // High priority first
});
```

#### Detailed Results with Scores

```typescript
const search = createSearch({ threshold: 0.1 });
const results = await search(items, "developer john");

results.forEach((result) => {
  console.log(`Item: ${result.item.name}`);
  console.log(`Score: ${result.score}`);
});

// Or just get the items
const justItems = results.map((r) => r.item);
```

#### Nested Object Search

```typescript
const items = [
  {
    id: "1",
    title: "Project Alpha",
    details: {
      description: "Machine learning project",
      tags: ["AI", "ML", "Python"],
    },
  },
  {
    id: "2",
    title: "Project Beta",
    details: {
      description: "Web development project",
      tags: ["React", "TypeScript", "Node.js"],
    },
  },
];

// Searches all string fields recursively
const results = simpleSearch(items, "machine learning");
```

### BM25 Parameters

The search utility uses the BM25 algorithm with configurable parameters:

- **k1** (default: 1.2): Controls term frequency saturation. Higher values give more weight to term frequency.
- **b** (default: 0.75): Controls field length normalization. Higher values penalize longer documents more.

```typescript
const options = {
  k1: 1.5, // More weight on term frequency
  b: 0.5, // Less penalty for long documents
};
```

### Custom Field Weighting

You can boost the importance of specific fields using the `boost` option:

```typescript
// Boost title matches more than descriptions
const search = createSearch({
  boost: {
    title: 2.0, // 2x weight for title field
    name: 1.8, // 1.8x weight for name field
    description: 1.2, // 1.2x weight for description
    // Other fields get default 1.0x weight
  },
});

// Now title matches will score much higher
const results = await search(items, "search term");
```

### Usage in Connectors

Here's how to use the search utility in MCP connectors:

```typescript
import { simpleSearch } from "./utils/lexical-search";

export const MyConnectorConfig = mcpConnectorConfig({
  // ... other config
  tools: (tool) => ({
    SEARCH_ITEMS: tool({
      name: "search_items",
      description: "Search for items",
      schema: z.object({
        query: z.string().describe("Search query"),
        sort_by: z.string().optional().describe("Property to sort by"),
        sort_order: z.enum(["ASC", "DESC"]).optional().describe("Sort order"),
      }),
      handler: async (args, context) => {
        try {
          const items = await fetchItems(); // Your data source

          const searchOptions: any = {
            maxResults: 20,
            threshold: 0.1,
          };

          // Add Orama's native sorting if specified
          if (args.sort_by) {
            searchOptions.sortBy = {
              property: args.sort_by,
              order: args.sort_order || "ASC",
            };
          }

          const results = simpleSearch(
            items as Record<string, unknown>[],
            args.query,
            searchOptions
          );

          return JSON.stringify(results, null, 2);
        } catch (error) {
          return `Search failed: ${error.message}`;
        }
      },
    }),
  }),
});
```

### Performance Tips

1. **Field specification is optional** - auto-discovery works great for most cases:

   ```typescript
   // ✅ Good - let it find all string fields automatically
   const search = createSearch({ threshold: 0.1 });

   // ✅ Also good - specify fields only for performance with large objects
   const search = createSearch({ fields: ["title", "description"] });
   ```

2. **Set appropriate thresholds** to filter out irrelevant results:

   ```typescript
   const options = { threshold: 0.1 };
   ```

3. **Limit result count** for better performance:

   ```typescript
   const options = { maxResults: 20 };
   ```

4. **Use native sorting** instead of post-processing when possible:

   ```typescript
   // ✅ Good - let Orama handle sorting
   const options = { sortBy: { property: "created_at", order: "DESC" } };

   // ❌ Avoid - manual sorting after search
   const results = await lexicalSearch(items, query);
   results.sort((a, b) => b.created_at - a.created_at);
   ```

### Error Handling

The search utility handles various edge cases:

- Empty queries return all items with score 0
- Invalid fields are ignored
- Non-string values are automatically filtered out
- Malformed objects are handled gracefully

```typescript
try {
  const results = simpleSearch(items, query, options);
  // Process results
} catch (error) {
  console.error("Search failed:", error.message);
}
```

## Contributing

When adding new utility functions:

1. Follow the existing code style and patterns
2. Add comprehensive JSDoc comments
3. Include examples in this README
4. Add unit tests for new functionality
5. Update the API documentation
