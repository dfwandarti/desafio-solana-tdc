import { clusterApiUrl } from "@solana/web3.js";

/**
 * Falls back to devnet whenever NEXT_PUBLIC_SOLANA_RPC_URL is unset OR set to an empty/
 * whitespace string — `??` alone doesn't catch the latter, and a blank env var value in a
 * host's dashboard (easy to leave empty by mistake) produces exactly that.
 */
export function resolveRpcEndpoint(): string {
  const value = process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim();
  return value ? value : clusterApiUrl("devnet");
}
