"use client";

import { AnchorProvider, Program } from "@anchor-lang/core";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  debtProcessorIdl,
  resolveRpcEndpoint,
  type DebtProcessor,
} from "@desafio/shared";
import { useMemo } from "react";

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
