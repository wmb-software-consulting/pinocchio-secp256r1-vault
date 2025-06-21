import {
  // renderJavaScriptUmiVisitor,
  renderJavaScriptVisitor,
  renderRustVisitor,
} from "@codama/renderers";
import {
  // accountNode,
  // booleanTypeNode,
  bytesTypeNode,
  constantDiscriminatorNode,
  constantValueNode,
  createFromRoot,
  fixedSizeTypeNode,
  instructionAccountNode,
  instructionArgumentNode,
  instructionNode,
  numberTypeNode,
  numberValueNode,
  // optionTypeNode,
  programNode,
  // publicKeyTypeNode,
  publicKeyValueNode,
  rootNode,
  // sizeDiscriminatorNode,
  // sizePrefixTypeNode,
  // stringTypeNode,
  // structFieldTypeNode,
  // structTypeNode,
} from "codama";
import path from "path";
import fs from "fs";

// const rustClientsDir = path.join(__dirname, "..", "sdk", "rust");
const typescriptClientsDir = path.join(__dirname, "..", "sdk", "ts");

const root = rootNode(
  programNode({
    name: "blueshift-secp256r1-vault",
    publicKey: "91tm9dq8Q3bb73eKQJZqKYr5BzftiMuybrdvKeBy1U6x",
    version: "1.0.0",
    accounts: [],
    instructions: [
      instructionNode({
        name: "deposit",
        discriminators: [
          constantDiscriminatorNode(
            constantValueNode(numberTypeNode("u8"), numberValueNode(0))
          ),
        ],
        arguments: [
          instructionArgumentNode({
            name: "discriminator",
            type: numberTypeNode("u8"),
            defaultValue: numberValueNode(0),
            defaultValueStrategy: "omitted",
          }),
          instructionArgumentNode({
            name: "pubkey",
            type: fixedSizeTypeNode(bytesTypeNode(), 40),
          }),
          instructionArgumentNode({
            name: "amount",
            type: numberTypeNode("u64"),
          }),
        ],
        accounts: [
          instructionAccountNode({
            name: "payer",
            isSigner: true,
            isWritable: true,
            docs: ["payer of the transaction"],
          }),
          instructionAccountNode({
            name: "vault",
            isSigner: false,
            isWritable: true,
            docs: ["Vault account to deposit into"],
          }),
          instructionAccountNode({
            name: "systemProgram",
            defaultValue: publicKeyValueNode(
              "11111111111111111111111111111111",
              "systemProgram"
            ),
            isSigner: false,
            isWritable: false,
            docs: ["System Program used to open our new class account"],
          }),
        ],
      }),
      instructionNode({
        name: "withdraw",
        discriminators: [
          constantDiscriminatorNode(
            constantValueNode(numberTypeNode("u8"), numberValueNode(1))
          ),
        ],
        arguments: [
          instructionArgumentNode({
            name: "discriminator",
            type: numberTypeNode("u8"),
            defaultValue: numberValueNode(1),
            defaultValueStrategy: "omitted",
          }),
          instructionArgumentNode({
            name: "bump",
            type: numberTypeNode("u8"),
          }),
        ],
        accounts: [
          instructionAccountNode({
            name: "payer",
            isSigner: true,
            isWritable: true,
            docs: ["payer of the transaction"],
          }),
          instructionAccountNode({
            name: "vault",
            isSigner: false,
            isWritable: true,
            docs: ["Vault account to deposit into"],
          }),
          instructionAccountNode({
            name: "instructions",
            defaultValue: publicKeyValueNode(
              "Sysvar1nstructions1111111111111111111111111",
              "sysvarInstructions"
            ),
            isSigner: false,
            isWritable: false,
            docs: ["Sysvar Instructions account used to get the instructions"],
          }),
          instructionAccountNode({
            name: "systemProgram",
            defaultValue: publicKeyValueNode(
              "11111111111111111111111111111111",
              "systemProgram"
            ),
            isSigner: false,
            isWritable: false,
            docs: ["System Program used to open our new class account"],
          }),
        ],
      }),
    ],
  })
);

function preserveConfigFiles() {
  const filesToPreserve = [
    "package.json",
    "tsconfig.json",
    ".npmignore",
    "pnpm-lock.yaml",
    "Cargo.toml",
  ];
  const preservedFiles = new Map();

  filesToPreserve.forEach((filename) => {
    const filePath = path.join(typescriptClientsDir, filename);
    const tempPath = path.join(typescriptClientsDir, `${filename}.temp`);

    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, tempPath);
      preservedFiles.set(filename, tempPath);
    }
  });

  return {
    restore: () => {
      preservedFiles.forEach((tempPath, filename) => {
        const filePath = path.join(typescriptClientsDir, filename);
        if (fs.existsSync(tempPath)) {
          fs.copyFileSync(tempPath, filePath);
          fs.unlinkSync(tempPath);
        }
      });
    },
  };
}

const codama = createFromRoot(root);

const configPreserver = preserveConfigFiles();

codama.accept(renderJavaScriptVisitor("sdk/ts/src", { formatCode: true }));
codama.accept(
  renderRustVisitor("sdk/rust/src/client", {
    crateFolder: "sdk/rust/",
    formatCode: true,
  })
);
