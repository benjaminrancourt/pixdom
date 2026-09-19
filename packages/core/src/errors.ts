import type { PageDebugInfo } from '@pixdom/types';

export type RenderErrorCode =
  | 'BROWSER_LAUNCH_FAILED'
  | 'PAGE_LOAD_FAILED'
  | 'CAPTURE_FAILED'
  | 'ENCODE_FAILED'
  | 'NO_ANIMATION_DETECTED'
  | 'SELECTOR_NOT_FOUND'
  | 'INVALID_FILE_TYPE'
  | 'FILE_NOT_FOUND'
  | 'IMAGE_NOT_FOUND'
  | 'SHARP_ERROR'
  | 'INVALID_URL_PROTOCOL'
  | 'INVALID_URL_HOST'
  | 'INVALID_OUTPUT_PATH'
  | 'INVALID_FPS'
  | 'INVALID_DURATION'
  | 'INVALID_WAIT_UNTIL'
  | 'INVALID_KEY'
  | 'RESOURCE_LIMIT_EXCEEDED'
  | 'INVALID_RESIZE_FORMAT'
  | 'GIF_RESIZE_FAILED'
  | 'INVALID_GIF_OPTIMIZE_FORMAT'
  | 'GIF_OPTIMIZE_FAILED';

export interface RenderError {
  code: RenderErrorCode;
  message: string;
  cause?: unknown;
  hints?: string[];
  debug?: PageDebugInfo;
}

export function makeError(
  code: RenderErrorCode,
  message: string,
  cause?: unknown,
  hints?: string[],
  debug?: PageDebugInfo,
): RenderError {
  const error: RenderError = { code, message, cause };
  if (hints !== undefined) error.hints = hints;
  if (debug !== undefined) error.debug = debug;
  return error;
}
