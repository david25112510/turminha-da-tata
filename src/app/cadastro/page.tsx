import Image from "next/image";
import { DevFooter } from "@/components/tata/DevFooter";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-tata-bg p-6">
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="relative w-16 h-20 tata-mascot-idle">
            <Image src="/images/tata-mascote.png" alt="Tata, mascote da Turminha da Tata" fill className="object-contain" priority />
          </div>
          <div className="flex items-baseline gap-1.5 font-[family-name:var(--font-baloo)] font-bold text-xl">
            <span className="text-tata-green">Turminha</span>
            <span className="text-tata-coral">Tata</span>
          </div>
        </div>

        <div className="w-full bg-tata-surface rounded-[28px] shadow-xl p-6 sm:p-8">
          <SignupForm />
        </div>
      </div>

      <DevFooter className="py-4" />
    </main>
  );
}
