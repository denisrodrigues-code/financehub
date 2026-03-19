using FinanceHub.Domain.Enums;

namespace FinanceHub.Domain.Entities;

public class Budget : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid CategoryId { get; set; }
    public decimal LimitAmount { get; set; }
    public BudgetPeriod Period { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }

    public User User { get; set; } = null!;
    public Category Category { get; set; } = null!;
}
