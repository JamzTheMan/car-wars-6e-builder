'use client';

import { APP_VERSION } from '@/config/version';

export function Version() {
  return (
    <div
      className="fixed bottom-4 right-5 text-xs text-gray-400 select-none pointer-events-none z-[9999]"
    >
      v{APP_VERSION}
    </div>
  );
}
