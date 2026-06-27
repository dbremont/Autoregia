# Research Keyword Data Analysis Spec

> The system is not merely a “typing analytics dashboard.” It should function as a behavioral telemetry laboratory capable of exposing temporal dynamics, workflow structures, cognitive-state indicators, composition processes, and identity-level behavioral signatures derived from keystroke streams.

> Tech Stack:  We need a HTML, JS, Tailwind CSS, Apache ECharts.

> UX Guide: Sophisticated analytical site.

> UI Guide: Sophisticated analytical site.

## Section Set

- Header
- Tabs
    - (See the Artifact - Tab)
- Footer
- Other
    - Toolbox Botton:
      - Keyword Bindings
      - Docs
- ...

### Data Format

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.org/schemas/portable-keystroke-dataset.schema.json",
  "title": "Portable Keystroke Telemetry Dataset",
  "description": "Cross-platform keystroke telemetry schema restricted to data realistically recoverable from both X11 and Wayland without privileged access.",
  "type": "array",
  "items": {
    "$ref": "#/$defs/KeystrokeEvent"
  },

  "$defs": {
    "KeystrokeEvent": {
      "type": "object",

      "required": [
        "event_id",
        "timestamp_utc",
        "session_id",
        "source",
        "device",
        "keyboard",
        "event",
        "timing"
      ],

      "properties": {
        "event_id": {
          "type": "string",
          "description": "Globally unique event identifier."
        },

        "timestamp_utc": {
          "type": "string",
          "format": "date-time"
        },

        "local_timestamp": {
          "type": "string",
          "format": "date-time"
        },

        "timezone": {
          "type": "string",
          "description": "IANA timezone identifier."
        },

        "session_id": {
          "type": "string",
          "description": "Logical typing session identifier."
        },

        "source": {
          "$ref": "#/$defs/Source"
        },

        "device": {
          "$ref": "#/$defs/Device"
        },

        "keyboard": {
          "$ref": "#/$defs/Keyboard"
        },

        "event": {
          "$ref": "#/$defs/KeyEvent"
        },

        "timing": {
          "$ref": "#/$defs/Timing"
        },

        "context": {
          "$ref": "#/$defs/Context"
        },

        "environment": {
          "$ref": "#/$defs/Environment"
        },

        "tags": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },

        "metadata": {
          "type": "object",
          "additionalProperties": true
        }
      },

      "additionalProperties": false
    },

    "Source": {
      "type": "object",

      "required": [
        "platform",
        "capture_scope"
      ],

      "properties": {
        "platform": {
          "type": "string",
          "enum": [
            "x11",
            "wayland",
            "unknown"
          ]
        },

        "capture_scope": {
          "type": "string",
          "enum": [
            "application_local",
            "focused_window",
            "global"
          ]
        },

        "collector": {
          "type": "string",
          "description": "Collector implementation name."
        },

        "collector_version": {
          "type": "string"
        }
      },

      "additionalProperties": false
    },

    "Device": {
      "type": "object",

      "required": [
        "device_id",
        "hostname",
        "os"
      ],

      "properties": {
        "device_id": {
          "type": "string"
        },

        "hostname": {
          "type": "string"
        },

        "machine_type": {
          "type": "string",
          "enum": [
            "desktop",
            "laptop",
            "tablet",
            "virtual_machine",
            "other"
          ]
        },

        "os": {
          "$ref": "#/$defs/OperatingSystem"
        }
      },

      "additionalProperties": false
    },

    "OperatingSystem": {
      "type": "object",

      "required": [
        "family",
        "version"
      ],

      "properties": {
        "family": {
          "type": "string",
          "examples": [
            "Linux",
            "Windows",
            "macOS"
          ]
        },

        "distribution": {
          "type": "string"
        },

        "version": {
          "type": "string"
        }
      },

      "additionalProperties": false
    },

    "Keyboard": {
      "type": "object",

      "required": [
        "layout"
      ],

      "properties": {
        "keyboard_id": {
          "type": "string"
        },

        "layout": {
          "type": "string",
          "examples": [
            "us",
            "es",
            "de"
          ]
        },

        "connection_type": {
          "type": "string",
          "enum": [
            "usb",
            "bluetooth",
            "integrated",
            "other"
          ]
        }
      },

      "additionalProperties": false
    },

    "KeyEvent": {
      "type": "object",

      "required": [
        "event_type",
        "key_code"
      ],

      "properties": {
        "event_type": {
          "type": "string",
          "enum": [
            "key_down",
            "key_up",
            "auto_repeat"
          ]
        },

        "key": {
          "type": "string",
          "description": "Logical key representation."
        },

        "key_code": {
          "type": "string",
          "description": "Normalized symbolic key code."
        },

        "modifiers": {
          "type": "array",

          "items": {
            "type": "string",

            "enum": [
              "shift",
              "ctrl",
              "alt",
              "meta",
              "caps_lock"
            ]
          }
        },

        "is_composition": {
          "type": "boolean"
        },

        "is_shortcut": {
          "type": "boolean"
        }
      },

      "additionalProperties": false
    },

    "Timing": {
      "type": "object",

      "required": [
        "event_time_ms"
      ],

      "properties": {
        "event_time_ms": {
          "type": "integer",
          "description": "Monotonic event timestamp in milliseconds."
        },

        "hold_time_ms": {
          "type": "number",
          "description": "Key press duration."
        },

        "flight_time_ms": {
          "type": "number",
          "description": "Latency from previous key release/press."
        },

        "digraph_latency_ms": {
          "type": "number"
        },

        "typing_speed_wpm": {
          "type": "number"
        },

        "session_elapsed_ms": {
          "type": "number"
        }
      },

      "additionalProperties": false
    },

    "Context": {
      "type": "object",

      "properties": {
        "language": {
          "type": "string"
        },

        "task_type": {
          "type": "string",

          "enum": [
            "coding",
            "writing",
            "chatting",
            "research",
            "terminal",
            "navigation",
            "other"
          ]
        },

        "application_name": {
          "type": "string",
          "description": "Available reliably only for application-local collection."
        },

        "input_field_type": {
          "type": "string",

          "enum": [
            "editor",
            "terminal",
            "search",
            "form",
            "chat",
            "other"
          ]
        }
      },

      "additionalProperties": false
    },

    "Environment": {
      "type": "object",

      "properties": {
        "cpu_load_percent": {
          "type": "number"
        },

        "memory_usage_percent": {
          "type": "number"
        },

        "battery_percent": {
          "type": "number"
        }
      },

      "additionalProperties": false
    }
  }
}
```

### Artifact - Tab

| Tab                                            | Concrete Epistemic Artifact            | Description (How it encodes the dataset)                                                                                                                 | Type                                  | Role                                                                                      |
| ---------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Overview**                                   | Total Keystroke Volume Projection      | Scalar projection of the dataset length                                                                                                                  | Scalar Metric                         | System load indicator, session boundary heuristic                                         |
| **Overview**                                   | Aggregate Throughput Velocity          | Keystroke count divided by session elapsed time                                                                                                          | Rate Metric                           | Real-time productivity proxy, baseline normalization                                      |
| **Overview**                                   | Global Consistency Index               | Inverse of coefficient of variation across all dwell times                                                                                               | Normalized Index                      | Signal quality assessment, noise floor estimation                                         |
| **Overview**                                   | Fatigue Event Frequency                | Count of telemetry points exceeding fatigue-boundary thresholds                                                                                          | Event Counter                         | Session health flag, trigger for adaptive system intervention                             |
| **Overview**                                   | Total Session Count                    | Scalar count of discrete typing sessions identified within the dataset                                                                                   | Scalar Metric                         | Dataset segmentation baseline, longitudinal tracking unit                                 |
| **Overview**                                   | Average Speed (WPM)                    | Mean words-per-minute calculated from net keystroke throughput and standard word length                                                                  | Rate Metric                           | User-facing productivity proxy, comparative performance indicator                         |
| **Overview**                                   | Consistency Score (%)                  | User-friendly percentage representation derived from the inverse coefficient of variation of dwell times                                                 | Normalized Index                      | Simplified signal quality indicator, dashboard health summary                             |
| **Overview**                                   | Session Rhythm Profile                 | Macro-scale temporal segmentation of keystroke density into warm-up, flow, degradation                                                                   | Temporal Profile                      | Performance monitoring, optimal scheduling inference                                      |
| **Overview**                                   | Productivity Telemetry Artifact        | Multi-dimensional aggregation: throughput, interruption density, revision burden, cadence                                                                | Composite Metric Vector               | Organizational analytics, workflow optimization                                           |
| **Overview**                                   | Behavioral State Distribution          | Categorical histogram mapping keystroke subsets to inferred cognitive/motor states (focus/casual/tired)                                                  | Distribution                          | Immediate situational awareness, dashboard health summary                                 |
| **Overview**                                   | Cross-Session Trend Vector             | First-order differences of key metrics (WPM, consistency, dwell) across consecutive sessions                                                             | Difference Vector                     | Longitudinal trajectory signal, regression input                                          |
| **Behavioral Signature**                       | Behavioral Signature Profile           | Structured encoding of stable dynamics: latency distributions, digraph timing, cadence, correction rates                                                 | Multi-Dimensional Profile             | Authentication, identity continuity, anomaly baseline                                     |
| **Behavioral Signature**                       | User Identity Model                    | Probabilistic biometric encoding derived from stable keystroke dynamics against a reference template                                                     | Probabilistic Model                   | Continuous authentication, fraud detection                                                |
| **Behavioral Signature**                       | Motor Coordination Profile             | Encoding of fine-grained biomechanical regularity inferred from alternating-hand vs. same-hand digraph timing differentials                              | Biomechanical Profile                 | Accessibility research, neuromotor studies, injury detection                              |
| **Behavioral Signature**                       | Behavioral Embedding Vector            | Compression of full behavioral telemetry into a fixed-dimension learned latent space via encoder network                                                 | Learned Latent Vector                 | Similarity search, clustering, identity matching, dimensionality reduction                |
| **Behavioral Signature**                       | Dwell Time Distribution Fingerprint    | Full probability density function of key-hold durations, parameterized or binned                                                                         | Probability Distribution              | Biometric matching, device-inference input, state classification feature                  |
| **Behavioral Signature**                       | Flight Time Distribution Fingerprint   | Full probability density function of inter-key intervals, parameterized or binned                                                                        | Probability Distribution              | Digraph modeling, routing optimization input, anomaly feature                             |
| **Behavioral Signature**                       | Hand-Alternation Ratio                 | Scalar projection of same-hand vs. alternating-hand keystroke transition frequency                                                                       | Scalar Ratio                          | Typing method detection (touch vs. hunt-and-peck), expertise proxy                        |
| **Behavioral Signature**                       | Correction Topology Signature          | Encoding of backspace frequency, correction depth, and immediate vs. deferred correction patterns                                                        | Topological Signature                 | Expertise estimation, identity stability feature, frustration proxy                       |
| **Behavioral Signature**                       | Burst Cadence Autocorrelation          | Autocorrelation function of burst-onset intervals across the dataset                                                                                     | Autocorrelation Function              | Rhythmicity detection, biological clock signal, anomaly baseline                          |
| **Behavioral Signature**                       | Behavioral Drift Model (Intra-Session) | Within-session regression of signature parameters against time-on-task                                                                                   | Regression Model                      | Micro-drift detection, fatigue confound isolation                                         |
| **Behavioral Signature**                       | Cross-Week Behavioral Drift Field      | Vector field encoding directional change of behavioral signature parameters across weeks/months (cadence, dwell, correction topology, rhythm regularity) | Temporal Vector Field                 | Longitudinal adaptation analysis, skill acquisition tracking, identity aging detection    |
| **Behavioral Signature**                       | Finger Utilization Distribution        | Probability distribution over estimated finger usage frequency derived from keyboard geometry and key transition mapping                                 | Biomechanical Distribution            | Ergonomic analysis, typing-style inference, motor asymmetry detection                     |
| **Behavioral Signature**                       | Same-Finger Repetition Stress Index    | Scalar index quantifying frequency and temporal density of consecutive same-finger activations                                                           | Ergonomic Stress Metric               | RSI risk estimation, keyboard-layout evaluation, fatigue amplification detection          |
| **Behavioral Signature**                       | Modifier Key Strain Profile            | Structured encoding of modifier-key utilization dynamics (Shift/Ctrl/Alt/Cmd), chord frequency, hold duration, asymmetry                                 | Interaction Strain Profile            | Shortcut ergonomics analysis, command fluency assessment, workload characterization       |
| **Behavioral Signature**                       | Keyboard Reach Heatmap                 | Spatial projection of key activation density mapped onto physical keyboard coordinates                                                                   | Spatial Heatmap                       | Ergonomic optimization, accessibility analysis, hardware-layout evaluation                |
| **Temporal Dynamics**                          | Keystroke Time Series                  | Raw ordered sequence of press/release timestamps, dwell times, flight times                                                                              | Ordered Time Series                   | Foundational substrate — input to all temporal models                                     |
| **Temporal Dynamics**                          | Normalized Temporal Stream             | Time series with z-scored dwell/flight per user, detrended, pause-removed                                                                                | Normalized Time Series                | Cross-session comparison, model training input                                            |
| **Temporal Dynamics**                          | Transition Probability Matrix          | Empirical joint probability matrix of key_{t} → key_{t+1} transitions                                                                                    | Stochastic Matrix                     | Sequence modeling, predictive typing, language-model coupling                             |
| **Temporal Dynamics**                          | Digraph Timing Matrix                  | Mean and variance of flight times for every observed key-pair combination                                                                                | Statistical Matrix                    | Behavioral fingerprint component, keyboard optimization input                             |
| **Temporal Dynamics**                          | Temporal Interaction Graph             | Directed graph where nodes are keystroke events and edges encode temporal dependencies (flight, pause, correction)                                       | Directed Temporal Graph               | Workflow analysis, composition dynamics, interaction topology                             |
| **Temporal Dynamics**                          | Pause Structure Encoding               | Ordered list of all inter-keystroke intervals exceeding a cognitive-pause threshold                                                                      | Interval Sequence                     | Cognitive segmentation input, disfluency quantification                                   |
| **Temporal Dynamics**                          | Interaction Entropy Profile            | Shannon entropy computed over binned flight times, dwell times, and key transitions                                                                      | Information-Theoretic Metric          | Expertise analysis, anomaly detection, cognitive variability                              |
| **Temporal Dynamics**                          | Conditional Timing Distribution        | P(flight_time | key_{t}, key_{t+1}) — context-conditioned flight time distribution                                                                       | Conditional Distribution              | Predictive error modeling, keyboard layout analysis                                       |
| **Temporal Dynamics**                          | Autoregressive Timing Model            | AR(p) or similar model fitted to the dwell/flight time series                                                                                            | Generative Time Series Model          | Anomaly scoring (residual analysis), synthetic data generation                            |
| **Temporal Dynamics**                          | Spectral Density Projection            | Power spectral density of the keystroke timing signal via FFT                                                                                            | Frequency-Domain Projection           | Rhythmic component extraction, tremor detection, burst identification                     |
| **Temporal Dynamics**                          | N-Gram Timing Sequence                 | Sliding window of N consecutive (dwell, flight) tuples as a sequence                                                                                     | Sequence-of-Tuples                    | Input to RNN/Transformer behavioral models                                                |
| **Temporal Dynamics**                          | Wavelet Timing Decomposition           | Multi-scale wavelet transform of dwell/flight time signals exposing transient temporal structures across frequencies                                     | Multi-Resolution Signal Decomposition | Burst detection, tremor analysis, hierarchical rhythm extraction                          |
| **Temporal Dynamics**                          | Rhythm Persistence Spectrum            | Spectral persistence encoding measuring stability of rhythmic structures across temporal scales                                                          | Persistence Spectrum                  | Flow-state stability analysis, behavioral periodicity characterization, anomaly detection |
| **Composition Process**                        | Burst Composition Model                | Segmentation of keystroke stream into temporally bounded high-activity bursts separated by planning pauses                                               | Temporal Segmentation                 | Productivity analysis, cognitive workflow decomposition                                   |
| **Composition Process**                        | Burst Duration Distribution            | Probability distribution of individual burst lengths (in keystrokes and elapsed time)                                                                    | Probability Distribution              | Writing style classification, task complexity inference                                   |
| **Composition Process**                        | Inter-Burst Interval Distribution      | Probability distribution of pause durations between production bursts                                                                                    | Probability Distribution              | Planning depth estimation, task-switching detection                                       |
| **Composition Process**                        | Revision Topology Model                | Graph encoding edit operations: insertion point, deletion span, correction locality relative to cursor                                                   | Edit Graph                            | Writing process analysis, expertise estimation, drafting behavior                         |
| **Composition Process**                        | Correction Depth Distribution          | Distribution of how many characters are deleted per backspace event                                                                                      | Probability Distribution              | Error awareness latency, expertise proxy (shallow corrections = expert)                   |
| **Composition Process**                        | Linguistic Production Model            | Mapping of keystroke timing onto emergent lexical/syntactic units (word timing, clause timing)                                                           | Temporal-Linguistic Model             | Writing research, language acquisition, cognitive linguistics                             |
| **Composition Process**                        | Word-Level Timing Vector               | Per-word vector: [character_count, total_production_time, within_word_pauses, post_word_pause]                                                           | Structured Vector                     | Vocabulary access latency, lexical retrieval studies                                      |
| **Composition Process**                        | Semantic Hesitation Map                | Spatial-temporal projection mapping pause duration and revision frequency onto positions within generated text                                           | Spatiotemporal Map                    | Cognitive writing analysis, educational diagnostics, difficulty hot-spot identification   |
| **Composition Process**                        | Composition Process Reconstruction     | Ordered replay encoding of the full edit history from initial keystroke to final text state                                                              | Ordered Edit Log                      | Forensic reconstruction, writing-process research                                         |
| **Composition Process**                        | Production-Revision Ratio              | Scalar: (net characters produced) / (characters deleted)                                                                                                 | Scalar Ratio                          | Drafting strategy classification (planner vs. discoverer)                                 |
| **Cognitive State**                            | Cognitive Load Estimator               | Probabilistic mapping from temporal irregularity, correction rate, and pause inflation to latent strain                                                  | Probabilistic Estimator               | Adaptive interfaces, human factors, real-time intervention trigger                        |
| **Cognitive State**                            | Pause-to-Keystroke Ratio               | Scalar: total pause time / total production time                                                                                                         | Scalar Ratio                          | Cognitive load proxy, task difficulty heuristic                                           |
| **Cognitive State**                            | Fatigue Dynamics Model                 | Time-evolving encoding of degradation signals: cadence decay, dwell inflation, correction escalation                                                     | Dynamic Trajectory Model              | Ergonomics, workforce telemetry, break scheduling                                         |
| **Cognitive State**                            | Fatigue Proportion Encoding            | Categorical partitioning of the dataset into normal vs. fatigue-flagged keystroke proportions                                                            | Categorical Ratio                     | Session-level health snapshot, visual workload balance indicator                          |
| **Cognitive State**                            | Fatigue Event Log                      | Structured tabular encoding of individual fatigue events with timestamp, session ID, type (slow dwell/flight), and severity                              | Structured Event Log                  | Granular forensic analysis, anomaly triage, targeted intervention mapping                 |
| **Cognitive State**                            | Circadian Fatigue Distribution         | 24-hour histogram aggregating fatigue event frequencies by hour of the day                                                                               | Temporal Histogram                    | Circadian rhythm inference, break scheduling optimization, occupational health monitoring |
| **Cognitive State**                            | Human Performance Degradation Curve    | Parametric curve fitted to behavioral metrics over session duration                                                                                      | Parametric Curve                      | Occupational safety, workload modeling, fatigue threshold calibration                     |
| **Cognitive State**                            | Attention Fragmentation Model          | Encoding of interruption frequency, context-switch events (app change, long pause, command), flow discontinuity                                          | Fragmentation Index                   | Multitasking analysis, workplace telemetry, deep-work quantification                      |
| **Cognitive State**                            | Flow State Probability Trace           | Sliding-window probabilistic estimate of being in a flow state based on low variance + high throughput                                                   | Time-Varying Probability              | Optimal scheduling, experience design, wellness metrics                                   |
| **Cognitive State**                            | Temporal Irregularity Index            | Higher-order moment encoding: skewness and kurtosis of the dwell/flight distributions                                                                    | Statistical Moment Vector             | Cognitive disruption signal, subtle fatigue detection before mean shift                   |
| **Cognitive State**                            | Error Escalation Trajectory            | Time series of error frequency showing acceleration or deceleration patterns                                                                             | Trajectory                            | Frustration prediction, adaptive difficulty input                                         |
| **Workflow & Expertise**                       | Workflow State Machine                 | Discrete state-transition encoding: idle → planning → composing → revising → debugging → searching                                                       | Finite State Machine                  | Process mining, developer tooling, productivity system design                             |
| **Workflow State Machine** → *(sub-artifacts)* | State Transition Probability Matrix    | Empirical matrix of transition probabilities between workflow states                                                                                     | Stochastic Matrix                     | Workflow prediction, process optimization                                                 |
| **Workflow State Machine** → *(sub-artifacts)* | State Dwell Time Distribution          | Distribution of time spent in each workflow state per visit                                                                                              | Probability Distribution              | Task complexity inference, bottleneck identification                                      |
| **Workflow & Expertise**                       | Task Archetype Classifier              | Categorical projection of keystroke patterns onto task types (coding, chat, transcription, search, editing)                                              | Classifier Output                     | Adaptive UI, workflow routing, context-aware tooling                                      |
| **Workflow & Expertise**                       | Expertise Classifier                   | Ordinal projection of typing regularity, revision structure, command fluency onto proficiency scale                                                      | Ordinal Classifier                    | Training systems, onboarding analytics, adaptive difficulty                               |
| **Workflow & Expertise**                       | Human–Machine Interaction Trace        | Composite ordered encoding of keystrokes + interface events + editor commands + navigation                                                               | Composite Event Trace                 | UX research, HCI optimization, interaction mining                                         |
| **Workflow & Expertise**                       | Command Fluency Profile                | Encoding of shortcut usage frequency, command execution timing, menu-vs-keyboard ratio                                                                   | Behavioral Profile                    | Tool mastery estimation, training gap identification                                      |
| **Workflow & Expertise**                       | Predictive Error Model                 | Statistical projection of future error likelihood based on recent timing drift and context                                                               | Predictive Distribution               | Intelligent editors, proactive correction, error prevention                               |
| **Workflow & Expertise**                       | Navigation Rhythm Encoding             | Temporal pattern of cursor movement, selection, and scroll events interleaved with keystrokes                                                            | Rhythmic Pattern                      | Task type inference, UI friction detection                                                |
| **Raw Telemetry**                              | Keystroke Event Log                    | Unmodified ordered list of every key press/release with hardware timestamps                                                                              | Raw Event Stream                      | Source of truth, audit trail, legal/forensic record                                       |
| **Raw Telemetry**                              | Hardware Timestamp Trace               | Bare system-level timestamp sequence without any derived metrics                                                                                         | Raw Time Series                       | Clock drift analysis, sensor calibration, latency profiling                               |
| **Raw Telemetry**                              | Key Code Mapping                       | Raw HID/scancode to logical key assignment record                                                                                                        | Lookup Table                          | Keyboard layout inference, hardware fault detection                                       |
| **Raw Telemetry**                              | Unfiltered Signal Buffer               | Complete press-and-release event pairs including modifier keys, function keys, and system shortcuts                                                      | Raw Buffer                            | Low-level interaction mining, accessibility event reconstruction                          |

## References

* [ScienceDirect — Keystroke dynamics research](https://www.sciencedirect.com/science/article/abs/pii/S174680942501568X?utm_source=chatgpt.com)
* [MDPI Diagnostics — Keystroke biomarker research](https://www.mdpi.com/2075-4418/13/19/3061?utm_source=chatgpt.com)
* [Scientific Reports — Diagnostic accuracy of keystroke dynamics as digital biomarkers](https://www.nature.com/articles/s41598-022-11865-7?utm_source=chatgpt.com)
* Dias, T., Vitorino, J., Maia, E., Sousa, O., & Praça, I. (2023). KeyRecs: Keystroke Dynamics Dataset (1.0.0) [Data set]. Zenodo. https://doi.org/10.5281/zenodo.7886743
* ...