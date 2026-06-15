# Design Method

How system-architect thinks. Feedforward guide. Read first, every run.

## Frame

System design = chain of decisions under constraint. Decide what to ingest, what to store, what to
compute, what to serve. Each stage kills bad cost, keeps useful signal. Good design not the one that
does most. The one that chooses best what to do.

Every nontrivial system has 4 capabilities. Generalize from the search-engine worked example:

| Capability | Search engine | General |
|---|---|---|
| Discover / ingest | crawler | get data in (API, events, uploads, crawl) |
| Understand / model | parser, extractor | parse, validate, enrich, normalize |
| Organize | inverted index | store for efficient query (index, schema, partition) |
| Serve | query path | answer requests, low latency, high availability |

Plus 2 support planes almost always: **metadata/policy** (rules, scheduling, dedup, config) and
**observability/control** (metrics, debugging, replay, backfill, allow/blocklists).

## Three pillars (Kleppmann, DDIA)

Score every design against these. They are the non-functional spine.

- **Reliability**: works correctly under fault. Hardware fail, software bug, human error. Design
  for failure (Vogels: "everything fails all the time"). Bulkheads, circuit breakers, retries with
  backoff, idempotency (Nygard, Release It).
- **Scalability**: handles growth in load. Define load params first (QPS, payload size, fan-out,
  read/write ratio). Then describe performance under that load (p50/p95/p99, throughput). Horizontal
  over vertical. Partition by a key that avoids hot spots.
- **Maintainability**: operable, simple, evolvable. Deep modules, simple interfaces (Ousterhout,
  Philosophy of Software Design). Hide complexity, do not spread it. Observability is part of design,
  not an afterthought.

## Numbers every engineer should know (Jeff Dean)

Use for back-of-envelope. Order of magnitude, not exact.

- L1 ref ~1 ns, main memory ref ~100 ns, SSD random read ~16 us, rotational disk seek ~2 ms.
- Read 1 MB sequentially: memory ~10 us, SSD ~50 us, disk ~5 ms.
- Round trip same datacenter ~0.5 ms. Round trip CA to Netherlands ~150 ms.
- 1 Gbps link ~125 MB/s. Mutex lock/unlock ~17 ns. Compress 1 KB ~2 us.

Sizing math always shown: QPS = DAU * actions/day / 86400, peak = avg * (2 to 10). Storage =
records * bytes/record * replication * retention. Bandwidth = QPS * payload. If you cannot do the
math, you do not understand the scale yet.

## Method (the stages an SDD walks)

1. **Problem + context**: one-line frame. Who, scale, internal vs web-scale. State it sharp.
2. **Requirements**: functional (what it does) + non-functional with numbers (latency SLO,
   throughput, availability target, consistency model, cost ceiling).
3. **Mental model**: end-to-end flow, numbered or mermaid. Prove you see the whole path before any
   component. If you cannot draw the flow, you cannot design the parts.
4. **High-level architecture**: components + mermaid. Name the data planes.
5. **Deep dives**: per critical component: data structures, algorithms, the hard trade-off. This is
   where staff separates from senior. Pick the 2-3 components that carry the risk.
6. **Data + storage**: separate store by function (raw vs parsed vs operational metadata).
   Pick storage per access pattern: KV/wide-column for random updates, object storage for blobs,
   inverted/search index for text, relational for transactions. Immutability where you can
   (Helland: data on the outside is immutable; events over mutable state).
7. **Scale + partitioning**: sharding strategy, replication, rebalancing. Owner-per-partition to
   coordinate (politeness, locks). Stateless workers autoscale; stateful needs leadership + replicas.
8. **Consistency + failure**: pick consistency model honestly (eventual is fine if it converges).
   Then enumerate failure modes and how design resists each. "What breaks first?"
9. **Observability + ops**: metrics per stage, the debugging tools that must exist (inspect one
   record's lifecycle, explain one query's result). Without these, team guesses forever.
10. **Security + compliance**: least data stored, sandbox untrusted input, sanitize parsing,
    respect external policy, clear identity/contact for outbound traffic.
11. **Incremental plan**: phases. Vertical slice first (prove end-to-end on small scope, reuse
    proven engines), then efficiency/quality, then real scale, then advanced relevance. Advanced
    layers on bad ingestion is expensive makeup.
12. **Trade-offs**: the explicit tensions. Coverage vs quality, freshness vs cost, recall vs
    latency, complexity vs delivery speed, centralize vs partition. Staff explains these plainly.
13. **Open questions / design review**: what you would interrogate in review (see review skill).

## Trade-off discipline

Never present one option as obvious. Name the alternative, the axis, and why you chose. Format:
"Chose X over Y because {axis} matters more here, given {constraint}." A design with no stated
trade-off is a design that hid one.

## Build pragmatically

Do not reinvent the hard parts if differentiation lives elsewhere. Use a proven engine (Lucene,
Postgres, Kafka, a managed queue) for the treacherous-detail layer; spend the quarters on the
pipeline and ranking/logic that is actually your edge. Reinvent only the part that is the product.

## The canon (whose idea each lens is)

Cite when it sharpens a point. These names are the method's backbone.

| Person | Idea applied here |
|---|---|
| Martin Kleppmann (DDIA) | reliability / scalability / maintainability as the spine; load params before perf |
| Jeff Dean & Sanjay Ghemawat | numbers every engineer knows; back-of-envelope; MapReduce-shaped batch |
| Werner Vogels | design for failure, "everything fails all the time", eventual consistency at scale |
| Pat Helland | immutability, events over mutable state, life beyond distributed transactions |
| Michael Nygard (Release It) | stability patterns: circuit breaker, bulkhead, timeout, backoff |
| John Ousterhout (PoSD) | deep modules, simple interfaces, complexity is the enemy |
| Sam Newman | service boundaries along business capability, not technical layer |
| Leslie Lamport | reason about distributed state and ordering before optimizing |
| Gregor Hohpe | the architect elevator: connect the engine room trade-off to the business stake |

## The harness connection (why this agent works this way)

This agent is itself a harness (Böckeler / Fowler, "Harness engineering for coding agent users").
- **Guides = feedforward**: this file + templates steer before the agent writes.
- **Sensors = deterministic feedback**: structure/rigor checks that gate after writing.
- **Evals = inferential feedback**: LLM-judge on design quality and review depth.
- **Humans on the loop**: improve the guide/sensors/evals, not just one output.

Same control split the design itself needs: computational controls (tests, linters, schema checks)
and inferential controls (semantic review). Both, always.

## Operational summary (the north star)

- Ingestion good = chooses well what to take in, not takes most.
- Parser good = survives broken input and still extracts signal.
- Store good = organizes for fast relevant retrieval, not keeps everything.
- Serving good = combines local signal, global signal, and intent under a latency budget.
- Ops good = explains fast why it failed and recovers without chaos.
