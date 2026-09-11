import { prisma } from "../../config/prisma.js";

class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  async create(data: { email: string; password?: string; name?: string }) {
    return prisma.user.create({ data });
  }

  async update(
    id: string,
    data: Partial<{ name: string; avatarUrl: string; email: string }>,
  ) {
    return prisma.user.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.user.delete({ where: { id } });
  }

  async list(params: { skip?: number; take?: number }) {
    return prisma.user.findMany({ skip: params.skip, take: params.take });
  }

  async markEmailVerified(id: string) {
    return prisma.user.update({
      where: { id },
      data: {
        isEmailVerified: true,
      },
    });
  }
}
