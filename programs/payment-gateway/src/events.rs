use anchor_lang::prelude::*;

#[event]
pub struct PaymentInitiated {
    pub plate: String,
    pub debt_ids: Vec<u8>,
    pub payer: Pubkey,
}
