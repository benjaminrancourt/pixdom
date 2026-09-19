import { describe, it, expect } from 'vitest'
import { formatBytes, createProgressReporter } from './progress-reporter.js'

describe('formatBytes', () => {
  it('formats sub-KB sizes as bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(999)).toBe('999 B')
    expect(formatBytes(1023)).toBe('1023 B')
  })
  it('formats KB sizes with one decimal', () => {
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(251187)).toBe('245.3 KB')
  })
  it('formats MB sizes with one decimal, not KB', () => {
    expect(formatBytes(1048576)).toBe('1.0 MB')
    expect(formatBytes(1572864)).toBe('1.5 MB')
  })
})

describe('createProgressReporter.finish', () => {
  it('is a no-op when noProgress is true, regardless of size arg', () => {
    const reporter = createProgressReporter(
      { hasSelector: false, hasAutoSize: false, isAnimated: false, isImagePassthrough: false, format: 'PNG', hasResize: false },
      true,
    )
    expect(() => reporter.finish('/tmp/out.png', 12345)).not.toThrow()
    expect(() => reporter.finish('/tmp/out.png')).not.toThrow()
  })
})
