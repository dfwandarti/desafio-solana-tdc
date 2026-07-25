use anchor_lang::prelude::*;

#[error_code]
pub enum DebtProcessorError {
    #[msg("Plate must be 1-7 characters")]
    InvalidPlate,
    #[msg("A catalog must have between 1 and 3 debts")]
    InvalidDebtCount,
    #[msg("Selection must be exactly 1 or 2 debts")]
    InvalidSelectionCount,
    #[msg("Duplicate debt id in selection")]
    DuplicateDebtSelection,
    #[msg("Debt id not found in catalog")]
    DebtNotFound,
    #[msg("Debt already paid")]
    DebtAlreadyPaid,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}
