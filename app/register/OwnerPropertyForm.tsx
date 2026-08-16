'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { registerOwnerPropertyAction } from '@/lib/owner/actions';
import {
  initialOwnerPropertyFormState,
  type OwnerPropertyFormState,
} from '@/lib/owner/form-state';
import { UNIT_DIRECTIONS } from '@/lib/owner/validation';

export interface BuildingChoice {
  id: string;
  name: string;
}

interface Props {
  mansionSlug: string;
  buildings: BuildingChoice[];
}

export default function OwnerPropertyForm({ mansionSlug, buildings }: Props) {
  const router = useRouter();
  const [state, setState] = useState<OwnerPropertyFormState>(initialOwnerPropertyFormState);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    try {
      const next = await registerOwnerPropertyAction(state, formData);
      setState(next);
      if (next.status === 'success') {
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  if (state.status === 'success' && state.registered) {
    return (
      <section className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-lg font-semibold text-emerald-900">マイマンションを登録しました</h2>
        <p className="mt-2 text-emerald-900">
          {state.registered.mansionName}
          {state.registered.buildingName ? `（${state.registered.buildingName}）` : ''}{' '}
          {state.registered.roomNumber}
        </p>
        <p className="mt-2 text-sm text-emerald-800">
          参考価格・相場の表示は準備中です。公開後にマイページからご確認いただけます。
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900">お住まいの情報</h2>
      <p className="mt-2 text-sm text-slate-500">
        部屋番号以外は任意です。入力いただくと参考価格の精度が上がります。
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input type="hidden" name="mansionSlug" value={mansionSlug} />

        {buildings.length > 0 && (
          <div>
            <label htmlFor="buildingId" className="block text-sm font-medium text-slate-700">
              棟
            </label>
            <select
              id="buildingId"
              name="buildingId"
              defaultValue=""
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">選択しない</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {state.errors.buildingId && (
              <p className="mt-1 text-sm text-red-600">{state.errors.buildingId}</p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="roomNumber" className="block text-sm font-medium text-slate-700">
            部屋番号
            <span className="ml-1 text-red-600">*</span>
          </label>
          <input
            id="roomNumber"
            name="roomNumber"
            type="text"
            required
            placeholder="1203"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          {state.errors.roomNumber && (
            <p className="mt-1 text-sm text-red-600">{state.errors.roomNumber}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="floor" className="block text-sm font-medium text-slate-700">
              階数
            </label>
            <input
              id="floor"
              name="floor"
              type="number"
              inputMode="numeric"
              placeholder="12"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            {state.errors.floor && (
              <p className="mt-1 text-sm text-red-600">{state.errors.floor}</p>
            )}
          </div>

          <div>
            <label htmlFor="areaSqm" className="block text-sm font-medium text-slate-700">
              専有面積（㎡）
            </label>
            <input
              id="areaSqm"
              name="areaSqm"
              type="number"
              step="0.01"
              placeholder="70.25"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            {state.errors.areaSqm && (
              <p className="mt-1 text-sm text-red-600">{state.errors.areaSqm}</p>
            )}
          </div>

          <div>
            <label htmlFor="layout" className="block text-sm font-medium text-slate-700">
              間取り
            </label>
            <input
              id="layout"
              name="layout"
              type="text"
              placeholder="3LDK"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            {state.errors.layout && (
              <p className="mt-1 text-sm text-red-600">{state.errors.layout}</p>
            )}
          </div>

          <div>
            <label htmlFor="direction" className="block text-sm font-medium text-slate-700">
              方角
            </label>
            <select
              id="direction"
              name="direction"
              defaultValue=""
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">選択しない</option>
              {UNIT_DIRECTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            {state.errors.direction && (
              <p className="mt-1 text-sm text-red-600">{state.errors.direction}</p>
            )}
          </div>
        </div>

        {state.message && state.status === 'error' && (
          <p className="text-sm text-red-600" role="status">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-slate-900 px-6 py-3 text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? '登録中…' : 'マイマンションに登録する'}
        </button>
      </form>
    </section>
  );
}
