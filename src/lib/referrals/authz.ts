import { AppError } from "../app-error.ts";

export function assertOwns(userId: string, ownerId: string): void {
  if (userId !== ownerId) {
    throw new AppError("forbidden", "You can only change your own referral.", 403);
  }
}

export function assertAdmin(role: string | null | undefined): void {
  if (role !== "admin") {
    throw new AppError("forbidden", "Admin only.", 403);
  }
}

export function canMutateReferral(userId: string, ownerId: string): boolean {
  return userId === ownerId;
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin";
}
