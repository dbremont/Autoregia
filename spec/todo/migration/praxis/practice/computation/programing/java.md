# Java Praxis

- [ ] ...

## Case Study

| System / Library                               | Description                                                                                                                     | Why Study This?                                                                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Java `java.util.concurrent` (JUC)**          | Core Java concurrency utilities including `ExecutorService`, `Future`, `ConcurrentHashMap`, `Semaphore`, `CountDownLatch`, etc. | Foundation of all modern Java concurrency; understanding its internals teaches you locks, atomics, memory visibility, and scheduling. |
| **Fork/Join Framework**                        | Part of JUC, optimized for divide-and-conquer tasks and work-stealing.                                                          | Teaches parallel decomposition, task scheduling, and fine-grained thread management.                                                  |
| **Akka (Java API)**                            | Actor-based concurrency library for building reactive and distributed systems.                                                  | Exposes actor model, message-passing concurrency, and handling state without shared-memory locks.                                     |
| **Disruptor (LMAX Disruptor)**                 | High-performance inter-thread messaging library using ring buffers.                                                             | Demonstrates ultra-low-latency, lock-free concurrency patterns, memory barriers, and cache efficiency.                                |
| **RxJava / Project Reactor**                   | Reactive programming libraries for asynchronous streams.                                                                        | Introduces functional concurrency, backpressure, event-driven systems, and non-blocking coordination.                                 |
| **Quasar / Loom (Virtual Threads)**            | Fibers / lightweight threads implementation. Loom is integrated in Java 21+.                                                    | Allows exploration of massive concurrency with minimal threads, understanding scheduling, and context-switch costs.                   |
| **Hazelcast / Infinispan**                     | Distributed in-memory data grids.                                                                                               | Teaches distributed concurrency, shared-state consistency, and partitioned data coordination.                                         |
| **JGroups / Netty**                            | Communication and cluster libraries for Java networking.                                                                        | Offers understanding of messaging, coordination, consensus, and building scalable concurrent systems.                                 |
| **Java Memory Model (JMM) studies**            | Specification of how threads interact via memory, including `volatile`, `synchronized`, and atomic classes.                     | Essential for deep mastery of visibility, ordering, and happens-before relationships.                                                 |
| **JCStress (Java Concurrency Stress Testing)** | Tool to test concurrency correctness and memory model assumptions.                                                              | Lets you empirically observe race conditions, reorderings, and subtle concurrency bugs.                                               |

## References

- https://github.com/dbremont/system-design-labs/blob/main/src/data/Apache%20Ignite.md
- https://github.com/dbremont/system-design-labs
- https://github.com/dbremont/documentorum
