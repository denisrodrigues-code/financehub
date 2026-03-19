using FinanceHub.Domain.Enums;

namespace FinanceHub.Domain.Entities;

public class Account : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid BankConnectionId { get; set; }
    public string ExternalAccountId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? BankName { get; set; }
    public string? BankCode { get; set; }
    public string? BankIspb { get; set; }
    public AccountType Type { get; set; }
    public string Currency { get; set; } = "BRL";
    public decimal CurrentBalance { get; set; }
    public decimal AvailableBalance { get; set; }

    public User User { get; set; } = null!;
    public BankConnection BankConnection { get; set; } = null!;
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
