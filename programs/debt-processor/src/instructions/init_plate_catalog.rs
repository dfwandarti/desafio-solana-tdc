use anchor_lang::prelude::*;

use crate::errors::DebtProcessorError;
use crate::state::{DebtEntry, DebtKind, PlateDebtCatalog};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DebtInput {
    pub description: String,
    pub kind: DebtKind,
    pub value: u64,
}

#[derive(Accounts)]
#[instruction(plate: String, debts: Vec<DebtInput>)]
pub struct InitPlateCatalog<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = PlateDebtCatalog::DISCRIMINATOR.len() + PlateDebtCatalog::INIT_SPACE,
        seeds = [b"plate_catalog", plate.as_bytes()],
        bump
    )]
    pub plate_catalog: Account<'info, PlateDebtCatalog>,

    pub system_program: Program<'info, System>,
}

pub fn init_plate_catalog(
    ctx: Context<InitPlateCatalog>,
    plate: String,
    debts: Vec<DebtInput>,
) -> Result<()> {
    require!(
        !plate.is_empty() && plate.len() <= 7,
        DebtProcessorError::InvalidPlate
    );
    require!(
        !debts.is_empty() && debts.len() <= 3,
        DebtProcessorError::InvalidDebtCount
    );

    let catalog = &mut ctx.accounts.plate_catalog;
    catalog.bump = ctx.bumps.plate_catalog;
    catalog.plate = plate;
    catalog.admin = ctx.accounts.admin.key();
    catalog.debts = debts
        .into_iter()
        .enumerate()
        .map(|(index, input)| {
            let id: u8 = index
                .try_into()
                .map_err(|_| DebtProcessorError::InvalidDebtCount)?;
            Ok(DebtEntry {
                id,
                description: input.description,
                kind: input.kind,
                value: input.value,
                paid: false,
            })
        })
        .collect::<Result<Vec<_>>>()?;

    let debt_count: u8 = catalog
        .debts
        .len()
        .try_into()
        .map_err(|_| DebtProcessorError::InvalidDebtCount)?;

    emit!(crate::events::PlateCatalogInitialized {
        plate: catalog.plate.clone(),
        admin: catalog.admin,
        debt_count,
    });

    Ok(())
}
