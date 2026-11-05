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
      role: "source",
      capacityRps: Number.MAX_SAFE_INTEGER,
      baseLatencyMs: 20,
      monthlyCostUsd: 0,
      complexityPoints: 0,
      acceptsFrom: [],
      connectsTo: ["rate-limiter", "load-balancer", "api-server"],
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
      role: "compute",
      scalable: true,
      capacityRps: 500,
      baseLatencyMs: 30,
      monthlyCostUsd: 40,
      complexityPoints: 2,
      acceptsFrom: ["client", "rate-limiter", "load-balancer"],
      connectsTo: [
        "cache",
        "local-data",
        "relational-database",
        "read-replica",
      ],
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
    "rate-limiter": {
      kind: "rate-limiter",
      label: "Rate limiter",
      description: "Rejects abusive traffic before it reaches your servers.",
      role: "gate",
      capacityRps: 50_000,
      baseLatencyMs: 1,
      monthlyCostUsd: 20,
      complexityPoints: 1,
      falsePositiveRate: 0.005,
      acceptsFrom: ["client"],
      connectsTo: ["load-balancer", "api-server"],
      failureMode:
        "Limits set too low reject real customers; limits set too high let abuse through.",
      learning: {
        why: "A traffic spike from bots or a buggy client can take down servers that are healthy for normal load.",
        how: "It counts requests per caller in a short window and answers 429 Too Many Requests once a caller exceeds its quota.",
        what: "Token bucket: refill 10 tokens/s, burst 20. Pseudocode: if (!bucket.take(callerId)) return 429 with Retry-After.",
        tradeoffs: [
          "Protects capacity for legitimate users during a spike.",
          "A small share of real users can be rejected, and limits need tuning and a shared counter store.",
        ],
        whenNotToUse:
          "Skip it while traffic is small and trusted; it adds a dependency and a place for false rejections.",
      },
    },
    "load-balancer": {
      kind: "load-balancer",
      label: "Load balancer",
      description: "Spreads requests across several API servers.",
      role: "distributor",
      capacityRps: 20_000,
      baseLatencyMs: 2,
      monthlyCostUsd: 25,
      complexityPoints: 2,
      acceptsFrom: ["client", "rate-limiter"],
      connectsTo: ["api-server"],
      failureMode:
        "A single load balancer is itself a single point of failure unless it is made redundant.",
      learning: {
        why: "One API server has a ceiling, and when it fails every request fails with it.",
        how: "Clients talk to one stable address. The balancer forwards each request to a healthy server and stops sending to servers that fail health checks.",
        what: "Round robin: next = servers[i++ % servers.length]. Health check: GET /healthz every 5 s; remove after 2 failures.",
        tradeoffs: [
          "Capacity grows by adding servers, and one server can fail without an outage.",
          "Servers must be stateless, and the balancer adds a hop, cost and its own failure mode.",
        ],
        whenNotToUse:
          "Do not add it while one server comfortably carries the peak load and brief downtime is acceptable.",
      },
    },
    cache: {
      kind: "cache",
      label: "Cache",
      description: "Answers popular product reads from memory.",
      role: "cache",
      capacityRps: 20_000,
      baseLatencyMs: 1,
      monthlyCostUsd: 50,
      complexityPoints: 2,
      hitRatio: 0.85,
      acceptsFrom: ["api-server"],
      connectsTo: ["relational-database", "read-replica"],
      failureMode:
        "A cold or flushed cache sends every read to the database at once, and cached data can be stale.",
      learning: {
        why: "A few popular products receive most reads. Asking the database for them again and again wastes its capacity.",
        how: "The API checks the cache first. On a hit it returns immediately. On a miss it reads the database, stores the row, then returns it.",
        what: "Cache-aside: row = cache.get(id) ?? db.get(id); cache.set(id, row, ttl=60s). Preset hit ratio 85% for a product catalogue.",
        tradeoffs: [
          "Cuts database load and latency for hot reads.",
          "Data can be stale until the TTL expires, and invalidation is easy to get wrong.",
        ],
        whenNotToUse:
          "Avoid it when data changes on every request or each item is read only once; the hit ratio will be too low to matter.",
      },
    },
    "read-replica": {
      kind: "read-replica",
      label: "Read replicas",
      description: "Copies of the database that serve reads.",
      role: "data",
      scalable: true,
      capacityRps: 1000,
      baseLatencyMs: 12,
      monthlyCostUsd: 80,
      complexityPoints: 2,
      acceptsFrom: ["api-server", "cache"],
      connectsTo: [],
      failureMode:
        "Replicas lag behind the primary, so a read right after a write may return old data.",
      learning: {
        why: "Reads far outnumber writes for a catalogue. One database ceiling limits every read.",
        how: "The primary streams its changes to replicas. The API sends reads to replicas and keeps writes on the primary.",
        what: "Streaming replication: replica applies the primary's write-ahead log. Pseudocode: reads -> pickReplica(); writes -> primary.",
        tradeoffs: [
          "Read capacity grows with each replica, and one can fail without data loss.",
          "Replication lag means eventually consistent reads, and every replica costs as much as the primary.",
        ],
        whenNotToUse:
          "Do not add replicas for a write-heavy workload; writes still go to one primary.",
      },
    },
    "local-data": {
      kind: "local-data",
      label: "Local data",
      description: "In-process product data for the smallest useful design.",
      role: "data",
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
      role: "data",
      capacityRps: 1000,
      baseLatencyMs: 12,
      unindexed: { capacityRps: 40, baseLatencyMs: 150 },
      monthlyCostUsd: 80,
      complexityPoints: 3,
      acceptsFrom: ["api-server", "cache"],
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
