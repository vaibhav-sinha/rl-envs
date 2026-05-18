export function LogPanel({ lines }: { lines: Array<{ text: string; err?: boolean }> }) {
  return (
    <div className="flex-1 min-h-0 h-full overflow-y-auto overflow-x-hidden p-2 font-mono text-[10px]">
      {lines.map((l, i) => (
        <p key={i} className={`my-0.5 ${l.err ? 'text-destructive' : 'text-[#bbb]'}`}>
          {l.text}
        </p>
      ))}
    </div>
  );
}
