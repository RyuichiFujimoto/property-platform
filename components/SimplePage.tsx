interface SimplePageProps {
  title: string;
  description: string;
  titleClassName?: string;
}

export function SimplePage({ title, description, titleClassName }: SimplePageProps) {
  return (
    <main className="p-6">
      <h1 className={titleClassName ?? 'text-2xl font-bold'}>{title}</h1>
      <p className="mt-4 text-slate-600">{description}</p>
    </main>
  );
}
