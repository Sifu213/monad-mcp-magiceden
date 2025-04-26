/**
 * Monad MCP Server (TypeScript)
 * Project: monad-mcp-magiceden
 *
 * Expose a second MCP tool:
 *  - get-user-total-value: calculate the total floor price value in MON of all NFT collections owned by a user on Magic Eden testnet
 *    accepts a single parameter: address
 */

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z, ZodRawShape } from "zod";

// Initialize the MCP server with both capabilities
const server = new McpServer({
  name: "monad-mcp-magiceden",
  version: "0.0.2",
  capabilities: ["get-user-collections", "get-user-total-value"],
});

// Tool: get-user-total-value
server.tool(
  "get-user-total-value",
  "Calculate the total floor price value in MON of all NFT collections owned by a user",
  {
    address: z.string().describe("Magic Eden user address on Monad testnet"),
    },
    async ({ address }) => {
    const url =
      `https://api-mainnet.magiceden.dev/v3/rtp/monad-testnet/users/${address}/collections/v3` +
      `?includeTopBid=false&includeLiquidCount=false&offset=0&limit=100`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`MagicEden API error: ${res.status} ${res.statusText}`);
      }
      const json = await res.json();
      const collections = json.collections as Array<{
        collection: { floorAskPrice?: { amount: { decimal: number } } }
      }>;

      // Sum all floor price decimals (treat missing as 0)
      const totalValue = collections.reduce((sum, item) => {
        const price = item.collection.floorAskPrice?.amount.decimal ?? 0;
        return sum + price;
      }, 0);

      const rounded = Math.round((totalValue + Number.EPSILON) * 100) / 100;
      const output = `Total estimated floor value: ${rounded} MON`;

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
            text: `Failed to calculate total value for ${address}: ${msg}`,
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
  console.error("MCP Server running on stdio (tool: get-user-collections)");
}

main().catch((error) => {
  console.error("Fatal error in MCP server:", error);
  process.exit(1);
});
