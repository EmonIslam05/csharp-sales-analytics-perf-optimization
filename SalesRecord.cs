namespace SalesAnalytics.Unoptimized;

/// <summary>
/// Reference-type transaction model. Note <see cref="ProductName"/> is
/// eagerly computed and stored on every single instance, even though the
/// vast majority of records never have their product name displayed. At
/// 1,000,000+ records this is 1,000,000+ extra string allocations that exist
/// purely "just in case".
/// </summary>
public class SalesRecord
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int RegionId { get; set; }
    public string RegionName { get; set; } = string.Empty;
    public int CustomerId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public DateTime Timestamp { get; set; }

    public decimal LineTotal => Quantity * UnitPrice;
}
