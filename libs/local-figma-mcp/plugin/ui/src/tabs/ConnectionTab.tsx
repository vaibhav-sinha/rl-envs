import { Button } from '../components/ui/button';
import { LogPanel } from '../components/LogPanel';

export function ConnectionTab({
  connected,
  meta,
  onReconnect,
  lines,
}: {
  connected: boolean;
  meta: string;
  onReconnect: () => void;
  lines: Array<{ text: string; err?: boolean }>;
}) {
  return (
    <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
      <header className="p-2.5 border-b border-[#333] shrink-0">
        <div className={`font-semibold text-[12px] ${connected ? 'text-accent' : 'text-destructive'}`}>
          {connected ? 'Connected' : 'Disconnected'}
        </div>
        <p className="text-[10px] text-muted mt-1 mb-0">{meta}</p>
        <Button className="mt-2" size="sm" onClick={onReconnect}>
          Reconnect
        </Button>
      </header>
      <LogPanel lines={lines} />
    </div>
  );
}
