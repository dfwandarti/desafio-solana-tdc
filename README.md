# Vehicle Debt Payment Demo (Solana CPI)

A two-app demo of paying Brazilian vehicle debts (IPVA, licensing, fines) through a Solana
cross-program invocation:

- **`payer-app`** — pick a vehicle plate, select 1-2 mock debts, click **Pagar**. Looks like an
  ordinary payment form — there's no wallet-connect UI. The app's `/api/pay` route signs and
  sends the transaction server-side with a fixed keypair, so the citizen-facing UI never
  exposes that this is a blockchain app.
- **`payment-gateway`** (program) — validates the request and CPIs into `debt-processor`.
- **`debt-processor`** (program) — validates the debts, marks them paid, and writes a
  `Receipt` account (plate, debts paid, values, protocol number, timestamp).
- **`processor-dashboard`** — read-only back-office view listing receipts as they land
  on-chain, polling every ~3s. This one's the internal/admin side, not citizen-facing.

No real funds move — this is a status-flip demo, not a payment rail. The point is that the
plate, the selected debts, and their values are durably persisted on-chain via CPI, atomically
(the whole transaction rolls back if anything fails).

## Prerequisites

- Rust (stable) + Solana CLI 3.1.10+ + Anchor CLI 1.1.2 (installed via AVM)
- Node.js 22+ and pnpm

## Repo layout

```
programs/debt-processor/     App 2's program (build first)
programs/payment-gateway/    App 1's program (CPIs into debt-processor via declare_program!)
idls/debt_processor.json     Committed IDL snapshot — declare_program! reads this
packages/shared/             PDA helpers, format helpers, IDL/type re-exports
apps/payer-app/              Next.js — no wallet UI, signs server-side via /api/pay
apps/processor-dashboard/    Next.js, read-only
scripts/seed-demo-data.ts    Seeds mock plates/debts on localnet or devnet
```

## Build

Order matters — `payment-gateway` reads `debt-processor`'s IDL at compile time via
`declare_program!`, with no Cargo dependency edge between them:

```bash
anchor build -p debt-processor
cp target/idl/debt_processor.json idls/debt_processor.json   # or: pnpm idl:sync
anchor build -p payment-gateway
# subsequent full-workspace builds:
anchor build
```

Re-run all three steps whenever `debt-processor`'s accounts/instructions change — a stale
`idls/debt_processor.json` fails silently otherwise.

## Test

```bash
cargo fmt --all
cargo clippy --all-targets -- -W clippy::all -D warnings
cargo test --workspace   # 21 LiteSVM tests across both programs
```

## Run the demo

```bash
pnpm install

# 1. Point both apps at your target cluster
cp apps/payer-app/.env.local.example apps/payer-app/.env.local
cp apps/processor-dashboard/.env.local.example apps/processor-dashboard/.env.local

# 2. Set PAYER_KEYPAIR_PATH in apps/payer-app/.env.local (server-only var) to a funded
#    keypair file — this is the account that signs every payment on the citizen's behalf.

# 3. Deploy (devnet shown; swap --provider.cluster for localnet)
anchor deploy --provider.cluster devnet

# 4. Seed a few demo plates with mock debts (idempotent)
pnpm seed -- --url devnet

# 5. Run both frontends
pnpm dev:payer        # http://localhost:3000
pnpm dev:dashboard     # http://localhost:3001
```

Pick a seeded plate on `payer-app`, select 1-2 debts, and click Pagar — no wallet connection
needed. The receipt shows up in `processor-dashboard` within a few seconds. The keypair at
`PAYER_KEYPAIR_PATH` needs enough SOL to cover network fees for every payment it signs.

## Program IDs (localnet, from `anchor keys list`)

- `debt_processor`: `12RNZJUaef67voHzcrQ7nXYrTyrCUKb7gVeZDyTjDeqx`
- `payment_gateway`: `ANvzcQ5NXzbmCUf2jyK74154axCQheV7iVFKkNyhwcoi`

Re-run `anchor keys sync` after a fresh `anchor keys list`/keypair regeneration and update
`Anchor.toml`'s `[programs.devnet]` section before deploying to devnet for the first time.
