import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { assertReadableP12 } from "@/lib/sri-signer";

const storageRoot = path.join(process.cwd(), "storage", "sri", "signatures");
const allowedExtensions = new Set([".p12", ".pfx"]);
const maxSignatureSize = 5 * 1024 * 1024;
const encryptedFileMagic = Buffer.from("EMILYSRI1");

function encryptionSecret() {
  const secret = process.env.SIGNATURE_ENCRYPTION_SECRET || process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("Configura AUTH_SECRET o SIGNATURE_ENCRYPTION_SECRET con al menos 16 caracteres.");
  }
  return secret;
}

function encryptionKey() {
  return scryptSync(encryptionSecret(), "emily-sri-signature-password", 32);
}

export function encryptSignaturePassword(password: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptSignaturePassword(payload: string) {
  const [ivValue, tagValue, encryptedValue] = payload.split(":");
  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error("La clave de la firma no tiene un formato seguro valido.");
  }

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function encryptSignatureFileBuffer(buffer: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([encryptedFileMagic, iv, tag, encrypted]);
}

function decryptSignatureFileBuffer(buffer: Buffer) {
  if (!buffer.subarray(0, encryptedFileMagic.length).equals(encryptedFileMagic)) {
    return buffer;
  }

  const ivStart = encryptedFileMagic.length;
  const tagStart = ivStart + 12;
  const encryptedStart = tagStart + 16;
  const iv = buffer.subarray(ivStart, tagStart);
  const tag = buffer.subarray(tagStart, encryptedStart);
  const encrypted = buffer.subarray(encryptedStart);

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

export function validateSignatureFile(file: File) {
  const extension = path.extname(file.name).toLowerCase();
  if (!allowedExtensions.has(extension)) {
    throw new Error("La firma electronica debe ser un archivo .p12 o .pfx.");
  }
  if (file.size <= 0) {
    throw new Error("Selecciona un archivo de firma valido.");
  }
  if (file.size > maxSignatureSize) {
    throw new Error("La firma electronica no debe superar 5 MB.");
  }
}

export async function saveSignatureFile(file: File, ruc: string, password: string) {
  validateSignatureFile(file);
  await mkdir(storageRoot, { recursive: true });

  const extension = path.extname(file.name).toLowerCase();
  const safeRuc = ruc.replace(/\D/g, "") || "empresa";
  const storedName = `${safeRuc}-${Date.now()}-${randomBytes(6).toString("hex")}${extension}.enc`;
  const absolutePath = path.join(storageRoot, storedName);
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  assertReadableP12(fileBuffer, password);
  await writeFile(absolutePath, encryptSignatureFileBuffer(fileBuffer), { mode: 0o600 });

  return {
    originalName: file.name,
    path: absolutePath,
  };
}

export async function readSignatureFileBuffer(filePath: string) {
  const resolvedRoot = path.resolve(storageRoot);
  const resolvedPath = path.resolve(filePath);
  const relativePath = path.relative(resolvedRoot, resolvedPath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("La ruta de la firma electronica no es valida.");
  }

  return decryptSignatureFileBuffer(await readFile(resolvedPath));
}

export async function removeSignatureFile(filePath?: string | null) {
  if (!filePath) return;

  const resolvedRoot = path.resolve(storageRoot);
  const resolvedPath = path.resolve(filePath);
  const relativePath = path.relative(resolvedRoot, resolvedPath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) return;

  try {
    await unlink(resolvedPath);
  } catch {
    // If the file was already removed, the database cleanup can still continue.
  }
}
