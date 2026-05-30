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
    <div className="flex flex-col items-center justify-center text-center py-20 px-8">
      <span className="text-4xl mb-5 opacity-70" role="img" aria-hidden>
        {icon}
      </span>
      <h2 className="text-title text-lg font-bold mb-2">{title}</h2>
      <p className="text-body text-ink-faint max-w-[18rem] leading-relaxed">{description}</p>
    </div>
  );
}
