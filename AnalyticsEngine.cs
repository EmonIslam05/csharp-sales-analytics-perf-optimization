using SalesAnalytics.Core;

namespace SalesAnalytics.Unoptimized;

/// <summary>
/// "BEFORE" implementation. Functionally correct, but written the way a lot
/// of real-world code accretes over time: reasonable-looking LINQ/loops that
/// individually seem fine, but that each re-scan the dataset, use O(n) lookup
/// structures where O(1) ones belong, and allocate far more than necessary.
///
/// Each inefficiency below is deliberate and called out in a comment, and
/// matches an entry in PERFORMANCE_REPORT.md.
/// </summary>
public class AnalyticsEngine
{
    private readonly RawDataset _raw;

    public AnalyticsEngine(RawDataset raw) => _raw = raw;

    /// <summary>
    /// INEFFICIENCY #1: List&lt;T&gt; built with no capacity hint, forcing the
    /// list to repeatedly reallocate and copy its backing array as it grows
    /// (O(log n) reallocations each copying up to n elements).
    /// INEFFICIENCY #2: eagerly formats and stores a ProductName string on
    /// every record even though it is only ever read for ~10 of them later
    /// (see Top10ProductsByRevenue) - wasted allocation + GC pressure.
    /// </summary>
    public List<SalesRecord> BuildRecords()
    {
        var list = new List<SalesRecord>(); // no capacity reserved

        for (var i = 0; i < _raw.Count; i++)
        {
            var record = new SalesRecord
            {
                ProductId = _raw.ProductId[i],
                ProductName = "Product-" + _raw.ProductId[i], // allocated for EVERY record
                CategoryId = _raw.CategoryId[i],
                CategoryName = _raw.CategoryNames[_raw.CategoryId[i]],
                RegionId = _raw.RegionId[i],
                RegionName = _raw.RegionNames[_raw.RegionId[i]],
                CustomerId = _raw.CustomerId[i],
                Quantity = _raw.Quantity[i],
                UnitPrice = _raw.UnitPrice[i],
                Timestamp = new DateTime(_raw.TimestampTicks[i])
            };
            list.Add(record);
        }

        return list;
    }

    /// <summary>
    /// INEFFICIENCY #3: re-scans the *entire* record list once per category
    /// using LINQ Where+Sum, i.e. O(categories * n) instead of a single O(n)
    /// pass. Also compares on a string (CategoryName) instead of the int id.
    /// </summary>
    public Dictionary<string, decimal> RevenueByCategory(List<SalesRecord> records)
    {
        var result = new Dictionary<string, decimal>();
        foreach (var categoryName in _raw.CategoryNames)
        {
            var total = records
                .Where(r => r.CategoryName == categoryName)
                .Sum(r => r.LineTotal);
            result[categoryName] = total;
        }
        return result;
    }

    /// <summary>
    /// INEFFICIENCY #4: for every distinct product, re-scans the entire
    /// record list to sum its revenue -> O(distinctProducts * n).
    /// INEFFICIENCY #5: sorts the *entire* per-product revenue list
    /// (O(k log k)) just to take the top 10, instead of using a bounded
    /// structure that only tracks the top 10 as it goes.
    /// </summary>
    public List<(int ProductId, decimal Revenue)> Top10ProductsByRevenue(List<SalesRecord> records)
    {
        var distinctProductIds = records.Select(r => r.ProductId).Distinct().ToList();

        var revenueByProduct = new List<(int ProductId, decimal Revenue)>();
        foreach (var productId in distinctProductIds)
        {
            var total = records
                .Where(r => r.ProductId == productId)
                .Sum(r => r.LineTotal);
            revenueByProduct.Add((productId, total));
        }

        revenueByProduct.Sort((a, b) => b.Revenue.CompareTo(a.Revenue)); // full sort of everything
        return revenueByProduct.Take(10).ToList();
    }

    /// <summary>
    /// INEFFICIENCY #6: dedupes customers per region with `List&lt;int&gt;.Contains`
    /// inside a loop - an O(n) linear scan for every single record checked,
    /// i.e. O(n * distinctCustomersSoFar) instead of an O(1)-lookup HashSet.
    /// </summary>
    public Dictionary<string, int> DistinctCustomersByRegion(List<SalesRecord> records)
    {
        var result = new Dictionary<string, int>();

        foreach (var regionName in _raw.RegionNames)
        {
            var seen = new List<int>(); // should be a HashSet<int>
            foreach (var r in records)
            {
                if (r.RegionName != regionName) continue;
                if (!seen.Contains(r.CustomerId)) // O(n) scan every time
                {
                    seen.Add(r.CustomerId);
                }
            }
            result[regionName] = seen.Count;
        }

        return result;
    }

    /// <summary>
    /// INEFFICIENCY #7: blocklist membership tested with `List&lt;int&gt;.Contains`
    /// (O(m) per record) instead of a HashSet&lt;int&gt; (O(1) per record).
    /// </summary>
    public (int Count, decimal Revenue) ValidTransactions(List<SalesRecord> records)
    {
        var blocked = _raw.BlockedProductIds.ToList(); // List, not HashSet

        var count = 0;
        var revenue = 0m;
        foreach (var r in records)
        {
            if (blocked.Contains(r.ProductId)) continue; // O(m) every record
            count++;
            revenue += r.LineTotal;
        }

        return (count, revenue);
    }

    /// <summary>
    /// INEFFICIENCY #8: formats a "yyyy-MM" string key for every single
    /// record (300k+ short-lived string allocations) instead of grouping by
    /// a cheap struct/int key and formatting only the ~24 distinct month
    /// labels that actually get displayed.
    /// </summary>
    public Dictionary<string, decimal> MonthlyRevenueTrend(List<SalesRecord> records)
    {
        var result = new Dictionary<string, decimal>();
        foreach (var r in records)
        {
            var key = $"{r.Timestamp.Year}-{r.Timestamp.Month:D2}"; // allocates every record
            if (!result.TryGetValue(key, out var existing))
            {
                result[key] = r.LineTotal;
            }
            else
            {
                result[key] = existing + r.LineTotal;
            }
        }
        return result;
    }

    /// <summary>
    /// INEFFICIENCY #9: builds a large report string with repeated `+=`
    /// concatenation. Each `+=` allocates an entirely new string and copies
    /// everything accumulated so far, making this O(n^2) in the number of
    /// lines rather than O(n).
    /// </summary>
    public string BuildLineItemExport(List<SalesRecord> records)
    {
        var report = "TransactionExport\n";
        foreach (var r in records)
        {
            report += $"{r.Timestamp:yyyy-MM-dd},{r.ProductName},{r.CategoryName},{r.RegionName}," +
                      $"{r.CustomerId},{r.Quantity},{r.UnitPrice:F2},{r.LineTotal:F2}\n";
        }
        return report;
    }

    public AnalysisResult RunFullPipeline(List<SalesRecord> records)
    {
        var revenueByCategory = RevenueByCategory(records);
        var top10 = Top10ProductsByRevenue(records);
        var distinctCustomers = DistinctCustomersByRegion(records);
        var (validCount, validRevenue) = ValidTransactions(records);
        var monthlyTrend = MonthlyRevenueTrend(records);

        return new AnalysisResult
        {
            RevenueByCategory = revenueByCategory,
            Top10ProductsByRevenue = top10,
            DistinctCustomersByRegion = distinctCustomers,
            ValidTransactionCount = validCount,
            ValidTransactionRevenue = validRevenue,
            MonthlyRevenueTrend = monthlyTrend
        };
    }
}
