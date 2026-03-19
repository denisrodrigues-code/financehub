using FinanceHub.Integrations.OpenFinance;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace FinanceHub.Integrations;

public static class DependencyInjection
{
    public static IServiceCollection AddIntegrations(this IServiceCollection services, IConfiguration configuration)
    {
        var baseAddress = configuration["OpenFinance:BaseUrl"] ?? "https://api.openfinance.local";
        services.AddHttpClient<OpenFinanceClient>(client => client.BaseAddress = new Uri(baseAddress));
        return services;
    }
}
