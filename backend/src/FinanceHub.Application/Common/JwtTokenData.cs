namespace FinanceHub.Application.Common;

public record JwtTokenData(string AccessToken, string RefreshToken, DateTime ExpiresAt);
