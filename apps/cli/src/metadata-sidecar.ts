/**
 * Path for the .txt metadata sidecar written next to a convert output file —
 * same name, extension swapped (e.g. /abs/pixdom-output.png -> /abs/pixdom-output.txt).
 */
export function metadataPathFor(outputPath: string): string {
  return outputPath.replace(/\.[^./]+$/, '.txt');
}

function quoteArgvToken(token: string): string {
  if (!/[\s"]/.test(token)) return token;
  return `"${token.replace(/(["\\])/g, '\\$1')}"`;
}

/**
 * Metadata sidecar content: generation timestamp plus the exact command that
 * produced the output, reconstructed as a copy-pasteable `pixdom ...` line.
 */
export function buildMetadataContent(argv: string[], generatedAt: Date): string {
  const command = `pixdom ${argv.map(quoteArgvToken).join(' ')}`;
  return `Generated: ${generatedAt.toISOString()}\nCommand: ${command}\n`;
}
