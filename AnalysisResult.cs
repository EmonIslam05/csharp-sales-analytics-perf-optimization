namespace SalesAnalytics.Core;

/// <summary>
/// Engine-agnostic snapshot of analysis output. Both the unoptimized and
/// optimized engines produce one of these so tests can assert the refactor
/// did not change *what* is computed - only *how fast* it's computed.
/// </summary>
public sealed class AnalysisResult
{
    public required Dictionary<string, decimal> RevenueByCategory { get; init; }
    public required List<(int ProductId, decimal Revenue)> Top10ProductsByRevenue { get; init; }
    public required Dictionary<string, int> DistinctCustomersByRegion { get; init; }
    public required int ValidTransactionCount { get; init; }
    public required decimal ValidTransactionRevenue { get; init; }
    public required Dictionary<string, decimal> MonthlyRevenueTrend { get; init; }
}

/// <summary>
/// Timing + memory metrics captured around a benchmark run, plus the metadata
/// needed to reproduce the run. Written to JSON so the report document can be
/// generated from real measured numbers rather than transcribed by hand.
/// </summary>
public sealed class BenchmarkRun
{
    public required string Variant { get; init; } // "Unoptimized" or "Optimized"
    public required string Benchmark { get; init; } // e.g. "CoreAnalyticsPipeline"
    public required int RecordCount { get; init; }
    public required double ElapsedMilliseconds { get; init; }
    public required long AllocatedBytes { get; init; }
    public required int Gen0Collections { get; init; }
    public required int Gen1Collections { get; init; }
    public required int Gen2Collections { get; init; }
    public required long PeakWorkingSetBytes { get; init; }
}
