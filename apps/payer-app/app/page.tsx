"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { useDebtProcessorProgram } from "@/lib/programs";

export default function HomePage() {
  const debtProcessor = useDebtProcessorProgram();

  const { data: catalogs, isLoading } = useQuery({
    queryKey: ["plateCatalogs"],
    queryFn: () => debtProcessor.account.plateDebtCatalog.all(),
  });

  return (
    <main>
      <h1>Pagamento de Débitos Veiculares</h1>

      {isLoading && <p className="muted">Carregando placas...</p>}
      {catalogs?.length === 0 && (
        <p className="muted">Nenhuma placa cadastrada ainda.</p>
      )}

      {catalogs?.map(({ publicKey, account }) => {
        const unpaidCount = account.debts.filter((debt) => !debt.paid).length;
        return (
          <Link
            key={publicKey.toBase58()}
            href={`/plate/${account.plate}`}
            className="card card-link"
          >
            <div className="plate">{account.plate}</div>
            <div className="muted">
              {unpaidCount > 0
                ? `${unpaidCount} débito(s) em aberto`
                : "Todos os débitos pagos"}
            </div>
          </Link>
        );
      })}
    </main>
  );
}
