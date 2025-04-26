/**
 * Monad MCP Server (TypeScript)
 * Project: monad-mcp-nft-owners
 *
 * Expose one MCP tool via STDIO:
 *  - get-nft-owners: retrieve all owner addresses for a given NFT contract via ThirdWeb Insight API (paginated)
 */

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

//const THIRDWEB_CLIENT_ID = process.env.THIRDWEB_CLIENT_ID;
const THIRDWEB_CLIENT_ID = "";

if (!THIRDWEB_CLIENT_ID) {
  console.error("Missing THIRDWEB_CLIENT_ID in env");
  process.exit(1);
}

// Hardcoded chain ID for this use-case Monad testnet
const CHAIN_ID = 10143;

const server = new McpServer({
  name: "monad-mcp-nft-owners",
  version: "0.0.1",
  capabilities: ["get-nft-owners"],
});

server.tool(
  "get-nft-owners",
  "Retrieve all owner addresses of an NFT contract via ThirdWeb Insight API",
  {
    contractAddress: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid Ethereum address")
      .describe("NFT contract address"),
  },
  async ({ contractAddress }) => {
    const baseUrl = `https://${CHAIN_ID}.insight.thirdweb.com/v1/nfts/owners/${contractAddress}`;
    const limit = 100;
    let page = 0;
    const allOwners: string[] = [];

    try {
      while (true) {
        const url = new URL(baseUrl);
        url.searchParams.set("limit", limit.toString());
        url.searchParams.set("page", page.toString());

        const res = await fetch(url.toString(), {
          headers: {
            "x-client-id": THIRDWEB_CLIENT_ID,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          throw new Error(`ThirdWeb API error: ${res.status} ${res.statusText}`);
        }

        const json = await res.json();
        const dataArray = Array.isArray(json.data) ? json.data : [];
        const entry = dataArray[0];
        const owners: string[] = Array.isArray(entry?.owner_addresses)
          ? entry.owner_addresses
          : [];

        if (owners.length === 0) break;
        allOwners.push(...owners);
        if (owners.length < limit) break;
        page += 1;
      }

      if (allOwners.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `Aucun propriétaire trouvé pour ${contractAddress}.`,
            },
          ],
        };
      }

      // build output list
      const lines = allOwners.map((addr) => `- ${addr}`);
      return {
        content: [
          {
            type: "text",
            text: [
              `Liste des ${allOwners.length} adresses propriétaires pour contrat ${contractAddress}:`,
              ...lines,
            ].join("\n"),
          },
        ],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text",
            text: `Failed to fetch NFT owners: ${msg}`,
          },
        ],
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server running on stdio (tool: get-nft-owners)");
}

main().catch((error) => {
  console.error("Fatal error in MCP server:", error);
  process.exit(1);
});
