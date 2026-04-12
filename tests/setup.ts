import { vi } from 'vitest';

if (typeof globalThis.crypto === 'undefined') {
  // @ts-expect-error partial polyfill
  globalThis.crypto = { randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2) };
}

vi.mock('react-markdown', () => ({ default: ({ children }: { children: string }) => children }));
