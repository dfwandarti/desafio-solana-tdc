import { PublicKey } from "@solana/web3.js";

import {
  PLATE_CATALOG_SEED,
  PROTOCOL_COUNTER_SEED,
  RECEIPT_SEED,
} from "./constants";

export function derivePlateCatalogPda(
  plate: string,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PLATE_CATALOG_SEED), Buffer.from(plate)],
    programId
  );
}

export function deriveProtocolCounterPda(
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PROTOCOL_COUNTER_SEED)],
    programId
  );
}

export function deriveReceiptPda(
  protocolNumber: bigint,
  programId: PublicKey
): [PublicKey, number] {
  const seed = Buffer.alloc(8);
  seed.writeBigUInt64LE(protocolNumber);
  return PublicKey.findProgramAddressSync(
    [Buffer.from(RECEIPT_SEED), seed],
    programId
  );
}
