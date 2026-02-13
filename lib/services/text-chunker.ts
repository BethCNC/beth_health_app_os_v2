export interface TextChunk {
  chunkIndex: number;
  text: string;
  startOffset: number;
  endOffset: number;
  tokenCount: number;
}

interface ChunkOptions {
  maxChars?: number;
  overlapChars?: number;
  minChars?: number;
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  maxChars: 1100,
  overlapChars: 150,
  minChars: 350
};

export function createTextChunks(rawText: string, options: ChunkOptions = {}): TextChunk[] {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const text = normalizeText(rawText);
  if (!text) {
    return [];
  }

  const chunks: TextChunk[] = [];
  let cursor = 0;
  let chunkIndex = 0;

  while (cursor < text.length) {
    const maxEnd = Math.min(cursor + config.maxChars, text.length);
    const targetEnd = chooseBreakPoint(text, cursor, maxEnd, config.minChars);
    const chunkText = text.slice(cursor, targetEnd).trim();

    if (chunkText.length > 0) {
      chunks.push({
        chunkIndex,
        text: chunkText,
        startOffset: cursor,
        endOffset: targetEnd,
        tokenCount: approximateTokenCount(chunkText)
      });
      chunkIndex += 1;
    }

    if (targetEnd >= text.length) {
      break;
    }

    cursor = Math.max(0, targetEnd - config.overlapChars);
  }

  return chunks;
}

function normalizeText(text: string): string {
  return text.replace(/\r/g, "").replace(/[\t ]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function chooseBreakPoint(text: string, start: number, maxEnd: number, minChars: number): number {
  const minEnd = Math.min(start + minChars, maxEnd);
  const window = text.slice(minEnd, maxEnd);
  const breakRegex = /[\.\?!]\s|\n\n/g;
  let match: RegExpExecArray | null = null;
  let bestIndex = -1;

  while ((match = breakRegex.exec(window)) !== null) {
    bestIndex = match.index + minEnd + 1;
  }

  if (bestIndex > minEnd) {
    return bestIndex;
  }

  return maxEnd;
}

function approximateTokenCount(value: string): number {
  return Math.max(1, Math.ceil(value.length / 4));
}
