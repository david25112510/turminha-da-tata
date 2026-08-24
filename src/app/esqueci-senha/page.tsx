import { connection } from "next/server";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

// connection() força renderização dinâmica — ver comentário em src/app/login/page.tsx.
export default async function ForgotPasswordPage() {
  await connection();
  return <ForgotPasswordForm />;
}
