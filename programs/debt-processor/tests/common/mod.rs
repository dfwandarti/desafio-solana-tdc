// This module is compiled fresh into each `tests/*.rs` binary; any given binary only
// uses a subset of these helpers, so the rest are legitimately unused from its view.
#![allow(dead_code)]

use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::pubkey::Pubkey;
use anchor_lang::solana_program::system_program;
use anchor_lang::{InstructionData, ToAccountMetas};
use debt_processor::{DebtInput, DebtKind, ID as DEBT_PROCESSOR_ID};
use litesvm::types::TransactionResult;
use litesvm::LiteSVM;
use solana_keypair::Keypair;
use solana_message::{Message, VersionedMessage};
use solana_signer::Signer;
use solana_transaction::versioned::VersionedTransaction;

pub const PLATE: &str = "ABC1234";

pub fn setup() -> (LiteSVM, Keypair) {
    let mut svm = LiteSVM::new();
    let bytes = include_bytes!("../../../../target/deploy/debt_processor.so");
    svm.add_program(DEBT_PROCESSOR_ID, bytes).unwrap();
    let payer = Keypair::new();
    svm.airdrop(&payer.pubkey(), 10_000_000_000).unwrap();
    (svm, payer)
}

pub fn protocol_counter_pda() -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"protocol_counter"], &DEBT_PROCESSOR_ID)
}

pub fn plate_catalog_pda(plate: &str) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"plate_catalog", plate.as_bytes()], &DEBT_PROCESSOR_ID)
}

pub fn receipt_pda(protocol_number: u64) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"receipt", &protocol_number.to_le_bytes()],
        &DEBT_PROCESSOR_ID,
    )
}

// litesvm's own TransactionResult has a large Err variant; we just forward it as-is
// from a third-party type we don't control.
#[allow(clippy::result_large_err)]
pub fn send(svm: &mut LiteSVM, payer: &Keypair, ix: Instruction) -> TransactionResult {
    send_signed_by(svm, payer, payer, ix)
}

/// Sends `ix` with `fee_payer` as the transaction's fee payer, signed by `signer`.
/// Lets tests build instructions whose declared `payer`/`admin` account differs from
/// whoever actually signs, e.g. for the missing-signer negative test.
#[allow(clippy::result_large_err)]
pub fn send_signed_by(
    svm: &mut LiteSVM,
    fee_payer: &Keypair,
    signer: &Keypair,
    ix: Instruction,
) -> TransactionResult {
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&fee_payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[signer]).unwrap();
    svm.send_transaction(tx)
}

pub fn initialize_protocol_counter_ix(admin: &Pubkey) -> Instruction {
    let (protocol_counter, _) = protocol_counter_pda();
    Instruction::new_with_bytes(
        DEBT_PROCESSOR_ID,
        &debt_processor::instruction::InitializeProtocolCounter {}.data(),
        debt_processor::accounts::InitializeProtocolCounter {
            admin: *admin,
            protocol_counter,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

pub struct DemoDebt {
    pub description: &'static str,
    pub kind: DebtKind,
    pub value: u64,
}

pub fn demo_debts(count: usize) -> Vec<DemoDebt> {
    let all = vec![
        DemoDebt {
            description: "IPVA 2026",
            kind: DebtKind::Ipva,
            value: 45_000,
        },
        DemoDebt {
            description: "Licenciamento 2026",
            kind: DebtKind::Licensing,
            value: 12_000,
        },
        DemoDebt {
            description: "Multa - Excesso de velocidade",
            kind: DebtKind::Fine,
            value: 19_530,
        },
    ];
    all.into_iter().take(count).collect()
}

pub fn init_plate_catalog_ix(admin: &Pubkey, plate: &str, debts: Vec<DemoDebt>) -> Instruction {
    let (plate_catalog, _) = plate_catalog_pda(plate);
    let debt_inputs: Vec<DebtInput> = debts
        .into_iter()
        .map(|debt| DebtInput {
            description: debt.description.to_string(),
            kind: debt.kind,
            value: debt.value,
        })
        .collect();

    Instruction::new_with_bytes(
        DEBT_PROCESSOR_ID,
        &debt_processor::instruction::InitPlateCatalog {
            plate: plate.to_string(),
            debts: debt_inputs,
        }
        .data(),
        debt_processor::accounts::InitPlateCatalog {
            admin: *admin,
            plate_catalog,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

pub fn process_payment_ix(
    payer: &Pubkey,
    plate: &str,
    debt_ids: Vec<u8>,
    next_protocol_number: u64,
) -> Instruction {
    let (plate_catalog, _) = plate_catalog_pda(plate);
    let (protocol_counter, _) = protocol_counter_pda();
    let (receipt, _) = receipt_pda(next_protocol_number);

    Instruction::new_with_bytes(
        DEBT_PROCESSOR_ID,
        &debt_processor::instruction::ProcessPayment {
            plate: plate.to_string(),
            debt_ids,
        }
        .data(),
        debt_processor::accounts::ProcessPayment {
            payer: *payer,
            plate_catalog,
            protocol_counter,
            receipt,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

/// Full happy-path setup: protocol counter initialized, `PLATE` seeded with `debt_count` debts.
pub fn setup_with_catalog(debt_count: usize) -> (LiteSVM, Keypair) {
    let (mut svm, payer) = setup();
    send(
        &mut svm,
        &payer,
        initialize_protocol_counter_ix(&payer.pubkey()),
    )
    .expect("initialize_protocol_counter should succeed");
    send(
        &mut svm,
        &payer,
        init_plate_catalog_ix(&payer.pubkey(), PLATE, demo_debts(debt_count)),
    )
    .expect("init_plate_catalog should succeed");
    (svm, payer)
}
