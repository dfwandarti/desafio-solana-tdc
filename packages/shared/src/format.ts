import { PublicKey } from "@solana/web3.js";

export function formatCentavos(value: bigint | number): string {
  const cents = typeof value === "bigint" ? value : BigInt(value);
  const reais = cents / 100n;
  const remainder = cents % 100n;
  return `R$ ${reais.toString()},${remainder.toString().padStart(2, "0")}`;
}

export function formatProtocolNumber(protocolNumber: bigint | number): string {
  return `#${protocolNumber.toString().padStart(6, "0")}`;
}

export function truncatePubkey(key: PublicKey | string, chars = 4): string {
  const value = typeof key === "string" ? key : key.toBase58();
  return `${value.slice(0, chars)}...${value.slice(-chars)}`;
}
