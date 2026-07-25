"use client";

import {
  formatCentavos,
  formatProtocolNumber,
  truncatePubkey,
} from "@desafio/shared";
import { useQuery } from "@tanstack/react-query";

import { useDebtProcessorProgram } from "@/lib/program";

interface ReceiptView {
  protocolNumber: { toString(): string };
  plate: string;
  paidDebts: { description: string }[];
  totalValue: { toString(): string };
  paidAt: { toString(): string };
  payer: { toBase58(): string };
}

export default function DashboardPage() {
  const program = useDebtProcessorProgram();

  const { data: receipts, isLoading } = useQuery({
    queryKey: ["receipts"],
    queryFn: async () => {
      const all = await program.account.receipt.all();
      return all
        .map((entry) => entry.account as unknown as ReceiptView)
        .sort((a, b) =>
          Number(
            BigInt(b.protocolNumber.toString()) -
              BigInt(a.protocolNumber.toString())
          )
        );
    },
    refetchInterval: 3_000,
  });

  return (
    <main>
      <h1>DETRAN Processor — Back Office</h1>
      <p className="muted">
        Pagamentos processados via CPI, atualizados automaticamente.
      </p>

      {isLoading && <p className="muted">Carregando...</p>}
      {receipts?.length === 0 && (
        <p className="muted">Nenhum pagamento processado ainda.</p>
      )}

      {receipts && receipts.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Protocolo</th>
              <th>Placa</th>
              <th>Débitos pagos</th>
              <th>Total</th>
              <th>Pago em</th>
              <th>Pagador</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((receipt) => (
              <tr key={receipt.protocolNumber.toString()}>
                <td>
                  {formatProtocolNumber(
                    BigInt(receipt.protocolNumber.toString())
                  )}
                </td>
                <td>{receipt.plate}</td>
                <td>
                  {receipt.paidDebts.map((debt, index) => (
                    <span className="chip" key={index}>
                      {debt.description}
                    </span>
                  ))}
                </td>
                <td>{formatCentavos(BigInt(receipt.totalValue.toString()))}</td>
                <td>
                  {new Date(
                    Number(receipt.paidAt.toString()) * 1000
                  ).toLocaleString("pt-BR")}
                </td>
                <td>{truncatePubkey(receipt.payer.toBase58())}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
