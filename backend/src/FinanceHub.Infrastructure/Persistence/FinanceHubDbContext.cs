using FinanceHub.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FinanceHub.Infrastructure.Persistence;

public class FinanceHubDbContext(DbContextOptions<FinanceHubDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Institution> Institutions => Set<Institution>();
    public DbSet<BankConnection> BankConnections => Set<BankConnection>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Budget> Budgets => Set<Budget>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<SyncJob> SyncJobs => Set<SyncJob>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(x => x.Email).IsUnique();
            entity.Property(x => x.Email).HasMaxLength(255);
            entity.Property(x => x.Name).HasMaxLength(120);
        });

        modelBuilder.Entity<Institution>(entity =>
        {
            entity.HasIndex(x => x.Code).IsUnique();
            entity.Property(x => x.Name).HasMaxLength(120);
            entity.Property(x => x.Code).HasMaxLength(50);
        });

        modelBuilder.Entity<BankConnection>(entity =>
        {
            entity.Property(x => x.Status).HasMaxLength(50);
            entity.Property(x => x.ConsentId).HasMaxLength(120);
            entity.HasOne(x => x.User).WithMany(x => x.BankConnections).HasForeignKey(x => x.UserId);
            entity.HasOne(x => x.Institution).WithMany(x => x.BankConnections).HasForeignKey(x => x.InstitutionId);
        });

        modelBuilder.Entity<Account>(entity =>
        {
            entity.HasIndex(x => x.ExternalAccountId);
            entity.Property(x => x.Name).HasMaxLength(120);
            entity.Property(x => x.BankName).HasMaxLength(120);
            entity.Property(x => x.BankCode).HasMaxLength(10);
            entity.Property(x => x.BankIspb).HasMaxLength(20);
            entity.Property(x => x.Currency).HasMaxLength(10);
            entity.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId);
            entity.HasOne(x => x.BankConnection).WithMany(x => x.Accounts).HasForeignKey(x => x.BankConnectionId);
        });

        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.HasIndex(x => x.ExternalTransactionId);
            entity.Property(x => x.Description).HasMaxLength(200);
            entity.Property(x => x.Merchant).HasMaxLength(200);
            entity.HasOne(x => x.Account).WithMany(x => x.Transactions).HasForeignKey(x => x.AccountId);
            entity.HasOne(x => x.Category).WithMany(x => x.Transactions).HasForeignKey(x => x.CategoryId);
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.Property(x => x.Name).HasMaxLength(80);
            entity.Property(x => x.Type).HasMaxLength(30);
            entity.Property(x => x.Color).HasMaxLength(20);
            entity.HasOne(x => x.User).WithMany(x => x.Categories).HasForeignKey(x => x.UserId);
        });

        modelBuilder.Entity<Budget>(entity =>
        {
            entity.HasOne(x => x.User).WithMany(x => x.Budgets).HasForeignKey(x => x.UserId);
            entity.HasOne(x => x.Category).WithMany(x => x.Budgets).HasForeignKey(x => x.CategoryId);
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.Property(x => x.Title).HasMaxLength(120);
            entity.Property(x => x.Message).HasMaxLength(500);
            entity.HasOne(x => x.User).WithMany(x => x.Notifications).HasForeignKey(x => x.UserId);
        });

        modelBuilder.Entity<SyncJob>(entity =>
        {
            entity.Property(x => x.JobType).HasMaxLength(60);
            entity.Property(x => x.ErrorMessage).HasMaxLength(500);
            entity.HasOne(x => x.User).WithMany(x => x.SyncJobs).HasForeignKey(x => x.UserId);
        });

        modelBuilder.Entity<Institution>().HasData(
            new Institution { Id = Guid.Parse("7b0cb7dc-7ab9-4efb-8d26-91ce0ec18d52"), Name = "Banco do Brasil", Code = "001" },
            new Institution { Id = Guid.Parse("fcbf1932-d8e7-4a7d-bbc0-8ae3978ef326"), Name = "Itaú", Code = "341" },
            new Institution { Id = Guid.Parse("6dcb4ef1-bbf8-4a3c-8947-5fef443f2f8e"), Name = "Nubank", Code = "260" }
        );

        base.OnModelCreating(modelBuilder);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var entries = ChangeTracker.Entries<BaseEntity>();
        foreach (var entry in entries)
        {
            if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
