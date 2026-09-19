import { spawn } from 'node:child_process';
import gifsiclePath from 'gifsicle';

/**
 * Returns the gifsicle binary path, throwing if unavailable.
 */
export function getGifsiclePath(): string {
  if (!gifsiclePath) {
    throw new Error('gifsicle binary not available on this platform (gifsicle returned null)');
  }
  return gifsiclePath;
}

/**
 * Spawns gifsicle with the given argument array (no shell), piping `input`
 * on stdin and collecting stdout as the result buffer. Rejects with an Error
 * containing stderr output on non-zero exit.
 */
export function spawnGifsicle(args: string[], input: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const bin = getGifsiclePath();
    const proc = spawn(bin, args, { shell: false });

    const chunks: Buffer[] = [];
    const stderrLines: string[] = [];

    proc.stdout.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderrLines.push(chunk.toString());
    });

    proc.on('error', (err) => reject(err));

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error(`gifsicle exited with code ${code}: ${stderrLines.join('')}`));
      }
    });

    proc.stdin.write(input);
    proc.stdin.end();
  });
}

/**
 * Re-optimizes an already-encoded GIF buffer with gifsicle: `-O3` (minimal
 * per-frame bounding boxes, transparency optimization, frame dedup — always
 * applied), plus optional lossy compression and palette-size reduction.
 */
export function optimizeGif(
  buffer: Buffer,
  opts: { colors?: number; lossy?: number } = {},
): Promise<Buffer> {
  const lossy = opts.lossy ?? 80;
  const args = ['-O3', `--lossy=${lossy}`];
  if (opts.colors !== undefined) {
    args.push('--colors', String(opts.colors));
  }
  args.push('-');
  return spawnGifsicle(args, buffer);
}
