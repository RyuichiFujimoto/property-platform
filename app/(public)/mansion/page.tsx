import type { Metadata } from 'next';
import { SimplePage } from '@/components/SimplePage';

// 中身がプレースホルダーのうちは thin page なので index させない。
export const metadata: Metadata = {
  title: 'マンション一覧',
  robots: { index: false, follow: true },
};

export default function MansionsPage() {
  return <SimplePage title="マンション一覧" description="マンション情報のプレースホルダーです。" />;
}
