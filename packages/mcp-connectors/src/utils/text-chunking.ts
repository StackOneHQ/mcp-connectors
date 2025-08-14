/**
 * Lightweight text chunking utility optimized for documentation and edge functions
 * Provides intelligent text splitting with overlap and semantic boundary awareness
 */

export interface ChunkingOptions {
  maxChunkSize?: number;
  minChunkSize?: number;
  overlapSize?: number;
}

export const defaultChunkingOptions: Required<ChunkingOptions> = {
  maxChunkSize: 1000, // Target ~1000 characters per chunk
  minChunkSize: 250, // Minimum meaningful chunk size
  overlapSize: 150, // Overlap for context continuity
};

/**
 * Split text into smart chunks optimized for documentation
 * Uses hierarchical splitting: sections -> sentences -> words
 */
export const splitTextIntoSmartChunks = (
  text: string,
  options: ChunkingOptions = {}
): string[] => {
  const opts = { ...defaultChunkingOptions, ...options };

  if (!text || text.trim().length === 0) {
    return [];
  }

  // Step 1: Split by major structural boundaries (prioritized order)
  const chunks: string[] = [];

  // First, split by major section breaks
  const majorSections = splitBySeparators(text, [
    '\n\n\n', // Triple newlines (major breaks)
    '\n\n', // Double newlines (paragraphs)
  ]);

  for (const section of majorSections) {
    if (section.trim().length === 0) continue;

    if (section.length <= opts.maxChunkSize) {
      // Section fits in one chunk
      chunks.push(section.trim());
    } else {
      // Section too large, split further
      const subChunks = splitLargeSection(section, opts.maxChunkSize, opts.overlapSize);
      chunks.push(...subChunks);
    }
  }

  // Step 2: Merge small chunks with neighbors if possible
  const mergedChunks = mergeSmallChunks(chunks, opts.minChunkSize, opts.maxChunkSize);

  // Step 3: Filter out chunks that are mostly non-textual
  const filteredChunks = mergedChunks.filter((chunk) => {
    if (chunk.length < opts.minChunkSize) return false;

    // Ensure meaningful content (not just punctuation/whitespace)
    const alphanumericChars = chunk.replace(/[^a-zA-Z0-9]/g, '').length;
    return alphanumericChars > chunk.length * 0.3;
  });

  return filteredChunks;
};

// Helper: Split text by multiple separators in priority order
const splitBySeparators = (text: string, separators: string[]): string[] => {
  let sections = [text];

  for (const separator of separators) {
    const newSections: string[] = [];
    for (const section of sections) {
      newSections.push(...section.split(separator));
    }
    sections = newSections;
  }

  return sections.filter((s) => s.trim().length > 0);
};

// Helper: Split large section into smaller chunks with overlap
const splitLargeSection = (
  section: string,
  maxSize: number,
  overlap: number
): string[] => {
  const chunks: string[] = [];

  // Try splitting by sentences first
  const sentences = section.split(/(?<=[.!?])\s+/);

  let currentChunk = '';
  let previousChunk = '';

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length + 1 <= maxSize) {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    } else {
      // Current chunk is full, start new one
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        previousChunk = currentChunk;
      }

      // Start new chunk with overlap from previous
      const overlapText = getOverlapText(previousChunk, overlap);
      currentChunk = overlapText + (overlapText ? ' ' : '') + sentence;
    }
  }

  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // If sentence splitting didn't work well, fall back to word splitting
  if (chunks.length === 0 || chunks.some((chunk) => chunk.length > maxSize * 1.5)) {
    return splitByWords(section, maxSize, overlap);
  }

  return chunks;
};

// Helper: Split by words when sentences are too large
const splitByWords = (text: string, maxSize: number, overlap: number): string[] => {
  const chunks: string[] = [];
  const words = text.split(/\s+/);

  let currentChunk = '';
  let previousChunk = '';

  for (const word of words) {
    if (currentChunk.length + word.length + 1 <= maxSize) {
      currentChunk += (currentChunk ? ' ' : '') + word;
    } else {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        previousChunk = currentChunk;
      }

      const overlapText = getOverlapText(previousChunk, overlap);
      currentChunk = overlapText + (overlapText ? ' ' : '') + word;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};

// Helper: Get overlap text from previous chunk
const getOverlapText = (text: string, overlapSize: number): string => {
  if (!text || overlapSize <= 0) return '';

  const words = text.split(/\s+/);
  const overlapWords = Math.min(Math.floor(overlapSize / 10), words.length);

  return words.slice(-overlapWords).join(' ');
};

// Helper: Merge small chunks with neighbors
const mergeSmallChunks = (
  chunks: string[],
  minSize: number,
  maxSize: number
): string[] => {
  const merged: string[] = [];
  let i = 0;

  while (i < chunks.length) {
    const initialChunk = chunks[i];
    if (!initialChunk) {
      i++;
      continue;
    }

    let currentChunk = initialChunk;

    // Try to merge with next chunk if current is too small
    while (currentChunk.length < minSize && i + 1 < chunks.length) {
      const nextChunk = chunks[i + 1];
      if (!nextChunk || currentChunk.length + nextChunk.length + 1 > maxSize) {
        break;
      }

      i++;
      currentChunk = `${currentChunk} ${nextChunk}`;
    }

    merged.push(currentChunk.trim());
    i++;
  }

  return merged;
};
