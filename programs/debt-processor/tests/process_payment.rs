mod common;

use anchor_lang::{AccountDeserialize, AccountSerialize};
use debt_processor::{PlateDebtCatalog, ProtocolCounter, Receipt};
use solana_keypair::Keypair;
use solana_signer::Signer;

use common::{
    initialize_protocol_counter_ix, plate_catalog_pda, process_payment_ix, protocol_counter_pda,
    receipt_pda, send, setup, setup_with_catalog, PLATE,
};

#[test]
fn test_process_payment_single_debt_success() {
    let (mut svm, payer) = setup_with_catalog(2);

    let result = send(
        &mut svm,
        &payer,
        process_payment_ix(&payer.pubkey(), PLATE, vec![0], 1),
    );
    assert!(result.is_ok(), "process_payment failed: {result:?}");

    let (catalog_pda, _) = plate_catalog_pda(PLATE);
    let catalog_account = svm.get_account(&catalog_pda).unwrap();
    let catalog = PlateDebtCatalog::try_deserialize(&mut catalog_account.data.as_slice()).unwrap();
    assert!(catalog.debts[0].paid, "debt 0 should be marked paid");
    assert!(!catalog.debts[1].paid, "debt 1 should remain untouched");

    let (counter_pda, _) = protocol_counter_pda();
    let counter_account = svm.get_account(&counter_pda).unwrap();
    let counter = ProtocolCounter::try_deserialize(&mut counter_account.data.as_slice()).unwrap();
    assert_eq!(counter.next_protocol_number, 2);

    let (receipt_addr, _) = receipt_pda(1);
    let receipt_account = svm.get_account(&receipt_addr).unwrap();
    let receipt = Receipt::try_deserialize(&mut receipt_account.data.as_slice()).unwrap();
    assert_eq!(receipt.protocol_number, 1);
    assert_eq!(receipt.plate, PLATE);
    assert_eq!(receipt.paid_debts.len(), 1);
    assert_eq!(receipt.total_value, 45_000);
}

#[test]
fn test_process_payment_two_debts_success() {
    let (mut svm, payer) = setup_with_catalog(2);

    let result = send(
        &mut svm,
        &payer,
        process_payment_ix(&payer.pubkey(), PLATE, vec![0, 1], 1),
    );
    assert!(result.is_ok(), "process_payment failed: {result:?}");

    let (receipt_addr, _) = receipt_pda(1);
    let receipt_account = svm.get_account(&receipt_addr).unwrap();
    let receipt = Receipt::try_deserialize(&mut receipt_account.data.as_slice()).unwrap();
    assert_eq!(receipt.paid_debts.len(), 2);
    assert_eq!(receipt.total_value, 45_000 + 12_000);
}

#[test]
fn test_process_payment_rejects_already_paid_debt() {
    let (mut svm, payer) = setup_with_catalog(2);
    send(
        &mut svm,
        &payer,
        process_payment_ix(&payer.pubkey(), PLATE, vec![0], 1),
    )
    .expect("first payment should succeed");

    let result = send(
        &mut svm,
        &payer,
        process_payment_ix(&payer.pubkey(), PLATE, vec![0], 2),
    );
    assert!(result.is_err(), "expected already-paid debt to be rejected");
}

#[test]
fn test_process_payment_rejects_unknown_plate() {
    let (mut svm, payer) = setup();
    send(
        &mut svm,
        &payer,
        initialize_protocol_counter_ix(&payer.pubkey()),
    )
    .expect("protocol counter init should succeed");
    // Deliberately no init_plate_catalog call.

    let result = send(
        &mut svm,
        &payer,
        process_payment_ix(&payer.pubkey(), PLATE, vec![0], 1),
    );
    assert!(result.is_err(), "expected unknown plate to be rejected");
}

#[test]
fn test_process_payment_rejects_unknown_debt_id() {
    let (mut svm, payer) = setup_with_catalog(2);

    let result = send(
        &mut svm,
        &payer,
        process_payment_ix(&payer.pubkey(), PLATE, vec![5], 1),
    );
    assert!(result.is_err(), "expected unknown debt id to be rejected");
}

#[test]
fn test_process_payment_rejects_zero_debt_selection() {
    let (mut svm, payer) = setup_with_catalog(2);

    let result = send(
        &mut svm,
        &payer,
        process_payment_ix(&payer.pubkey(), PLATE, vec![], 1),
    );
    assert!(
        result.is_err(),
        "expected zero-debt selection to be rejected"
    );
}

#[test]
fn test_process_payment_rejects_three_plus_debt_selection() {
    let (mut svm, payer) = setup_with_catalog(3);

    let result = send(
        &mut svm,
        &payer,
        process_payment_ix(&payer.pubkey(), PLATE, vec![0, 1, 2], 1),
    );
    assert!(
        result.is_err(),
        "expected a 3-debt selection to be rejected"
    );
}

#[test]
fn test_process_payment_rejects_duplicate_debt_id_in_selection() {
    let (mut svm, payer) = setup_with_catalog(2);

    let result = send(
        &mut svm,
        &payer,
        process_payment_ix(&payer.pubkey(), PLATE, vec![0, 0], 1),
    );
    assert!(result.is_err(), "expected duplicate debt id to be rejected");
}

#[test]
fn test_process_payment_receipt_pda_and_bump_correct() {
    let (mut svm, payer) = setup_with_catalog(1);

    send(
        &mut svm,
        &payer,
        process_payment_ix(&payer.pubkey(), PLATE, vec![0], 1),
    )
    .expect("process_payment should succeed");

    let (expected_pda, expected_bump) = receipt_pda(1);
    let account = svm
        .get_account(&expected_pda)
        .expect("receipt should exist at the independently-derived PDA");
    let receipt = Receipt::try_deserialize(&mut account.data.as_slice()).unwrap();
    assert_eq!(receipt.bump, expected_bump);
}

#[test]
fn test_process_payment_owner_check() {
    let (mut svm, payer) = setup_with_catalog(2);

    let (catalog_pda, _) = plate_catalog_pda(PLATE);
    let mut account = svm
        .get_account(&catalog_pda)
        .expect("catalog account should exist");
    account.owner = anchor_lang::solana_program::system_program::ID;
    svm.set_account(catalog_pda, account)
        .expect("test harness should be able to overwrite account state");

    let result = send(
        &mut svm,
        &payer,
        process_payment_ix(&payer.pubkey(), PLATE, vec![0], 1),
    );
    assert!(
        result.is_err(),
        "expected a catalog account not owned by debt-processor to be rejected"
    );
}

#[test]
fn test_process_payment_missing_signer_rejected() {
    let (mut svm, payer) = setup_with_catalog(2);
    let fee_payer = Keypair::new();
    svm.airdrop(&fee_payer.pubkey(), 10_000_000_000).unwrap();

    let mut ix = process_payment_ix(&payer.pubkey(), PLATE, vec![0], 1);
    for meta in ix.accounts.iter_mut() {
        if meta.pubkey == payer.pubkey() {
            meta.is_signer = false;
        }
    }

    let result = send(&mut svm, &fee_payer, ix);
    assert!(
        result.is_err(),
        "expected process_payment without the payer's signature to be rejected"
    );
}

#[test]
fn test_protocol_counter_overflow_guarded() {
    let (mut svm, payer) = setup_with_catalog(1);

    let (counter_pda, bump) = protocol_counter_pda();
    let mut account = svm
        .get_account(&counter_pda)
        .expect("protocol counter should exist");
    let maxed_counter = ProtocolCounter {
        bump,
        next_protocol_number: u64::MAX,
    };
    let mut data = Vec::new();
    maxed_counter
        .try_serialize(&mut data)
        .expect("harness serialization should succeed");
    account.data = data;
    svm.set_account(counter_pda, account)
        .expect("test harness should be able to overwrite account state");

    let result = send(
        &mut svm,
        &payer,
        process_payment_ix(&payer.pubkey(), PLATE, vec![0], u64::MAX),
    );
    assert!(
        result.is_err(),
        "expected protocol counter overflow to be rejected instead of wrapping"
    );
}
