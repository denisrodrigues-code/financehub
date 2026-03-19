using FinanceHub.Worker;
using FinanceHub.Infrastructure;
using FinanceHub.Integrations;
using Microsoft.Extensions.DependencyInjection;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddIntegrations(builder.Configuration);

builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource.AddService("FinanceHub.Worker"))
    .WithTracing(tracing => tracing
        .AddHttpClientInstrumentation()
        .AddConsoleExporter());

builder.Services.AddHostedService<Worker>();

var host = builder.Build();
host.Run();
