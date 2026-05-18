export function SectionIntro({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-md border border-[#3a3a3a] bg-[#252525] px-2.5 py-2 space-y-1">
      <p className="text-[11px] font-semibold m-0 text-foreground">{title}</p>
      <p className="text-[10px] text-muted m-0 leading-snug">{description}</p>
    </div>
  );
}
