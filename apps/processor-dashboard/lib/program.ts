"use client";

import { AnchorProvider, Program } from "@anchor-lang/core";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { debtProcessorIdl, type DebtProcessor } from "@desafio/shared";
import { useMemo } from "react";

const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl("devnet");

const readOnlyWallet = {
  publicKey: PublicKey.default,
  signTransaction: async () => {
    throw new Error("Read-only dashboard cannot sign transactions");
  },
  signAllTransactions: async () => {
    throw new Error("Read-only dashboard cannot sign transactions");
  },
};

export function useDebtProcessorProgram(): Program<DebtProcessor> {
  return useMemo(() => {
    const connection = new Connection(RPC_ENDPOINT, "confirmed");
    const provider = new AnchorProvider(connection, readOnlyWallet, {
      commitment: "confirmed",
    });
    return new Program<DebtProcessor>(
      debtProcessorIdl as unknown as DebtProcessor,
      provider
    );
  }, []);
}
