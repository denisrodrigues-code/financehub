using System.Security.Claims;
using System.ComponentModel.DataAnnotations;
using System.Net.Http.Json;
using FinanceHub.Application;
using FinanceHub.Application.Contracts.Accounts;
using FinanceHub.Application.Contracts.Auth;
using FinanceHub.Application.Contracts.Budgets;
using FinanceHub.Application.Contracts.Categories;
using FinanceHub.Application.Contracts.Dashboard;
using FinanceHub.Application.Contracts.Transactions;
using FinanceHub.Application.Interfaces;
using FinanceHub.Application.Validation;
using FinanceHub.Domain.Entities;
using FinanceHub.Domain.Enums;
using FinanceHub.Infrastructure;
using FinanceHub.Infrastructure.Options;
using FinanceHub.Infrastructure.Persistence;
using FinanceHub.Integrations;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddIntegrations(builder.Configuration);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource.AddService("FinanceHub.Api"))
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddConsoleExporter())
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddConsoleExporter());

var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
var signingKey = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwtOptions.SecretKey));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = signingKey
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddHttpClient("banks-directory", httpClient =>
{
    httpClient.BaseAddress = new Uri("https://brasilapi.com.br");
    httpClient.Timeout = TimeSpan.FromSeconds(8);
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<FinanceHubDbContext>();
    await dbContext.Database.EnsureCreatedAsync();
    await EnsureSchemaPatchesAsync(dbContext);
    await SeedDemoDataAsync(dbContext);
}

app.UseAuthentication();
app.UseAuthorization();

var passwordHasher = new PasswordHasher<User>();

app.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }));

var api = app.MapGroup("/api");
var auth = api.MapGroup("/auth");

auth.MapPost("/register", async (
    RegisterRequest request,
    FinanceHubDbContext dbContext,
    IJwtTokenService tokenService,
    IValidator<RegisterRequest> validator,
    CancellationToken cancellationToken) =>
{
    var validation = await validator.ValidateAsync(request, cancellationToken);
    if (!validation.IsValid)
    {
        return Results.ValidationProblem(validation.ToDictionary());
    }

    var exists = await dbContext.Users.AnyAsync(x => x.Email == request.Email, cancellationToken);
    if (exists)
    {
        return Results.Conflict(new { message = "Email already registered." });
    }

    var user = new User
    {
        Name = request.Name,
        Email = request.Email.ToLowerInvariant()
    };
    user.PasswordHash = passwordHasher.HashPassword(user, request.Password);

    dbContext.Users.Add(user);
    dbContext.Categories.AddRange(
        new Category { UserId = user.Id, Name = "Moradia", Type = "Expense", Color = "#EF4444" },
        new Category { UserId = user.Id, Name = "Alimentacao", Type = "Expense", Color = "#F59E0B" },
        new Category { UserId = user.Id, Name = "Salario", Type = "Income", Color = "#22C55E" }
    );

    var token = tokenService.Generate(user);
    user.RefreshToken = token.RefreshToken;
    user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(jwtOptions.RefreshTokenDays);

    await dbContext.SaveChangesAsync(cancellationToken);

    return Results.Ok(new AuthResponse(token.AccessToken, token.RefreshToken, token.ExpiresAt));
});

auth.MapPost("/login", async (
    LoginRequest request,
    FinanceHubDbContext dbContext,
    IJwtTokenService tokenService,
    CancellationToken cancellationToken) =>
{
    var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Email == request.Email.ToLowerInvariant(), cancellationToken);
    if (user is null)
    {
        return Results.Unauthorized();
    }

    var passwordResult = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
    if (passwordResult is PasswordVerificationResult.Failed)
    {
        return Results.Unauthorized();
    }

    var token = tokenService.Generate(user);
    user.RefreshToken = token.RefreshToken;
    user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(jwtOptions.RefreshTokenDays);
    await dbContext.SaveChangesAsync(cancellationToken);

    return Results.Ok(new AuthResponse(token.AccessToken, token.RefreshToken, token.ExpiresAt));
});

auth.MapPost("/refresh", async (
    RefreshTokenRequest request,
    FinanceHubDbContext dbContext,
    IJwtTokenService tokenService,
    CancellationToken cancellationToken) =>
{
    var user = await dbContext.Users.FirstOrDefaultAsync(x => x.RefreshToken == request.RefreshToken, cancellationToken);
    if (user is null || user.RefreshTokenExpiresAt is null || user.RefreshTokenExpiresAt < DateTime.UtcNow)
    {
        return Results.Unauthorized();
    }

    var token = tokenService.Generate(user);
    user.RefreshToken = token.RefreshToken;
    user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(jwtOptions.RefreshTokenDays);
    await dbContext.SaveChangesAsync(cancellationToken);

    return Results.Ok(new AuthResponse(token.AccessToken, token.RefreshToken, token.ExpiresAt));
});

var secured = api.MapGroup(string.Empty).RequireAuthorization();

secured.MapGet("/me", async (
    ClaimsPrincipal principal,
    FinanceHubDbContext dbContext,
    CancellationToken cancellationToken) =>
{
    var userId = GetUserId(principal);
    var user = await dbContext.Users
        .Where(x => x.Id == userId)
        .Select(x => new
        {
            x.Id,
            x.Name,
            x.Email,
            x.CreatedAt
        })
        .FirstOrDefaultAsync(cancellationToken);

    return user is null ? Results.NotFound() : Results.Ok(user);
});

secured.MapPut("/me", async (
    ClaimsPrincipal principal,
    FinanceHubDbContext dbContext,
    UpdateProfileRequest request,
    CancellationToken cancellationToken) =>
{
    var userId = GetUserId(principal);
    var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);
    if (user is null)
    {
        return Results.NotFound();
    }

    if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length > 120)
    {
        return Results.BadRequest(new { message = "Nome inválido." });
    }

    if (!new EmailAddressAttribute().IsValid(request.Email))
    {
        return Results.BadRequest(new { message = "E-mail inválido." });
    }

    var normalizedEmail = request.Email.Trim().ToLowerInvariant();
    var emailExists = await dbContext.Users.AnyAsync(
        x => x.Email == normalizedEmail && x.Id != userId,
        cancellationToken);

    if (emailExists)
    {
        return Results.Conflict(new { message = "E-mail já está em uso." });
    }

    user.Name = request.Name.Trim();
    user.Email = normalizedEmail;
    await dbContext.SaveChangesAsync(cancellationToken);

    return Results.Ok(new { user.Id, user.Name, user.Email, user.CreatedAt });
});

secured.MapPut("/me/password", async (
    ClaimsPrincipal principal,
    FinanceHubDbContext dbContext,
    ChangePasswordRequest request,
    CancellationToken cancellationToken) =>
{
    var userId = GetUserId(principal);
    var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);
    if (user is null)
    {
        return Results.NotFound();
    }

    if (string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
    {
        return Results.BadRequest(new { message = "Informe a senha atual e a nova senha." });
    }

    if (request.NewPassword.Length < 8)
    {
        return Results.BadRequest(new { message = "A nova senha deve ter pelo menos 8 caracteres." });
    }

    var verifyResult = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword);
    if (verifyResult is PasswordVerificationResult.Failed)
    {
        return Results.BadRequest(new { message = "Senha atual inválida." });
    }

    user.PasswordHash = passwordHasher.HashPassword(user, request.NewPassword);
    await dbContext.SaveChangesAsync(cancellationToken);
    return Results.Ok(new { message = "Senha atualizada com sucesso." });
});

secured.MapGet("/institutions", async (FinanceHubDbContext dbContext, CancellationToken cancellationToken) =>
{
    var institutions = await dbContext.Institutions
        .OrderBy(x => x.Name)
        .Select(x => new { x.Id, x.Name, x.Code })
        .ToListAsync(cancellationToken);

    return Results.Ok(institutions);
});

secured.MapGet("/banks", async (IHttpClientFactory httpClientFactory, CancellationToken cancellationToken) =>
{
    try
    {
        var httpClient = httpClientFactory.CreateClient("banks-directory");
        using var response = await httpClient.GetAsync("/api/banks/v1", cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return Results.Problem("Não foi possível carregar os bancos externos.", statusCode: StatusCodes.Status502BadGateway);
        }

        var banks = await response.Content.ReadFromJsonAsync<List<BankDirectoryItem>>(cancellationToken: cancellationToken) ?? [];

        var normalized = banks
            .Where(x => !string.IsNullOrWhiteSpace(x.Name))
            .OrderBy(x => x.Code ?? int.MaxValue)
            .ThenBy(x => x.Name)
            .ToList();

        return Results.Ok(normalized);
    }
    catch
    {
        return Results.Problem("Não foi possível carregar os bancos externos.", statusCode: StatusCodes.Status502BadGateway);
    }
});

secured.MapGet("/accounts", async (ClaimsPrincipal principal, FinanceHubDbContext dbContext, CancellationToken cancellationToken) =>
{
    var userId = GetUserId(principal);
    var accounts = await dbContext.Accounts
        .Where(x => x.UserId == userId)
        .OrderByDescending(x => x.CreatedAt)
        .Select(x => new
        {
            x.Id,
            x.Name,
            x.BankName,
            x.BankCode,
            x.BankIspb,
            x.Type,
            x.Currency,
            x.CurrentBalance,
            x.AvailableBalance,
            x.BankConnectionId
        })
        .ToListAsync(cancellationToken);

    return Results.Ok(accounts);
});

secured.MapPost("/accounts", async (
    ClaimsPrincipal principal,
    CreateAccountRequest request,
    FinanceHubDbContext dbContext,
    CancellationToken cancellationToken) =>
{
    var userId = GetUserId(principal);

    var connectionExists = await dbContext.BankConnections.AnyAsync(
        x => x.Id == request.BankConnectionId && x.UserId == userId,
        cancellationToken);

    if (!connectionExists)
    {
        return Results.BadRequest(new { message = "Bank connection not found for user." });
    }

    var account = new Account
    {
        UserId = userId,
        BankConnectionId = request.BankConnectionId,
        ExternalAccountId = $"acc-{Guid.NewGuid():N}",
        Name = request.Name,
        BankName = string.IsNullOrWhiteSpace(request.BankName) ? null : request.BankName.Trim(),
        BankCode = string.IsNullOrWhiteSpace(request.BankCode) ? null : request.BankCode.Trim(),
        BankIspb = string.IsNullOrWhiteSpace(request.BankIspb) ? null : request.BankIspb.Trim(),
        Type = request.Type,
        Currency = request.Currency,
        CurrentBalance = request.CurrentBalance,
        AvailableBalance = request.AvailableBalance
    };

    dbContext.Accounts.Add(account);
    await dbContext.SaveChangesAsync(cancellationToken);

    return Results.Created($"/api/accounts/{account.Id}", account);
});

secured.MapPut("/accounts/{accountId:guid}", async (
    ClaimsPrincipal principal,
    FinanceHubDbContext dbContext,
    Guid accountId,
    UpdateAccountRequest request,
    CancellationToken cancellationToken) =>
{
    var userId = GetUserId(principal);
    var account = await dbContext.Accounts
        .FirstOrDefaultAsync(x => x.Id == accountId && x.UserId == userId, cancellationToken);

    if (account is null)
    {
        return Results.NotFound();
    }

    if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length > 120)
    {
        return Results.BadRequest(new { message = "Nome da conta inválido." });
    }

    account.Name = request.Name.Trim();
    account.BankName = string.IsNullOrWhiteSpace(request.BankName) ? account.BankName : request.BankName.Trim();
    account.BankCode = string.IsNullOrWhiteSpace(request.BankCode) ? account.BankCode : request.BankCode.Trim();
    account.BankIspb = string.IsNullOrWhiteSpace(request.BankIspb) ? account.BankIspb : request.BankIspb.Trim();
    account.CurrentBalance = request.CurrentBalance;
    account.AvailableBalance = request.AvailableBalance;
    account.Type = request.Type;
    account.Currency = string.IsNullOrWhiteSpace(request.Currency) ? account.Currency : request.Currency.Trim().ToUpperInvariant();

    await dbContext.SaveChangesAsync(cancellationToken);
    return Results.Ok(account);
});

secured.MapDelete("/accounts/{accountId:guid}", async (
    ClaimsPrincipal principal,
    FinanceHubDbContext dbContext,
    Guid accountId,
    CancellationToken cancellationToken) =>
{
    var userId = GetUserId(principal);
    var account = await dbContext.Accounts
        .FirstOrDefaultAsync(x => x.Id == accountId && x.UserId == userId, cancellationToken);

    if (account is null)
    {
        return Results.NotFound();
    }

    var hasTransactions = await dbContext.Transactions.AnyAsync(x => x.AccountId == accountId, cancellationToken);
    if (hasTransactions)
    {
        return Results.BadRequest(new { message = "Não é possível excluir conta com transações vinculadas." });
    }

    dbContext.Accounts.Remove(account);
    await dbContext.SaveChangesAsync(cancellationToken);
    return Results.NoContent();
});

secured.MapGet("/categories", async (ClaimsPrincipal principal, FinanceHubDbContext dbContext, CancellationToken cancellationToken) =>
{
    var userId = GetUserId(principal);
    var categories = await dbContext.Categories
        .Where(x => x.UserId == userId)
        .OrderBy(x => x.Type)
        .ThenBy(x => x.Name)
        .ToListAsync(cancellationToken);

    return Results.Ok(categories);
});

secured.MapPost("/categories", async (
    ClaimsPrincipal principal,
    CreateCategoryRequest request,
    FinanceHubDbContext dbContext,
    CancellationToken cancellationToken) =>
{
    var userId = GetUserId(principal);
    var category = new Category
    {
        UserId = userId,
        Name = request.Name,
        Type = request.Type,
        Color = request.Color
    };

    dbContext.Categories.Add(category);
    await dbContext.SaveChangesAsync(cancellationToken);

    return Results.Created($"/api/categories/{category.Id}", category);
});

secured.MapGet("/transactions", async (
    ClaimsPrincipal principal,
    FinanceHubDbContext dbContext,
    int? month,
    int? year,
    CancellationToken cancellationToken) =>
{
    var userId = GetUserId(principal);
    var query = dbContext.Transactions
        .Where(x => x.Account.UserId == userId)
        .Include(x => x.Category)
        .AsQueryable();

    if (month.HasValue && year.HasValue)
    {
        query = query.Where(x => x.PostedAt.Month == month.Value && x.PostedAt.Year == year.Value);
    }

    var transactions = await query
        .OrderByDescending(x => x.PostedAt)
        .Select(x => new
        {
            x.Id,
            x.AccountId,
            x.Description,
            x.Merchant,
            x.Amount,
            x.Type,
            x.PostedAt,
            Category = x.Category == null ? null : new { x.Category.Id, x.Category.Name, x.Category.Color }
        })
        .ToListAsync(cancellationToken);

    return Results.Ok(transactions);
});

secured.MapPost("/transactions", async (
    ClaimsPrincipal principal,
    CreateTransactionRequest request,
    FinanceHubDbContext dbContext,
    CancellationToken cancellationToken) =>
{
    var userId = GetUserId(principal);
    var accountExists = await dbContext.Accounts.AnyAsync(x => x.Id == request.AccountId && x.UserId == userId, cancellationToken);
    if (!accountExists)
    {
        return Results.BadRequest(new { message = "Account not found for user." });
    }

    if (request.CategoryId.HasValue)
    {
        var categoryExists = await dbContext.Categories.AnyAsync(x => x.Id == request.CategoryId && x.UserId == userId, cancellationToken);
        if (!categoryExists)
        {
            return Results.BadRequest(new { message = "Category not found for user." });
        }
    }

    var transaction = new Transaction
    {
        AccountId = request.AccountId,
        ExternalTransactionId = $"trx-{Guid.NewGuid():N}",
        Description = request.Description,
        Merchant = request.Merchant,
        Amount = request.Amount,
        Type = request.Type,
        CategoryId = request.CategoryId,
        PostedAt = request.PostedAt
    };

    dbContext.Transactions.Add(transaction);

    var account = await dbContext.Accounts.FirstAsync(x => x.Id == request.AccountId, cancellationToken);
    account.CurrentBalance += request.Type == TransactionType.Income ? request.Amount : -request.Amount;
    account.AvailableBalance = account.CurrentBalance;

    await dbContext.SaveChangesAsync(cancellationToken);
    return Results.Created($"/api/transactions/{transaction.Id}", transaction);
});

secured.MapPut("/transactions/{transactionId:guid}", async (
    ClaimsPrincipal principal,
    FinanceHubDbContext dbContext,
    Guid transactionId,
    UpdateTransactionRequest request,
    CancellationToken cancellationToken) =>
{
    var userId = GetUserId(principal);
    var transaction = await dbContext.Transactions
        .Include(x => x.Account)
        .FirstOrDefaultAsync(x => x.Id == transactionId && x.Account.UserId == userId, cancellationToken);

    if (transaction is null)
    {
        return Results.NotFound();
    }

    if (request.CategoryId.HasValue)
    {
        var categoryExists = await dbContext.Categories.AnyAsync(
            x => x.Id == request.CategoryId && x.UserId == userId,
            cancellationToken);
        if (!categoryExists)
        {
            return Results.BadRequest(new { message = "Categoria inválida para o usuário." });
        }
    }

    if (string.IsNullOrWhiteSpace(request.Description))
    {
        return Results.BadRequest(new { message = "Descrição é obrigatória." });
    }

    var oldEffect = transaction.Type == TransactionType.Income ? transaction.Amount : -transaction.Amount;
    var newEffect = request.Type == TransactionType.Income ? request.Amount : -request.Amount;
    var delta = newEffect - oldEffect;

    transaction.Account.CurrentBalance += delta;
    transaction.Account.AvailableBalance = transaction.Account.CurrentBalance;

    transaction.Description = request.Description.Trim();
    transaction.Merchant = request.Merchant.Trim();
    transaction.Amount = request.Amount;
    transaction.Type = request.Type;
    transaction.CategoryId = request.CategoryId;
    transaction.PostedAt = request.PostedAt;

    await dbContext.SaveChangesAsync(cancellationToken);
    return Results.Ok(transaction);
});

secured.MapDelete("/transactions/{transactionId:guid}", async (
    ClaimsPrincipal principal,
    FinanceHubDbContext dbContext,
    Guid transactionId,
    CancellationToken cancellationToken) =>
{
    var userId = GetUserId(principal);
    var transaction = await dbContext.Transactions
        .Include(x => x.Account)
        .FirstOrDefaultAsync(x => x.Id == transactionId && x.Account.UserId == userId, cancellationToken);

    if (transaction is null)
    {
        return Results.NotFound();
    }

    if (transaction.Type == TransactionType.Income)
    {
        transaction.Account.CurrentBalance -= transaction.Amount;
    }
    else
    {
        transaction.Account.CurrentBalance += transaction.Amount;
    }

    transaction.Account.AvailableBalance = transaction.Account.CurrentBalance;
    dbContext.Transactions.Remove(transaction);
    await dbContext.SaveChangesAsync(cancellationToken);
    return Results.NoContent();
});

secured.MapGet("/budgets", async (ClaimsPrincipal principal, FinanceHubDbContext dbContext, CancellationToken cancellationToken) =>
{
    var userId = GetUserId(principal);
    var budgets = await dbContext.Budgets
        .Where(x => x.UserId == userId)
        .Include(x => x.Category)
        .OrderByDescending(x => x.StartDate)
        .Select(x => new
        {
            x.Id,
            x.LimitAmount,
            x.Period,
            x.StartDate,
            x.EndDate,
            Category = new { x.CategoryId, x.Category.Name, x.Category.Color }
        })
        .ToListAsync(cancellationToken);

    return Results.Ok(budgets);
});

secured.MapPost("/budgets", async (
    ClaimsPrincipal principal,
    CreateBudgetRequest request,
    FinanceHubDbContext dbContext,
    CancellationToken cancellationToken) =>
{
    var userId = GetUserId(principal);
    var categoryExists = await dbContext.Categories.AnyAsync(x => x.Id == request.CategoryId && x.UserId == userId, cancellationToken);
    if (!categoryExists)
    {
        return Results.BadRequest(new { message = "Category not found for user." });
    }

    var budget = new Budget
    {
        UserId = userId,
        CategoryId = request.CategoryId,
        LimitAmount = request.LimitAmount,
        Period = request.Period,
        StartDate = request.StartDate,
        EndDate = request.EndDate
    };

    dbContext.Budgets.Add(budget);
    await dbContext.SaveChangesAsync(cancellationToken);
    return Results.Created($"/api/budgets/{budget.Id}", budget);
});

secured.MapPut("/budgets/{budgetId:guid}", async (
    ClaimsPrincipal principal,
    FinanceHubDbContext dbContext,
    Guid budgetId,
    UpdateBudgetRequest request,
    CancellationToken cancellationToken) =>
{
    var userId = GetUserId(principal);
    var budget = await dbContext.Budgets
        .FirstOrDefaultAsync(x => x.Id == budgetId && x.UserId == userId, cancellationToken);

    if (budget is null)
    {
        return Results.NotFound();
    }

    var categoryExists = await dbContext.Categories.AnyAsync(
        x => x.Id == request.CategoryId && x.UserId == userId,
        cancellationToken);
    if (!categoryExists)
    {
        return Results.BadRequest(new { message = "Categoria inválida para o usuário." });
    }

    budget.CategoryId = request.CategoryId;
    budget.LimitAmount = request.LimitAmount;
    budget.Period = request.Period;
    budget.StartDate = request.StartDate;
    budget.EndDate = request.EndDate;

    await dbContext.SaveChangesAsync(cancellationToken);
    return Results.Ok(budget);
});

secured.MapDelete("/budgets/{budgetId:guid}", async (
    ClaimsPrincipal principal,
    FinanceHubDbContext dbContext,
    Guid budgetId,
    CancellationToken cancellationToken) =>
{
    var userId = GetUserId(principal);
    var budget = await dbContext.Budgets
        .FirstOrDefaultAsync(x => x.Id == budgetId && x.UserId == userId, cancellationToken);

    if (budget is null)
    {
        return Results.NotFound();
    }

    dbContext.Budgets.Remove(budget);
    await dbContext.SaveChangesAsync(cancellationToken);
    return Results.NoContent();
});

secured.MapGet("/dashboard/summary", async (
    ClaimsPrincipal principal,
    FinanceHubDbContext dbContext,
    CancellationToken cancellationToken) =>
{
    var userId = GetUserId(principal);
    var now = DateTime.UtcNow;

    var totalBalance = await dbContext.Accounts
        .Where(x => x.UserId == userId)
        .SumAsync(x => (decimal?)x.CurrentBalance, cancellationToken) ?? 0m;

    var monthlyIncome = await dbContext.Transactions
        .Where(x => x.Account.UserId == userId && x.Type == TransactionType.Income && x.PostedAt.Month == now.Month && x.PostedAt.Year == now.Year)
        .SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m;

    var monthlyExpense = await dbContext.Transactions
        .Where(x => x.Account.UserId == userId && x.Type == TransactionType.Expense && x.PostedAt.Month == now.Month && x.PostedAt.Year == now.Year)
        .SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m;

    var accountsCount = await dbContext.Accounts.CountAsync(x => x.UserId == userId, cancellationToken);
    var transactionsCount = await dbContext.Transactions.CountAsync(x => x.Account.UserId == userId, cancellationToken);

    var response = new DashboardSummaryResponse(
        totalBalance,
        monthlyIncome,
        monthlyExpense,
        monthlyIncome - monthlyExpense,
        accountsCount,
        transactionsCount);

    return Results.Ok(response);
});

secured.MapGet("/reports/monthly", async (
    ClaimsPrincipal principal,
    FinanceHubDbContext dbContext,
    CancellationToken cancellationToken) =>
{
    var userId = GetUserId(principal);
    var sixMonthsAgo = DateTime.UtcNow.AddMonths(-5);
    var startDateUtc = DateTime.SpecifyKind(new DateTime(sixMonthsAgo.Year, sixMonthsAgo.Month, 1), DateTimeKind.Utc);

    var monthly = await dbContext.Transactions
        .Where(x => x.Account.UserId == userId && x.PostedAt >= startDateUtc)
        .GroupBy(x => new { x.PostedAt.Year, x.PostedAt.Month })
        .Select(group => new
        {
            group.Key.Year,
            group.Key.Month,
            Income = group.Where(x => x.Type == TransactionType.Income).Sum(x => x.Amount),
            Expense = group.Where(x => x.Type == TransactionType.Expense).Sum(x => x.Amount)
        })
        .OrderBy(x => x.Year)
        .ThenBy(x => x.Month)
        .ToListAsync(cancellationToken);

    var byCategory = await dbContext.Transactions
        .Where(x => x.Account.UserId == userId && x.Type == TransactionType.Expense)
        .Include(x => x.Category)
        .GroupBy(x => x.Category != null ? x.Category.Name : "Sem categoria")
        .Select(group => new { Category = group.Key, Amount = group.Sum(x => x.Amount) })
        .OrderByDescending(x => x.Amount)
        .ToListAsync(cancellationToken);

    return Results.Ok(new { monthly, byCategory });
});

secured.MapPost("/bank-connections", async (
    ClaimsPrincipal principal,
    FinanceHubDbContext dbContext,
    Guid institutionId,
    CancellationToken cancellationToken) =>
{
    var userId = GetUserId(principal);
    var institutionExists = await dbContext.Institutions.AnyAsync(x => x.Id == institutionId, cancellationToken);
    if (!institutionExists)
    {
        return Results.BadRequest(new { message = "Institution not found." });
    }

    var existing = await dbContext.BankConnections.FirstOrDefaultAsync(
        x => x.UserId == userId && x.InstitutionId == institutionId,
        cancellationToken);

    if (existing is not null)
    {
        return Results.Ok(existing);
    }

    var connection = new BankConnection
    {
        UserId = userId,
        InstitutionId = institutionId,
        ConsentId = $"consent-{Guid.NewGuid():N}",
        Status = "Active",
        ConsentGrantedAt = DateTime.UtcNow,
        ConsentExpiresAt = DateTime.UtcNow.AddMonths(6),
        LastSyncAt = DateTime.UtcNow
    };

    dbContext.BankConnections.Add(connection);
    await dbContext.SaveChangesAsync(cancellationToken);

    return Results.Created($"/api/bank-connections/{connection.Id}", connection);
});

secured.MapPost("/bank-connections/from-directory", async (
    ClaimsPrincipal principal,
    FinanceHubDbContext dbContext,
    CreateBankConnectionFromDirectoryRequest request,
    CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(request.Name))
    {
        return Results.BadRequest(new { message = "Nome do banco é obrigatório." });
    }

    var bankName = request.Name.Trim();
    if (bankName.Length > 120)
    {
        return Results.BadRequest(new { message = "Nome do banco inválido." });
    }

    var bankCode = !string.IsNullOrWhiteSpace(request.Code)
        ? request.Code.Trim()
        : request.Ispb?.Trim();

    if (string.IsNullOrWhiteSpace(bankCode) || bankCode.Length > 50)
    {
        return Results.BadRequest(new { message = "Código do banco inválido." });
    }

    var userId = GetUserId(principal);

    var institution = await dbContext.Institutions
        .FirstOrDefaultAsync(x => x.Code == bankCode, cancellationToken);

    if (institution is null)
    {
        institution = new Institution
        {
            Name = bankName,
            Code = bankCode
        };
        dbContext.Institutions.Add(institution);
    }

    var existing = await dbContext.BankConnections
        .FirstOrDefaultAsync(x => x.UserId == userId && x.InstitutionId == institution.Id, cancellationToken);

    if (existing is not null)
    {
        return Results.Ok(existing);
    }

    var connection = new BankConnection
    {
        UserId = userId,
        InstitutionId = institution.Id,
        ConsentId = $"consent-{Guid.NewGuid():N}",
        Status = "Active",
        ConsentGrantedAt = DateTime.UtcNow,
        ConsentExpiresAt = DateTime.UtcNow.AddMonths(6),
        LastSyncAt = DateTime.UtcNow
    };

    dbContext.BankConnections.Add(connection);
    await dbContext.SaveChangesAsync(cancellationToken);

    return Results.Created($"/api/bank-connections/{connection.Id}", connection);
});

secured.MapGet("/bank-connections", async (
    ClaimsPrincipal principal,
    FinanceHubDbContext dbContext,
    CancellationToken cancellationToken) =>
{
    var userId = GetUserId(principal);
    var connections = await dbContext.BankConnections
        .Where(x => x.UserId == userId)
        .Include(x => x.Institution)
        .OrderByDescending(x => x.CreatedAt)
        .Select(x => new
        {
            x.Id,
            x.InstitutionId,
            Institution = new { x.Institution.Name, x.Institution.Code },
            x.Status,
            x.ConsentGrantedAt,
            x.ConsentExpiresAt,
            x.LastSyncAt
        })
        .ToListAsync(cancellationToken);

    return Results.Ok(connections);
});

secured.MapDelete("/bank-connections/{connectionId:guid}", async (
    ClaimsPrincipal principal,
    FinanceHubDbContext dbContext,
    Guid connectionId,
    CancellationToken cancellationToken) =>
{
    var userId = GetUserId(principal);
    var connection = await dbContext.BankConnections
        .FirstOrDefaultAsync(x => x.Id == connectionId && x.UserId == userId, cancellationToken);

    if (connection is null)
    {
        return Results.NotFound();
    }

    var hasAccounts = await dbContext.Accounts
        .AnyAsync(x => x.BankConnectionId == connectionId && x.UserId == userId, cancellationToken);
    if (hasAccounts)
    {
        return Results.BadRequest(new { message = "Não é possível remover a conexão porque existem contas vinculadas." });
    }

    dbContext.BankConnections.Remove(connection);
    await dbContext.SaveChangesAsync(cancellationToken);
    return Results.NoContent();
});

app.Run();

static Guid GetUserId(ClaimsPrincipal principal)
{
    var value = principal.FindFirstValue("sub")
        ?? principal.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? principal.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");

    if (string.IsNullOrWhiteSpace(value) || !Guid.TryParse(value, out var userId))
    {
        throw new InvalidOperationException("Authenticated user id not found.");
    }

    return userId;
}

static async Task SeedDemoDataAsync(FinanceHubDbContext dbContext)
{
    if (await dbContext.Users.AnyAsync())
    {
        return;
    }

    var now = DateTime.UtcNow;
    var user = new User
    {
        Name = "Demo User",
        Email = "demo@financehub.local"
    };

    var hasher = new PasswordHasher<User>();
    user.PasswordHash = hasher.HashPassword(user, "FinanceHub@123");

    var expenseCategories = new[]
    {
        new Category { UserId = user.Id, Name = "Moradia", Type = "Expense", Color = "#EF4444" },
        new Category { UserId = user.Id, Name = "Alimentacao", Type = "Expense", Color = "#F59E0B" },
        new Category { UserId = user.Id, Name = "Transporte", Type = "Expense", Color = "#6366F1" },
    };
    var incomeCategory = new Category { UserId = user.Id, Name = "Salario", Type = "Income", Color = "#22C55E" };

    var institution = await dbContext.Institutions.OrderBy(x => x.Name).FirstAsync();
    var connection = new BankConnection
    {
        UserId = user.Id,
        InstitutionId = institution.Id,
        ConsentId = $"consent-{Guid.NewGuid():N}",
        Status = "Active",
        ConsentGrantedAt = now.AddDays(-40),
        ConsentExpiresAt = now.AddMonths(6),
        LastSyncAt = now
    };

    var account = new Account
    {
        UserId = user.Id,
        BankConnectionId = connection.Id,
        ExternalAccountId = $"acc-{Guid.NewGuid():N}",
        Name = "Conta Principal",
        BankName = institution.Name,
        BankCode = institution.Code,
        Type = AccountType.Checking,
        Currency = "BRL",
        CurrentBalance = 8500m,
        AvailableBalance = 8500m
    };

    var transactions = new List<Transaction>
    {
        new()
        {
            AccountId = account.Id,
            CategoryId = incomeCategory.Id,
            ExternalTransactionId = $"trx-{Guid.NewGuid():N}",
            Description = "Pagamento mensal",
            Merchant = "Empresa ABC",
            Amount = 12000m,
            Type = TransactionType.Income,
            PostedAt = new DateTime(now.Year, now.Month, 5, 10, 0, 0, DateTimeKind.Utc)
        },
        new()
        {
            AccountId = account.Id,
            CategoryId = expenseCategories[0].Id,
            ExternalTransactionId = $"trx-{Guid.NewGuid():N}",
            Description = "Aluguel",
            Merchant = "Imobiliaria Central",
            Amount = 2800m,
            Type = TransactionType.Expense,
            PostedAt = new DateTime(now.Year, now.Month, 8, 12, 0, 0, DateTimeKind.Utc)
        },
        new()
        {
            AccountId = account.Id,
            CategoryId = expenseCategories[1].Id,
            ExternalTransactionId = $"trx-{Guid.NewGuid():N}",
            Description = "Supermercado",
            Merchant = "Mercado Verde",
            Amount = 640m,
            Type = TransactionType.Expense,
            PostedAt = new DateTime(now.Year, now.Month, 12, 18, 0, 0, DateTimeKind.Utc)
        }
    };

    var budget = new Budget
    {
        UserId = user.Id,
        CategoryId = expenseCategories[1].Id,
        LimitAmount = 1500m,
        Period = BudgetPeriod.Monthly,
        StartDate = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc),
        EndDate = new DateTime(now.Year, now.Month, DateTime.DaysInMonth(now.Year, now.Month), 23, 59, 59, DateTimeKind.Utc)
    };

    dbContext.Users.Add(user);
    dbContext.Categories.AddRange(expenseCategories);
    dbContext.Categories.Add(incomeCategory);
    dbContext.BankConnections.Add(connection);
    dbContext.Accounts.Add(account);
    dbContext.Transactions.AddRange(transactions);
    dbContext.Budgets.Add(budget);

    await dbContext.SaveChangesAsync();
}

static async Task EnsureSchemaPatchesAsync(FinanceHubDbContext dbContext)
{
    await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE \"Accounts\" ADD COLUMN IF NOT EXISTS \"BankName\" character varying(120);");
    await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE \"Accounts\" ADD COLUMN IF NOT EXISTS \"BankCode\" character varying(10);");
    await dbContext.Database.ExecuteSqlRawAsync("ALTER TABLE \"Accounts\" ADD COLUMN IF NOT EXISTS \"BankIspb\" character varying(20);");
}

public partial class Program;

public record UpdateProfileRequest(string Name, string Email);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public record UpdateAccountRequest(string Name, decimal CurrentBalance, decimal AvailableBalance, AccountType Type, string Currency, string? BankName = null, string? BankCode = null, string? BankIspb = null);
public record UpdateTransactionRequest(string Description, string Merchant, decimal Amount, TransactionType Type, Guid? CategoryId, DateTime PostedAt);
public record UpdateBudgetRequest(Guid CategoryId, decimal LimitAmount, BudgetPeriod Period, DateTime StartDate, DateTime EndDate);
public record BankDirectoryItem(string Ispb, string Name, int? Code, string? FullName);
public record CreateBankConnectionFromDirectoryRequest(string Name, string? Code = null, string? Ispb = null);
