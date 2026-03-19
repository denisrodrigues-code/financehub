using FinanceHub.Domain.Enums;

namespace FinanceHub.Application.Contracts.Transactions;

public record CreateTransactionRequest(
    Guid AccountId,
    string Description,
    string Merchant,
    decimal Amount,
    TransactionType Type,
    Guid? CategoryId,
    DateTime PostedAt);
