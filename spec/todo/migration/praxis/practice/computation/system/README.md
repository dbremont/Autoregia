# Computer System Design

> How should we design a system such that multiple systems can reference and operate on the same logical data while ensuring correctness, availability, and performance, given that one source is authoritative and replicas must maintain coherence?

## Study:

1. **Read the Code**: Many are open-source (Linux, Redis, SQLite).
2. **Paper Trail**: Study foundational papers (e.g., Dynamo, MapReduce).
3. **Rebuild Mini-Versions**: Implement:
    - A tiny OS scheduler
    - A key-value store
    - A toy compiler
4. **Compare**: e.g., Kafka vs. RabbitMQ, Redis vs. Memcached.

## Web Note Taking App

- [ ]  https://www.blocknotejs.org/
- [ ]  https://github.com/yjs
- [ ]  https://github.com/suitenumerique/docs/tree/main?tab=readme-ov-file

## Catching

### URL Shortener Service

- Problem: Design a service like Bit.ly that converts long URLs into short ones and redirects users quickly.
- Caching Use Case:
  - Cache frequently accessed short URL → long URL mappings in memory for O(1) lookup.
- Challenges to Solve:
  - High read-to-write ratio (reads dominate, writes are rare).
- Cache invalidation on URL expiration.
  - Extension: Support global distributed caching for multiple datacenters.
 
### News Feed Service

- Problem: Design a personalized news feed system like Facebook or Twitter.
- Caching Use Case:
  - Cache precomputed feeds for active users.
  - Cache top trending stories.
- Challenges to Solve:
  - User feed personalization (high cache miss risk for less active users).
  - Handling real-time updates and invalidation.
  - Tradeoff between precomputation (write-heavy) and on-demand computation (read-heavy).
 
### E-commerce Product Catalog

- Problem: Design a catalog system for an online store with millions of products.
- Caching Use Case:
  - Cache product details for popular items.
  - Cache category pages or search results.
- Challenges to Solve:
  - Inventory updates require cache invalidation.
  - High read/write ratio fluctuations (e.g., sales events).
- Geo-distributed caching for global users


## Case Studies

| **Category** | **System** | **What to Learn / Study Focus** | **Key Insight / Concept / Lesson** |
| --- | --- | --- | --- |
| **Foundational Systems** | **UNIX/Linux Kernel** | Process scheduling, memory management, file systems | How OS abstractions enable hardware utilization |
|  | **TCP/IP Stack** | Network protocols, congestion control, packet routing | Distributed communication fundamentals |
|  | **SQLite Database** | ACID transactions, B-tree storage, query optimization | Embedded system design |
|  | **Redis** | In-memory data structures, persistence models | Performance/simplicity trade-offs |
| **Distributed Systems** | **Apache Kafka** | Log-based messaging, partition tolerance | Event-driven architectures |
|  | **Google MapReduce** | Batch processing, fault tolerance | Scalable data parallelism |
|  | **Amazon DynamoDB** | Key-value storage, eventual consistency | CAP theorem in practice |
|  | **Kubernetes** | Container orchestration, declarative state management | Distributed control planes |
| **Language Runtimes** | **Java JVM** | Bytecode interpretation, garbage collection | Cross-platform execution |
|  | **Python CPython** | GIL, reference counting | Interpreter/compiler trade-offs |
|  | **V8 JavaScript Engine** | JIT compilation, hidden classes | Runtime optimization techniques |
| **Specialized Systems** | **Git** | Content-addressable storage, DAG-based versioning | Immutable data structures |
|  | **Nginx** | Event-driven web server, load balancing | C10k problem solutions |
|  | **TensorFlow** | Computational graphs, automatic differentiation | ML system design patterns |
| **Historical/Conceptual** | **Lisp Machine** | Hardware/software co-design, REPL-driven development | Interactive programming |
|  | **Plan 9 OS** | Everything-is-a-file, distributed resources | Unified interfaces |
|  | **Smalltalk VM** | Object-oriented runtime, live coding | Metaprogramming |

## References

- [System](https://righteous-guardian-68f.notion.site/System-180c0f5171ec803391a6cb98cc236081?source=copy_link)
- [Netflix’s Distributed Counter Abstraction](https://netflixtechblog.com/netflixs-distributed-counter-abstraction-8d0c45eb66b2)
- [Shopify Tech Stack](https://blog.bytebytego.com/p/shopify-tech-stack?publication_id=817132&post_id=165590160&isFreemail=true&r=ewe3h&triedRedirect=true)
- [How Lyft Uses ML to Make 100 Million Predictions A Day](https://blog.bytebytego.com/p/how-lyft-uses-ml-to-make-100-million?publication_id=817132&post_id=165365614&isFreemail=true&r=ewe3h&triedRedirect=true)
- 
