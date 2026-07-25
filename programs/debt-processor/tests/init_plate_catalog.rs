mod common;

use anchor_lang::AccountDeserialize;
use debt_processor::PlateDebtCatalog;
use solana_signer::Signer;

use common::{demo_debts, init_plate_catalog_ix, plate_catalog_pda, send, setup, PLATE};

#[test]
fn test_init_plate_catalog_success() {
    let (mut svm, payer) = setup();

    let result = send(
        &mut svm,
        &payer,
        init_plate_catalog_ix(&payer.pubkey(), PLATE, demo_debts(2)),
    );
    assert!(result.is_ok(), "init_plate_catalog failed: {result:?}");

    let (catalog_pda, bump) = plate_catalog_pda(PLATE);
    let account = svm
        .get_account(&catalog_pda)
        .expect("catalog account should exist");
    let catalog = PlateDebtCatalog::try_deserialize(&mut account.data.as_slice())
        .expect("catalog should deserialize");

    assert_eq!(catalog.plate, PLATE);
    assert_eq!(catalog.bump, bump);
    assert_eq!(catalog.admin, payer.pubkey());
    assert_eq!(catalog.debts.len(), 2);
    assert!(catalog.debts.iter().all(|debt| !debt.paid));
}

#[test]
fn test_init_plate_catalog_rejects_zero_debts() {
    let (mut svm, payer) = setup();

    let result = send(
        &mut svm,
        &payer,
        init_plate_catalog_ix(&payer.pubkey(), PLATE, demo_debts(0)),
    );
    assert!(result.is_err(), "expected zero-debt catalog to be rejected");
}

#[test]
fn test_init_plate_catalog_rejects_too_many_debts() {
    let (mut svm, payer) = setup();

    let mut debts = demo_debts(3);
    debts.push(common::DemoDebt {
        description: "Extra debt beyond the max",
        kind: debt_processor::DebtKind::Fine,
        value: 1_000,
    });

    let result = send(
        &mut svm,
        &payer,
        init_plate_catalog_ix(&payer.pubkey(), PLATE, debts),
    );
    assert!(result.is_err(), "expected a 4th debt to be rejected");
}
