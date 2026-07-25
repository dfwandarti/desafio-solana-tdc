use anchor_lang::prelude::*;

#[error_code]
pub enum PaymentGatewayError {
    #[msg("Plate must be 1-7 characters")]
    InvalidPlate,
    #[msg("Selection must be exactly 1 or 2 debts")]
    InvalidSelectionCount,
}
