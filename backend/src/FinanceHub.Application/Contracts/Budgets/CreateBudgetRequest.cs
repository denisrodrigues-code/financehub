using FinanceHub.Domain.Enums;

namespace FinanceHub.Application.Contracts.Budgets;

public record CreateBudgetRequest(
    Guid CategoryId,
    decimal LimitAmount,
    BudgetPeriod Period,
    DateTime StartDate,
    DateTime EndDate);
