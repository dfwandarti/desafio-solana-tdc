use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

pub use instructions::init_plate_catalog::DebtInput;
pub use state::*;

declare_id!("12RNZJUaef67voHzcrQ7nXYrTyrCUKb7gVeZDyTjDeqx");

#[program]
pub mod debt_processor {
    use super::*;

    pub fn initialize_protocol_counter(ctx: Context<InitializeProtocolCounter>) -> Result<()> {
        instructions::initialize_protocol_counter(ctx)
    }

    pub fn init_plate_catalog(
        ctx: Context<InitPlateCatalog>,
        plate: String,
        debts: Vec<DebtInput>,
    ) -> Result<()> {
        instructions::init_plate_catalog(ctx, plate, debts)
    }

    pub fn process_payment(
        ctx: Context<ProcessPayment>,
        plate: String,
        debt_ids: Vec<u8>,
    ) -> Result<()> {
        instructions::process_payment(ctx, plate, debt_ids)
    }
}
