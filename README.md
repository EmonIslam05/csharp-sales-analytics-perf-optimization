# SalesAnalytics — C# Performance Optimization Case Study

A before/after performance-optimization exercise built around a purpose-made
C# console application: a retail sales analytics engine that ingests
hundreds of thousands of transaction records and computes revenue
aggregates, top-product rankings, regional customer counts, blocklist
filtering, monthly trends, and a line-item export report.

Two functionally identical engines are provided:

| Project | Role |
|---|---|
| `src/SalesAnalytics.Core` | Shared, deterministic dataset generator + result/metric types + benchmark harness |
| `src/SalesAnalytics.Unoptimized` | "Before" engine — 9 documented, intentional inefficiencies |
| `src/SalesAnalytics.Optimized` | "After" engine — single-pass, HashSet/PriorityQueue lookups, StringBuilder, struct records, `Parallel.For` |
| `tests/SalesAnalytics.Tests` | 41-case correctness harness proving both engines produce identical output |

Full write-up, methodology, before/after code excerpts, and measured
results (real numbers, not estimates) are in
[`reports/Performance_Optimization_Report.docx`](reports/Performance_Optimization_Report.docx).

## Headline results (n = 400,000 records)

| Metric | Before | After | Improvement |
|---|---|---|---|
| Core analytics pipeline | 4,627 ms | 150 ms | **~31x faster** |
| Export report (15,000 rows) | 6,696 ms / 14.66 GB allocated | 22.8 ms / 6.34 MB allocated | **~294x faster, ~2,313x less memory** |

The optimized engine was additionally validated at 4,000,000 records
(10x the comparison size) — see the report for details.

## Getting started

Requires the [.NET 8 SDK](https://dotnet.microsoft.com/download).

```bash
git clone <this-repo-url>
cd SalesAnalytics
dotnet build -c Release

# Run each engine's benchmark suite (appends to reports/benchmarks.json)
dotnet run --project src/SalesAnalytics.Unoptimized -c Release --no-build -- reports/benchmarks.json
dotnet run --project src/SalesAnalytics.Optimized   -c Release --no-build -- reports/benchmarks.json

# Run the correctness test suite
dotnet run --project tests/SalesAnalytics.Tests -c Release
```

## Repository layout

```
PerfDemo.sln
src/
  SalesAnalytics.Core/          shared dataset generator + result/metric types
  SalesAnalytics.Unoptimized/   "before" engine (SalesRecord class + naive algorithms)
  SalesAnalytics.Optimized/     "after" engine (SalesRecord struct + optimized algorithms)
tests/
  SalesAnalytics.Tests/         41 automated correctness checks, before vs. after
reports/
  Performance_Optimization_Report.docx   full write-up (Word)
  Performance_Optimization_Report.pdf    same report, rendered to PDF
  benchmarks.json                        raw measured metrics (source of every number in the report)
  unoptimized_console_output.txt         console transcript, before run
  optimized_console_output.txt           console transcript, after run
docgen/
  build_report.js               Node/docx-js script that generates the .docx report from benchmarks.json
```

## License

Sample/demo code provided as-is for the performance optimization exercise.
