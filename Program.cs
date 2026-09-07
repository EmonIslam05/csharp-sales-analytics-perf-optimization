using SalesAnalytics.Core;
using SalesAnalytics.Tests;
using UnoptEngine = SalesAnalytics.Unoptimized.AnalyticsEngine;
using OptEngine = SalesAnalytics.Optimized.AnalyticsEngine;

Console.WriteLine("=== SalesAnalytics correctness tests ===");
Console.WriteLine("Verifying the optimized engine produces identical results to the");
Console.WriteLine("unoptimized engine on the same input data.\n");

void CompareEngines(int recordCount, int seed)
{
    var scenario = $"n={recordCount}, seed={seed}";

    var raw = DataGenerator.Generate(recordCount, seed);

    var unopt = new UnoptEngine(raw);
    var unoptRecords = unopt.BuildRecords();
    var unoptResult = unopt.RunFullPipeline(unoptRecords);
    var unoptExport = unopt.BuildLineItemExport(unoptRecords);

    var opt = new OptEngine(raw);
    var optRecords = opt.BuildRecords();
    var optResult = opt.RunFullPipeline(optRecords);
    var optExport = opt.BuildLineItemExport(optRecords);

    TestHarness.Run($"RecordCount matches [{scenario}]",
        () => Assert.Equal(unoptRecords.Count, optRecords.Length, "record count"));

    TestHarness.Run($"RevenueByCategory matches [{scenario}]",
        () => Assert.DictionariesEqual(unoptResult.RevenueByCategory, optResult.RevenueByCategory, "RevenueByCategory"));

    TestHarness.Run($"DistinctCustomersByRegion matches [{scenario}]",
        () => Assert.DictionariesEqual(unoptResult.DistinctCustomersByRegion, optResult.DistinctCustomersByRegion, "DistinctCustomersByRegion"));

    TestHarness.Run($"MonthlyRevenueTrend matches [{scenario}]",
        () => Assert.DictionariesEqual(unoptResult.MonthlyRevenueTrend, optResult.MonthlyRevenueTrend, "MonthlyRevenueTrend"));

    TestHarness.Run($"ValidTransactionCount matches [{scenario}]",
        () => Assert.Equal(unoptResult.ValidTransactionCount, optResult.ValidTransactionCount, "ValidTransactionCount"));

    TestHarness.Run($"ValidTransactionRevenue matches [{scenario}]",
        () => Assert.Equal(unoptResult.ValidTransactionRevenue, optResult.ValidTransactionRevenue, "ValidTransactionRevenue"));

    TestHarness.Run($"Top10ProductsByRevenue matches (same set + amounts) [{scenario}]", () =>
    {
        Assert.Equal(unoptResult.Top10ProductsByRevenue.Count, optResult.Top10ProductsByRevenue.Count, "Top10 count");

        var unoptSet = unoptResult.Top10ProductsByRevenue
            .ToDictionary(p => p.ProductId, p => p.Revenue);
        var optSet = optResult.Top10ProductsByRevenue
            .ToDictionary(p => p.ProductId, p => p.Revenue);

        Assert.DictionariesEqual(unoptSet, optSet, "Top10ProductsByRevenue");

        // Also check ordering (both should be sorted descending by revenue).
        for (var i = 0; i < unoptResult.Top10ProductsByRevenue.Count - 1; i++)
        {
            Assert.True(
                unoptResult.Top10ProductsByRevenue[i].Revenue >= unoptResult.Top10ProductsByRevenue[i + 1].Revenue,
                "Unoptimized Top10 not sorted descending");
            Assert.True(
                optResult.Top10ProductsByRevenue[i].Revenue >= optResult.Top10ProductsByRevenue[i + 1].Revenue,
                "Optimized Top10 not sorted descending");
        }
    });

    TestHarness.Run($"BuildLineItemExport produces identical text [{scenario}]",
        () => Assert.Equal(unoptExport, optExport, "Export text"));
}

// A range of sizes/seeds, including edge cases (empty, single record).
CompareEngines(recordCount: 0, seed: 1);
CompareEngines(recordCount: 1, seed: 1);
CompareEngines(recordCount: 500, seed: 7);
CompareEngines(recordCount: 5_000, seed: 42);
CompareEngines(recordCount: 20_000, seed: 123);

// Sanity check on the shared data generator itself: same seed -> same data.
TestHarness.Run("DataGenerator is deterministic for a fixed seed", () =>
{
    var a = DataGenerator.Generate(1_000, seed: 99);
    var b = DataGenerator.Generate(1_000, seed: 99);
    Assert.True(a.ProductId.SequenceEqual(b.ProductId), "ProductId arrays differ for same seed");
    Assert.True(a.UnitPrice.SequenceEqual(b.UnitPrice), "UnitPrice arrays differ for same seed");
    Assert.True(a.BlockedProductIds.SequenceEqual(b.BlockedProductIds), "BlockedProductIds differ for same seed");
});

return TestHarness.Summarize();
