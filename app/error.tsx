'use client';

import { useEffect } from 'react';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: Props) {
  useEffect(() => {
    // digest はサーバー側のログと突き合わせるための ID。
    console.error('[error] app: unhandled rendering error', error.digest ?? '(no digest)', error);
  }, [error]);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-slate-900">ページを表示できませんでした</h1>
      <p className="mt-4 text-slate-600">
        一時的な問題が発生しています。時間をおいて再度お試しください。
      </p>
      {error.digest && <p className="mt-2 text-sm text-slate-400">エラーID: {error.digest}</p>}
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg bg-slate-900 px-6 py-3 text-white hover:bg-slate-800"
      >
        再読み込み
      </button>
    </main>
  );
}
