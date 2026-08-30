"use client";

import { DocumentAcceptanceWizard } from "@/components/tata/DocumentAcceptanceWizard";

export function PrivacyPolicyAcceptanceCard({
  acceptanceId,
  guardianName,
  version,
  content,
  action,
}: {
  acceptanceId: string;
  guardianName: string;
  version: string;
  content: string;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <DocumentAcceptanceWizard
      acceptanceId={acceptanceId}
      documentTitle="Política de Privacidade"
      identificationLines={[
        { label: "Responsável", value: guardianName },
        { label: "Versão", value: version },
      ]}
      content={content}
      action={action}
      checkboxLabel="Li e compreendi a Política de Privacidade."
      confirmIntro="Você está prestes a confirmar a leitura da Política de Privacidade da Turminha da Tata."
      confirmChecks={[
        "Li e compreendi a Política de Privacidade.",
        "A assinatura abaixo representa minha manifestação de vontade para esta confirmação.",
      ]}
      submitLabel="FINALIZAR E CONFIRMAR LEITURA"
      successTitle="🎉 Política de Privacidade confirmada!"
      successMessage={`Obrigado, ${guardianName}! Seus dados e os da criança continuam protegidos. 💛`}
    />
  );
}
