"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import {
  derivePlateCatalogPda,
  formatCentavos,
  formatProtocolNumber,
} from "@desafio/shared";
import { getUserFriendlyError } from "@/lib/errors";
import { useDebtProcessorProgram } from "@/lib/programs";

interface DebtEntryView {
  id: number;
  description: string;
  value: { toString(): string };
  paid: boolean;
}

interface PaidReceipt {
  protocolNumber: string;
  totalValue: string;
  paidDebts: { description: string; value: string }[];
}

export default function PlatePage() {
  const { plate } = useParams<{ plate: string }>();
  const debtProcessor = useDebtProcessorProgram();
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<number[]>([]);
  const [receipt, setReceipt] = useState<PaidReceipt | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const catalogPda = derivePlateCatalogPda(plate, debtProcessor.programId)[0];

  const { data: catalog, isLoading } = useQuery({
    queryKey: ["plateCatalog", plate],
    queryFn: () => debtProcessor.account.plateDebtCatalog.fetch(catalogPda),
  });

  const toggleDebt = (id: number) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((debtId) => debtId !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  };

  const payMutation = useMutation({
    mutationFn: async (): Promise<PaidReceipt> => {
      const response = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plate, debtIds: selected }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Payment failed");
      }
      return data as PaidReceipt;
    },
    onSuccess: (result) => {
      setReceipt(result);
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ["plateCatalog", plate] });
    },
    onError: (error) => {
      setErrorMessage(getUserFriendlyError(error));
    },
  });

  if (receipt) {
    return (
      <main>
        <div className="banner success">
          <strong>
            Pago! Protocolo{" "}
            {formatProtocolNumber(BigInt(receipt.protocolNumber))}
          </strong>
        </div>
        <div className="card">
          <div className="plate">{plate}</div>
          {receipt.paidDebts.map((debt, index) => (
            <div className="debt-row" key={index}>
              <span>{debt.description}</span>
              <span>{formatCentavos(BigInt(debt.value))}</span>
            </div>
          ))}
          <div className="debt-row">
            <strong>Total</strong>
            <strong>{formatCentavos(BigInt(receipt.totalValue))}</strong>
          </div>
        </div>
        <Link href="/">← Voltar</Link>
      </main>
    );
  }

  return (
    <main>
      <Link href="/" className="muted">
        ← Voltar
      </Link>
      <h1>{plate}</h1>

      {errorMessage && <div className="banner error">{errorMessage}</div>}
      {isLoading && <p className="muted">Carregando débitos...</p>}

      <div className="card">
        {catalog?.debts.map((debt: DebtEntryView) => (
          <label
            key={debt.id}
            className={`debt-row ${debt.paid ? "paid" : ""}`}
          >
            <span>
              {!debt.paid && (
                <input
                  type="checkbox"
                  checked={selected.includes(debt.id)}
                  onChange={() => toggleDebt(debt.id)}
                  disabled={!selected.includes(debt.id) && selected.length >= 2}
                />
              )}{" "}
              {debt.description}
            </span>
            <span>{formatCentavos(BigInt(debt.value.toString()))}</span>
          </label>
        ))}
      </div>

      <button
        onClick={() => payMutation.mutate()}
        disabled={selected.length === 0 || payMutation.isPending}
      >
        {payMutation.isPending ? "Processando..." : "Pagar"}
      </button>
    </main>
  );
}
