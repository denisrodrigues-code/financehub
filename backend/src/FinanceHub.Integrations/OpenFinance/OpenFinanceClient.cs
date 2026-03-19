namespace FinanceHub.Integrations.OpenFinance;

public class OpenFinanceClient(HttpClient httpClient)
{
    public async Task<string> HealthCheckAsync(CancellationToken cancellationToken = default)
    {
        await Task.Delay(50, cancellationToken);
        return $"Open Finance integration ready ({httpClient.BaseAddress})";
    }
}
