namespace SalesAnalytics.Core;

/// <summary>
/// Plain, column-oriented ("struct of arrays") representation of the generated
/// sample data. Both the unoptimized and optimized engines consume the exact
/// same underlying values (same seed) so that timing differences come from
/// algorithm/data-structure choices, not from different input data.
/// </summary>
public sealed class RawDataset
{
    public required int Count { get; init; }
    public required int[] ProductId { get; init; }
    public required int[] CategoryId { get; init; }
    public required int[] RegionId { get; init; }
    public required int[] CustomerId { get; init; }
    public required int[] Quantity { get; init; }
    public required decimal[] UnitPrice { get; init; }
    public required long[] TimestampTicks { get; init; }

    public required string[] CategoryNames { get; init; }
    public required string[] RegionNames { get; init; }
    public required int[] BlockedProductIds { get; init; }
}
