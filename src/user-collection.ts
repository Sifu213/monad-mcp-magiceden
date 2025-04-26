/**
 * Monad MCP Server (TypeScript)
 * Project: monad-mcp-magiceden
 *
 * Expose one MCP tool:
 *  - get-user-collections: retrieve NFT collections owned by a user on Magic Eden testnet
 *    accepts a single parameter: address
 */

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z, ZodRawShape } from "zod";

// Initialize the MCP server
type InputShape = { address: string };
const server = new McpServer({
  name: "monad-mcp-magiceden",
  version: "0.0.1",
  capabilities: ["get-user-collections"],
});


// Tool: get-user-collections
server.tool(
  "get-user-collections",
  "Retrieve NFT collections owned by a user on Magic Eden testnet",
  {
  address: z.string().describe("Magic Eden user address on Monad testnet"),
  },
  async ({ address }) => {
    const url =
      `https://api-mainnet.magiceden.dev/v3/rtp/monad-testnet/users/${address}/collections/v3?includeTopBid=false&includeLiquidCount=false&offset=0&limit=100`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`MagicEden API error: ${res.status} ${res.statusText}`);
      }

     const json = await res.json();
      const collections = json.collections as Array<{
        collection: { name: string; floorAskPrice?: { amount: { decimal: number } } }
      }>;

      // we sort by floorAskPrice
      collections.sort((a, b) => {
        const pa = a.collection.floorAskPrice?.amount.decimal ?? 0;
        const pb = b.collection.floorAskPrice?.amount.decimal ?? 0;
        return pb - pa;
      });

      // we keep only the top 30 collections by fp
      const topCollections = collections.slice(0, 30);

      // we build the output string: "Name: price MON"
      const lines = topCollections.map((item) => {
        const name = item.collection.name;
        const price = item.collection.floorAskPrice?.amount.decimal;
        return price != null
          ? `${name}: ${price} MON`
          : `${name}: no floor price available`;
      });
      const output = lines.join("\n");
      console.error(`Output: ${output}`);
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
            text: `Failed to fetch user collections for ${address}: ${msg}`,
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
