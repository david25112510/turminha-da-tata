"use client";

import { DocumentAcceptanceWizard } from "@/components/tata/DocumentAcceptanceWizard";

export function ContractAcceptanceCard({
  acceptanceId,
  childName,
  guardianName,
  version,
  content,
  action,
}: {
  acceptanceId: string;
  childName: string;
  guardianName: string;
  version: string;
  content: string;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <DocumentAcceptanceWizard
      acceptanceId={acceptanceId}
      documentTitle="Contrato de prestação de serviços"
      identificationLines={[
        { label: "Criança", value: childName },
        { label: "Responsável", value: guardianName },
        { label: "Versão", value: version },
      ]}
      content={content}
      action={action}
      checkboxLabel="Li e compreendi o conteúdo deste contrato."
      confirmIntro="Você está prestes a aceitar o contrato da Turminha da Tata."
      confirmChecks={[
        "Li e compreendi o contrato.",
        "A assinatura abaixo representa minha manifestação de vontade para este contrato.",
      ]}
      submitLabel="FINALIZAR E ACEITAR CONTRATO"
      successTitle="🎉 Contrato aceito com sucesso!"
      successMessage={`Prontinho! Agora você já pode acompanhar a rotina de ${childName} pelo Portal dos Pais. 💛`}
    />
  );
}
