import { RefreshToken, User } from "../../../generated/prisma/client.js";

export class UserMapper {
  static toPublicUserDto(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatarUrl,
      verified: user.isEmailVerified,
      createdAt: user.createdAt,
      twoFactorEnabled: user.twoFactorEnabled,
    };
  }

  static toPublicSessionDto(refresh: RefreshToken) {
    return {
      id: refresh.id,
      userAgent: refresh.userAgent,
      ipAddress: refresh.ipAddress,
      createdAt: refresh.createdAt,
      expiresAt: refresh.expiresAt,
      isRevoked: refresh.isRevoked,
    };
  }
}
