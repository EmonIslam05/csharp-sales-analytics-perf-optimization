namespace SalesAnalytics.Core;

/// <summary>
/// Generates deterministic, reproducible sample "sales transaction" data.
/// Using a fixed seed means the Unoptimized and Optimized programs always
/// analyze the identical dataset, which makes the before/after comparison
/// fair (same input, same output values, different implementation).
/// </summary>
public static class DataGenerator
{
    public const int CategoryCount = 12;
    public const int RegionCount = 6;
    public const int ProductCount = 1500;
    public const int CustomerCount = 8000;
    public const int BlockedProductCount = 300;

    public static readonly string[] CategoryNames =
    {
        "Electronics", "Home & Kitchen", "Apparel", "Sporting Goods", "Toys",
        "Books", "Beauty", "Automotive", "Garden", "Office Supplies",
        "Pet Supplies", "Groceries"
    };

    public static readonly string[] RegionNames =
    {
        "North America", "South America", "Europe", "Middle East & Africa",
        "Asia Pacific", "Oceania"
    };

    public static RawDataset Generate(int count, int seed = 42)
    {
        var rng = new Random(seed);

        var productId = new int[count];
        var categoryId = new int[count];
        var regionId = new int[count];
        var customerId = new int[count];
        var quantity = new int[count];
        var unitPrice = new decimal[count];
        var timestampTicks = new long[count];

        var start = new DateTime(2024, 1, 1).Ticks;
        var span = TimeSpan.FromDays(730).Ticks; // ~2 years of activity

        for (var i = 0; i < count; i++)
        {
            productId[i] = rng.Next(0, ProductCount);
            // Correlate category with product id (deterministic mapping) so
            // "revenue by category" and "revenue by product" stay consistent.
            categoryId[i] = productId[i] % CategoryCount;
            regionId[i] = rng.Next(0, RegionCount);
            customerId[i] = rng.Next(0, CustomerCount);
            quantity[i] = rng.Next(1, 21);
            unitPrice[i] = Math.Round((decimal)(rng.NextDouble() * 495.0 + 5.0), 2);
            timestampTicks[i] = start + (long)(rng.NextDouble() * span);
        }

        // A fixed set of "blocked" (e.g. recalled / discontinued) product ids
        // that every transaction must be checked against.
        var blocked = new HashSet<int>();
        while (blocked.Count < BlockedProductCount)
        {
            blocked.Add(rng.Next(0, ProductCount));
        }

        return new RawDataset
        {
            Count = count,
            ProductId = productId,
            CategoryId = categoryId,
            RegionId = regionId,
            CustomerId = customerId,
            Quantity = quantity,
            UnitPrice = unitPrice,
            TimestampTicks = timestampTicks,
            CategoryNames = CategoryNames,
            RegionNames = RegionNames,
            BlockedProductIds = blocked.ToArray()
        };
    }
}
