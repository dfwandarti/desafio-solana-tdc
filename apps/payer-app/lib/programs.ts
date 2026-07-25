"use client";

import { AnchorProvider, Program } from "@anchor-lang/core";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  debtProcessorIdl,
  resolveRpcEndpoint,
  type DebtProcessor,
} from "@desafio/shared";
import { useMemo } from "react";

// Reads are public on-chain data — no signer is needed to fetch them. Payments go through
// the /api/pay route instead, which signs server-side so the UI never exposes wallet UX.
const readOnlyWallet = {
  publicKey: PublicKey.default,
  signTransaction: async () => {
    throw new Error("This client is read-only");
  },
  signAllTransactions: async () => {
    throw new Error("This client is read-only");
  },
};

export function useDebtProcessorProgram(): Program<DebtProcessor> {
  return useMemo(() => {
    const connection = new Connection(resolveRpcEndpoint(), "confirmed");
    const provider = new AnchorProvider(connection, readOnlyWallet, {
      commitment: "confirmed",
    });
    return new Program<DebtProcessor>(
      debtProcessorIdl as unknown as DebtProcessor,
      provider
    );
  }, []);
}
