import {
  generateKeyPairSync,
  createSign,
  createVerify,
  createPrivateKey,
  createPublicKey,
  createECDH,
  KeyObject,
} from "crypto";

const HASH = "sha256";

export const generateKeyPair = (): {
  privateKey: string;
  publicKey: string;
  privateKeyObj: KeyObject;
  publicKeyObj: KeyObject;
} => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "sec1", format: "pem" },
  });
  const privateKeyObj = createPrivateKey(privateKey);
  const publicKeyObj = createPublicKey(privateKeyObj);
  return {
    publicKey,
    privateKey,
    privateKeyObj,
    publicKeyObj,
  };
};

export const generateSignature = (
  message: Buffer,
  privateKey: string | KeyObject
): {
  derSignature: Buffer<ArrayBufferLike>;
  rawSignature: Buffer<ArrayBufferLike>;
} => {
  const sign = createSign(HASH);
  sign.write(message);
  sign.end();
  let derSignature = Buffer.from([]);
  if (typeof privateKey === "string") {
    derSignature = sign.sign(privateKey);
  } else if (privateKey instanceof KeyObject) {
    derSignature = sign.sign(
      privateKey.export({ type: "sec1", format: "pem" })
    );
  } else {
    throw new Error("Invalid private key type");
  }
  return {
    derSignature,
    rawSignature: derSignatureToRaw(derSignature),
  };
};

export const getCompressedPublicKey = (
  publicKeyObj: KeyObject
): Buffer<ArrayBufferLike> => {
  const publicKeyDer = publicKeyObj.export({
    type: "spki",
    format: "der",
  });
  const uncompressedKey = publicKeyDer.slice(-65);
  if (uncompressedKey[0] !== 0x04) {
    throw new Error("Expected uncompressed public key format (0x04 prefix)");
  }
  const x = uncompressedKey.slice(1, 33);
  const y = uncompressedKey.slice(33, 65);

  // Determine the prefix for compressed key
  // 0x02 if y is even, 0x03 if y is odd
  const prefix = y[y.length - 1] % 2 === 0 ? 0x02 : 0x03;

  return Buffer.concat([Buffer.from([prefix]), x]);
};

export const verifySignature = (
  message: Buffer,
  publicKeyPem: string,
  derSignature: string
): boolean => {
  const verify = createVerify(HASH);
  verify.write(message);
  verify.end();

  return verify.verify(publicKeyPem, derSignature, "hex");
};

export const createPrivateKeyPemFromHex = (hexKey: string) => {
  // For secp256r1, create proper ASN.1 DER structure
  const privateKeyBuffer = Buffer.from(hexKey, "hex");

  // ASN.1 DER structure for secp256r1 private key
  const derHeader = Buffer.from([
    0x30,
    0x77, // SEQUENCE, length 119
    0x02,
    0x01,
    0x01, // INTEGER version 1
    0x04,
    0x20, // OCTET STRING, length 32 (private key)
  ]);

  const derMiddle = Buffer.from([
    0xa0,
    0x0a, // context specific [0], length 10
    0x06,
    0x08, // OID, length 8
    0x2a,
    0x86,
    0x48,
    0xce,
    0x3d,
    0x03,
    0x01,
    0x07, // secp256r1 OID
    0xa1,
    0x44, // context specific [1], length 68
    0x03,
    0x42,
    0x00, // BIT STRING, length 66, unused bits 0
  ]);

  // Get public key point (we need to generate this from private key)
  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(hexKey, "hex");
  const publicKeyUncompressed = ecdh.getPublicKey();

  const derStructure = Buffer.concat([
    derHeader,
    privateKeyBuffer,
    derMiddle,
    publicKeyUncompressed,
  ]);

  const base64Der = derStructure.toString("base64");
  const pemLines = [
    "-----BEGIN EC PRIVATE KEY-----",
    ...base64Der.match(/.{1,64}/g),
    "-----END EC PRIVATE KEY-----",
  ];

  return pemLines.join("\n");
};

// Convert DER signature to raw 64-byte signature (r || s)
const derSignatureToRaw = (derSignature: Buffer<ArrayBufferLike>) => {
  let offset = 0;

  // Check if it starts with 0x30 (SEQUENCE)
  if (derSignature[offset] !== 0x30) {
    throw new Error("Invalid DER signature format");
  }
  offset += 1;

  // Skip total length
  const totalLength = derSignature[offset];
  offset += 1;

  // Read r
  if (derSignature[offset] !== 0x02) {
    throw new Error("Expected INTEGER for r component");
  }
  offset += 1;

  const rLength = derSignature[offset];
  offset += 1;

  let r = derSignature.slice(offset, offset + rLength);
  offset += rLength;

  // Read s
  if (derSignature[offset] !== 0x02) {
    throw new Error("Expected INTEGER for s component");
  }
  offset += 1;

  const sLength = derSignature[offset];
  offset += 1;

  let s = derSignature.slice(offset, offset + sLength);

  // Remove leading zeros if present (DER encoding adds 0x00 for positive numbers)
  if (r.length > 32 && r[0] === 0x00) {
    r = r.slice(1);
  }
  if (s.length > 32 && s[0] === 0x00) {
    s = s.slice(1);
  }

  // Pad to 32 bytes if needed
  const paddedR = Buffer.alloc(32, 0);
  r.copy(paddedR, 32 - r.length);

  const paddedS = Buffer.alloc(32, 0);
  s.copy(paddedS, 32 - s.length);

  return Buffer.concat([paddedR, paddedS]);
};
