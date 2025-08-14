import { describe, expect, it } from 'vitest';
import { defaultChunkingOptions, splitTextIntoSmartChunks } from './text-chunking';
import type { ChunkingOptions } from './text-chunking';

describe('#text-chunking', () => {
  describe('.splitTextIntoSmartChunks', () => {
    describe('when text is empty string', () => {
      it('returns empty array', () => {
        const actual = splitTextIntoSmartChunks('');

        expect(actual).toEqual([]);
      });
    });

    describe('when text is only whitespace', () => {
      it('returns empty array', () => {
        const actual = splitTextIntoSmartChunks('   \n\t   ');

        expect(actual).toEqual([]);
      });
    });

    describe('when text is shorter than max chunk size', () => {
      it('returns single chunk with trimmed text', () => {
        const text = '  This is a short text that fits in one chunk.  ';

        const actual = splitTextIntoSmartChunks(text, {
          minChunkSize: 10,
          maxChunkSize: 100,
        });

        expect(actual.length).toBe(1);
        expect(actual[0]).toBe('This is a short text that fits in one chunk.');
      });
    });

    describe('when text contains double newlines', () => {
      describe('and each paragraph fits in max chunk size', () => {
        it('splits into separate chunks by paragraphs', () => {
          const text = [
            'First paragraph with some content.',
            '',
            'Second paragraph with different content.',
          ].join('\n\n');

          const actual = splitTextIntoSmartChunks(text, {
            minChunkSize: 10,
            maxChunkSize: 100,
          });

          expect(actual.length).toBe(2);
          expect(actual[0]).toContain('First paragraph with some content');
          expect(actual[1]).toContain('Second paragraph with different content');
        });
      });
    });

    describe('when text contains triple newlines', () => {
      it('treats triple newlines as major section breaks', () => {
        const text = ['First major section.', '', '', 'Second major section.'].join('\n');

        const actual = splitTextIntoSmartChunks(text, {
          minChunkSize: 10,
          maxChunkSize: 100,
        });

        expect(actual.length).toBe(2);
        expect(actual[0]).toContain('First major section');
        expect(actual[1]).toContain('Second major section');
      });
    });

    describe('when paragraph exceeds max chunk size', () => {
      describe('and can be split by sentences', () => {
        it('splits paragraph into sentence-based chunks with overlap', () => {
          const longSentence = 'A'.repeat(400);
          const text = `${longSentence}. ${'B'.repeat(400)}. ${'C'.repeat(400)}.`;

          const actual = splitTextIntoSmartChunks(text, { maxChunkSize: 500 });

          expect(actual.length).toBeGreaterThan(1);
        });
      });

      describe('and sentences are too long', () => {
        it('falls back to word-based splitting', () => {
          const words = Array(200).fill('word').join(' ');

          const actual = splitTextIntoSmartChunks(words, { maxChunkSize: 500 });

          expect(actual.length).toBeGreaterThan(1);
        });
      });
    });

    describe('when chunks are smaller than min chunk size', () => {
      it('merges small chunks with neighbors', () => {
        const text = 'A.\n\nB.\n\nC.\n\nD.';

        const actual = splitTextIntoSmartChunks(text, {
          minChunkSize: 10,
          maxChunkSize: 100,
        });

        expect(
          actual.every(
            (chunk) => chunk.length >= 10 || chunk === actual[actual.length - 1]
          )
        ).toBe(true);
      });
    });

    describe('when chunk contains mostly non-alphanumeric characters', () => {
      it('filters out chunks with insufficient meaningful content', () => {
        const text = `
          Good content here with meaningful text.

          !!!@@@###$$$%%%^^^&&&***

          More good content with actual words.
        `;

        const actual = splitTextIntoSmartChunks(text);

        expect(
          actual.every((chunk) => {
            const alphanumeric = chunk.replace(/[^a-zA-Z0-9]/g, '').length;
            return alphanumeric > chunk.length * 0.3;
          })
        ).toBe(true);
      });
    });

    describe('when custom options are provided', () => {
      describe('and maxChunkSize is specified', () => {
        it('uses custom max chunk size', () => {
          const longText = 'word '.repeat(200);
          const options: ChunkingOptions = { maxChunkSize: 100 };

          const actual = splitTextIntoSmartChunks(longText, options);

          expect(actual.every((chunk) => chunk.length <= 110)).toBe(true); // Allow small buffer for overlap
        });
      });

      describe('and minChunkSize is specified', () => {
        it('uses custom min chunk size for filtering', () => {
          const text = 'A.\n\nB.\n\nC.';
          const options: ChunkingOptions = { minChunkSize: 5 };

          const actual = splitTextIntoSmartChunks(text, options);

          expect(actual.every((chunk) => chunk.length >= 5)).toBe(true);
        });
      });

      describe('and overlapSize is specified', () => {
        it('uses custom overlap size for chunk boundaries', () => {
          const longText =
            'This comprehensive documentation explains various aspects of text processing and analysis techniques used in modern content management systems. It covers detailed information about implementation strategies and provides extensive coverage of algorithmic approaches for document processing workflows. '.repeat(
              15
            );
          const options: ChunkingOptions = {
            maxChunkSize: 400,
            overlapSize: 50,
          };

          const actual = splitTextIntoSmartChunks(longText, options);

          expect(actual.length).toBeGreaterThan(1);
        });
      });
    });

    describe('when no options provided', () => {
      it('uses default chunking options', () => {
        const longText = 'word '.repeat(500);

        const actual = splitTextIntoSmartChunks(longText);

        expect(
          actual.every(
            (chunk) => chunk.length <= defaultChunkingOptions.maxChunkSize + 100
          )
        ).toBe(true);
      });
    });

    describe('when text has mixed content types', () => {
      it('handles combination of paragraphs, sentences, and words', () => {
        const text = `
# Title Section Documentation System

This comprehensive paragraph contains multiple detailed sentences that explain various aspects of the documentation processing system. Each sentence provides meaningful content that describes different components and features. The paragraph demonstrates how the chunking algorithm should process mixed content types effectively and maintain proper text segmentation throughout the entire document structure.

## Advanced Processing Subsection

This extended subsection provides additional information about advanced processing techniques used in modern documentation systems. It covers various methodologies and approaches that enable effective content management and text analysis. The section includes detailed explanations of algorithms and implementation strategies.

${Array(50).fill('comprehensive technical documentation content').join(' ')}

Final extended paragraph contains substantial content that explains the concluding aspects of the documentation system. It provides comprehensive information about the final processing stages and summarizes the key concepts discussed throughout this technical documentation example.
        `;

        const actual = splitTextIntoSmartChunks(text);

        expect(actual.length).toBeGreaterThan(1);
        expect(actual.every((chunk) => chunk.trim().length > 0)).toBe(true);
      });
    });

    describe('when text contains code blocks', () => {
      it('preserves code block structure where possible', () => {
        const text = `
This comprehensive documentation provides detailed information about code integration and implementation strategies. It explains various approaches to embedding code examples within technical documentation and demonstrates best practices for maintaining proper formatting and structure throughout the document processing workflow.

\`\`\`javascript
function comprehensiveExample() {
  console.log("This is a comprehensive code example that demonstrates various programming concepts");
  const documentationProcessor = new TextChunker();
  const processedContent = documentationProcessor.processContent(inputText);
  return processedContent.map(chunk => chunk.optimizeForDisplay());
}
\`\`\`

This extended section provides additional context and explanation following the code example. It covers implementation details and describes how the code integrates with the broader system architecture. The section includes comprehensive information about configuration options and usage patterns that developers should understand when working with this codebase.
        `;

        const actual = splitTextIntoSmartChunks(text);

        expect(actual.length).toBeGreaterThan(0);
        expect(actual.some((chunk) => chunk.includes('comprehensiveExample'))).toBe(true);
      });
    });

    describe('when overlap creates meaningful context', () => {
      it('includes overlap text in subsequent chunks', () => {
        const text = [
          'Introduction paragraph with context.',
          'Main content paragraph that is quite long and contains detailed information about the topic.',
          'Conclusion paragraph that wraps up.',
        ].join(' ');

        const actual = splitTextIntoSmartChunks(text, {
          maxChunkSize: 100,
          overlapSize: 20,
        });

        if (actual.length > 1) {
          expect(actual[1]).toMatch(/context|content/);
        }
      });
    });

    describe('when text has inconsistent spacing', () => {
      it('normalizes spacing in output chunks', () => {
        const text = `
        First   paragraph    with    extra    spaces.


        Second  paragraph     also    with    spacing   issues.
        `;

        const actual = splitTextIntoSmartChunks(text);

        expect(actual.every((chunk) => !chunk.includes('  '))).toBe(true);
      });
    });

    describe('when single word exceeds max chunk size', () => {
      it('includes oversized word as single chunk', () => {
        const oversizedWord = 'A'.repeat(2000);
        const text = `Normal text. ${oversizedWord} More normal text.`;

        const actual = splitTextIntoSmartChunks(text, { maxChunkSize: 500 });

        expect(actual.some((chunk) => chunk.includes(oversizedWord))).toBe(true);
      });
    });

    describe('when text ends with punctuation', () => {
      it('preserves sentence boundaries correctly', () => {
        const text = 'First sentence! Second sentence? Third sentence.';

        const actual = splitTextIntoSmartChunks(text, {
          maxChunkSize: 20,
          minChunkSize: 5,
        });

        expect(actual.length).toBeGreaterThan(1);
        expect(actual.join(' ')).toContain('sentence!');
        expect(actual.join(' ')).toContain('sentence?');
        expect(actual.join(' ')).toContain('sentence.');
      });
    });

    describe('when chunk merging would exceed max size', () => {
      it('keeps chunks separate instead of merging', () => {
        const text = Array(10).fill('Medium length content chunk.').join('\n\n');

        const actual = splitTextIntoSmartChunks(text, {
          minChunkSize: 20,
          maxChunkSize: 50,
        });

        expect(actual.every((chunk) => chunk.length <= 50)).toBe(true);
      });
    });
  });

  describe('.defaultChunkingOptions', () => {
    describe('when accessing default options', () => {
      it('provides expected max chunk size', () => {
        const actual = defaultChunkingOptions.maxChunkSize;

        expect(actual).toBe(1000);
      });

      it('provides expected min chunk size', () => {
        const actual = defaultChunkingOptions.minChunkSize;

        expect(actual).toBe(250);
      });

      it('provides expected overlap size', () => {
        const actual = defaultChunkingOptions.overlapSize;

        expect(actual).toBe(150);
      });
    });
  });
});
