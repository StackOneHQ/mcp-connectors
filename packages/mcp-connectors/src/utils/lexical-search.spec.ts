import { describe, expect, it } from 'vitest';
import { createIndex, search } from './lexical-search';
import type { SearchOptions, SearchableItem } from './lexical-search';

describe('#lexical-search', () => {
  describe('.createIndex', () => {
    describe('when items array is empty', () => {
      it('creates index with no items', async () => {
        const actual = await createIndex([]);

        expect(actual.items).toEqual([]);
        expect(actual.db).toBeDefined();
        expect(actual.options).toEqual({});
      });
    });

    describe('when items array has one item', () => {
      describe('and item has string fields', () => {
        it('creates index with items stored', async () => {
          const items = [{ name: 'John Doe', age: 30 }];
          const actual = await createIndex(items);

          expect(actual.items).toEqual(items);
          expect(actual.db).toBeDefined();
        });
      });

      describe('and item has nested string fields', () => {
        it('creates searchable index for nested fields', async () => {
          const items = [{ user: { profile: { name: 'John' } } }];
          const actual = await createIndex(items);

          expect(actual.items).toEqual(items);
          expect(actual.db).toBeDefined();
        });
      });
    });

    describe('when options specify custom fields', () => {
      it('creates index with specified fields only', async () => {
        const items = [{ title: 'Test', content: 'Description' }];
        const options: SearchOptions = { fields: ['title'] };

        const actual = await createIndex(items, options);

        expect(actual.items).toEqual(items);
        expect(actual.options).toEqual(options);
      });
    });

    describe('when items contain circular references', () => {
      it('handles circular references without infinite loops', async () => {
        const circularItem = { name: 'test' } as SearchableItem;
        circularItem.self = circularItem;

        const actual = await createIndex([circularItem]);

        expect(actual.items).toEqual([circularItem]);
      });
    });

    describe('when items contain array fields', () => {
      it('creates index that can search array contents', async () => {
        const items = [{ tags: ['javascript', 'typescript'] }];

        const actual = await createIndex(items);

        expect(actual.items).toEqual(items);
        expect(actual.db).toBeDefined();
      });
    });
  });

  describe('.search', () => {
    describe('when query is empty string', () => {
      it('returns all items with zero scores', async () => {
        const items = [
          { name: 'John Doe', id: 1 },
          { name: 'Jane Smith', id: 2 },
        ];
        const index = await createIndex(items);

        const actual = await search(index, '');

        expect(actual).toEqual([
          { item: { name: 'John Doe', id: 1 }, score: 0 },
          { item: { name: 'Jane Smith', id: 2 }, score: 0 },
        ]);
      });
    });

    describe('when query is whitespace only', () => {
      it('returns all items with zero scores', async () => {
        const items = [
          { name: 'John Doe', id: 1 },
          { name: 'Jane Smith', id: 2 },
        ];
        const index = await createIndex(items);

        const actual = await search(index, '   ');

        expect(actual).toEqual([
          { item: { name: 'John Doe', id: 1 }, score: 0 },
          { item: { name: 'Jane Smith', id: 2 }, score: 0 },
        ]);
      });
    });

    describe('when searching for matching content', () => {
      it('returns matching items with scores', async () => {
        const items = [
          { name: 'John Doe', id: 1 },
          { name: 'Jane Smith', id: 2 },
          { name: 'Johnny Cash', id: 3 },
        ];
        const index = await createIndex(items);

        const actual = await search(index, 'John');

        expect(actual.length).toBeGreaterThan(0);
        expect(actual.every((result) => result.score > 0)).toBe(true);
        expect(actual.some((result) => result.item.name.includes('John'))).toBe(true);
      });
    });

    describe('when searching with threshold option', () => {
      it('filters results by minimum score', async () => {
        const items = [
          { name: 'John Doe', id: 1 },
          { name: 'Jane Smith', id: 2 },
        ];
        const index = await createIndex(items);

        const actual = await search(index, 'John', { threshold: 0.1 });

        expect(actual.every((result) => result.score >= 0.1)).toBe(true);
      });
    });

    describe('when searching with maxResults option', () => {
      it('limits number of results returned', async () => {
        const items = [
          { name: 'Test One', id: 1 },
          { name: 'Test Two', id: 2 },
          { name: 'Test Three', id: 3 },
        ];
        const index = await createIndex(items);

        const actual = await search(index, 'Test', { maxResults: 2 });

        expect(actual.length).toBeLessThanOrEqual(2);
      });
    });

    describe('when searching with boost option', () => {
      it('applies field boosting to search results', async () => {
        const items = [
          { title: 'Important Document', content: 'Regular content', id: 1 },
          { title: 'Regular Document', content: 'Important content', id: 2 },
        ];
        const index = await createIndex(items);

        const actual = await search(index, 'Important', { boost: { title: 2.0 } });

        expect(actual.length).toBeGreaterThan(0);
        expect(actual.every((result) => result.score > 0)).toBe(true);
      });
    });

    describe('when searching with custom fields', () => {
      it('searches only specified fields', async () => {
        const items = [{ title: 'Test Title', content: 'Different content', id: 1 }];
        const index = await createIndex(items, { fields: ['title'] });

        const actual = await search(index, 'Test');

        expect(actual.length).toBeGreaterThan(0);
        expect(actual[0]?.item.title).toBe('Test Title');
      });
    });

    describe('when no matches found', () => {
      it('returns empty array', async () => {
        const items = [
          { name: 'John Doe', id: 1 },
          { name: 'Jane Smith', id: 2 },
        ];
        const index = await createIndex(items);

        const actual = await search(index, 'xyz123nonexistent');

        expect(actual).toEqual([]);
      });
    });

    describe('when searching with sortBy option', () => {
      it('orders results according to the specified property and order', async () => {
        const items = [
          { title: 'Same Text', createdAt: '100' },
          { title: 'Same Text', createdAt: '300' },
          { title: 'Same Text', createdAt: '200' },
        ];
        const index = await createIndex(items, { fields: ['title', 'createdAt'] });

        const ascResults = await search(index, 'Same', {
          sortBy: { property: 'createdAt', order: 'ASC' },
        });
        expect(ascResults.map((r) => r.item.createdAt)).toEqual(['100', '200', '300']);

        const descResults = await search(index, 'Same', {
          sortBy: { property: 'createdAt', order: 'DESC' },
        });
        expect(descResults.map((r) => r.item.createdAt)).toEqual(['300', '200', '100']);
      });
    });

    describe('when testing fuzzy tolerance edge cases', () => {
      it('finds results within one character difference and rejects beyond tolerance', async () => {
        const items = [{ text: 'hello world', id: 1 }];
        const index = await createIndex(items, { fields: ['text'] });

        const oneOff = await search(index, 'helo', {});
        expect(oneOff.length).toBeGreaterThan(0);

        const twoOff = await search(index, 'hezxo', {});
        expect(twoOff.length).toBe(0);
      });
    });
  });
});
