use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ProtocolCounter {
    pub bump: u8,
    pub next_protocol_number: u64,
}

#[account]
#[derive(InitSpace)]
pub struct PlateDebtCatalog {
    pub bump: u8,
    #[max_len(7)]
    pub plate: String,
    pub admin: Pubkey,
    #[max_len(3)]
    pub debts: Vec<DebtEntry>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct DebtEntry {
    pub id: u8,
    #[max_len(32)]
    pub description: String,
    pub kind: DebtKind,
    pub value: u64,
    pub paid: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, PartialEq, Eq)]
pub enum DebtKind {
    Ipva,
    Licensing,
    Fine,
}

#[account]
#[derive(InitSpace)]
pub struct Receipt {
    pub bump: u8,
    pub protocol_number: u64,
    #[max_len(7)]
    pub plate: String,
    pub payer: Pubkey,
    #[max_len(2)]
    pub paid_debts: Vec<PaidDebtRecord>,
    pub total_value: u64,
    pub paid_at: i64,
    pub status: ReceiptStatus,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct PaidDebtRecord {
    pub debt_id: u8,
    #[max_len(32)]
    pub description: String,
    pub kind: DebtKind,
    pub value: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, PartialEq, Eq)]
pub enum ReceiptStatus {
    Paid,
}
