import { describe, it, expect } from 'vitest'
import { metadataPathFor, buildMetadataContent } from './metadata-sidecar.js'

describe('metadataPathFor', () => {
  it('swaps the extension for .txt for every output format', () => {
    expect(metadataPathFor('/abs/pixdom-output.png')).toBe('/abs/pixdom-output.txt')
    expect(metadataPathFor('/abs/pixdom-output.jpeg')).toBe('/abs/pixdom-output.txt')
    expect(metadataPathFor('/abs/pixdom-output.webp')).toBe('/abs/pixdom-output.txt')
    expect(metadataPathFor('/abs/pixdom-output.gif')).toBe('/abs/pixdom-output.txt')
    expect(metadataPathFor('/abs/pixdom-output.mp4')).toBe('/abs/pixdom-output.txt')
    expect(metadataPathFor('/abs/pixdom-output.webm')).toBe('/abs/pixdom-output.txt')
  })
  it('only replaces the final extension, keeping dots earlier in the path', () => {
    expect(metadataPathFor('/abs/my.project/out.png')).toBe('/abs/my.project/out.txt')
  })
})

describe('buildMetadataContent', () => {
  const generatedAt = new Date('2026-09-18T20:14:03.512Z')

  it('includes an ISO timestamp and the reconstructed command', () => {
    const content = buildMetadataContent(['convert', '--format', 'png', '--output', 'out.png'], generatedAt)
    expect(content).toBe(
      'Generated: 2026-09-18T20:14:03.512Z\nCommand: pixdom convert --format png --output out.png\n',
    )
  })

  it('quotes argv tokens containing spaces', () => {
    const content = buildMetadataContent(['convert', '--html', '<div class="card">Hi</div>'], generatedAt)
    expect(content).toBe(
      'Generated: 2026-09-18T20:14:03.512Z\nCommand: pixdom convert --html "<div class=\\"card\\">Hi</div>"\n',
    )
  })

  it('leaves tokens without whitespace or quotes unquoted', () => {
    const content = buildMetadataContent(['convert', '--auto'], generatedAt)
    expect(content).toContain('Command: pixdom convert --auto\n')
  })
})
