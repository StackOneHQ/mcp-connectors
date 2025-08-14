/**
 * Lexical search utility for searching through structured data
 * Uses Orama for modern full-text search with BM25-like scoring
 */

import {
  type AnyOrama,
  create,
  insertMultiple,
  search as oramaSearch,
} from '@orama/orama';

export interface SearchableItem {
  [key: string]: unknown;
}

// Helper type to avoid casting for common object types
export type AnySearchableObject = Record<string, unknown>;

export interface SearchResult<T extends SearchableItem> {
  item: T;
  score: number;
}

export interface SearchIndex<T extends SearchableItem> {
  db: AnyOrama;
  items: T[];
  options: SearchOptions;
  idMap: Map<string, T>;
}

export interface SearchOptions {
  /**
   * Fields to search in. If not provided, will search all string fields
   */
  fields?: string[];

  /**
   * Minimum score threshold for results
   */
  threshold?: number;

  /**
   * Maximum number of results to return
   */
  maxResults?: number;

  /**
   * Sort results by property. Supports string, number, and boolean fields
   */
  sortBy?: {
    property: string;
    order?: 'ASC' | 'DESC';
  };

  /**
   * Field boost weights for custom relevance scoring
   * Example: { title: 2.0, description: 1.2 }
   */
  boost?: Record<string, number>;

  /**
   * BM25 k1 parameter (term frequency saturation point)
   */
  k1?: number;

  /**
   * BM25 b parameter (field length normalization)
   */
  b?: number;
}

/**
 * Gets a nested value from an object using dot notation
 */
function getNestedValue(obj: SearchableItem, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);
}

/**
 * Gets all string field names from an object
 */
function getAllStringFields(obj: SearchableItem): string[] {
  const fields: string[] = [];
  const visited = new Set();

  function traverse(current: unknown, path = ''): void {
    if (visited.has(current)) return;
    if (current && typeof current === 'object') {
      visited.add(current);
    }

    if (typeof current === 'string' && path) {
      fields.push(path);
      return;
    }

    if (current && typeof current === 'object') {
      if (Array.isArray(current)) {
        current.forEach((item, index) => {
          traverse(item, path ? `${path}[${index}]` : `[${index}]`);
        });
      } else {
        for (const [key, value] of Object.entries(current)) {
          const fieldPath = path ? `${path}.${key}` : key;
          traverse(value, fieldPath);
        }
      }
    }
  }

  traverse(obj);
  return fields;
}

/**
 * Creates a search index for the given items
 * Returns an index that can be searched multiple times efficiently
 */
export const createIndex = async <T extends SearchableItem>(
  items: T[],
  options: SearchOptions = {}
): Promise<SearchIndex<T>> => {
  const startTime = Date.now();

  console.log(`[createIndex] Creating search index for ${items.length} items`, {
    fieldsToSearch: options.fields || 'all',
  });

  try {
    const searchableFields = options.fields || getAllStringFields(items[0] || {});
    console.log(
      `[createIndex] Discovered ${searchableFields.length} searchable fields:`,
      searchableFields
    );

    const schema = {
      id: 'string',
      ...Object.fromEntries(searchableFields.map((field) => [field, 'string'])),
    } as const;

    console.log('[createIndex] Creating Orama database with schema');
    const db = await create({
      schema,
      components: {
        tokenizer: {
          stopWords: false, // Keep all terms for better matching
        },
      },
    });

    // Prepare documents and id mapping
    const idMap = new Map<string, T>();

    const documents = items.map((item, index) => {
      const id = String(index);
      idMap.set(id, item);

      const doc: Record<string, string> = { id };

      for (const field of searchableFields) {
        const value = getNestedValue(item, field);
        doc[field] = typeof value === 'string' ? value : '';
      }

      return doc;
    });

    console.log(
      `[createIndex] Inserting ${documents.length} documents into Orama database`
    );
    await insertMultiple(db, documents);

    const duration = Date.now() - startTime;
    console.log(`[createIndex] Index created in ${duration}ms`);

    return {
      db,
      items,
      options,
      idMap,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[createIndex] Index creation failed after ${duration}ms:`, {
      itemsSearched: items.length,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * Search within a previously created index
 */
export const search = async <T extends SearchableItem>(
  index: SearchIndex<T>,
  query: string,
  overrideOptions: Partial<SearchOptions> = {}
): Promise<SearchResult<T>[]> => {
  const { threshold = 0, maxResults = 50 } = { ...index.options, ...overrideOptions };
  const startTime = Date.now();

  console.log(
    `[search] Searching for "${query}" in index with ${index.items.length} items`,
    {
      threshold,
      maxResults,
    }
  );

  if (!query || query.trim() === '') {
    console.log('[search] Empty query, returning all items with score 0');
    return index.items.map((item) => ({ item, score: 0 }));
  }

  try {
    // Use user-provided boost values or default to equal weighting
    const boost = { ...index.options.boost, ...overrideOptions.boost };
    const sortBy = overrideOptions.sortBy || index.options.sortBy;

    console.log(`[search] Executing search with term: "${query}"`, {
      boost: Object.keys(boost).length > 0,
      sortBy,
    });

    const searchParams = {
      term: query,
      properties: (index.options.fields && index.options.fields.length > 0
        ? (index.options.fields as string[])
        : '*') as '*' | string[],
      limit: maxResults,
      threshold: threshold,
      boost, // Use Orama's native field boosting
      exact: false, // Allow fuzzy matching
      tolerance: 1, // Allow 1 character difference
      ...(sortBy && {
        sortBy: {
          property: sortBy.property,
          order: sortBy.order || 'ASC',
        },
      }),
    };

    const searchResults = await oramaSearch(index.db, searchParams);

    // Direct result processing using id map
    const results: SearchResult<T>[] = searchResults.hits
      .map((result) => {
        const id = result.document.id as string;
        const originalItem = index.idMap.get(id);

        if (!originalItem) return null;

        return {
          item: originalItem,
          score: result.score || 0,
        };
      })
      .filter((result): result is SearchResult<T> => result !== null);

    const duration = Date.now() - startTime;

    console.log(`[search] Search completed in ${duration}ms`, {
      query,
      itemsSearched: index.items.length,
      resultsFound: results.length,
      topScores: results.slice(0, 3).map((r) => r.score),
    });

    return results;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[search] Search failed after ${duration}ms:`, {
      query,
      itemsSearched: index.items.length,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
};
