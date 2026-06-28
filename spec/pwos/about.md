# PWOS Model Explanation

> What underlies the PWOS model?

## Agent

> An agent is a system that maintains its continued existence and pursues objectives through regulated interaction with an environment.

> An agent is a system that deliberately transforms states of itself and its environment by selecting and executing actions according to internal objectives while regulating those actions using feedback.

| Component      | Role                                     |
| -------------- | ---------------------------------------- |
| Identity       | what persists through time               |
| Objectives     | desired future states                    |
| World          |(Internal, External)                      |
| Internal State | beliefs, memory, resources, capabilities |
| Perception     | acquisition of information               |
| Decision       | selection among alternatives             |
| Action         | modification of world or self            |
| Feedback       | observation of consequences              |
| Regulation     | correction of deviations                 |
| Learning       | modification of internal models          |

### What functional problems must every agent solve?

| Functional Problem   | Description                       |
| -------------------- | --------------------------------- |
| Identity Maintenance | preserve the agent                |
| Situation Assessment | understand environment            |
| Goal Formation       | determine desired future          |
| Planning             | generate possible actions         |
| Resource Allocation  | distribute limited resources      |
| Coordination         | synchronize concurrent activities |
| Execution            | perform actions                   |
| Monitoring           | observe progress                  |
| Regulation           | compensate disturbances           |
| Learning             | improve future behavior           |

### Agent Control Loop  Model

```txt
World: Environment | Internal Environment
      │
      ▼
 Perception
      │
      ▼
Situation Model
      │
      ▼
Decision
      │
      ▼
Action Selection
      │
      ▼
Execution
      │
      ▼
World
      ▲
      │
Feedback
```

## Personal Viable System Model (PVSM)

### Agent Control Loop

```txt
World: Environment | Internal Environment
      │
      ▼
 Perception: Personal Recording System
        -> Null.
        -> Task Regitry Mechanism
        -> Reflection
        -> ...
Situation Model
      │
      ▼
Decision
      │
      ▼
Action Selection  (Calendar, Time Tracker, ...)
      │
      ▼
Execution  (Production)
      │
      ▼
World
      ▲
      │
Feedback  (Reflection)
```

## References

- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6?source=copy_link)
- [Self-Management](https://app.notion.com/p/Self-Management-2a6c0f5171ec80e5bd2dfa83993a3c84?source=copy_link)
