namespace FinanceHub.Worker;

public class Worker(ILogger<Worker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("FinanceHub Worker iniciado");

        var jobs = new[]
        {
            "SyncAccountsJob",
            "SyncTransactionsJob",
            "CategorizeTransactionsJob",
            "BudgetAlertJob",
            "ConsentExpirationJob"
        };

        while (!stoppingToken.IsCancellationRequested)
        {
            var selectedJob = jobs[Random.Shared.Next(jobs.Length)];
            logger.LogInformation("Executando {job} em {time}", selectedJob, DateTimeOffset.UtcNow);
            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        }
    }
}
