# Pinocchio Secp256r1 Vault

## About

The Pinocchio Secp256r1 Vault is a Solana program that implements a secure vault system using secp256r1 cryptographic signatures. This program allows users to deposit SOL into a vault that can only be withdrawn with valid secp256r1 signature verification, providing an additional layer of security beyond standard Solana keypair authentication.

The vault uses Program Derived Addresses (PDAs) to create unique vault accounts for each secp256r1 public key, ensuring that only the holder of the corresponding private key can authorize withdrawals through cryptographic proof.

## Pinocchio

This project is built using [Pinocchio](https://github.com/anza-xyz/pinocchio), a high-performance Solana program development framework. Pinocchio offers several advantages:

- **Performance**: Optimized for speed and efficiency with minimal runtime overhead
- **Safety**: Memory-safe operations with compile-time checks
- **Simplicity**: Clean, minimal API that reduces boilerplate code
- **Size**: Smaller program binaries compared to traditional Anchor programs

## Secp256r1

Secp256r1 (also known as P-256 or prime256v1) is an elliptic curve used for digital signatures, commonly used in:

- **Web Standards**: TLS/SSL certificates, WebAuthn
- **Mobile**: iOS Secure Enclave, Android hardware security
- **Hardware**: Smart cards, TPMs (Trusted Platform Modules)

This vault implementation uses secp256r1 signatures to:
1. **Verify Identity**: Ensure only the private key holder can authorize withdrawals
2. **Cross-Platform Compatibility**: Enable integration with existing secp256r1 infrastructure
3. **Hardware Security**: Support hardware-backed key storage

The program validates secp256r1 signatures using Solana's built-in secp256r1 precompile program, which performs the cryptographic verification efficiently on-chain.

## Setup

### Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (v2.2.1+)
- [Node.js](https://nodejs.org/) (v18+)
- [Yarn](https://yarnpkg.com/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd blueshift_secp256r1_vault
   ```

2. **Install dependencies**:
   ```bash
   yarn install
   ```

3. **Build the program**:
   ```bash
   yarn build
   # or
   make build
   ```

4. **Generate TypeScript SDK**:
    This step generates TypeScript bindings for the program, allowing easy integration with JavaScript/TypeScript clients. Using [Codama](https://github.com/codama-idl/codama) that describes any Solana program in a powerful standardised format known as the Codama IDL. 
   ```bash
   yarn generate-sdks
   # or
   make generate-sdks
   ```

### Configuration

Set your Solana cluster:

```bash
# For local development
make set-config-local

# For devnet
make set-config-devnet
```

### Deployment

1. **Deploy to local validator**:
   ```bash
   # Start test validator (in separate terminal)
   make start-test-validator
   
   # Deploy program
   make deploy
   ```

## Tests with TS + Solana Test Validator

The project includes comprehensive TypeScript tests that run against a local Solana test validator, providing a realistic testing environment.

### Running the Tests

1. **Start the test validator**:
   ```bash
   yarn solana:test:validator
   # or
   make start-test-validator
   ```

2. **Run TypeScript tests**:
   ```bash
   yarn test
   # or
   make test
   ```

### Test Features

The TypeScript test suite ([tests/vault.test.ts](tests/vault.test.ts)) includes:

- **Secp256r1 Key Generation**: Creates test keypairs using Node.js crypto
- **Signature Generation**: Signs messages with secp256r1 private keys
- **Deposit Operations**: Tests depositing SOL into the vault
- **Withdrawal Operations**: Tests withdrawing SOL with signature verification
- **Error Handling**: Validates proper error responses for invalid signatures

### Key Test Components

- **Secp256r1 Program** ([tests/ecp256r1-program.ts](tests/ecp256r1-program.ts)): Helper functions for:
  - [`createInstructionWithPublicKey`](tests/ecp256r1-program.ts) - Create an secp256r1 instruction with a public key and signature. The public key must be a buffer that is 33 bytes long, and the signature must be a buffer of 64 bytes.

- **Secp256r1 Utilities** ([tests/secp256r1-sign.ts](tests/secp256r1-sign.ts)): Helper functions for:
  - [`signMessage`](tests/secp256r1-sign.ts) - Generate secp256r1 signatures
  - [`getCompressedPublicKey`](tests/secp256r1-sign.ts) - Convert public keys to compressed format
  - [`verifySignature`](tests/secp256r1-sign.ts) - Verify signatures offline

- **TypeScript SDK** ([sdk/ts/src/instructions/](sdk/ts/src/instructions/)): Auto-generated client code for:
  - [`deposit`](sdk/ts/src/instructions/deposit.ts) - Deposit instruction builder
  - [`withdraw`](sdk/ts/src/instructions/withdraw.ts) - Withdraw instruction builder

## Tests with LiteSVM

For faster iteration and unit testing, the project uses [LiteSVM](https://github.com/LiteSVM/litesvm) - a lightweight Solana Virtual Machine that runs tests without a full validator.

### Running LiteSVM Tests

```bash
make test-rust
# or
cargo test --features test --test vault
```

### LiteSVM Test Benefits

The Rust test suite ([tests/vault.rs](tests/vault.rs)) provides:

- **Speed**: Tests run in milliseconds instead of seconds
- **Isolation**: Each test runs in a clean environment
- **Debugging**: Better error messages and stack traces

### Test Coverage

The LiteSVM tests ([tests/vault.rs](tests/vault.rs)) cover:

1. **Deposit Flow** ([`test_deposit`](tests/vault.rs)):
   - Creates vault PDA from secp256r1 public key
   - Transfers SOL from payer to vault
   - Verifies account balances

2. **Withdrawal Flow** ([`test_withdraw`](tests/vault.rs)):
   - Validates secp256r1 signature verification
   - Transfers SOL from vault back to payer
   - Ensures proper authorization

### Test Constants

Key test data is defined in [tests/vault.rs](tests/vault.rs):

- [`PAYER`](tests/vault.rs) - Test wallet address
- [`ECDSA_PUBKEY`](tests/vault.rs) - Compressed secp256r1 public key
- [`MESSAGE`](tests/vault.rs) - Test message for signature verification
- [`SIGNATURE`](tests/vault.rs) - Valid secp256r1 signature

### Secp256r1 Instruction Verification

Both test suites validate secp256r1 instructions using the [`Secp256r1Instruction`](tests/vault.rs) type from the [`pinocchio-secp256r1-instruction`](Cargo.toml) crate, ensuring:

- Correct signature format and encoding
- Valid public key compression
- Proper message hash verification
- Integration with Solana's secp256r1 precompile

---

This vault demonstrates advanced Solana program development with modern cryptographic standards, providing a foundation for applications requiring hardware-backed or cross-platform signature verification.
