namespace FinanceHub.Domain.Entities;

public class User : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiresAt { get; set; }

    public ICollection<BankConnection> BankConnections { get; set; } = new List<BankConnection>();
    public ICollection<Category> Categories { get; set; } = new List<Category>();
    public ICollection<Budget> Budgets { get; set; } = new List<Budget>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    public ICollection<SyncJob> SyncJobs { get; set; } = new List<SyncJob>();
}
