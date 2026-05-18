import { useCallback, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { useConnection } from './hooks/useConnection';
import { ConnectionTab } from './tabs/ConnectionTab';
import { ExportTab } from './tabs/ExportTab';
import { TaskBuilderTab } from './task-builder/TaskBuilderTab';

export function App() {
  const [lines, setLines] = useState<Array<{ text: string; err?: boolean }>>([]);

  const onLog = useCallback((text: string, err?: boolean) => {
    const ts = new Date().toLocaleTimeString();
    setLines((prev) => [...prev.slice(-200), { text: `${ts} ${text}`, err }]);
  }, []);

  const { connected, meta, reconnect, fileName } = useConnection(onLog);

  const safeFileName = fileName.replace(/[^a-zA-Z0-9._\s-]+/g, '').trim() || 'Untitled';

  return (
    <Tabs defaultValue="connection" className="flex flex-col flex-1 min-h-0 h-full">
      <TabsList>
        <TabsTrigger value="connection">Connection</TabsTrigger>
        <TabsTrigger value="export">Export</TabsTrigger>
        <TabsTrigger value="builder">Task Builder</TabsTrigger>
      </TabsList>
      <TabsContent value="connection">
        <ConnectionTab connected={connected} meta={meta} onReconnect={reconnect} lines={lines} />
      </TabsContent>
      <TabsContent value="export">
        <ExportTab onLog={onLog} defaultFileName={safeFileName} />
      </TabsContent>
      <TabsContent value="builder">
        <TaskBuilderTab onLog={onLog} />
      </TabsContent>
    </Tabs>
  );
}
