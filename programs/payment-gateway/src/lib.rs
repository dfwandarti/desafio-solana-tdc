use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;

use instructions::*;

declare_id!("ANvzcQ5NXzbmCUf2jyK74154axCQheV7iVFKkNyhwcoi");
declare_program!(debt_processor);

#[program]
pub mod payment_gateway {
    use super::*;

    pub fn pay_debts(ctx: Context<PayDebts>, plate: String, debt_ids: Vec<u8>) -> Result<()> {
        instructions::pay_debts(ctx, plate, debt_ids)
    }
}
