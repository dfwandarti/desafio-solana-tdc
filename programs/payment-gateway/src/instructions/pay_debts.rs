use anchor_lang::prelude::*;

use crate::debt_processor;
use crate::errors::PaymentGatewayError;
use crate::events::PaymentInitiated;

#[derive(Accounts)]
#[instruction(plate: String, debt_ids: Vec<u8>)]
pub struct PayDebts<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"plate_catalog", plate.as_bytes()],
        bump = plate_catalog.bump,
        seeds::program = debt_processor::ID,
    )]
    pub plate_catalog: Account<'info, debt_processor::accounts::PlateDebtCatalog>,

    #[account(
        mut,
        seeds = [b"protocol_counter"],
        bump = protocol_counter.bump,
        seeds::program = debt_processor::ID,
    )]
    pub protocol_counter: Account<'info, debt_processor::accounts::ProtocolCounter>,

    /// CHECK: not yet initialized here — debt-processor's own `init` constraint creates it
    /// inside the CPI. We only derive the address to forward.
    #[account(
        mut,
        seeds = [b"receipt", protocol_counter.next_protocol_number.to_le_bytes().as_ref()],
        bump,
        seeds::program = debt_processor::ID,
    )]
    pub receipt: UncheckedAccount<'info>,

    pub debt_processor_program: Program<'info, debt_processor::program::DebtProcessor>,
    pub system_program: Program<'info, System>,
}

pub fn pay_debts(ctx: Context<PayDebts>, plate: String, debt_ids: Vec<u8>) -> Result<()> {
    require!(
        debt_ids.len() == 1 || debt_ids.len() == 2,
        PaymentGatewayError::InvalidSelectionCount
    );
    require!(
        !plate.is_empty() && plate.len() <= 7,
        PaymentGatewayError::InvalidPlate
    );

    let cpi_accounts = debt_processor::cpi::accounts::ProcessPayment {
        payer: ctx.accounts.payer.to_account_info(),
        plate_catalog: ctx.accounts.plate_catalog.to_account_info(),
        protocol_counter: ctx.accounts.protocol_counter.to_account_info(),
        receipt: ctx.accounts.receipt.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.debt_processor_program.key(), cpi_accounts);
    debt_processor::cpi::process_payment(cpi_ctx, plate.clone(), debt_ids.clone())?;

    emit!(PaymentInitiated {
        plate,
        debt_ids,
        payer: ctx.accounts.payer.key(),
    });

    Ok(())
}
