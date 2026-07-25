use anchor_lang::prelude::*;

use crate::errors::DebtProcessorError;
use crate::events::DebtsPaid;
use crate::state::{PaidDebtRecord, PlateDebtCatalog, ProtocolCounter, Receipt, ReceiptStatus};

#[derive(Accounts)]
#[instruction(plate: String, debt_ids: Vec<u8>)]
pub struct ProcessPayment<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"plate_catalog", plate.as_bytes()],
        bump = plate_catalog.bump,
    )]
    pub plate_catalog: Account<'info, PlateDebtCatalog>,

    #[account(
        mut,
        seeds = [b"protocol_counter"],
        bump = protocol_counter.bump,
    )]
    pub protocol_counter: Account<'info, ProtocolCounter>,

    #[account(
        init,
        payer = payer,
        space = Receipt::DISCRIMINATOR.len() + Receipt::INIT_SPACE,
        seeds = [b"receipt", protocol_counter.next_protocol_number.to_le_bytes().as_ref()],
        bump
    )]
    pub receipt: Account<'info, Receipt>,

    pub system_program: Program<'info, System>,
}

pub fn process_payment(
    ctx: Context<ProcessPayment>,
    _plate: String,
    debt_ids: Vec<u8>,
) -> Result<()> {
    require!(
        debt_ids.len() == 1 || debt_ids.len() == 2,
        DebtProcessorError::InvalidSelectionCount
    );

    let mut sorted_ids = debt_ids.clone();
    sorted_ids.sort_unstable();
    sorted_ids.dedup();
    require!(
        sorted_ids.len() == debt_ids.len(),
        DebtProcessorError::DuplicateDebtSelection
    );

    let catalog = &mut ctx.accounts.plate_catalog;
    let mut paid_debts = Vec::with_capacity(debt_ids.len());
    let mut total_value: u64 = 0;

    for debt_id in &debt_ids {
        let entry = catalog
            .debts
            .iter_mut()
            .find(|debt| debt.id == *debt_id)
            .ok_or(DebtProcessorError::DebtNotFound)?;

        require!(!entry.paid, DebtProcessorError::DebtAlreadyPaid);
        entry.paid = true;

        total_value = total_value
            .checked_add(entry.value)
            .ok_or(DebtProcessorError::ArithmeticOverflow)?;

        paid_debts.push(PaidDebtRecord {
            debt_id: entry.id,
            description: entry.description.clone(),
            kind: entry.kind,
            value: entry.value,
        });
    }

    let plate = catalog.plate.clone();

    let protocol_counter = &mut ctx.accounts.protocol_counter;
    let protocol_number = protocol_counter.next_protocol_number;
    protocol_counter.next_protocol_number = protocol_number
        .checked_add(1)
        .ok_or(DebtProcessorError::ArithmeticOverflow)?;

    let paid_at = Clock::get()?.unix_timestamp;

    let receipt = &mut ctx.accounts.receipt;
    receipt.bump = ctx.bumps.receipt;
    receipt.protocol_number = protocol_number;
    receipt.plate = plate.clone();
    receipt.payer = ctx.accounts.payer.key();
    receipt.paid_debts = paid_debts;
    receipt.total_value = total_value;
    receipt.paid_at = paid_at;
    receipt.status = ReceiptStatus::Paid;

    emit!(DebtsPaid {
        plate,
        protocol_number,
        payer: receipt.payer,
        debt_ids,
        total_value,
        paid_at,
    });

    Ok(())
}
