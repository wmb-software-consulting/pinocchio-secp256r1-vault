use core::{ mem::size_of, ptr };

use pinocchio::{
    account_info::AccountInfo,
    program_error::ProgramError,
    pubkey::{ find_program_address },
    sysvars::Sysvar,
    ProgramResult,
};
use pinocchio_secp256r1_instruction::Secp256r1Pubkey;
use pinocchio_system::instructions::Transfer;

pub struct DepositAccounts<'a> {
    pub payer: &'a AccountInfo,
    pub vault: &'a AccountInfo,
}

impl<'a> TryFrom<&'a [AccountInfo]> for DepositAccounts<'a> {
    type Error = ProgramError;

    fn try_from(accounts: &'a [AccountInfo]) -> Result<Self, Self::Error> {
        let [payer, vault, _] = accounts else {
            return Err(ProgramError::NotEnoughAccountKeys);
        };

        // Accounts Checks
        if !payer.is_signer() {
            return Err(ProgramError::InvalidAccountOwner);
        }

        if !payer.is_owned_by(&pinocchio_system::ID) {
            return Err(ProgramError::InvalidAccountOwner);
        }

        if payer.lamports().eq(&0) {
            return Err(ProgramError::InvalidAccountData);
        }

        if !vault.is_owned_by(&pinocchio_system::ID) {
            return Err(ProgramError::InvalidAccountOwner);
        }

        if vault.lamports().ne(&0) {
            return Err(ProgramError::InvalidAccountData);
        }

        // Return the accounts
        Ok(Self { payer, vault })
    }
}

#[repr(C, packed)] // Ensure the struct is packed to avoid padding issues
pub struct DepositInstructionData {
    pub pubkey: Secp256r1Pubkey,
    pub amount: u64,
}

impl<'a> TryFrom<&'a [u8]> for DepositInstructionData {
    type Error = ProgramError;

    fn try_from(data: &'a [u8]) -> Result<Self, Self::Error> {
        if data.len() != size_of::<DepositInstructionData>() {
            return Err(ProgramError::InvalidInstructionData);
        }
        let pubkey = unsafe {
            ptr::read(data.as_ptr() as *const [u8; size_of::<Secp256r1Pubkey>()])
        };
        let amount = unsafe {
            ptr::read(data.as_ptr().add(size_of::<Secp256r1Pubkey>()) as *const u64)
        };
        Ok(Self { pubkey, amount })
    }
}

pub struct Deposit<'a> {
    pub accounts: DepositAccounts<'a>,
    pub instruction_data: DepositInstructionData,
}

impl<'a> TryFrom<(&'a [u8], &'a [AccountInfo])> for Deposit<'a> {
    type Error = ProgramError;

    fn try_from((data, accounts): (&'a [u8], &'a [AccountInfo])) -> Result<Self, Self::Error> {
        let accounts = DepositAccounts::try_from(accounts)?;
        let instruction_data = DepositInstructionData::try_from(data)?;

        Ok(Self {
            accounts,
            instruction_data,
        })
    }
}

impl<'a> Deposit<'a> {
    pub const DISCRIMINATOR: &'a u8 = &0;

    pub fn process(&mut self) -> ProgramResult {
        // Check vault address
        let (vault_key, _) = find_program_address(
            &[b"vault", &self.instruction_data.pubkey[..1], &self.instruction_data.pubkey[1..33]],
            &crate::ID
        );
        if vault_key.ne(self.accounts.vault.key()) {
            return Err(ProgramError::InvalidAccountOwner);
        }

        let amount = self.instruction_data.amount;
        // Calculate minimum rent for the vault account
        let rent_exempt_minimum = pinocchio::sysvars::rent::Rent
            ::get()?
            .minimum_balance(self.accounts.vault.data_len());
        pinocchio_log::log!(
            "Depositing: {} (+ {} for rent vault account)",
            amount,
            rent_exempt_minimum
        );
        (Transfer {
            from: self.accounts.payer,
            to: self.accounts.vault,
            lamports: amount,
        }).invoke()?;

        Ok(())
    }
}
