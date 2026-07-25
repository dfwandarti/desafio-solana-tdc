import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { AnchorProvider, BN, Program, Wallet } from "@anchor-lang/core";
import { Connection, Keypair } from "@solana/web3.js";

import {
  debtProcessorIdl,
  derivePlateCatalogPda,
  deriveProtocolCounterPda,
  type DebtProcessor,
} from "@desafio/shared";

type DebtKindArg = { ipva: Record<string, never> } | { licensing: Record<string, never> } | { fine: Record<string, never> };

const IPVA: DebtKindArg = { ipva: {} };
const LICENSING: DebtKindArg = { licensing: {} };
const FINE: DebtKindArg = { fine: {} };

interface DemoDebt {
  description: string;
  kind: DebtKindArg;
  value: number;
}

interface DemoPlate {
  plate: string;
  debts: DemoDebt[];
}

const DEMO_PLATES: DemoPlate[] = [
  {
    plate: "ABC1234",
    debts: [
      { description: "IPVA 2026", kind: IPVA, value: 45_000 },
      { description: "Licenciamento 2026", kind: LICENSING, value: 12_000 },
    ],
  },
  {
    plate: "BRA2E19",
    debts: [
      { description: "IPVA 2026", kind: IPVA, value: 38_000 },
      { description: "Multa - Excesso de velocidade", kind: FINE, value: 19_530 },
      { description: "Licenciamento 2026", kind: LICENSING, value: 12_000 },
    ],
  },
  {
    plate: "XYZ9876",
    debts: [{ description: "Multa - Estacionamento irregular", kind: FINE, value: 8_800 }],
  },
  {
    plate: "POW1234",
    debts: [
      { description: "IPVA 2026", kind: IPVA, value: 38_000 },
      { description: "Multa - Excesso de velocidade", kind: FINE, value: 19_530 },
      { description: "Licenciamento 2026", kind: LICENSING, value: 12_000 },
    ],
  },
  {
    plate: "CAT7594",
    debts: [{ description: "Multa - Estacionamento irregular", kind: FINE, value: 8_800 }],
  },
  {
    plate: "DEF5678",
    debts: [
      { description: "IPVA 2026", kind: IPVA, value: 52_000 },
      { description: "Licenciamento 2026", kind: LICENSING, value: 12_000 },
    ],
  },
  {
    plate: "MER4B21",
    debts: [
      { description: "IPVA 2026", kind: IPVA, value: 41_000 },
      { description: "Multa - Avanço de sinal vermelho", kind: FINE, value: 29_340 },
    ],
  },
];

const CLUSTER_URLS: Record<string, string> = {
  localnet: "http://127.0.0.1:8899",
  devnet: "https://api.devnet.solana.com",
};

function resolveClusterUrl(): string {
  const args = process.argv.slice(2);
  const flagIndex = args.indexOf("--url");
  const arg = flagIndex >= 0 ? args[flagIndex + 1] : "localnet";
  return CLUSTER_URLS[arg] ?? arg;
}

function loadKeypair(path: string): Keypair {
  const raw = JSON.parse(readFileSync(path, "utf-8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

async function main(): Promise<void> {
  const url = resolveClusterUrl();
  const connection = new Connection(url, "confirmed");
  const keypairPath = process.env.SOLANA_KEYPAIR ?? join(homedir(), ".config", "solana", "id.json");
  const payer = loadKeypair(keypairPath);

  const provider = new AnchorProvider(connection, new Wallet(payer), { commitment: "confirmed" });
  const program = new Program<DebtProcessor>(debtProcessorIdl as unknown as DebtProcessor, provider);

  console.log(`Seeding demo data on ${url} as ${payer.publicKey.toBase58()}`);

  // protocolCounter/plateCatalog/systemProgram are all resolvable from the IDL's PDA/address
  // metadata (Anchor.toml `features.resolution = true`), so only the signer is passed explicitly.
  const [protocolCounterPda] = deriveProtocolCounterPda(program.programId);
  const existingCounter = await connection.getAccountInfo(protocolCounterPda);
  if (!existingCounter) {
    await program.methods
      .initializeProtocolCounter()
      .accounts({ admin: payer.publicKey })
      .rpc();
    console.log("Initialized protocol counter");
  } else {
    console.log("Protocol counter already initialized, skipping");
  }

  const summary: { plate: string; pda: string; debts: number }[] = [];

  for (const demo of DEMO_PLATES) {
    const [catalogPda] = derivePlateCatalogPda(demo.plate, program.programId);
    const existing = await connection.getAccountInfo(catalogPda);
    if (!existing) {
      const debtInputs = demo.debts.map((debt) => ({
        description: debt.description,
        kind: debt.kind,
        value: new BN(debt.value),
      }));
      await program.methods
        .initPlateCatalog(demo.plate, debtInputs)
        .accounts({ admin: payer.publicKey })
        .rpc();
      console.log(`Seeded ${demo.plate} with ${demo.debts.length} debt(s)`);
    } else {
      console.log(`${demo.plate} already seeded, skipping`);
    }
    summary.push({ plate: demo.plate, pda: catalogPda.toBase58(), debts: demo.debts.length });
  }

  console.log("\nSummary:");
  console.table(summary);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
