import { connection } from "next/server";
import { ResetPasswordFormPage } from "./ResetPasswordFormPage";

// connection() força renderização dinâmica — ver comentário em src/app/login/page.tsx.
export default async function ResetPasswordPage() {
  await connection();
  return <ResetPasswordFormPage />;
}
