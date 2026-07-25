import { readFileSync } from "node:fs";

import { AnchorProvider, Program } from "@anchor-lang/core";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { NextResponse } from "next/server";

import {
  debtProcessorIdl,
  deriveProtocolCounterPda,
  deriveReceiptPda,
  paymentGatewayIdl,
  resolveRpcEndpoint,
  type DebtProcessor,
  type PaymentGateway,
} from "@desafio/shared";

// PAYER_KEYPAIR_SECRET (the JSON array secret key, e.g. the contents of a solana-keygen
// file, inlined) works on serverless hosts like Vercel where there's no local filesystem
// to point PAYER_KEYPAIR_PATH at. PAYER_KEYPAIR_PATH remains for local dev convenience.
function loadPayerKeypair(): Keypair {
  const secret = process.env.PAYER_KEYPAIR_SECRET;
  if (secret) {
    const raw = JSON.parse(secret) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(raw));
  }

  const path = process.env.PAYER_KEYPAIR_PATH;
  if (path) {
    const raw = JSON.parse(readFileSync(path, "utf-8")) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(raw));
  }

  throw new Error("Set PAYER_KEYPAIR_SECRET or PAYER_KEYPAIR_PATH");
}

// `new Wallet(payer)` from @anchor-lang/core hits an ESM/CJS interop issue under
// Next.js's server bundler ("Wallet is not a constructor"); a plain object matching
// the same interface sidesteps it.
function nodeWallet(payer: Keypair) {
  return {
    publicKey: payer.publicKey,
    signTransaction: async <T extends Transaction | VersionedTransaction>(
      tx: T
    ): Promise<T> => {
      if (tx instanceof VersionedTransaction) {
        tx.sign([payer]);
      } else {
        tx.partialSign(payer);
      }
      return tx;
    },
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(
      txs: T[]
    ): Promise<T[]> => {
      for (const tx of txs) {
        if (tx instanceof VersionedTransaction) {
          tx.sign([payer]);
        } else {
          tx.partialSign(payer);
        }
      }
      return txs;
    },
  };
}

interface PayRequestBody {
  plate: string;
  debtIds: number[];
}

function parseBody(value: unknown): PayRequestBody | null {
  if (typeof value !== "object" || value === null) return null;
  const { plate, debtIds } = value as Record<string, unknown>;
  if (typeof plate !== "string" || !Array.isArray(debtIds)) return null;
  if (!debtIds.every((id): id is number => typeof id === "number")) return null;
  return { plate, debtIds };
}

export async function POST(request: Request): Promise<NextResponse> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const body = parseBody(rawBody);
  if (!body) {
    return NextResponse.json(
      { error: "plate (string) and debtIds (number[]) are required" },
      { status: 400 }
    );
  }

  try {
    const payer = loadPayerKeypair();
    const connection = new Connection(resolveRpcEndpoint(), "confirmed");
    const provider = new AnchorProvider(connection, nodeWallet(payer), {
      commitment: "confirmed",
    });
    const debtProcessor = new Program<DebtProcessor>(
      debtProcessorIdl as unknown as DebtProcessor,
      provider
    );
    const paymentGateway = new Program<PaymentGateway>(
      paymentGatewayIdl as unknown as PaymentGateway,
      provider
    );

    // Read the counter's current value up front so we know exactly which protocol
    // number (and therefore which Receipt PDA) this transaction will produce, rather
    // than trying to recover it after the fact by parsing logs from a CPI'd event.
    const [protocolCounterPda] = deriveProtocolCounterPda(
      debtProcessor.programId
    );
    const counter = await debtProcessor.account.protocolCounter.fetch(
      protocolCounterPda
    );
    const protocolNumber = BigInt(counter.nextProtocolNumber.toString());
    const [receiptPda] = deriveReceiptPda(
      protocolNumber,
      debtProcessor.programId
    );

    const ix = await paymentGateway.methods
      .payDebts(body.plate, Buffer.from(body.debtIds))
      .accounts({ payer: payer.publicKey })
      .instruction();

    const tx = new Transaction().add(ix);
    tx.feePayer = payer.publicKey;
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;

    const simulation = await connection.simulateTransaction(tx);
    if (simulation.value.err) {
      throw new Error(
        `Simulation failed: ${JSON.stringify(simulation.value.err)}`
      );
    }
    const units = simulation.value.unitsConsumed ?? 200_000;
    tx.instructions.unshift(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: Math.ceil(units * 1.2),
      })
    );

    await provider.sendAndConfirm(tx, [], { commitment: "confirmed" });

    const receiptAccount = await debtProcessor.account.receipt.fetch(
      receiptPda
    );

    return NextResponse.json({
      protocolNumber: protocolNumber.toString(),
      totalValue: receiptAccount.totalValue.toString(),
      paidDebts: receiptAccount.paidDebts.map(
        (debt: { description: string; value: { toString(): string } }) => ({
          description: debt.description,
          value: debt.value.toString(),
        })
      ),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
