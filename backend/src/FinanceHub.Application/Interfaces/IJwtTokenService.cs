using FinanceHub.Application.Common;
using FinanceHub.Domain.Entities;

namespace FinanceHub.Application.Interfaces;

public interface IJwtTokenService
{
    JwtTokenData Generate(User user);
}
