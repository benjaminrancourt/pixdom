# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Pixdom is a CLI tool and MCP server that converts HTML (inline, file, or URL) into
platform-ready images (PNG/JPEG/WebP) and animations (GIF/MP4/WebM), plus a Sharp-only
path for resizing existing images to platform dimensions. It also auto-detects CSS
animation cycles/FPS and ships 19 platform presets (LinkedIn/Twitter/Instagram).

## Commands

```bash
pnpm install              # install workspace deps (pnpm 9+, Node 18+)
pnpm build                # build all packages (pnpm -r build)
pnpm typecheck             # typecheck all packages (pnpm -r typecheck)
pnpm test                  # run the full vitest suite
pnpm test:watch            # vitest in watch mode
pnpm lint:md                # markdownlint on openspec/ and .claude/
pnpm audit                  # pnpm audit --audit-level=high
```

Run a single test file or case directly with vitest (test files live next to source,
e.g. `packages/profiles/src/index.test.ts`):

```bash
pnpm vitest run packages/profiles/src/index.test.ts
pnpm vitest run -t "resolves linkedin-post correctly"
```

CI (`.github/workflows/ci.yml`) only runs `pnpm install --frozen-lockfile`, `pnpm build`,
and `pnpm typecheck` — it does not run tests, so run `pnpm test` yourself before opening a PR.

Each package/app also exposes its own `build`/`typecheck` script (invoked via `pnpm -r`).
`apps/cli`'s build bundles both the CLI and the MCP server with esbuild into
`apps/cli/dist/` (`index.js` and `mcp-server.cjs`), externalizing native/heavy deps
(playwright, sharp, ffmpeg-static, commander, ora, omelette, @anthropic-ai/sdk, mcp sdk, zod).

## Monorepo layout

pnpm workspace: `packages/*` (library packages) + `apps/*` (binaries). Dependency
direction is strict: `apps/` depends on `packages/`, never the other way, and packages
don't import across siblings without a declared `workspace:*` dependency in package.json.

- `packages/types` — Zod schemas + inferred types shared everywhere (`RenderOptions`,
  `RenderInput`, `OutputFormat`, `ProfileId`/`Profile`, and the `Result<T, E>` /
  `ok()`/`err()` pair used instead of throwing across package boundaries).
- `packages/profiles` — the platform preset registry (`resolveProfile`, `getProfile`,
  `groupedProfiles`) mapping the 19 canonical slugs + 3 legacy aliases
  (`linkedin`/`twitter`/`instagram`) to width/height/format/quality.
- `packages/detector` — CSS animation cycle detection and the auto-mode heuristics
  (`autoDetectElement`, `autoDetectDuration`, `autoDetectFps`, `detectAnimationCycle`),
  used only by `packages/core`.
- `packages/core` — the actual rendering engine: Playwright (Chromium) + Sharp + FFmpeg.
  `render()` in `packages/core/src/index.ts` is the single entry point used by both apps.
- `apps/cli` — Commander.js CLI (`pixdom` binary) plus `mcp`/`completion` subcommands.
- `apps/mcp-server` — MCP server (`pixdom-mcp` binary) exposing two tools to Claude Code.

## Render pipeline (`packages/core/src/index.ts`)

`render(options, { onProgress })` returns `Result<RenderResult, RenderError>` — it never throws
across the package boundary; every failure path returns `err(makeError(code, ...))` with a
`RenderErrorCode` from `packages/core/src/errors.ts`.

1. **Image input** short-circuits straight to `renderImage()` (Sharp only — no browser).
2. Otherwise a Chromium browser is launched (sandboxed unless `PIXDOM_NO_SANDBOX=1`,
   Docker/CI only) and **must be closed in the `finally` block** — do not add early
   returns inside the try that skip `browser.close()`.
3. `installRequestGuard()` (`request-guard.ts`) is attached to the page **before** any
   navigation — see Security below.
4. `loadPage()` navigates/sets content for html/file/url input.
5. If `--auto`: sequentially auto-detects element → duration → fps (each step can be
   individually overridden by an explicit option), emitting `auto-detected` progress data.
   If an animated format was requested but no animation was found, it silently falls back
   to static PNG (`autoSwitchedToStatic`).
6. Selector resolution (bounding box lookup) happens once, after auto-mode, before
   dispatch to a renderer.
7. Dispatches to `renderStatic` (png/jpeg/webp), `renderAnimated` (gif/mp4/webm — frame
   capture loop via `requestAnimationFrame`, then encoded with FFmpeg through
   `ffmpeg-spawn.ts`), or the static fallback path.
8. GIF-only post-processing, in order: optional Sharp resize (`resizeWidth`/`resizeHeight`),
   then optional gifsicle compression (`gifOptimize`, via `gifsicle-spawn.ts`: `-O3` +
   `--lossy` default 80 + optional `--colors`). `render()` returns `RenderResult`
   (`{ buffer, originalBuffer? }`); `originalBuffer` is the pre-gifsicle GIF and the CLI
   writes it as `<name>.max.gif` next to the optimized `<name>.gif`.

Progress is reported through the `OnProgress` callback (`progress.ts`) as a stream of
`step-start`/`step-done`/`auto-detected` events — both the CLI (`progress-reporter.ts`,
ora spinner) and callers consume the same event shape.

## Security model

This is defense-in-depth against a fundamentally untrusted input (arbitrary HTML/URLs
rendered in a real browser):

- **SSRF protection** (`packages/core/src/request-guard.ts`): a Playwright route
  interceptor installed on every page blocks non-http(s) protocols, and resolves each
  request's hostname via DNS to block loopback/RFC1918/link-local (incl. cloud metadata
  `169.254.0.0/16`) and IPv6 private ranges — unless `--allow-local`/`allowLocal` is set.
  `file:` is only permitted for the top-level document when the input itself is a local
  file; `blockFileSubresources` additionally blocks `file:` sub-resource requests (e.g. a
  malicious local HTML file trying to `<iframe>`/`<link>` other files on disk) — this is
  always on for the MCP server.
- **MCP-specific hardening** (`apps/mcp-server/src/`): `mcp-file-scope.ts` restricts which
  local paths can be read as input, `mcp-sandbox.ts` restricts where output can be written
  (default `~/pixdom-output/`, override via `PIXDOM_MCP_OUTPUT_DIR`), and `keychain.ts`
  stores the Anthropic API key in the OS keychain first, falling back to `0o600` plaintext
  in `~/.claude.json`.
- Chromium sandbox is on by default; `PIXDOM_NO_SANDBOX=1` is Docker/CI-only and prints a
  warning.
- Both `apps/cli/src/validate-input.ts` and `apps/mcp-server/src/validate-input.ts` do
  their own input validation ahead of `packages/core` — the two are not the same code
  (CLI accepts local paths broadly; MCP is scoped to allowed directories), so a change to
  one does not automatically apply to the other.

## OpenSpec (spec-driven changes)

This repo tracks capability specs under `openspec/specs/<capability>/` (one directory per
capability, e.g. `render-pipeline`, `request-interception`, `platform-profiles`) and
in-flight proposals under `openspec/changes/<name>/`. `openspec/config.yaml` sets
`schema: spec-driven`. When present in this environment, the `/opsx:propose`,
`/opsx:apply`, and `/opsx:archive` commands drive this workflow: propose a spec delta
before writing code, implement tasks from `openspec/changes/<name>/tasks.md`, then archive
(merge deltas into `openspec/specs/`) once done.

## Conventions (from CONTRIBUTING.md)

- Branch names: `feat/...`, `fix/...`, `docs/...`, `chore/...` off `main`.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, ...).
- Stage files explicitly rather than `git add .`.
- `pnpm build` and `pnpm test` must pass before opening a PR.

## Hard rules

- Never import across `packages/` without a declared `workspace:*` dependency.
- Playwright browser instances must always be closed in a `finally` block.
- All render output goes under `output/` (gitignored) — never write elsewhere by default.
- `packages/core` must not be imported by anything under `apps/` other than as a
  `workspace:*` dependency, and must not import from `apps/`.
