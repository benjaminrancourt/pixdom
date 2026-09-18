import type { Page } from 'playwright';
import type { NavigationWaitUntil, RenderInput } from '@pixdom/types';

export async function loadPage(
  page: Page,
  input: RenderInput,
  waitUntil: NavigationWaitUntil = 'networkidle',
): Promise<void> {
  switch (input.type) {
    case 'html':
      await page.setContent(input.html, { waitUntil });
      break;
    case 'file':
      await page.goto(`file://${input.path}`, { waitUntil });
      break;
    case 'url':
      await page.goto(input.url, { waitUntil });
      break;
  }
}
