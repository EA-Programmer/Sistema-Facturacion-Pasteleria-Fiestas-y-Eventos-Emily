import type { BillingCustomer, CustomerDocumentType } from "@/types/customer";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passportPattern = /^[A-Za-z0-9-]{4,20}$/;

export class AppValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppValidationError";
  }
}

export function failValidation(message: string): never {
  throw new AppValidationError(message);
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidEmail(value: string) {
  return emailPattern.test(value.trim());
}

export function isValidEcuadorCedula(value: string) {
  const digits = onlyDigits(value);
  if (!/^\d{10}$/.test(digits)) return false;

  const province = Number(digits.slice(0, 2));
  const thirdDigit = Number(digits[2]);
  if (province < 1 || province > 24 || thirdDigit > 5) return false;

  const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  const total = coefficients.reduce((sum, coefficient, index) => {
    const product = Number(digits[index]) * coefficient;
    return sum + (product >= 10 ? product - 9 : product);
  }, 0);
  const verifier = total % 10 === 0 ? 0 : 10 - (total % 10);

  return verifier === Number(digits[9]);
}

export function isValidEcuadorRuc(value: string) {
  const digits = onlyDigits(value);
  if (!/^\d{13}$/.test(digits) || !digits.endsWith("001")) return false;

  const thirdDigit = Number(digits[2]);
  const naturalPersonRuc = thirdDigit < 6 && isValidEcuadorCedula(digits.slice(0, 10));
  const privateCompanyRuc = thirdDigit === 9 && validateRucChecksum(digits, [4, 3, 2, 7, 6, 5, 4, 3, 2], 10);
  const publicCompanyRuc = thirdDigit === 6 && validateRucChecksum(digits, [3, 2, 7, 6, 5, 4, 3, 2], 9);

  return naturalPersonRuc || privateCompanyRuc || publicCompanyRuc;
}

function validateRucChecksum(digits: string, coefficients: number[], verifierPosition: number) {
  const total = coefficients.reduce((sum, coefficient, index) => {
    return sum + Number(digits[index]) * coefficient;
  }, 0);
  const remainder = total % 11;
  const verifier = remainder === 0 ? 0 : 11 - remainder;

  return verifier === Number(digits[verifierPosition]);
}

export function validateCustomerDocument(type: CustomerDocumentType, document: string) {
  const trimmed = document.trim();

  if (type === "CONSUMIDOR_FINAL") {
    return trimmed === "9999999999999";
  }

  if (type === "CEDULA") return isValidEcuadorCedula(trimmed);
  if (type === "RUC") return isValidEcuadorRuc(trimmed);
  return passportPattern.test(trimmed);
}

export function normalizeCustomerDocument(type: CustomerDocumentType, document: string) {
  if (type === "PASAPORTE") return document.trim().toUpperCase();
  if (type === "CONSUMIDOR_FINAL") return "9999999999999";
  return onlyDigits(document);
}

export function validateCustomerFields(customer: BillingCustomer) {
  if (!customer.name.trim()) failValidation("Ingresa el nombre o razon social del cliente.");
  if (!customer.document.trim()) failValidation("Ingresa el numero de identificacion.");

  if (!validateCustomerDocument(customer.documentType, customer.document)) {
    if (customer.documentType === "CEDULA") failValidation("La cedula debe tener 10 digitos validos.");
    if (customer.documentType === "RUC") failValidation("El RUC debe tener 13 digitos validos y terminar en 001.");
    if (customer.documentType === "CONSUMIDOR_FINAL") failValidation("Consumidor final debe usar 9999999999999.");
    failValidation("El pasaporte solo puede tener letras, numeros y guiones.");
  }

  if (customer.email.trim() && !isValidEmail(customer.email)) {
    failValidation("Ingresa un correo valido para el cliente.");
  }

  if (customer.documentType !== "CONSUMIDOR_FINAL") {
    if (!customer.email.trim()) failValidation("Ingresa el correo para enviar la factura.");
    if (!customer.address.trim()) failValidation("Ingresa la direccion de facturacion del cliente.");
  }
}

export function todayAsDateInput() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString().slice(0, 10);
}

export function isPastDateInput(value: string) {
  if (!value) return false;
  return value < todayAsDateInput();
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
