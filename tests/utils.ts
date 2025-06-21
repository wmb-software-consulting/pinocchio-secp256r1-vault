import {
  Address,
  getAddressEncoder,
  ReadonlyUint8Array,
  getAddressDecoder,
  Lamports,
} from "gill";

// // Convert hex string to Uint8Array
export const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
};

// Helper to convert u64 to little-endian bytes
export const toU64Bytes = (value: bigint): Buffer => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(value, 0); // Write as Little Endian
  return buf;
};

// Helper to convert Address to bytes
export const addressToBytes = (address: Address): Uint8Array => {
  const addressEncoder = getAddressEncoder();
  return new Uint8Array(addressEncoder.encode(address));
};

// Helper to convert bytes to Address
export const bytestoAddress = (address: Uint8Array): Address => {
  const addressEncoder = getAddressDecoder();
  return addressEncoder.decode(address);
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const getBalance = async (
  rpc: any,
  address: Address
): Promise<Lamports> => {
  const balance = await rpc.getBalance(address).send();
  console.log("Address :", address, "Balance :", balance.value, "lamports");
  return balance.value;
};

export const requestAirdrop = async (
  rpc: any,
  address: Address,
  amount: bigint
): Promise<string> => {
  return await rpc
    .requestAirdrop(address, amount as Lamports, {
      commitment: "committed",
    })
    .send();
};
