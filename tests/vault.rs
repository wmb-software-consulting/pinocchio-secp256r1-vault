#![allow(deprecated)]

use litesvm::LiteSVM;
use std::path::Path;
use pinocchio_secp256r1_instruction::{ Secp256r1Instruction, SECP256R1_PROGRAM_ID };
use solana_sdk::message::Message;
use solana_sdk::native_token::LAMPORTS_PER_SOL;
use solana_sdk::signature::Keypair;
use solana_sdk::system_program;
use solana_sdk::transaction::Transaction;
use solana_sdk::{ pubkey, instruction::{ AccountMeta, Instruction }, pubkey::Pubkey };

use blueshift_secp256r1_vault::{
    Deposit,
    DepositInstructionData,
    Withdraw,
    WithdrawInstructionData,
    ID as ID,
};


pub const PROGRAM: Pubkey = Pubkey::new_from_array(ID);

pub const SYSVAR_INSTRUCTIONS: Pubkey = pubkey!("Sysvar1nstructions1111111111111111111111111");

pub const PAYER: Pubkey = pubkey!("DxaZaBY5JFzjHfFHrVYvvBC9qpoMM72N57xHHQv7waKR");

pub const ECDSA_PUBKEY: [u8; 33] = [
    3, 172, 70, 103, 66, 57, 25, 154, 9, 234, 221, 115, 82, 145, 195, 243, 193, 169, 97, 224, 172, 8,
    188, 113, 47, 145, 65, 157, 47, 247, 55, 93, 167,
];

pub const MESSAGE: [u8; 40] = [
    192, 137, 34, 197, 88, 144, 3, 148, 41, 206, 133, 146, 18, 235, 53, 113, 123, 240, 28, 197,
    208, 115, 116, 208, 56, 16, 103, 77, 97, 184, 232, 128, 81, 126, 135, 224, 1, 0, 0, 0,
];

pub const SIGNATURE: [u8; 64] = [
    19, 247, 209, 135, 92, 230, 15, 129, 117, 242, 57, 135, 118, 128, 185, 85, 71, 92, 58, 14, 208, 165,
    21, 11, 40, 249, 133, 100, 198, 80, 36, 124, 118, 93, 56, 53, 234, 243, 187, 196, 171, 24, 97, 201,
    64, 166, 82, 84, 223, 37, 40, 224, 63, 103, 226, 60, 149, 179, 129, 20, 42, 6, 77, 24,
];

pub const HEADER: [u8; 16] = [
    // Header
    0x01,
    0x00, // Num signatures
    // Offsets
    0x31,
    0x00, // Offset to signature (49 bytes)
    0xff,
    0xff, // Current IX (u16::MAX)
    0x10,
    0x00, // Offset to pubkey (16 bytes)
    0xff,
    0xff, // Current IX (u16::MAX)
    0x71,
    0x00, // Offset to message data (113)
    0x28,
    0x00, // Message data size (40 bytes)
    0xff,
    0xff, // Current IX (u16::MAX)
];

fn setup() -> (LiteSVM, Keypair) {
    let mut svm = LiteSVM::new();
    let bytes = include_bytes!("../target/deploy/blueshift_secp256r1_vault.so");
    svm.add_program(PROGRAM, bytes);

    let wallet_json = Path::new("./tests/my-test-wallet.json");
    let file_contents = std::fs
        ::read_to_string(wallet_json)
        .expect("Failed to read payer keypair file");
    let keypair_bytes: Vec<u8> = serde_json
        ::from_str(&file_contents)
        .expect("Failed to parse JSON keypair");
    let payer_keypair = Keypair::from_bytes(&keypair_bytes).expect("Failed to parse payer keypair");
    svm.airdrop(&PAYER, 10 * LAMPORTS_PER_SOL).unwrap();

    (svm, payer_keypair)
}

#[test]
fn test_deposit() {
    let (mut svm, payer_keypair) = setup();
    let (vault, _) = solana_sdk::pubkey::Pubkey::find_program_address(
        &[b"vault", ECDSA_PUBKEY[..1].as_ref(), ECDSA_PUBKEY[1..33].as_ref()],
        &PROGRAM
    );

    // Create the instruction data
    let instruction_data = DepositInstructionData {
        pubkey: ECDSA_PUBKEY,
        amount: 1 * LAMPORTS_PER_SOL,
    };

    // instruction discriminator = 0
    let mut ser_instruction_data = vec![*Deposit::DISCRIMINATOR];
    ser_instruction_data.extend_from_slice(unsafe {
        to_bytes::<DepositInstructionData>(&instruction_data)
    });

    let instruction = Instruction::new_with_bytes(
        PROGRAM,
        &ser_instruction_data,
        vec![
            AccountMeta::new(PAYER, true),
            AccountMeta::new(vault, false),
            AccountMeta::new_readonly(system_program::ID, false)
        ]
    );

    let tx = Transaction::new(
        &[&payer_keypair],
        Message::new(&[instruction], Some(&PAYER)),
        svm.latest_blockhash()
    );

    let result = svm.send_transaction(tx);
    assert!(result.is_ok(), "Transaction failed: {:?}", result);

    let payer_account = svm.get_account(&PAYER).unwrap();
    assert_eq!(payer_account.lamports, 8999995000);

    let vault_account = svm.get_account(&vault).unwrap();
    assert_eq!(vault_account.lamports, 1 * LAMPORTS_PER_SOL);
}

#[test]
fn test_withdraw() {
    let (mut svm, payer_keypair) = setup();

    let (vault, vault_bump) = solana_sdk::pubkey::Pubkey::find_program_address(
        &[b"vault", ECDSA_PUBKEY[..1].as_ref(), ECDSA_PUBKEY[1..33].as_ref()],
        &PROGRAM
    );
    svm.airdrop(&vault, 1 * LAMPORTS_PER_SOL).unwrap();

    // Create the instruction data
    let instruction_data = WithdrawInstructionData {
        bump: [vault_bump],
    };

    // instruction discriminator = 1
    let mut ser_instruction_data = vec![*Withdraw::DISCRIMINATOR];
    ser_instruction_data.extend_from_slice(unsafe {
        to_bytes::<WithdrawInstructionData>(&instruction_data)
    });

    let instruction = Instruction::new_with_bytes(
        PROGRAM,
        &ser_instruction_data,
        vec![
            AccountMeta::new(PAYER, true),
            AccountMeta::new(vault, false),
            AccountMeta::new_readonly(SYSVAR_INSTRUCTIONS, false),
            AccountMeta::new_readonly(system_program::ID, false)
        ]
    );
    let test_data: [u8; 153] = {
        let mut data = [0u8; 153];
        data[..16].copy_from_slice(&HEADER);
        data[16..49].copy_from_slice(&ECDSA_PUBKEY);
        data[49..113].copy_from_slice(&SIGNATURE);
        data[113..153].copy_from_slice(&MESSAGE);
        data
    };

    // Check if the instruction data is correct
    let secp256r1_ix = Secp256r1Instruction::try_from(&test_data[..]);
    if secp256r1_ix.is_err() {
        panic!("Failed to create Secp256r1Instruction: {:?}", secp256r1_ix.err());
    }
    let secp256r1_ix = secp256r1_ix.unwrap();
    assert_eq!(secp256r1_ix.num_signatures(), 1);
    assert_eq!(secp256r1_ix.get_signer(0).unwrap(), &ECDSA_PUBKEY);
    assert_eq!(secp256r1_ix.get_signature(0).unwrap(), &SIGNATURE);
    assert_eq!(secp256r1_ix.get_message_data(0).unwrap(), &MESSAGE);

    let secp_instruction: Instruction = Instruction::new_with_bytes(
        Pubkey::new_from_array(SECP256R1_PROGRAM_ID),
        &test_data,
        vec![]
    );

    let tx = Transaction::new(
        &[&payer_keypair],
        Message::new(&[instruction, secp_instruction], Some(&PAYER)),
        svm.latest_blockhash()
    );
    let result = svm.send_transaction(tx);
    assert!(result.is_ok(), "Transaction failed: {:?}", result);

    let payer_account = svm.get_account(&PAYER).unwrap();
    assert_eq!(payer_account.lamports, 10999990000);

    let vault_account = svm.get_account(&vault).unwrap();
    assert_eq!(vault_account.lamports, 0 * LAMPORTS_PER_SOL);
}

unsafe fn to_bytes<T>(data: &T) -> &[u8] {
    core::slice::from_raw_parts(data as *const T as *const u8, size_of::<T>())
}
