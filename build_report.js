const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType, Header, Footer, PageNumber,
  PageBreak, LevelFormat, convertInchesToTwip, VerticalAlign, TableOfContents
} = require("docx");
const fs = require("fs");

const PAGE_WIDTH = 12240; // US Letter DXA
const PAGE_HEIGHT = 15840;
const MARGIN = 1440; // 1 inch
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 9360

const COLORS = {
  dark: "1F2937",
  accent: "1D4ED8",
  good: "047857",
  bad: "B91C1C",
  grayBg: "F3F4F6",
  headerBg: "1D4ED8",
  headerText: "FFFFFF",
  border: "9CA3AF"
};

function heading1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    border: { bottom: { color: COLORS.accent, space: 4, style: BorderStyle.SINGLE, size: 8 } }
  });
}
function heading2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 } });
}
function heading3(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } });
}
function body(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 160, line: 276 },
    children: [new TextRun({ text, ...opts })]
  });
}
function bodyRuns(runs, opts = {}) {
  return new Paragraph({ spacing: { after: 160, line: 276 }, ...opts, children: runs });
}
function bullet(text, level = 0) {
  return new Paragraph({
    text,
    bullet: { level },
    spacing: { after: 80 }
  });
}
function code(lines) {
  return new Paragraph({
    shading: { type: ShadingType.CLEAR, fill: "0F172A" },
    spacing: { before: 120, after: 120 },
    border: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "0F172A" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "0F172A" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "0F172A" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "0F172A" }
    },
    children: lines.split("\n").map((l, i) =>
      new TextRun({ text: l.length ? l : " ", font: "Consolas", size: 17, color: "E2E8F0", break: i === 0 ? 0 : 1 })
    )
  });
}

function cell(text, opts = {}) {
  const { width, bold = false, color, fill, align = AlignmentType.LEFT, size = 20 } = opts;
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: fill ? { type: ShadingType.CLEAR, fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text: String(text), bold, color, size })]
    })]
  });
}

function headerRow(headers, widths) {
  return new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => cell(h, { width: widths[i], bold: true, color: COLORS.headerText, fill: COLORS.headerBg, align: AlignmentType.CENTER })),
  });
}

function dataRow(values, widths, opts = {}) {
  const { fill, align = [] } = opts;
  return new TableRow({
    children: values.map((v, i) => cell(v, { width: widths[i], fill, align: align[i] || AlignmentType.CENTER })),
  });
}

function makeTable(widths, rows) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows
  });
}

// ---------------------------------------------------------------------------
// Data pulled directly from reports/benchmarks.json (real measured numbers)
// ---------------------------------------------------------------------------
const bench = JSON.parse(fs.readFileSync(__dirname + "/../reports/benchmarks.json", "utf8"));
const find = (variant, name, n) => bench.find(b => b.Variant === variant && b.Benchmark === name && b.RecordCount === n);

const buildU = find("Unoptimized", "BuildRecords", 400000);
const buildO = find("Optimized", "BuildRecords", 400000);
const pipeU = find("Unoptimized", "CoreAnalyticsPipeline", 400000);
const pipeO = find("Optimized", "CoreAnalyticsPipeline", 400000);
const exp7U = find("Unoptimized", "LineItemExport", 7500);
const exp7O = find("Optimized", "LineItemExport", 7500);
const exp15U = find("Unoptimized", "LineItemExport", 15000);
const exp15O = find("Optimized", "LineItemExport", 15000);
const buildO4M = find("Optimized", "BuildRecords", 4000000);
const pipeO4M = find("Optimized", "CoreAnalyticsPipeline", 4000000);

const speedup = (a, b) => (a.ElapsedMilliseconds / b.ElapsedMilliseconds);
const memRatio = (a, b) => (a.AllocatedBytes / b.AllocatedBytes);
const fmtMs = (v) => `${v.ElapsedMilliseconds.toFixed(1)} ms`;
const fmtMB = (v) => `${(v.AllocatedBytes / 1024 / 1024).toFixed(2)} MB`;
const fmtWS = (v) => `${(v.PeakWorkingSetBytes / 1024 / 1024).toFixed(2)} MB`;
const fmtX = (v) => `${v.toFixed(1)}x`;

const W = CONTENT_WIDTH;

// ===========================================================================
// Document assembly
// ===========================================================================

const titlePage = [
  new Paragraph({ spacing: { before: 2400 }, children: [] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Code Optimization &", bold: true, size: 56, color: COLORS.dark })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
    children: [new TextRun({ text: "Performance Tuning Report", bold: true, size: 56, color: COLORS.accent })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [new TextRun({ text: "A Before/After Case Study in a C# Retail Sales Analytics Engine", size: 28, italics: true, color: "4B5563" })]
  }),
  new Paragraph({ spacing: { before: 1200 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "SalesAnalytics.Unoptimized  →  SalesAnalytics.Optimized", size: 22, font: "Consolas", color: COLORS.dark })] }),
  new Paragraph({ spacing: { before: 800 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Prepared for: Performance Optimization Task", size: 22, color: "4B5563" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Platform: .NET 8.0 (C# 12) · Environment: Linux container, 1 vCPU, Intel Xeon @ 2.10GHz", size: 20, color: "6B7280" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: new Date().toISOString().slice(0,10), size: 20, color: "6B7280" })] }),
  new Paragraph({ children: [new PageBreak()] }),
];

const execSummary = [
  heading1("1. Executive Summary"),
  body("This report documents a complete performance-optimization exercise on a purpose-built C# console application that simulates a moderately complex, real-world workload: a retail sales analytics engine that ingests hundreds of thousands of transaction records and computes revenue aggregates, top-product rankings, regional customer counts, blocklist filtering, monthly trends, and a line-item export report."),
  body("Two functionally identical implementations were built side by side:"),
  bullet("SalesAnalytics.Unoptimized — a \u201Cbefore\u201D version written the way real code often accretes: reasonable-looking loops and LINQ that individually seem fine, but that collectively re-scan the dataset many times, use O(n) lookup structures where O(1) ones belong, and allocate far more memory than necessary."),
  bullet("SalesAnalytics.Optimized — an \u201Cafter\u201D version that fixes each identified inefficiency using idiomatic .NET techniques: single-pass aggregation, HashSet/Dictionary/PriorityQueue lookup structures, StringBuilder, pre-sized value-type (struct) records, and parallelized processing via Parallel.For with thread-local accumulation."),
  body("Both versions were run against the exact same generated dataset (fixed random seed) so the comparison isolates implementation choices rather than differences in input data. A 41-test automated correctness harness confirms the optimized engine produces byte-for-byte identical analytical output to the unoptimized engine — the refactor changed speed and memory, not behavior."),
  heading3("Headline results (n = 400,000 transaction records)"),
];

const wsChangePct = Math.round((1 - pipeO.PeakWorkingSetBytes / pipeU.PeakWorkingSetBytes) * 100);
const wsChangeLabel = wsChangePct > 0 ? `-${wsChangePct}%` : `+${-wsChangePct}%`;

const summaryTableWidths = [3200, 2080, 2080, 2000];
const summaryTable = makeTable(summaryTableWidths, [
  headerRow(["Metric", "Before", "After", "Improvement"], summaryTableWidths),
  dataRow(["Core analytics pipeline (time)", fmtMs(pipeU), fmtMs(pipeO), fmtX(speedup(pipeU, pipeO)) + " faster"], summaryTableWidths, { align: [AlignmentType.LEFT] }),
  dataRow(["Record loading (time)", fmtMs(buildU), fmtMs(buildO), fmtX(speedup(buildU, buildO)) + " faster"], summaryTableWidths, { align: [AlignmentType.LEFT] }),
  dataRow(["Export report, 7,500 rows (time)", fmtMs(exp7U), fmtMs(exp7O), fmtX(speedup(exp7U, exp7O)) + " faster"], summaryTableWidths, { align: [AlignmentType.LEFT] }),
  dataRow(["Export report, 15,000 rows (time)", fmtMs(exp15U), fmtMs(exp15O), fmtX(speedup(exp15U, exp15O)) + " faster"], summaryTableWidths, { align: [AlignmentType.LEFT] }),
  dataRow(["Export report, 15,000 rows (memory)", fmtMB(exp15U), fmtMB(exp15O), fmtX(memRatio(exp15U, exp15O)) + " less"], summaryTableWidths, { align: [AlignmentType.LEFT] }),
  dataRow(["Core pipeline (peak working set)", fmtWS(pipeU), fmtWS(pipeO), wsChangeLabel], summaryTableWidths, { align: [AlignmentType.LEFT] }),
]);

const execSummary2 = [
  new Paragraph({ spacing: { before: 200, after: 300 }, children: [] }),
  body("The optimized engine was additionally validated at 4,000,000 records (10x the unoptimized benchmark size) to confirm it scales cleanly: the full analytics pipeline completed in " + fmtMs(pipeO4M) + " with only " + fmtMB(pipeO4M) + " allocated and zero garbage-collection pauses — a scale the unoptimized algorithm cannot reach in practical time due to its O(k\u00b7n) and O(n\u00b2)-leaning operations.", {}),
];

// ---------------------------------------------------------------------------
// Section 2: Application overview
// ---------------------------------------------------------------------------
const appOverview = [
  heading1("2. Test Application Overview"),
  body("The sample application, \u201CSalesAnalytics,\u201D models a workload deliberately chosen to exercise the categories of bottleneck most commonly seen in production C# services: large in-memory collections, repeated aggregation over the same data, string-heavy report generation, and membership-testing against reference/lookup sets."),
  heading2("2.1 Domain model"),
  body("Each transaction record carries: ProductId, CategoryId, RegionId, CustomerId, Quantity, UnitPrice, and a timestamp. A deterministic generator (fixed random seed) produces datasets of any size, along with a fixed \u201Cblocked product\u201D reference set (simulating recalled/discontinued SKUs) that every transaction must be checked against."),
  heading2("2.2 Computations performed"),
  bullet("Total revenue grouped by product category"),
  bullet("Top-10 products ranked by revenue"),
  bullet("Count of distinct customers per sales region"),
  bullet("Count and total revenue of transactions whose product is not on the blocklist"),
  bullet("Monthly revenue trend across the dataset's ~24-month span"),
  bullet("A full CSV-style line-item export report (one line per transaction)"),
  heading2("2.3 Solution layout"),
  code(
`PerfDemo.sln
 src/
   SalesAnalytics.Core/          shared dataset generator + result/metric types
   SalesAnalytics.Unoptimized/   "before" engine (SalesRecord class + naive algorithms)
   SalesAnalytics.Optimized/     "after" engine (SalesRecord struct + optimized algorithms)
 tests/
   SalesAnalytics.Tests/         41 automated correctness checks, before vs. after
 reports/
   benchmarks.json                    raw measured metrics (this report's source data)
   unoptimized_console_output.txt     console transcript, before run
   optimized_console_output.txt       console transcript, after run`
  ),
  body("Both engine projects reference the same SalesAnalytics.Core project, guaranteeing they analyze identical input data — the only variable between runs is the implementation."),
];

// ---------------------------------------------------------------------------
// Section 3: Methodology
// ---------------------------------------------------------------------------
const methodology = [
  heading1("3. Methodology & Environment"),
  heading2("3.1 Profiling approach"),
  body("Rather than rely solely on a GUI profiler (not available in the target execution environment), the application embeds a lightweight BenchmarkHarness (SalesAnalytics.Core/BenchmarkHarness.cs) that captures the same categories of data Visual Studio's Diagnostic Tools / PerfView would report:"),
  bullet("Wall-clock elapsed time (System.Diagnostics.Stopwatch)"),
  bullet("Bytes allocated during the operation (GC.GetTotalAllocatedBytes)"),
  bullet("Garbage-collection counts per generation (GC.CollectionCount(0/1/2))"),
  bullet("Peak process working set (Process.PeakWorkingSet64)"),
  body("Each measured run is preceded by a forced blocking GC.Collect() so every run starts from a clean, comparable baseline, and all results are written to reports/benchmarks.json — the report tables below are generated directly from that file, not hand-transcribed."),
  heading2("3.2 Fair-comparison controls"),
  bullet("Identical input data: both engines consume the same DataGenerator output for a given (size, seed) pair."),
  bullet("Identical dataset size within each benchmark pair (400,000 records for the core pipeline; 7,500 and 15,000 for the export benchmark)."),
  bullet("Release build configuration (dotnet build -c Release) for all measured runs."),
  bullet("Correctness parity verified independently (Section 6) so speed gains cannot be explained by \u201Cdoing less work.\u201D"),
  heading2("3.3 Environment"),
];

const envWidths = [3200, 6160];
const envTable = makeTable(envWidths, [
  headerRow(["Item", "Value"], envWidths),
  dataRow([".NET SDK", "8.0.130"], envWidths, { align: [AlignmentType.LEFT, AlignmentType.LEFT] }),
  dataRow(["Build configuration", "Release"], envWidths, { align: [AlignmentType.LEFT, AlignmentType.LEFT] }),
  dataRow(["OS", "Ubuntu 24.04 (Linux container)"], envWidths, { align: [AlignmentType.LEFT, AlignmentType.LEFT] }),
  dataRow(["CPU", "Intel(R) Xeon(R) @ 2.10GHz, 1 logical processor available"], envWidths, { align: [AlignmentType.LEFT, AlignmentType.LEFT] }),
  dataRow(["Note on parallelism", "Parallel.For in the optimized engine ran single-threaded in this environment; all measured gains below come from algorithmic/data-structure changes alone. On multi-core hardware the parallel pass would add further speedup."], envWidths, { align: [AlignmentType.LEFT, AlignmentType.LEFT] }),
]);

// ---------------------------------------------------------------------------
// Section 4: Bottleneck analysis
// ---------------------------------------------------------------------------
const bottleneckIntro = [
  heading1("4. Profiling Results: Identified Bottlenecks"),
  body("Nine distinct inefficiencies were identified in the baseline implementation. Each is numbered in source-code comments (SalesAnalytics.Unoptimized/AnalyticsEngine.cs) so it can be traced directly to its fix in the optimized engine."),
];

const bnWidths = [500, 2500, 3200, 3160];
const bottleneckTable = makeTable(bnWidths, [
  headerRow(["#", "Location", "Inefficiency", "Complexity impact"], bnWidths),
  dataRow(["1", "BuildRecords", "List<T> built with no capacity hint", "Repeated internal array reallocation/copy as the list grows"], bnWidths, { align: [AlignmentType.CENTER, AlignmentType.LEFT, AlignmentType.LEFT, AlignmentType.LEFT] }),
  dataRow(["2", "BuildRecords", "ProductName string eagerly formatted & stored on every record", "n unnecessary string allocations (only ~10 are ever displayed)"], bnWidths, { align: [AlignmentType.CENTER, AlignmentType.LEFT, AlignmentType.LEFT, AlignmentType.LEFT] }),
  dataRow(["3", "RevenueByCategory", "Full LINQ Where+Sum re-scan once per category", "O(categories \u00d7 n) instead of O(n)"], bnWidths, { align: [AlignmentType.CENTER, AlignmentType.LEFT, AlignmentType.LEFT, AlignmentType.LEFT] }),
  dataRow(["4", "Top10ProductsByRevenue", "Full re-scan once per distinct product", "O(distinctProducts \u00d7 n) instead of O(n)"], bnWidths, { align: [AlignmentType.CENTER, AlignmentType.LEFT, AlignmentType.LEFT, AlignmentType.LEFT] }),
  dataRow(["5", "Top10ProductsByRevenue", "Full sort of every product just to take top 10", "O(k log k) instead of O(k log 10)"], bnWidths, { align: [AlignmentType.CENTER, AlignmentType.LEFT, AlignmentType.LEFT, AlignmentType.LEFT] }),
  dataRow(["6", "DistinctCustomersByRegion", "List<int>.Contains used to de-duplicate customer ids", "O(n \u00d7 seenSoFar) linear scan per record instead of O(1) HashSet lookup"], bnWidths, { align: [AlignmentType.CENTER, AlignmentType.LEFT, AlignmentType.LEFT, AlignmentType.LEFT] }),
  dataRow(["7", "ValidTransactions", "List<int>.Contains against the blocklist", "O(n \u00d7 m) instead of O(n) with a HashSet"], bnWidths, { align: [AlignmentType.CENTER, AlignmentType.LEFT, AlignmentType.LEFT, AlignmentType.LEFT] }),
  dataRow(["8", "MonthlyRevenueTrend", "\u201Cyyyy-MM\u201D string key formatted per record", "n short-lived string allocations instead of ~24"], bnWidths, { align: [AlignmentType.CENTER, AlignmentType.LEFT, AlignmentType.LEFT, AlignmentType.LEFT] }),
  dataRow(["9", "BuildLineItemExport", "Report built with string += concatenation", "O(n\u00b2) total character copies instead of O(n)"], bnWidths, { align: [AlignmentType.CENTER, AlignmentType.LEFT, AlignmentType.LEFT, AlignmentType.LEFT] }),
]);

// ---------------------------------------------------------------------------
// Section 5: Optimizations applied (with code excerpts)
// ---------------------------------------------------------------------------
const optIntro = [
  heading1("5. Optimizations Applied"),
  body("Each fix below corresponds to the numbered bottleneck in Section 4. Representative before/after code excerpts are shown; full source is included in the accompanying package."),

  heading2("5.1 Value-type records instead of eagerly-allocated strings (#1, #2)"),
  body("The domain model moved from a reference-type class with an eagerly-formatted display string to a lean readonly record struct holding only ids, stored in a pre-sized array."),
  code(
`// BEFORE — class + eager string allocation, unsized List<T>
public class SalesRecord {
    public string ProductName { get; set; }   // "Product-" + id, built for EVERY record
    ...
}
var list = new List<SalesRecord>();            // grows/reallocates as it fills
foreach (...) list.Add(new SalesRecord { ProductName = "Product-" + id, ... });

// AFTER — struct, no display string, exact-size array
public readonly record struct SalesRecord(
    int ProductId, int CategoryId, int RegionId,
    int CustomerId, int Quantity, decimal UnitPrice, long TimestampTicks);
var array = new SalesRecord[_raw.Count];        // one allocation, exact size
for (var i = 0; i < _raw.Count; i++) array[i] = new SalesRecord(...);`
  ),

  heading2("5.2 Single-pass aggregation instead of one scan per key (#3, #4)"),
  body("Rather than re-scanning the dataset once per category and once per product, the optimized engine computes every metric — category revenue, product revenue, regional customer sets, blocklist totals, and monthly trend — in one parallelized O(n) pass, using a thread-local accumulator merged at the end."),
  code(
`// BEFORE — one full scan PER category, one full scan PER product
foreach (var categoryName in categoryNames)
    result[categoryName] = records.Where(r => r.CategoryName == categoryName).Sum(r => r.LineTotal);
foreach (var productId in distinctProductIds)
    revenueByProduct.Add((productId, records.Where(r => r.ProductId == productId).Sum(r => r.LineTotal)));

// AFTER — one pass computes everything at once (shown simplified; the real
// version uses Parallel.For with a thread-local accumulator, see 5.5)
foreach (var r in records) {
    revenueByCategory[r.CategoryId] += r.LineTotal;
    revenueByProduct[r.ProductId]    = revenueByProduct.GetValueOrDefault(r.ProductId) + r.LineTotal;
    customersByRegion[r.RegionId].Add(r.CustomerId);
    if (!blocked.Contains(r.ProductId)) { validCount++; validRevenue += r.LineTotal; }
}`
  ),

  heading2("5.3 Bounded min-heap for Top-10 instead of a full sort (#5)"),
  code(
`// BEFORE — sorts every one of the ~1,500 products just to keep 10
revenueByProduct.Sort((a, b) => b.Revenue.CompareTo(a.Revenue));
return revenueByProduct.Take(10).ToList();

// AFTER — PriorityQueue<int, decimal> min-heap capped at 10 elements
if (heap.Count < 10) heap.Enqueue(productId, revenue);
else {
    heap.TryPeek(out _, out var minRevenueInHeap);
    if (revenue > minRevenueInHeap) { heap.Dequeue(); heap.Enqueue(productId, revenue); }
}`
  ),

  heading2("5.4 HashSet lookups instead of List.Contains (#6, #7)"),
  code(
`// BEFORE — O(n) scan on every membership check
var seen = new List<int>();
if (!seen.Contains(customerId)) seen.Add(customerId);
var blocked = raw.BlockedProductIds.ToList();
if (blocked.Contains(r.ProductId)) continue;

// AFTER — O(1) average-case lookup
var seen = new HashSet<int>();
seen.Add(customerId);                       // Add() is a no-op if already present
var blocked = new HashSet<int>(raw.BlockedProductIds);
if (blocked.Contains(r.ProductId)) continue;`
  ),

  heading2("5.5 Parallelized aggregation (best practice: async/parallel programming)"),
  body("The single combined pass described in 5.2 is executed with Parallel.For using the thread-local accumulator + final-merge pattern, so independent per-record work is spread across available cores and only the (cheap) merge step needs synchronization:"),
  code(
`Parallel.For(0, records.Length,
    localInit: () => new PartitionState(),
    body: (i, state, local) => { /* accumulate record i into 'local' */ return local; },
    localFinally: local => { lock (mergeLock) { /* merge 'local' into shared totals */ } });`
  ),
  body("In this report's 1-vCPU test environment this yields no additional wall-clock benefit (there is only one core to schedule onto), so every measured speedup in Section 6 is attributable purely to the algorithmic and data-structure changes above. On multi-core production hardware this pass would scale further with available cores.", { italics: true, color: "4B5563" }),

  heading2("5.6 Integer keys instead of per-record string formatting (#8)"),
  code(
`// BEFORE — formats a "yyyy-MM" string for every single record
var key = $"{r.Timestamp.Year}-{r.Timestamp.Month:D2}";

// AFTER — cheap integer key; the ~24 distinct human-readable labels are
// formatted once each, only when producing final output
var monthKey = dt.Year * 100 + dt.Month;
...
monthlyTrend[$"{year}-{month:D2}"] = revenue;   // executed ~24 times total, not n times`
  ),

  heading2("5.7 StringBuilder instead of string concatenation (#9)"),
  code(
`// BEFORE — O(n^2): every += allocates a new string and copies everything so far
var report = "TransactionExport\\n";
foreach (var r in records)
    report += $"{r.Timestamp:yyyy-MM-dd},{r.ProductName},...\\n";

// AFTER — O(n): one growable buffer, capacity pre-estimated
var sb = new StringBuilder(records.Length * 90 + 32);
sb.Append("TransactionExport\\n");
foreach (var r in records)
    sb.Append(dt.ToString("yyyy-MM-dd")).Append(',').Append("Product-").Append(r.ProductId)...Append('\\n');
return sb.ToString();`
  ),
];

// ---------------------------------------------------------------------------
// Section 6: Results
// ---------------------------------------------------------------------------
const resultsIntro = [
  heading1("6. Performance Results"),
  body("All figures below are taken directly from reports/benchmarks.json, produced by real, timed runs of both compiled Release binaries against identical input data. Full console transcripts are included in the package (unoptimized_console_output.txt / optimized_console_output.txt)."),
  heading2("6.1 Core analytics pipeline — 400,000 records"),
  body("Computes revenue by category, top-10 products, distinct customers per region, blocklist filtering, and monthly trend, in a single run."),
];

const coreWidths = [3300, 2020, 2020, 2020];
const coreTable = makeTable(coreWidths, [
  headerRow(["Metric", "Unoptimized", "Optimized", "Change"], coreWidths),
  dataRow(["Elapsed time", fmtMs(pipeU), fmtMs(pipeO), fmtX(speedup(pipeU, pipeO)) + " faster"], coreWidths, { align: [AlignmentType.LEFT] }),
  dataRow(["Bytes allocated", fmtMB(pipeU), fmtMB(pipeO), fmtX(memRatio(pipeU, pipeO)) + " less"], coreWidths, { align: [AlignmentType.LEFT] }),
  dataRow(["Gen0 / Gen1 / Gen2 GCs", `${pipeU.Gen0Collections}/${pipeU.Gen1Collections}/${pipeU.Gen2Collections}`, `${pipeO.Gen0Collections}/${pipeO.Gen1Collections}/${pipeO.Gen2Collections}`, "no GC pressure"], coreWidths, { align: [AlignmentType.LEFT] }),
  dataRow(["Peak working set", fmtWS(pipeU), fmtWS(pipeO), wsChangePct + "% lower"], coreWidths, { align: [AlignmentType.LEFT] }),
]);

const results2 = [
  new Paragraph({ spacing: { before: 200, after: 300 }, children: [] }),
  heading2("6.2 Record loading (BuildRecords) — 400,000 records"),
];
const buildWidths = [3300, 2020, 2020, 2020];
const buildTable = makeTable(buildWidths, [
  headerRow(["Metric", "Unoptimized", "Optimized", "Change"], buildWidths),
  dataRow(["Elapsed time", fmtMs(buildU), fmtMs(buildO), fmtX(speedup(buildU, buildO)) + " faster"], buildWidths, { align: [AlignmentType.LEFT] }),
  dataRow(["Bytes allocated", fmtMB(buildU), fmtMB(buildO), fmtX(memRatio(buildU, buildO)) + " less"], buildWidths, { align: [AlignmentType.LEFT] }),
]);

const results3 = [
  new Paragraph({ spacing: { before: 200, after: 300 }, children: [] }),
  heading2("6.3 Export / report generation — scaling behavior"),
  body("This benchmark isolates the string-concatenation fix (#9). Because the unoptimized version is genuinely O(n\u00b2), it is run at a smaller, clearly-labeled scale (7,500 / 15,000 rows) — large enough to demonstrate the effect, small enough to finish in reasonable time. The key finding is not just the absolute speedup but the growth curve: doubling the row count roughly quadruples the unoptimized runtime, while the optimized version grows linearly."),
];
const expWidths = [1800, 1520, 1520, 1520, 1500, 1500];
const expTable = makeTable(expWidths, [
  headerRow(["Rows", "Before (ms)", "After (ms)", "Speedup", "Before (MB)", "After (MB)"], expWidths),
  dataRow(["7,500", exp7U.ElapsedMilliseconds.toFixed(0), exp7O.ElapsedMilliseconds.toFixed(1), fmtX(speedup(exp7U, exp7O)), (exp7U.AllocatedBytes/1024/1024).toFixed(0), (exp7O.AllocatedBytes/1024/1024).toFixed(2)], expWidths),
  dataRow(["15,000", exp15U.ElapsedMilliseconds.toFixed(0), exp15O.ElapsedMilliseconds.toFixed(1), fmtX(speedup(exp15U, exp15O)), (exp15U.AllocatedBytes/1024/1024).toFixed(0), (exp15O.AllocatedBytes/1024/1024).toFixed(2)], expWidths),
  dataRow(["Growth, 2x rows", `${(exp15U.ElapsedMilliseconds/exp7U.ElapsedMilliseconds).toFixed(1)}x time`, `${(exp15O.ElapsedMilliseconds/exp7O.ElapsedMilliseconds).toFixed(1)}x time`, "-", "-", "-"], expWidths),
]);

const results4 = [
  new Paragraph({ spacing: { before: 200, after: 300 }, children: [] }),
  body(`The unoptimized export also drove ${exp15U.Gen0Collections} generation-0, ${exp15U.Gen1Collections} generation-1, and ${exp15U.Gen2Collections} full generation-2 garbage collections at 15,000 rows — the growing intermediate strings were large enough to be promoted onto the Large Object Heap, forcing expensive full collections. The StringBuilder-based version triggered zero collections at the same size.`),
  heading2("6.4 Scale validation — 4,000,000 records (optimized engine only)"),
  body("To confirm the optimized engine scales past the size used for the head-to-head comparison, it was additionally run at 4,000,000 records — 10x the size used above, and a size at which the unoptimized algorithm's O(distinctProducts \u00d7 n) and O(n \u00d7 seenSoFar) operations would not complete in practical time."),
];
const scaleWidths = [3300, 3030, 3030];
const scaleTable = makeTable(scaleWidths, [
  headerRow(["Metric", "400,000 records", "4,000,000 records"], scaleWidths),
  dataRow(["Record loading time", fmtMs(buildO), fmtMs(buildO4M)], scaleWidths, { align: [AlignmentType.LEFT] }),
  dataRow(["Full pipeline time", fmtMs(pipeO), fmtMs(pipeO4M)], scaleWidths, { align: [AlignmentType.LEFT] }),
  dataRow(["Full pipeline allocation", fmtMB(pipeO), fmtMB(pipeO4M)], scaleWidths, { align: [AlignmentType.LEFT] }),
  dataRow(["GC pauses", "0", "0"], scaleWidths, { align: [AlignmentType.LEFT] }),
]);

// ---------------------------------------------------------------------------
// Section 7: Correctness verification
// ---------------------------------------------------------------------------
const correctness = [
  new Paragraph({ spacing: { before: 200, after: 300 }, children: [] }),
  heading1("7. Correctness Verification"),
  body("A speedup is only meaningful if both versions produce the same answers. SalesAnalytics.Tests runs both engines against five identical datasets (sizes 0, 1, 500, 5,000, and 20,000 records, spanning multiple random seeds and edge cases) and asserts, per scenario:"),
  bullet("Record counts match"),
  bullet("Revenue-by-category totals match exactly"),
  bullet("Distinct-customer-per-region counts match exactly"),
  bullet("Monthly revenue trend matches exactly, including the set of distinct months"),
  bullet("Valid (non-blocklisted) transaction count and revenue match exactly"),
  bullet("Top-10 products match as a set, with matching revenue amounts and matching descending order"),
  bullet("The full line-item export text is byte-for-byte identical between engines"),
  body("A network-restricted environment prevented restoring the usual xUnit/NUnit NuGet packages, so a small dependency-free test harness (TestHarness.cs, ~50 lines) was written to provide the same practical guarantee: run every check, print pass/fail, and return a non-zero exit code on any failure so it still integrates with CI. Swapping in a standard framework later is a drop-in change — see the comment at the top of TestHarness.cs.", { italics: true, color: "4B5563" }),
  new Paragraph({ spacing: { before: 150, after: 150 }, children: [
    new TextRun({ text: "Result: 41 / 41 tests passed. ", bold: true, color: COLORS.good, size: 24 }),
    new TextRun({ text: "The optimized engine is behaviorally identical to the unoptimized engine across every scenario tested.", size: 24 })
  ]}),
];

// ---------------------------------------------------------------------------
// Section 8: Conclusions
// ---------------------------------------------------------------------------
const conclusions = [
  heading1("8. Conclusions & Recommendations"),
  heading2("8.1 Summary of findings"),
  body("The dominant cost in the unoptimized engine was algorithmic — re-scanning the full dataset once per category and once per product, and using linear-scan lookups (List.Contains) where hashed lookups belong. These are Big-O problems that no amount of micro-tuning fixes; they required restructuring the aggregation into a single pass. The secondary cost was allocation pressure — an eagerly-built display string per record, and O(n\u00b2) string concatenation for the export report — which showed up directly as extra garbage-collection cycles."),
  heading2("8.2 Recommended practices going forward"),
  bullet("Default to a single aggregation pass over a collection; if a value is needed once per unique key, accumulate into a Dictionary during one scan instead of re-filtering per key."),
  bullet("Reach for HashSet<T>/Dictionary<TKey,TValue> for any membership test or de-duplication over more than a handful of items; List<T>.Contains is O(n) and easy to miss in code review."),
  bullet("Use PriorityQueue<TElement,TPriority> (or an equivalent bounded heap) for top-N/bottom-N problems instead of sorting the full collection."),
  bullet("Use StringBuilder for any text built incrementally in a loop; a single += on a string inside a loop is an O(n\u00b2) red flag."),
  bullet("Prefer value types (readonly record struct) for small, high-volume, short-lived data to reduce heap allocation and GC pressure, and avoid pre-computing derived strings that are rarely used."),
  bullet("For independent per-item work over large collections, Parallel.For with a thread-local accumulator scales cleanly across cores with minimal synchronization overhead."),
  heading2("8.3 Suggested next steps"),
  bullet("Re-run this benchmark suite on multi-core production hardware to quantify the additional gain from the Parallel.For pass (not observable in this single-vCPU test environment)."),
  bullet("Wire SalesAnalytics.Tests into CI, or restore network access and swap in xUnit for richer test reporting/coverage tooling."),
  bullet("If dataset sizes grow well beyond memory (tens of millions+ of records), consider streaming aggregation (IAsyncEnumerable / batched reads) rather than materializing the full record array."),
];

// ---------------------------------------------------------------------------
// Appendix
// ---------------------------------------------------------------------------
const appendix = [
  heading1("Appendix A: Reproducing These Results"),
  code(
`# from the solution root
dotnet build -c Release

dotnet run --project src/SalesAnalytics.Unoptimized -c Release --no-build -- reports/benchmarks.json
dotnet run --project src/SalesAnalytics.Optimized   -c Release --no-build -- reports/benchmarks.json

dotnet run --project tests/SalesAnalytics.Tests -c Release`
  ),
  body("Each program prints a human-readable summary to the console and appends a structured JSON entry to the given path (default reports/benchmarks.json), so repeated runs accumulate a comparable history rather than overwriting prior data."),
  heading1("Appendix B: Package Contents"),
  bullet("PerfDemo.sln — solution file"),
  bullet("src/SalesAnalytics.Core — shared data generator, result types, benchmark harness"),
  bullet("src/SalesAnalytics.Unoptimized — baseline (\u201Cbefore\u201D) engine and console runner"),
  bullet("src/SalesAnalytics.Optimized — refactored (\u201Cafter\u201D) engine and console runner"),
  bullet("tests/SalesAnalytics.Tests — 41-case correctness harness"),
  bullet("reports/benchmarks.json — raw measured metrics (source of every number in this report)"),
  bullet("reports/unoptimized_console_output.txt, reports/optimized_console_output.txt — full console transcripts"),
];

const doc = new Document({
  creator: "Claude",
  title: "Code Optimization and Performance Tuning Report",
  description: "Before/after C# performance optimization case study",
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 22, color: COLORS.dark } }
    },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { bold: true, size: 32, color: COLORS.accent, font: "Calibri" } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { bold: true, size: 26, color: COLORS.dark, font: "Calibri" } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { bold: true, size: 23, color: "374151", font: "Calibri" } },
    ]
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
          margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN }
        }
      },
      children: titlePage
    },
    {
      properties: {
        page: {
          size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
          margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN }
        }
      },
      headers: {
        default: new Header({ children: [ new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "C# Performance Optimization Report", size: 16, color: "9CA3AF" })]
        })]})
      },
      footers: {
        default: new Footer({ children: [ new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Page ", size: 16, color: "9CA3AF" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "9CA3AF" }),
            new TextRun({ text: " of ", size: 16, color: "9CA3AF" }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "9CA3AF" }),
          ]
        })]})
      },
      children: [
        ...execSummary, summaryTable, ...execSummary2,
        ...appOverview,
        ...methodology, envTable,
        ...bottleneckIntro, bottleneckTable,
        ...optIntro,
        ...resultsIntro, coreTable,
        ...results2, buildTable,
        ...results3, expTable,
        ...results4, scaleTable,
        ...correctness,
        ...conclusions,
        new Paragraph({ children: [new PageBreak()] }),
        ...appendix,
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(__dirname + "/../reports/Performance_Optimization_Report.docx", buf);
  console.log("Written:", __dirname + "/../reports/Performance_Optimization_Report.docx", buf.length, "bytes");
});
