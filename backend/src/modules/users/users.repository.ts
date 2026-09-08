import { prisma } from "../../database/prismaClient.js";
import type { Prisma } from "@prisma/client";

const userWithRoles = {
  include: { roles: { include: { role: true } } },
} satisfies Prisma.UserDefaultArgs;

export const usersRepository = {
  findById(id: string) {
    return prisma.user.findUnique({ where: { id }, ...userWithRoles });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  create(data: {
    email: string;
    fullName: string;
    phone?: string;
    passwordHash: string;
    roleIds: string[];
  }) {
    return prisma.user.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        ...(data.phone ? { phone: data.phone } : {}),
        passwordHash: data.passwordHash,
        roles: { create: data.roleIds.map((roleId) => ({ roleId })) },
      },
      ...userWithRoles,
    });
  },

  update(id: string, data: { fullName?: string; phone?: string }) {
    return prisma.user.update({ where: { id }, data, ...userWithRoles });
  },

  setStatus(id: string, status: "ACTIVE" | "INACTIVE" | "SUSPENDED") {
    return prisma.user.update({
      where: { id },
      data: { status, ...(status === "ACTIVE" ? { failedLoginAttempts: 0, lockedUntil: null } : {}) },
      ...userWithRoles,
    });
  },

  replaceRoles(id: string, roleIds: string[]) {
    return prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId: id } }),
      prisma.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: id, roleId })) }),
    ]);
  },

  async list(params: {
    skip: number;
    take: number;
    search?: string;
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    roleId?: string;
  }) {
    const where: Prisma.UserWhereInput = {
      archivedAt: null,
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { fullName: { contains: params.search } },
              { email: { contains: params.search } },
            ],
          }
        : {}),
      ...(params.roleId ? { roles: { some: { roleId: params.roleId } } } : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: "desc" },
        ...userWithRoles,
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total };
  },
};

export const rolesRepository = {
  findAll() {
    return prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
      orderBy: { name: "asc" },
    });
  },

  findManyByIds(ids: string[]) {
    return prisma.role.findMany({ where: { id: { in: ids } } });
  },
};
