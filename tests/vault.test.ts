import * as program from "../sdk/ts/src/index";
import {
  createTransaction,
  createSolanaClient,
  Address as AddressType,
  signTransactionMessageWithSigners,
  getSignatureFromTransaction,
  getExplorerLink,
  getProgramDerivedAddress,
  Lamports,
  Signature,
  lamports,
  airdropFactory,
  createSolanaRpcSubscriptions,
  devnet,
  sendAndConfirmTransactionFactory,
  getAddressEncoder,
  ReadonlyUint8Array,
  FixedSizeEncoder,
  addEncoderSizePrefix,
  Encoder,
  getStructEncoder,
  getU32Encoder,
  getUtf8Encoder,
  getBaseXEncoder,
  fixEncoderSize,
  Address,
  getU8Encoder,
  getAddressDecoder,
  Rpc,
  SendAndConfirmTransactionWithSignersFunction,
  SimulateTransactionFunction,
  RpcFromTransport,
  SolanaRpcApiFromTransport,
  RpcTransportFromClusterUrl,
  ProgramDerivedAddressBump,
} from "gill";

import { generateKeyPairSigner, type KeyPairSigner } from "gill";
import { loadKeypairSignerFromFile } from "gill/node";
import {
  getAddMemoInstruction,
  getCreateAccountInstruction,
} from "gill/programs";
import { Secp256r1Program } from "./secp256r1-program";
import {
  addressToBytes,
  getBalance,
  hexToBytes,
  requestAirdrop,
  sleep,
  toU64Bytes,
} from "./utils";
import {
  generateKeyPair,
  generateSignature,
  getCompressedPublicKey,
} from "./secp256r1-sign";
import { KeyObject } from "crypto";
import assert from "assert";

const _1Sol = BigInt(1000000000); // 1 SOL = 1,000,000,000 lamports

describe("blueshift_secp256r1_vault", async () => {
  let signer: KeyPairSigner;
  let rpc: any;
  let sendAndConfirmTransaction: SendAndConfirmTransactionWithSignersFunction;
  let simulateTransaction: SimulateTransactionFunction;
  let ecdsaPrivateKey: KeyObject;
  let ecdsaPublicKey: Buffer<ArrayBufferLike>;
  let vaultAddress: AddressType<string>;
  let vaultBump: ProgramDerivedAddressBump;

  before(async () => {
    const client = createSolanaClient({
      urlOrMoniker: "localnet", // mainnet | devnet |  localnet
    });
    rpc = client.rpc;
    sendAndConfirmTransaction = client.sendAndConfirmTransaction;
    simulateTransaction = client.simulateTransaction;
    const { privateKeyObj, publicKeyObj } = generateKeyPair();
    ecdsaPrivateKey = privateKeyObj;
    signer = await generateKeyPairSigner();
    ecdsaPublicKey = getCompressedPublicKey(publicKeyObj);
    console.log("Signer address:", signer.address);

    await requestAirdrop(rpc, signer.address, _1Sol);

    const [_vaultAddress, _vaultBump] = await getProgramDerivedAddress({
      programAddress: program.BLUESHIFT_SECP256R1_VAULT_PROGRAM_ADDRESS,
      seeds: [
        "vault",
        new Uint8Array(ecdsaPublicKey.slice(0, 1)), // Use the first 1 bytes of the pubkey
        new Uint8Array(ecdsaPublicKey.slice(1, 33)), // Use the next 32 bytes of the pubkey
      ],
    });
    vaultAddress = _vaultAddress;
    vaultBump = _vaultBump;
    console.log("Vault address:", vaultAddress);

    // await requestAirdrop(rpc, vaultAddress, _1Sol);

    await sleep(1000);

    await getBalance(rpc, signer.address);
    await getBalance(rpc, vaultAddress);
  });

  it("should deposit", async () => {
    const ixDeposit = program.getDepositInstruction({
      payer: signer,
      pubkey: ecdsaPublicKey,
      vault: vaultAddress as AddressType,
      amount: BigInt(890880) as Lamports, // 0.00089088 SOL is the minimum deposit amount for the vault rent 
    });

    // get the latest blockhash
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const transaction = await signTransactionMessageWithSigners(
      createTransaction({
        version: 0,
        instructions: [ixDeposit],
        feePayer: signer,
        latestBlockhash,
        computeUnitLimit: 500000,
        computeUnitPrice: 10000,
      })
    );

    const simulation = await simulateTransaction(transaction);

    console.log("Simulation: ", simulation.value.err, simulation);
    const signature = await sendAndConfirmTransaction(transaction);

    console.log(
      "Explorer:",
      getExplorerLink({
        cluster: "localhost",
        transaction: signature,
      })
    );
  });

  it("should withdraw", async () => {
    const ixWithdraw = program.getWithdrawInstruction({
      payer: signer,
      vault: vaultAddress as AddressType,
      bump: vaultBump,
    });

    const payerBytes = addressToBytes(signer.address);
    const expiration = BigInt(
      ((Date.now() + 1000 * 60 * 60) / 1000).toFixed(0)
    ); // 1 hour from now
    const expirationBytes = toU64Bytes(expiration); // Example expiration time in milliseconds

    // generate message to sign
    const message = Buffer.concat([payerBytes, expirationBytes]);

    const { rawSignature } = generateSignature(message, ecdsaPrivateKey);

    const ixSecp256r1 = Secp256r1Program.createInstructionWithPublicKey({
      message,
      signature: rawSignature,
      publicKey: ecdsaPublicKey,
    });

    // get the latest blockhash
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const transaction = await signTransactionMessageWithSigners(
      createTransaction({
        version: 0,
        instructions: [ixWithdraw, ixSecp256r1],
        feePayer: signer,
        latestBlockhash,
        computeUnitLimit: 500000,
        computeUnitPrice: 10000,
      })
    );

    const simulation = await simulateTransaction(transaction);

    console.log("Simulation: ", simulation.value.err, simulation);
    const signature = await sendAndConfirmTransaction(transaction);

    console.log(
      "Explorer:",
      getExplorerLink({
        cluster: "localhost",
        transaction: signature,
      })
    );
  });
});
