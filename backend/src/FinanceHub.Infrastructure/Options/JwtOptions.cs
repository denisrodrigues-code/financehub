namespace FinanceHub.Infrastructure.Options;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "FinanceHub";
    public string Audience { get; set; } = "FinanceHub.Web";
    public string SecretKey { get; set; } = "financehub-super-secret-change-me-in-production";
    public int AccessTokenMinutes { get; set; } = 60;
    public int RefreshTokenDays { get; set; } = 7;
}
