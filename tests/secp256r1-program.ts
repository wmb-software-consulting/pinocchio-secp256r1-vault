import { type Address as AddressType, type IInstruction } from "@solana/kit";
import assert from "assert";

const HEADER_BYTES = 2;
const PUBLIC_KEY_BYTES = 33;
const SIGNATURE_BYTES = 64;

/**
 * Params for creating an Secp256r1 instruction using a public key
 */
export type CreateSecp256r1InstructionWithPublicKeyParams = {
  publicKey: Uint8Array;
  message: Uint8Array;
  signature: Uint8Array;
};

export class Secp256r1Program {
  /**
   * @internal
   */
  constructor() {}

  /**
   * Public key that identifies the secp256r1 program
   */
  static programId =
    "Secp256r1SigVerify1111111111111111111111111" as AddressType;

  /**
   * Create an secp256r1 instruction with a public key and signature. The
   * public key must be a buffer that is 33 bytes long, and the signature
   * must be a buffer of 64 bytes.
   */
  static createInstructionWithPublicKey(
    params: CreateSecp256r1InstructionWithPublicKeyParams
  ): IInstruction {
    const { publicKey, message, signature } = params;

    assert(
      publicKey.length === PUBLIC_KEY_BYTES,
      `Public Key must be ${PUBLIC_KEY_BYTES} bytes but received ${publicKey.length} bytes`
    );

    assert(
      signature.length === SIGNATURE_BYTES,
      `Signature must be ${SIGNATURE_BYTES} bytes but received ${signature.length} bytes`
    );

    const messageDataSize = message.length;

    // Instruction index for data within the current instruction (0xffff = u16::MAX)
    const currentInstructionIndex = 0xffff;
 
    const numSignatures = 1; // As per Secp256r1InstructionHeader

    // Calculate the size of one Secp256r1SignatureOffsets struct
    const signatureOffsetsStructSize = 7 * 2; // 7 u16 fields, each 2 bytes = 14 bytes

    // The total size of the header + all signature offsets structures
    const offsetsSectionSize =
      HEADER_BYTES + numSignatures * signatureOffsetsStructSize;

    // Now, calculate the offsets for the actual data (pubkey, signature, message) 
    const public_key_offset = offsetsSectionSize; // Public key starts immediately after the offsets section
    const signature_offset = public_key_offset + PUBLIC_KEY_BYTES;
    const message_data_offset = signature_offset + SIGNATURE_BYTES;

    // 3. Assemble the instruction data buffer
    let instructionData: Buffer[] = [];

    // Header
    instructionData.push(Buffer.from([numSignatures, 0])); // num_signatures: u8

    // Secp256r1SignatureOffsets (for each signature)
    // For a single signature, we have one instance of this struct.
    instructionData.push(Secp256r1Program.toU16Bytes(signature_offset)); // signature_offset: u16
    instructionData.push(Secp256r1Program.toU16Bytes(currentInstructionIndex)); // signature_instruction_index: u16
    instructionData.push(Secp256r1Program.toU16Bytes(public_key_offset)); // public_key_offset: u16
    instructionData.push(Secp256r1Program.toU16Bytes(currentInstructionIndex)); // public_key_instruction_index: u16
    instructionData.push(Secp256r1Program.toU16Bytes(message_data_offset)); // message_data_offset: u16
    instructionData.push(Secp256r1Program.toU16Bytes(messageDataSize)); // message_data_size: u16
    instructionData.push(Secp256r1Program.toU16Bytes(currentInstructionIndex)); // message_instruction_index: u16

    // The actual raw data (pubkey, signature, message)
    instructionData.push(Buffer.from(publicKey));
    instructionData.push(Buffer.from(signature));
    instructionData.push(Buffer.from(message));

    const finalInstructionData = Buffer.concat(instructionData);

    return {
      accounts: [],
      programAddress: Secp256r1Program.programId,
      data: finalInstructionData,
    };
  }

  // Helper to convert u16 to little-endian bytes
  private static toU16Bytes(value: number): Buffer {
    const buf = Buffer.alloc(2);
    buf.writeUInt16LE(value, 0); // Write as Little Endian
    return buf;
  }
}
