namespace FinanceHub.Domain.Entities;

public class Institution : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;

    public ICollection<BankConnection> BankConnections { get; set; } = new List<BankConnection>();
}
