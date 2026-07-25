use anchor_lang::prelude::*;

use crate::state::ProtocolCounter;

#[derive(Accounts)]
pub struct InitializeProtocolCounter<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = ProtocolCounter::DISCRIMINATOR.len() + ProtocolCounter::INIT_SPACE,
        seeds = [b"protocol_counter"],
        bump
    )]
    pub protocol_counter: Account<'info, ProtocolCounter>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_protocol_counter(ctx: Context<InitializeProtocolCounter>) -> Result<()> {
    let protocol_counter = &mut ctx.accounts.protocol_counter;
    protocol_counter.bump = ctx.bumps.protocol_counter;
    protocol_counter.next_protocol_number = 1;
    Ok(())
}
