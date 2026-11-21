'use client';

import { useState, type FormEvent } from 'react';
import { signInAction, signUpAction } from '@/lib/owner/actions';
import { initialAuthFormState, type AuthFormState } from '@/lib/owner/form-state';

type Mode = 'signin' | 'signup';

interface Props {
  mansionSlug: string | null;
  disabled?: boolean;
}

export default function AuthForm({ mansionSlug, disabled = false }: Props) {
  const [mode, setMode] = useState<Mode>('signin');
  const [state, setState] = useState<AuthFormState>(initialAuthFormState);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    try {
      const next =
        mode === 'signin'
          ? await signInAction(state, formData)
          : await signUpAction(state, formData);
      setState(next);
    } finally {
      setPending(false);
    }
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setState(initialAuthFormState);
  }

  return (
    <section className="mt-8 rounded-xl border border-slate-200 p-6">
      <div className="flex gap-2" role="tablist">
        {(['signin', 'signup'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={
              mode === m
                ? 'rounded-lg bg-slate-900 px-4 py-2 text-sm text-white'
                : 'rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600'
            }
          >
            {m === 'signin' ? 'ログイン' : '新規登録'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input type="hidden" name="mansionSlug" value={mansionSlug ?? ''} />

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            メールアドレス
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          {state.errors.email && (
            <p className="mt-1 text-sm text-red-600">{state.errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            パスワード
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          {state.errors.password && (
            <p className="mt-1 text-sm text-red-600">{state.errors.password}</p>
          )}
          {mode === 'signup' && !state.errors.password && (
            <p className="mt-1 text-sm text-slate-500">8文字以上で設定してください。</p>
          )}
        </div>

        {state.message && (
          <p
            className={
              state.status === 'error' ? 'text-sm text-red-600' : 'text-sm text-emerald-700'
            }
            role="status"
          >
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={disabled || pending}
          className="rounded-lg bg-slate-900 px-6 py-3 text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pending
            ? '送信中…'
            : mode === 'signin'
              ? 'ログインして続ける'
              : 'アカウントを作成して続ける'}
        </button>
      </form>
    </section>
  );
}
