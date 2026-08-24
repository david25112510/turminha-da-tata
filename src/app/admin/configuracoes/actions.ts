"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/authz";
import { toggleUserActive } from "@/lib/user-actions";

export async function toggleUserActiveAction(formData: FormData) {
  const session = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");

  await toggleUserActive(userId, session.id);

  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin/cuidadoras");
}
