using FinanceHub.Domain.Enums;

namespace FinanceHub.Application.Contracts.Accounts;

public record CreateAccountRequest(
    Guid BankConnectionId,
    string Name,
    AccountType Type,
    decimal CurrentBalance,
    decimal AvailableBalance,
    string Currency = "BRL",
    string? BankName = null,
    string? BankCode = null,
    string? BankIspb = null);
