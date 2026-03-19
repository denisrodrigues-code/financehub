using FinanceHub.Domain.Enums;

namespace FinanceHub.Domain.Entities;

public class Transaction : BaseEntity
{
    public Guid AccountId { get; set; }
    public Guid? CategoryId { get; set; }
    public string ExternalTransactionId { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Merchant { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public TransactionType Type { get; set; }
    public DateTime PostedAt { get; set; }

    public Account Account { get; set; } = null!;
    public Category? Category { get; set; }
}
