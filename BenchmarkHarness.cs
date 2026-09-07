using System.Diagnostics;
using System.Text.Json;

namespace SalesAnalytics.Core;

public static class BenchmarkHarness
{
    /// <summary>
    /// Runs <paramref name="action"/> once, isolated by a forced blocking GC
    /// before and after, and captures wall-clock time, allocated bytes
    /// (GC.GetAllocatedBytesForCurrentThread as a proxy for the whole run,
    /// since these programs are effectively single-logical-workload processes
    /// run in isolation), GC collection counts per generation, and the
    /// process's peak working set.
    /// </summary>
    public static BenchmarkRun Measure(string variant, string benchmark, int recordCount, Action action)
    {
        // Get the process into a clean, comparable state before measuring.
        GC.Collect();
        GC.WaitForPendingFinalizers();
        GC.Collect();

        var gen0Before = GC.CollectionCount(0);
        var gen1Before = GC.CollectionCount(1);
        var gen2Before = GC.CollectionCount(2);
        var allocBefore = GC.GetTotalAllocatedBytes(precise: true);

        var sw = Stopwatch.StartNew();
        action();
        sw.Stop();

        var allocAfter = GC.GetTotalAllocatedBytes(precise: true);
        var gen0After = GC.CollectionCount(0);
        var gen1After = GC.CollectionCount(1);
        var gen2After = GC.CollectionCount(2);

        var proc = Process.GetCurrentProcess();

        return new BenchmarkRun
        {
            Variant = variant,
            Benchmark = benchmark,
            RecordCount = recordCount,
            ElapsedMilliseconds = sw.Elapsed.TotalMilliseconds,
            AllocatedBytes = allocAfter - allocBefore,
            Gen0Collections = gen0After - gen0Before,
            Gen1Collections = gen1After - gen1Before,
            Gen2Collections = gen2After - gen2Before,
            PeakWorkingSetBytes = proc.PeakWorkingSet64
        };
    }

    public static void AppendToJsonLog(string path, BenchmarkRun run)
    {
        var dir = Path.GetDirectoryName(path);
        if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);

        List<BenchmarkRun> existing = new();
        if (File.Exists(path))
        {
            try
            {
                var json = File.ReadAllText(path);
                existing = JsonSerializer.Deserialize<List<BenchmarkRun>>(json) ?? new();
            }
            catch
            {
                existing = new();
            }
        }

        existing.Add(run);
        File.WriteAllText(path, JsonSerializer.Serialize(existing, new JsonSerializerOptions { WriteIndented = true }));
    }

    public static void PrintSummary(BenchmarkRun run)
    {
        Console.WriteLine($"[{run.Variant}] {run.Benchmark} (n={run.RecordCount:N0})");
        Console.WriteLine($"  Elapsed:        {run.ElapsedMilliseconds:N1} ms");
        Console.WriteLine($"  Allocated:      {run.AllocatedBytes / 1024.0 / 1024.0:N2} MB");
        Console.WriteLine($"  GC (gen0/1/2):  {run.Gen0Collections}/{run.Gen1Collections}/{run.Gen2Collections}");
        Console.WriteLine($"  Peak WorkingSet:{run.PeakWorkingSetBytes / 1024.0 / 1024.0:N2} MB");
        Console.WriteLine();
    }
}
