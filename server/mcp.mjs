import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import {
  loadPublicStore,
  searchProducts,
  productDTO,
  storeDTO,
} from "./public-store.mjs";
import { pages, pageMarkdown, site } from "../src/public-content.js";
import { PublicError, notFound, problem } from "./http.mjs";
const variant = z.object({
  size: z.string(),
  price_minor: z.number().int().positive(),
  available: z.boolean(),
});
export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(["men", "women", "unisex"]),
  type: z.string(),
  color: z.string(),
  price_minor: z.number().int().positive(),
  currency: z.literal("MYR"),
  preview: z.boolean(),
  available: z.boolean(),
  variants: z.array(variant),
  fit: z.string(),
  details: z.array(z.string()),
  care: z.string(),
  image_url: z.string().url(),
  url: z.string().url(),
});
const searchSchema = z.object({
  products: z.array(productSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int(),
  offset: z.number().int(),
});
const storeSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  currency: z.literal("MYR"),
  preview: z.boolean(),
  checkout_enabled: z.boolean(),
  payment_mode: z.enum(["test", "live", "unknown"]),
  payments_configured: z.boolean(),
  sandbox_bag_enabled: z.boolean(),
  shipping_configured: z.boolean(),
  shipping_zones: z.array(
    z.object({
      name: z.string(),
      countries: z.array(z.string()),
      regions: z.array(z.string()),
      fee_minor: z.number().int().nonnegative(),
      free_over_minor: z.number().int().nonnegative().nullable(),
    }),
  ),
  notice: z.string(),
});
const pageSchema = z.object({
  path: z.string(),
  url: z.string().url(),
  markdown: z.string(),
});
const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};
function result(data) {
  return {
    content: [{ type: "text", text: JSON.stringify(data) }],
    structuredContent: data,
  };
}
function tool(fn) {
  return async (args) => {
    try {
      return result(await fn(args));
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: JSON.stringify(problem(error)) }],
      };
    }
  };
}
export function makeMcpServer(load = loadPublicStore) {
  const server = new McpServer(
    { name: "tsuyo-gymwear", version: "1.0.0" },
    {
      instructions:
        "Read-only public gymwear information. Preview products are illustrative, not offers. Check get_store_status before discussing a purchase. No customer, order, checkout or admin access.",
    },
  );
  server.registerTool(
    "search_products",
    {
      description:
        "Find Tsuyo gymwear by name, colour, type or category. Returns MYR minor-unit prices, sizes and explicit preview/availability flags; never reserves stock.",
      inputSchema: {
        q: z.string().max(100).optional(),
        category: z.enum(["men", "women", "unisex"]).optional(),
        limit: z.number().int().min(1).max(50).default(20),
        offset: z.number().int().min(0).max(10000).default(0),
      },
      outputSchema: searchSchema,
      annotations,
    },
    tool(async (args) => searchProducts(await load(), args)),
  );
  server.registerTool(
    "get_product",
    {
      description:
        "Read one public Tsuyo product’s fit, care, sizes, MYR price and availability. Use an id returned by search_products. Illustrative products are marked preview.",
      inputSchema: {
        id: z
          .string()
          .regex(/^[a-z0-9-]+$/)
          .max(120),
      },
      outputSchema: productSchema,
      annotations,
    },
    tool(async ({ id }) => {
      const s = await load(),
        p = s.products.find((p) => p.id === id);
      if (!p) throw notFound();
      return productDTO(p);
    }),
  );
  server.registerTool(
    "get_store_status",
    {
      description:
        "Check whether live checkout, Stripe payments and shipping zones are configured. Distinguishes preview catalog and sandbox payment flow from fulfilment sales.",
      inputSchema: {},
      outputSchema: storeSchema,
      annotations,
    },
    tool(async () => storeDTO(await load())),
  );
  server.registerTool(
    "read_page",
    {
      description:
        "Read Tsuyo’s public About, Contact, Privacy, API, authentication or error guidance as Markdown. Only the enumerated public pages are accessible; never customer or admin pages.",
      inputSchema: { path: z.enum(Object.keys(pages)) },
      outputSchema: pageSchema,
      annotations,
    },
    tool(async ({ path }) => ({
      path,
      url: site.url + path,
      markdown: pageMarkdown(path),
    })),
  );
  return server;
}
export function createMcpHandler(
  load = loadPublicStore,
  {
    allowedOrigins = [site.url, "https://tsuyo-danhqms-projects.vercel.app"],
  } = {},
) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
      res.statusCode = 403;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Origin is not allowed." },
          id: null,
        }),
      );
      return;
    }
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Accept, MCP-Protocol-Version",
      );
      res.statusCode = 204;
      res.end();
      return;
    }
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Allow", "POST, OPTIONS");
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message:
              "No unsolicited event stream or sessions. Use POST for MCP requests.",
          },
          id: null,
        }),
      );
      return;
    }
    const server = makeMcpServer(load),
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
        maxRequestBodySize: 65536,
      });
    res.once("close", () => {
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      console.error("mcp_request_failed");
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message: "MCP request could not be processed.",
            },
            id: null,
          }),
        );
      }
    }
  };
}
