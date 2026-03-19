using FinanceHub.Application.Interfaces;
using FinanceHub.Infrastructure.Options;
using FinanceHub.Infrastructure.Persistence;
using FinanceHub.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace FinanceHub.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));

        var connectionString = configuration.GetConnectionString("Postgres")
            ?? "Host=localhost;Port=5432;Database=financehub;Username=postgres;Password=postgres";

        services.AddDbContext<FinanceHubDbContext>(options =>
            options.UseNpgsql(connectionString));

        var redisConnection = configuration.GetConnectionString("Redis") ?? "localhost:6379";
        services.AddStackExchangeRedisCache(options => options.Configuration = redisConnection);

        services.AddScoped<IJwtTokenService, JwtTokenService>();

        return services;
    }
}
