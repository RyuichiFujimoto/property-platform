'use client';

import { useEffect } from 'react';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[error] app: unhandled layout error', error.digest ?? '(no digest)', error);
  }, [error]);

  return (
    <html lang="ja">
      <body>
        <main className="mx-auto max-w-3xl p-6">
          <h1 className="text-2xl font-bold">問題が発生しました</h1>
          <p className="mt-4">時間をおいて再度お試しください。</p>
          {error.digest && <p className="mt-2 text-sm">エラーID: {error.digest}</p>}
          <button type="button" onClick={reset} className="mt-6 underline">
            再読み込み
          </button>
        </main>
      </body>
    </html>
  );
}
