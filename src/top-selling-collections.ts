/**
 * Monad MCP Server (TypeScript)
 * Project: monad-mcp-magiceden
 *
 * Expose one MCP tool via STDIO:
 *  - get-top-selling-collections: retrieve top selling NFT collections on Magic Eden testnet (last 1d)
 */

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z, ZodRawShape } from "zod";



// Initialize the MCP server with the top-selling-collections capability
type InputShape = { address: string };
const server = new McpServer({
  name: "monad-mcp-magiceden",
  version: "0.0.2",
  capabilities: ["top-selling-collections"],
});

// Tool: get-user-collections
server.tool(
  "get-top-selling-collections",
  "Retrieve top selling NFT collections on Magic Eden testnet",
  {
  period: z.string().describe("Magic Eden user address on Monad testnet"),
  },
  async ({ period }) => {
    const url =
    `https://api-mainnet.magiceden.dev/v3/rtp/monad-testnet/collections/trending/v1?period=${period}&limit=50&sortBy=sales&normalizeRoyalties=false&useNonFlaggedFloorAsk=false`

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`MagicEden API error: ${res.status} ${res.statusText}`);
      }
 
      const data =
        (await res.json()) as { collections: Array<{ name: string; count: number }> };

      // Sort by number of sales (count) and build output lines
      const lines = data.collections
        .sort((a, b) => b.count - a.count)
        .map(item => `${item.name}: ${item.count} sales`);

      const output = lines.join("\n");

      return {
        content: [
          {
            type: "text",
            text: output,
          },
        ],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text",
            text: `Failed to fetch trending collections : ${msg}`,
          },
        ],
      };
    }
  }
);

// Main: connect server over stdio
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server running on stdio (tool: get-top-selling-collections)");
}

main().catch((error) => {
  console.error("Fatal error in MCP server:", error);
  process.exit(1);
});
