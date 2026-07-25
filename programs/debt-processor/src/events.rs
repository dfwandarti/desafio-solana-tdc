use anchor_lang::prelude::*;

#[event]
pub struct DebtsPaid {
    pub plate: String,
    pub protocol_number: u64,
    pub payer: Pubkey,
    pub debt_ids: Vec<u8>,
    pub total_value: u64,
    pub paid_at: i64,
}

#[event]
pub struct PlateCatalogInitialized {
    pub plate: String,
    pub admin: Pubkey,
    pub debt_count: u8,
}
