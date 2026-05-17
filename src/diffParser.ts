// src/diffParser.ts

// Define files and folders to aggressively ignore to optimize LLM token footprints
const EXCLUDED_EXTENSIONS = [
  '.json', '.lock', '.yaml', '.yml', 
  '.png', '.jpg', '.jpeg', '.svg', '.gif', '.mp4', '.pdf',
  '.maps', '.ico'
];

const EXCLUDED_PATHS = [
  '.next/', 'node_modules/', 'dist/', 'build/', '.git/'
];

interface ParsedFileDiff {
  fileName: string;
  diffContent: string;
}

/**
 * Parses a raw git diff text block, filters out unreviewable files,
 * and formats clean code segments for the LLM context pool.
 */
export function parseAndFilterDiff(rawDiff: string): ParsedFileDiff[] {
  if (!rawDiff) return [];

  // Git diffs split distinct files using the delimiter string "diff --git "
  const fileBlocks = rawDiff.split(/^diff --git /m);
  const reviewedFiles: ParsedFileDiff[] = [];

  for (const block of fileBlocks) {
    if (!block.trim()) continue;

    // Extract the target file name from the header line (e.g., "a/src/app.ts b/src/app.ts")
    const lines = block.split('\n');
    const headerLine = lines[0] || '';
    
    // Quick regex execution to capture the file path destination path
    const match = headerLine.match(/b\/(.+)$/);
    if (!match) continue;

    const fileName = match[1].trim();

    // Technical Verification: Evaluate file mask exclusions
    const shouldSkipExtension = EXCLUDED_EXTENSIONS.some(ext => fileName.endsWith(ext));
    const shouldSkipPath = EXCLUDED_PATHS.some(path => fileName.includes(path));

    if (shouldSkipExtension || shouldSkipPath) {
      console.log(`⏩ [Parser] Skipping blacklisted asset file: ${fileName}`);
      continue;
    }

    // Reconstruct the structural diff text data without the git meta header
    const diffContent = lines.slice(1).join('\n').trim();
    
    if (diffContent) {
      reviewedFiles.push({ fileName, diffContent });
    }
  }

  return reviewedFiles;
}