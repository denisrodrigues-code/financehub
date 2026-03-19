namespace FinanceHub.Domain.Entities;

public class BankConnection : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid InstitutionId { get; set; }
    public string ConsentId { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public DateTime? ConsentGrantedAt { get; set; }
    public DateTime? ConsentExpiresAt { get; set; }
    public DateTime? LastSyncAt { get; set; }

    public User User { get; set; } = null!;
    public Institution Institution { get; set; } = null!;
    public ICollection<Account> Accounts { get; set; } = new List<Account>();
}
