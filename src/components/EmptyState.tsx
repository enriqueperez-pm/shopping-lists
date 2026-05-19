"use client";

export default function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <span className="text-5xl mb-4 opacity-80" role="img" aria-hidden>{icon}</span>
      <h2 className="text-lg font-extrabold text-slate-800 mb-2 tracking-tight">{title}</h2>
      <p className="text-sm text-slate-500 max-w-[20rem] leading-relaxed">{description}</p>
    </div>
  );
}
