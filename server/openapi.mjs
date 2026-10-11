import { site, pages } from "../src/public-content.js";
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const str = { type: "string" },
  bool = { type: "boolean" },
  integer = { type: "integer", minimum: 0 };
const object = (properties, required = Object.keys(properties)) => ({
  type: "object",
  additionalProperties: false,
  required,
  properties,
});
const json = (schema) => ({ "application/json": { schema } });
const problemResponse = {
  description:
    "Structured problem. Correct input, consult docs, or honor Retry-After for 503.",
  content: { "application/problem+json": { schema: ref("Problem") } },
};
const responses = (schema) => ({
  200: { description: "Public read succeeded.", content: json(schema) },
  400: problemResponse,
  404: problemResponse,
  405: problemResponse,
  503: {
    ...problemResponse,
    headers: {
      "Retry-After": {
        description: "Seconds to wait before retrying.",
        schema: { type: "integer" },
      },
    },
  },
});
const operation = (operationId, description, schema, parameters = []) => ({
  operationId,
  summary: description.split(".")[0],
  description,
  parameters,
  responses: responses(schema),
});
const param = (
  name,
  description,
  schema,
  location = "query",
  required = false,
) => ({ name, in: location, required, description, schema });
export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Tsuyo Gymwear Public API",
    version: "1.0.0",
    description:
      "Read-only public gymwear catalog, MYR prices, store configuration and public help pages. No authentication required. Preview pieces are illustrative. This API never creates orders, charges cards or exposes customer records.",
    contact: { name: "Tsuyo", email: site.email, url: site.url + "/contact" },
  },
  servers: [
    { url: site.url, description: "Canonical Tsuyo production origin" },
  ],
  externalDocs: {
    description: "Tsuyo API & agent usage, authentication and errors",
    url: site.url + "/docs",
  },
  security: [],
  paths: {
    "/api": {
      get: operation(
        "getApiIndex",
        "Discover Tsuyo’s read-only API and documentation URLs.",
        ref("ApiIndex"),
      ),
    },
    "/api/products": {
      get: operation(
        "searchProducts",
        "Search public Tsuyo gymwear by name, colour, type or category. Paginated results explicitly identify previews; a result is not a stock reservation.",
        ref("ProductSearch"),
        [
          param("q", "Case-insensitive name, colour or type substring.", {
            type: "string",
            maxLength: 100,
            default: "",
          }),
          param("category", "Public collection category.", {
            type: "string",
            enum: ["men", "women", "unisex"],
          }),
          param("limit", "Maximum results to return.", {
            type: "integer",
            minimum: 1,
            maximum: 50,
            default: 20,
          }),
          param("offset", "Number of matched results to skip.", {
            type: "integer",
            minimum: 0,
            maximum: 10000,
            default: 0,
          }),
        ],
      ),
    },
    "/api/products/{id}": {
      get: operation(
        "getProduct",
        "Read a public product, including MYR minor-unit price, sizes, fit, care and availability flags. Preview products are illustrative.",
        ref("Product"),
        [
          param(
            "id",
            "Product id obtained from searchProducts.",
            { type: "string", pattern: "^[a-z0-9-]+$" },
            "path",
            true,
          ),
        ],
      ),
    },
    "/api/store": {
      get: operation(
        "getStoreStatus",
        "Check whether checkout, Stripe sandbox or live payments, and delivery zones are configured. Recheck before planning a purchase.",
        ref("StoreStatus"),
      ),
    },
    "/api/pages": {
      get: operation(
        "readPublicPage",
        "Read an enumerated public trust or developer page as Markdown in JSON. No private account, customer, order or admin content is accessible.",
        ref("PublicPage"),
        [
          param(
            "path",
            "Canonical public information page.",
            { type: "string", enum: Object.keys(pages) },
            "query",
            true,
          ),
        ],
      ),
    },
  },
  components: {
    schemas: {
      Problem: object({
        type: { type: "string", enum: ["about:blank"] },
        title: str,
        status: { type: "integer", minimum: 400, maximum: 599 },
        code: str,
        message: str,
        detail: str,
        resolution: str,
      }),
      Variant: object({
        size: str,
        price_minor: {
          type: "integer",
          minimum: 1,
          description: "Integer MYR minor units.",
        },
        available: bool,
      }),
      Product: object({
        id: str,
        name: str,
        description: str,
        category: { type: "string", enum: ["men", "women", "unisex"] },
        type: str,
        color: str,
        price_minor: {
          type: "integer",
          minimum: 1,
          description: "Integer MYR minor units: 14900 is RM 149.00.",
        },
        currency: { type: "string", enum: ["MYR"] },
        preview: {
          type: "boolean",
          description: "Illustrative product, not a fulfilment offer.",
        },
        available: bool,
        variants: { type: "array", items: ref("Variant") },
        fit: str,
        details: { type: "array", items: str },
        care: str,
        image_url: { type: "string", format: "uri" },
        url: { type: "string", format: "uri" },
      }),
      ProductSearch: object({
        products: { type: "array", items: ref("Product") },
        total: integer,
        limit: { type: "integer", minimum: 1, maximum: 50 },
        offset: integer,
      }),
      ShippingZone: object({
        name: str,
        countries: {
          type: "array",
          items: { type: "string", pattern: "^[A-Z]{2}$" },
        },
        regions: { type: "array", items: str },
        fee_minor: integer,
        free_over_minor: { type: "integer", minimum: 0, nullable: true },
      }),
      StoreStatus: object({
        name: str,
        url: { type: "string", format: "uri" },
        currency: { type: "string", enum: ["MYR"] },
        preview: bool,
        checkout_enabled: bool,
        payment_mode: { type: "string", enum: ["test", "live", "unknown"] },
        payments_configured: bool,
        sandbox_bag_enabled: bool,
        shipping_configured: bool,
        shipping_zones: { type: "array", items: ref("ShippingZone") },
        notice: str,
      }),
      PublicPage: object({
        path: str,
        url: { type: "string", format: "uri" },
        markdown: str,
      }),
      ApiIndex: object({
        name: str,
        version: str,
        authentication: { type: "string", enum: ["none"] },
        read_only: { type: "boolean", enum: [true] },
        documentation: { type: "string", format: "uri" },
        openapi: { type: "string", format: "uri" },
        mcp: { type: "string", format: "uri" },
        endpoints: { type: "array", items: str },
      }),
    },
  },
};
