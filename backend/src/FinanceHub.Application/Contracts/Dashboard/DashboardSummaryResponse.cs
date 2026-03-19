namespace FinanceHub.Application.Contracts.Dashboard;

public record DashboardSummaryResponse(
    decimal TotalBalance,
    decimal MonthlyIncome,
    decimal MonthlyExpense,
    decimal Cashflow,
    int AccountsCount,
    int TransactionsCount);
