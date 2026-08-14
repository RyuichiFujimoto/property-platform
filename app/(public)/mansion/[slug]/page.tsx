export function generateStaticParams() {
  return [{ slug: 'sample-mansion' }];
}

export default function MansionDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">マンション詳細: {params.slug}</h1>
      <p className="mt-4 text-slate-600">
        マンション詳細ページのプレースホルダーです。
      </p>
    </main>
  );
}
