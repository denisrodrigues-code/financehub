using FinanceHub.Domain.Enums;

namespace FinanceHub.Domain.Entities;

public class SyncJob : BaseEntity
{
    public Guid UserId { get; set; }
    public string JobType { get; set; } = string.Empty;
    public SyncJobStatus Status { get; set; } = SyncJobStatus.Pending;
    public DateTime StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
    public string? ErrorMessage { get; set; }

    public User User { get; set; } = null!;
}
