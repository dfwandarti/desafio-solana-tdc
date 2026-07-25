use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::pubkey::Pubkey;
use anchor_lang::solana_program::system_program;
use anchor_lang::{AccountDeserialize, InstructionData, ToAccountMetas};
use debt_processor::{DebtInput, DebtKind, PlateDebtCatalog, Receipt};
use litesvm::types::TransactionResult;
use litesvm::LiteSVM;
use solana_keypair::Keypair;
use solana_message::{Message, VersionedMessage};
use solana_signer::Signer;
use solana_transaction::versioned::VersionedTransaction;

const PLATE: &str = "ABC1234";

fn protocol_counter_pda() -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"protocol_counter"], &debt_processor::ID)
}

fn plate_catalog_pda(plate: &str) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"plate_catalog", plate.as_bytes()], &debt_processor::ID)
}

fn receipt_pda(protocol_number: u64) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"receipt", &protocol_number.to_le_bytes()],
        &debt_processor::ID,
    )
}

fn setup() -> (LiteSVM, Keypair) {
    let mut svm = LiteSVM::new();
    svm.add_program(
        debt_processor::ID,
        include_bytes!("../../../target/deploy/debt_processor.so"),
    )
    .unwrap();
    svm.add_program(
        payment_gateway::ID,
        include_bytes!("../../../target/deploy/payment_gateway.so"),
    )
    .unwrap();
    let payer = Keypair::new();
    svm.airdrop(&payer.pubkey(), 10_000_000_000).unwrap();
    (svm, payer)
}

// litesvm's own TransactionResult has a large Err variant; we just forward it as-is
// from a third-party type we don't control.
#[allow(clippy::result_large_err)]
fn send(svm: &mut LiteSVM, payer: &Keypair, ix: Instruction) -> TransactionResult {
    send_signed_by(svm, payer, payer, ix)
}

#[allow(clippy::result_large_err)]
fn send_signed_by(
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

/// Seeds debt-processor state directly (not through payment-gateway) so tests start from a
/// known-good plate catalog with `debt_count` unpaid debts.
fn setup_with_catalog(debt_count: usize) -> (LiteSVM, Keypair) {
    let (mut svm, payer) = setup();

    let (protocol_counter, _) = protocol_counter_pda();
    send(
        &mut svm,
        &payer,
        Instruction::new_with_bytes(
            debt_processor::ID,
            &debt_processor::instruction::InitializeProtocolCounter {}.data(),
            debt_processor::accounts::InitializeProtocolCounter {
                admin: payer.pubkey(),
                protocol_counter,
                system_program: system_program::ID,
            }
            .to_account_metas(None),
        ),
    )
    .expect("initialize_protocol_counter should succeed");

    let all_debts = [
        DebtInput {
            description: "IPVA 2026".to_string(),
            kind: DebtKind::Ipva,
            value: 45_000,
        },
        DebtInput {
            description: "Licenciamento 2026".to_string(),
            kind: DebtKind::Licensing,
            value: 12_000,
        },
    ];
    let debts: Vec<DebtInput> = all_debts.into_iter().take(debt_count).collect();

    let (plate_catalog, _) = plate_catalog_pda(PLATE);
    send(
        &mut svm,
        &payer,
        Instruction::new_with_bytes(
            debt_processor::ID,
            &debt_processor::instruction::InitPlateCatalog {
                plate: PLATE.to_string(),
                debts,
            }
            .data(),
            debt_processor::accounts::InitPlateCatalog {
                admin: payer.pubkey(),
                plate_catalog,
                system_program: system_program::ID,
            }
            .to_account_metas(None),
        ),
    )
    .expect("init_plate_catalog should succeed");

    (svm, payer)
}

fn pay_debts_ix(
    payer: &Pubkey,
    plate: &str,
    debt_ids: Vec<u8>,
    next_protocol_number: u64,
    debt_processor_program: Pubkey,
) -> Instruction {
    let (plate_catalog, _) = plate_catalog_pda(plate);
    let (protocol_counter, _) = protocol_counter_pda();
    let (receipt, _) = receipt_pda(next_protocol_number);

    Instruction::new_with_bytes(
        payment_gateway::ID,
        &payment_gateway::instruction::PayDebts {
            plate: plate.to_string(),
            debt_ids,
        }
        .data(),
        payment_gateway::accounts::PayDebts {
            payer: *payer,
            plate_catalog,
            protocol_counter,
            receipt,
            debt_processor_program,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

#[test]
fn test_pay_debts_cpi_single_debt_end_to_end() {
    let (mut svm, payer) = setup_with_catalog(2);

    let result = send(
        &mut svm,
        &payer,
        pay_debts_ix(&payer.pubkey(), PLATE, vec![0], 1, debt_processor::ID),
    );
    assert!(result.is_ok(), "pay_debts failed: {result:?}");

    let (catalog_pda, _) = plate_catalog_pda(PLATE);
    let catalog_account = svm.get_account(&catalog_pda).unwrap();
    let catalog = PlateDebtCatalog::try_deserialize(&mut catalog_account.data.as_slice()).unwrap();
    assert!(catalog.debts[0].paid);
    assert!(!catalog.debts[1].paid);

    let (receipt_addr, _) = receipt_pda(1);
    let receipt_account = svm.get_account(&receipt_addr).unwrap();
    let receipt = Receipt::try_deserialize(&mut receipt_account.data.as_slice()).unwrap();
    assert_eq!(receipt.total_value, 45_000);
}

#[test]
fn test_pay_debts_cpi_two_debts_end_to_end() {
    let (mut svm, payer) = setup_with_catalog(2);

    let result = send(
        &mut svm,
        &payer,
        pay_debts_ix(&payer.pubkey(), PLATE, vec![0, 1], 1, debt_processor::ID),
    );
    assert!(result.is_ok(), "pay_debts failed: {result:?}");

    let (receipt_addr, _) = receipt_pda(1);
    let receipt_account = svm.get_account(&receipt_addr).unwrap();
    let receipt = Receipt::try_deserialize(&mut receipt_account.data.as_slice()).unwrap();
    assert_eq!(receipt.total_value, 45_000 + 12_000);
    assert_eq!(receipt.paid_debts.len(), 2);
}

#[test]
fn test_pay_debts_rejects_invalid_selection_count_before_cpi() {
    let (mut svm, payer) = setup_with_catalog(2);

    let result = send(
        &mut svm,
        &payer,
        pay_debts_ix(&payer.pubkey(), PLATE, vec![], 1, debt_processor::ID),
    );
    assert!(
        result.is_err(),
        "expected zero-debt selection to be rejected"
    );

    // No CPI should ever have been reached, so no receipt was created.
    let (receipt_addr, _) = receipt_pda(1);
    assert!(
        svm.get_account(&receipt_addr).is_none(),
        "no receipt should exist when payment-gateway rejects before the CPI"
    );
}

#[test]
fn test_pay_debts_cpi_target_validation() {
    let (mut svm, payer) = setup_with_catalog(2);

    // Substitute a real, executable, but wrong program in the debt_processor_program slot.
    let result = send(
        &mut svm,
        &payer,
        pay_debts_ix(&payer.pubkey(), PLATE, vec![0], 1, system_program::ID),
    );
    assert!(
        result.is_err(),
        "expected an incorrect debt_processor_program to be rejected before any CPI executes"
    );
}

#[test]
fn test_pay_debts_atomicity_on_failure_rolls_back() {
    let (mut svm, payer) = setup_with_catalog(2);

    send(
        &mut svm,
        &payer,
        pay_debts_ix(&payer.pubkey(), PLATE, vec![0], 1, debt_processor::ID),
    )
    .expect("first payment should succeed");

    // Paying debt 0 again must fail inside debt-processor's process_payment, reached via CPI.
    let result = send(
        &mut svm,
        &payer,
        pay_debts_ix(&payer.pubkey(), PLATE, vec![0], 2, debt_processor::ID),
    );
    assert!(result.is_err(), "expected the second payment to fail");

    let (second_receipt_addr, _) = receipt_pda(2);
    assert!(
        svm.get_account(&second_receipt_addr).is_none(),
        "a failed CPI must not leave a partially-created receipt behind"
    );
}

#[test]
fn test_pay_debts_signer_propagation() {
    let (mut svm, payer) = setup_with_catalog(2);
    let fee_payer = Keypair::new();
    svm.airdrop(&fee_payer.pubkey(), 10_000_000_000).unwrap();

    let mut ix = pay_debts_ix(&payer.pubkey(), PLATE, vec![0], 1, debt_processor::ID);
    for meta in ix.accounts.iter_mut() {
        if meta.pubkey == payer.pubkey() {
            meta.is_signer = false;
        }
    }

    let result = send(&mut svm, &fee_payer, ix);
    assert!(
        result.is_err(),
        "expected pay_debts without the real payer's signature to be rejected"
    );
}
