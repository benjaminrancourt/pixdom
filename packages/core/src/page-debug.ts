import type { PageDebugInfo } from '@pixdom/types';

const MAX_ENTRIES = 20;
const MAX_TEXT_LENGTH = 500;

type ConsoleEntry = PageDebugInfo['consoleMessages'][number];
type PageErrorEntry = PageDebugInfo['pageErrors'][number];
type FailedRequestEntry = PageDebugInfo['failedRequests'][number];
type GuardAbortEntry = PageDebugInfo['guardAbortedRequests'][number];

export interface PageDebugCollector {
  addConsole(entry: ConsoleEntry): void;
  addPageError(entry: PageErrorEntry): void;
  addFailedRequest(entry: FailedRequestEntry): void;
  addGuardAbort(entry: GuardAbortEntry): void;
  snapshot(): PageDebugInfo;
}

function truncateText(text: string): string {
  return text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH)}…` : text;
}

function makeBucket<T>() {
  const items: T[] = [];
  let total = 0;
  return {
    add(entry: T): void {
      total += 1;
      if (items.length < MAX_ENTRIES) items.push(entry);
    },
    items: () => items,
    total: () => total,
    truncated: () => total > items.length,
  };
}

export function createPageDebugCollector(navigationTimeoutMs: number): PageDebugCollector {
  const consoleMessages = makeBucket<ConsoleEntry>();
  const pageErrors = makeBucket<PageErrorEntry>();
  const failedRequests = makeBucket<FailedRequestEntry>();
  const guardAbortedRequests = makeBucket<GuardAbortEntry>();

  return {
    addConsole(entry) {
      consoleMessages.add({ ...entry, text: truncateText(entry.text) });
    },
    addPageError(entry) {
      pageErrors.add({ message: truncateText(entry.message) });
    },
    addFailedRequest(entry) {
      failedRequests.add({ ...entry, failureText: truncateText(entry.failureText) });
    },
    addGuardAbort(entry) {
      guardAbortedRequests.add(entry);
    },
    snapshot(): PageDebugInfo {
      // Requests aborted by pixdom's own request-guard also fire Playwright's
      // requestfailed event (generic net::ERR_BLOCKED_BY_CLIENT). Prefer the
      // guard's specific reason and drop the duplicate generic entry.
      const abortedUrls = new Set(guardAbortedRequests.items().map((r) => r.url));
      const dedupedFailedRequests = failedRequests.items().filter((r) => !abortedUrls.has(r.url));

      return {
        navigationTimeoutMs,
        consoleMessages: consoleMessages.items(),
        pageErrors: pageErrors.items(),
        failedRequests: dedupedFailedRequests,
        guardAbortedRequests: guardAbortedRequests.items(),
        truncated: {
          consoleMessages: consoleMessages.truncated(),
          pageErrors: pageErrors.truncated(),
          failedRequests: failedRequests.truncated(),
          guardAbortedRequests: guardAbortedRequests.truncated(),
        },
        totals: {
          consoleMessages: consoleMessages.total(),
          pageErrors: pageErrors.total(),
          failedRequests: failedRequests.total(),
          guardAbortedRequests: guardAbortedRequests.total(),
        },
      };
    },
  };
}
