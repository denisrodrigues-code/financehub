namespace FinanceHub.Application.Contracts.Auth;

public record AuthResponse(string AccessToken, string RefreshToken, DateTime ExpiresAt);
