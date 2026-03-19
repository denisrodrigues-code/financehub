using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using FinanceHub.Application.Common;
using FinanceHub.Application.Interfaces;
using FinanceHub.Domain.Entities;
using FinanceHub.Infrastructure.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace FinanceHub.Infrastructure.Security;

public class JwtTokenService(IOptions<JwtOptions> jwtOptions) : IJwtTokenService
{
    private readonly JwtOptions _jwtOptions = jwtOptions.Value;

    public JwtTokenData Generate(User user)
    {
        var claims = new List<Claim>
        {
            new("sub", user.Id.ToString()),
            new("email", user.Email),
            new(ClaimTypes.Name, user.Name)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.SecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expires = DateTime.UtcNow.AddMinutes(_jwtOptions.AccessTokenMinutes);

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = _jwtOptions.Issuer,
            Audience = _jwtOptions.Audience,
            Subject = new ClaimsIdentity(claims),
            Expires = expires,
            SigningCredentials = credentials
        };

        var accessToken = new JsonWebTokenHandler().CreateToken(descriptor);
        return new JwtTokenData(accessToken, GenerateRefreshToken(), expires);
    }

    private static string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }
}
