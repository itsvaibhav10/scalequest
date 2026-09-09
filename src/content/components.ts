import type {
  ComponentDefinition,
  ComponentKind,
} from "../domain/systemDesign";

export const componentDefinitions: Record<ComponentKind, ComponentDefinition> =
  {
    client: {
      kind: "client",
      label: "Client",
      description: "The caller that starts each product read.",
      capacityRps: Number.MAX_SAFE_INTEGER,
      baseLatencyMs: 20,
      monthlyCostUsd: 0,
      complexityPoints: 0,
      acceptsFrom: [],
      connectsTo: ["api-server"],
      failureMode:
        "Network loss or a malformed request prevents the call from reaching the API.",
      learning: {
        why: "A concrete caller makes the system boundary and request flow visible.",
        how: "It sends a read request to the public API endpoint.",
        what: "A client can be a browser or mobile app. Example request: GET /api/products/42.",
        tradeoffs: [
          "Retries improve resilience but can amplify load.",
          "Client caching saves calls but can show stale data.",
        ],
        whenNotToUse:
          "Do not model every device separately when they share the same behaviour.",
      },
    },
    "api-server": {
      kind: "api-server",
      label: "API server",
      description: "Validates requests and reads product data.",
      capacityRps: 500,
      baseLatencyMs: 30,
      monthlyCostUsd: 40,
      complexityPoints: 2,
      acceptsFrom: ["client"],
      connectsTo: ["local-data", "relational-database"],
      failureMode:
        "Overload increases latency and errors; a restart clears process memory.",
      learning: {
        why: "The API owns the HTTP contract and application logic.",
        how: "It parses the product ID, reads the configured data source, and returns JSON.",
        what: "Schema: Product { id: string; name: string; priceCents: number }. Pseudocode: product = data.get(id); return product ?? 404.",
        tradeoffs: [
          "A single server is simple and cheap.",
          "Process-local state disappears on restart.",
        ],
        whenNotToUse:
          "Do not place durable business data only inside the API process.",
      },
    },
    "local-data": {
      kind: "local-data",
      label: "Local data",
      description: "In-process product data for the smallest useful design.",
      capacityRps: 500,
      baseLatencyMs: 2,
      monthlyCostUsd: 0,
      complexityPoints: 1,
      acceptsFrom: ["api-server"],
      connectsTo: [],
      failureMode: "An API restart erases all process-local data.",
      learning: {
        why: "It keeps an early prototype understandable when durability is not required.",
        how: "The API reads a map held in its own memory.",
        what: "Example: const products = new Map<string, Product>(); then products.get(productId).",
        tradeoffs: [
          "Very low latency and no separate service cost.",
          "No durability across restarts and no shared state across servers.",
        ],
        whenNotToUse:
          "Avoid it when data must survive restarts or be shared by multiple API instances.",
      },
    },
    "relational-database": {
      kind: "relational-database",
      label: "Relational database",
      description: "Durable, structured product storage.",
      capacityRps: 1000,
      baseLatencyMs: 12,
      monthlyCostUsd: 80,
      complexityPoints: 3,
      acceptsFrom: ["api-server"],
      connectsTo: [],
      failureMode:
        "Connection exhaustion or database unavailability prevents reads, but an API restart does not erase committed rows.",
      learning: {
        why: "Use it when product data must remain available after an API process restarts.",
        how: "The API queries durable rows by primary key through a database connection.",
        what: "Schema: products(id PRIMARY KEY, name, price_cents). Pseudocode: SELECT id, name, price_cents FROM products WHERE id = ?.",
        tradeoffs: [
          "Durability and constraints improve correctness.",
          "It adds network latency, operational work, and monthly cost.",
        ],
        whenNotToUse:
          "Do not add it merely because user count increased; add it when durability, sharing, or query needs justify it.",
      },
    },
  };
