namespace SalesAnalytics.Tests;

/// <summary>
/// Minimal hand-rolled test runner. The sandbox this project was built in
/// has no network access to nuget.org, so the usual xUnit/NUnit/MSTest
/// packages cannot be restored. Rather than skip automated testing, this
/// harness gives the same practical guarantee (run every test, report
/// pass/fail, non-zero exit code on any failure -> CI friendly) using only
/// the .NET base class library.
///
/// To use a real framework instead, restore network access to nuget.org and
/// swap this project's contents for xUnit-style [Fact] methods; the
/// AssertionException/Assert helpers below map almost 1:1 onto
/// Assert.Equal/Assert.True.
/// </summary>
public static class TestHarness
{
    private static int _passed;
    private static int _failed;

    public static void Run(string name, Action test)
    {
        try
        {
            test();
            _passed++;
            Console.WriteLine($"  [PASS] {name}");
        }
        catch (Exception ex)
        {
            _failed++;
            Console.WriteLine($"  [FAIL] {name}");
            Console.WriteLine($"         {ex.Message}");
        }
    }

    public static int Summarize()
    {
        Console.WriteLine();
        Console.WriteLine($"Total: {_passed + _failed}, Passed: {_passed}, Failed: {_failed}");
        return _failed == 0 ? 0 : 1;
    }
}

public static class Assert
{
    public static void Equal<T>(T expected, T actual, string? context = null)
    {
        if (!EqualityComparer<T>.Default.Equals(expected, actual))
        {
            throw new Exception(
                $"{context ?? "Values"} differ. Expected: {expected}, Actual: {actual}");
        }
    }

    public static void True(bool condition, string message)
    {
        if (!condition) throw new Exception(message);
    }

    public static void DictionariesEqual<TKey, TValue>(
        IDictionary<TKey, TValue> expected,
        IDictionary<TKey, TValue> actual,
        string context) where TKey : notnull
    {
        Equal(expected.Count, actual.Count, $"{context}: dictionary size");
        foreach (var (key, value) in expected)
        {
            True(actual.TryGetValue(key, out var actualValue),
                $"{context}: missing key '{key}' in actual result");
            Equal(value, actual[key], $"{context}[{key}]");
        }
    }
}
