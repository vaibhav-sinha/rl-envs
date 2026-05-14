/**
 * Manual MCP smoke over Streamable HTTP (requires server: `npm run build && node dist/cli.js`).
 * Usage: npx tsx tests/manual/mcp-http-call.ts [baseUrl]
 * Default baseUrl: http://127.0.0.1:3847
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const base = process.argv[2] ?? 'http://127.0.0.1:3847';
const url = new URL(base);
url.pathname = '/mcp';

async function main(): Promise<void> {
  const client = new Client({ name: 'mcp-http-call', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(url));
  try {
    const tools = await client.listTools();
    const created = await client.callTool({ name: 'create_new_file', arguments: {} });
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          tools: tools.tools.map((t) => t.name),
          create_new_file: created,
        },
        null,
        2
      )
    );
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
