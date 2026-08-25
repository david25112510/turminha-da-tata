"use client";

import { DocumentAcceptanceWizard } from "@/components/tata/DocumentAcceptanceWizard";

export function ConsentAcceptanceCard({
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
      documentTitle="Consentimento para tratamento de dados pessoais"
      identificationLines={[
        { label: "Responsável", value: guardianName },
        { label: "Versão", value: version },
      ]}
      content={content}
      action={action}
      checkboxLabel="Li e compreendi como meus dados e os da criança são tratados."
      confirmIntro="Você está prestes a registrar seu consentimento para o tratamento de dados pessoais na Turminha da Tata."
      confirmChecks={[
        "Li e compreendi o termo de consentimento.",
        "A assinatura abaixo representa minha manifestação de vontade para este consentimento.",
      ]}
      submitLabel="FINALIZAR E REGISTRAR CONSENTIMENTO"
      successTitle="🎉 Consentimento registrado com sucesso!"
      successMessage={`Obrigado, ${guardianName}! Isso não muda em nada o cuidado com você e sua família — seus dados continuam protegidos. 💛`}
    />
  );
}
