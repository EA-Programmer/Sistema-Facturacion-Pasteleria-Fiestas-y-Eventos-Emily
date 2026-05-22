import fs from "fs/promises";
import crypto from "crypto";
// @ts-expect-error: node-forge does not have official typescript declaration files
import forge from "node-forge";

/**
 * Módulo de Firma Digital XAdES-BES para SRI Ecuador
 * 
 * Implementa la especificación técnica del SRI para firmar comprobantes electrónicos
 * utilizando archivos de firma digital (.p12 / .pfx) en memoria.
 */

interface SignerConfig {
  xmlPath: string;
  p12Path: string;
  p12Password: string;
}

/**
 * Lee el archivo de firma .p12 y extrae la clave privada y el certificado X.509
 */
function extractKeysFromP12(p12Buffer: Buffer, password: string) {
  try {
    const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString("binary"), false);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

    // Obtener la bolsa de clave privada
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
    if (!keyBag || !keyBag.key) {
      throw new Error("No se encontró la clave privada en el archivo .p12.");
    }
    const privateKey = keyBag.key;

    // Obtener la bolsa de certificado
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag]?.[0];
    if (!certBag || !certBag.cert) {
      throw new Error("No se encontró el certificado X.509 en el archivo .p12.");
    }
    const certificate = certBag.cert;

    // Convertir a formatos PEM reutilizables
    const privateKeyPem = forge.pki.privateKeyToPem(privateKey);
    const certificatePem = forge.pki.certificateToPem(certificate);

    return {
      privateKeyPem,
      certificatePem,
      certificate,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Clave incorrecta o archivo corrupto.";
    throw new Error(`Error al leer la firma electrónica (.p12): ${msg}`);
  }
}

/**
 * Formatea el nombre distintivo (DN) del emisor del certificado de forma estándar
 */
function formatIssuerDN(issuer: forge.pki.RDN) {
  return issuer.attributes
    .map((attr: { name?: string; value: string; type?: string; shortName?: string }) => {
      const label = attr.shortName || attr.name || attr.type;
      return `${label}=${attr.value}`;
    })
    .reverse()
    .join(",");
}

/**
 * Firma digitalmente un archivo XML de factura con el formato XAdES-BES
 */
export async function signXmlInvoice({ xmlPath, p12Path, p12Password }: SignerConfig): Promise<string> {
  // 1. Leer archivos
  const xmlContent = await fs.readFile(xmlPath, "utf8");
  const p12Buffer = await fs.readFile(p12Path);

  // 2. Extraer claves de firma
  const { privateKeyPem, certificatePem, certificate } = extractKeysFromP12(p12Buffer, p12Password);

  // 3. Preparar datos del certificado
  const certBase64 = certificatePem
    .replace("-----BEGIN CERTIFICATE-----", "")
    .replace("-----END CERTIFICATE-----", "")
    .replace(/\s+/g, "");

  const certDerBuffer = Buffer.from(certBase64, "base64");
  const certDigest = crypto.createHash("sha1").update(certDerBuffer).digest("base64");

  const serialNumberHex = certificate.serialNumber;
  const serialNumberDecimal = BigInt("0x" + serialNumberHex).toString(10);
  const issuerName = formatIssuerDN(certificate.issuer);

  // 4. Extraer el bloque del comprobante (<factura ...> ... </factura>)
  const startTag = '<factura id="comprobante" version="1.1.0">';
  const endTag = "</factura>";
  const startIndex = xmlContent.indexOf(startTag);
  const endIndex = xmlContent.indexOf(endTag);

  if (startIndex === -1 || endIndex === -1) {
    throw new Error("El archivo XML no contiene una estructura <factura id=\"comprobante\"> válida.");
  }

  const facturaXml = xmlContent.substring(startIndex, endIndex + endTag.length);
  // Normalizar finales de línea a LF para asegurar consistencia del digest de C14N
  const canonicalFacturaXml = facturaXml.replace(/\r\n/g, "\n");
  const invoiceDigest = crypto.createHash("sha1").update(Buffer.from(canonicalFacturaXml, "utf8")).digest("base64");

  // 5. Definir identificadores únicos para la estructura de la firma
  const uniqueId = crypto.randomBytes(4).toString("hex");
  const idSignature = `Signature-${uniqueId}`;
  const idReferenceId = `Reference-ID-${uniqueId}`;
  const idSignedProperties = `SignedProperties-${uniqueId}`;
  const idKeyInfo = `KeyInfo-${uniqueId}`;

  const signingTime = new Date().toISOString();

  // 6. Construir y calcular digest del bloque KeyInfo (Canonicalized)
  const keyInfoXml = `<ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Id="${idKeyInfo}"><ds:X509Data><ds:X509Certificate>${certBase64}</ds:X509Certificate></ds:X509Data></ds:KeyInfo>`;
  const keyInfoDigest = crypto.createHash("sha1").update(Buffer.from(keyInfoXml, "utf8")).digest("base64");

  // 7. Construir y calcular digest del bloque SignedProperties (Canonicalized)
  const signedPropertiesXml = `<xades:SignedProperties xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Id="${idSignedProperties}"><xades:SignedSignatureProperties><xades:SigningTime>${signingTime}</xades:SigningTime><xades:SigningCertificate><xades:Cert><xades:CertDigest><ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod><ds:DigestValue>${certDigest}</ds:DigestValue></xades:CertDigest><xades:IssuerSerial><ds:X509IssuerName>${issuerName}</ds:X509IssuerName><ds:X509SerialNumber>${serialNumberDecimal}</ds:X509SerialNumber></xades:IssuerSerial></xades:Cert></xades:SigningCertificate></xades:SignedSignatureProperties><xades:SignedDataObjectProperties><xades:DataObjectFormat ObjectReference="#${idReferenceId}"><xades:Description>contenido comprobante</xades:Description><xades:MimeType>text/xml</xades:MimeType></xades:DataObjectFormat></xades:SignedDataObjectProperties></xades:SignedProperties>`;
  const signedPropertiesDigest = crypto.createHash("sha1").update(Buffer.from(signedPropertiesXml, "utf8")).digest("base64");

  // 8. Construir bloque SignedInfo (Canonicalized)
  const signedInfoXml = `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:xades="http://uri.etsi.org/01903/v1.3.2#"><ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></ds:CanonicalizationMethod><ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"></ds:SignatureMethod><ds:Reference Id="${idReferenceId}" URI="#comprobante"><ds:Transforms><ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></ds:Transform></ds:Transforms><ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod><ds:DigestValue>${invoiceDigest}</ds:DigestValue></ds:Reference><ds:Reference URI="#${idKeyInfo}"><ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod><ds:DigestValue>${keyInfoDigest}</ds:DigestValue></ds:Reference><ds:Reference URI="#${idSignedProperties}"><ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod><ds:DigestValue>${signedPropertiesDigest}</ds:DigestValue></ds:Reference></ds:SignedInfo>`;

  // 9. Criptografía: Firmar SignedInfo con la clave privada (RSA-SHA1)
  const signatureBuffer = crypto.sign("RSA-SHA1", Buffer.from(signedInfoXml, "utf8"), {
    key: privateKeyPem,
    padding: crypto.constants.RSA_PKCS1_PADDING,
  });
  const signatureBase64 = signatureBuffer.toString("base64");

  // 10. Ensamblar la firma digital final
  const signatureXml = [
    `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Id="${idSignature}">`,
    signedInfoXml,
    `<ds:SignatureValue Id="SignatureValue-${uniqueId}">${signatureBase64}</ds:SignatureValue>`,
    keyInfoXml,
    `<ds:Object Id="Object-${uniqueId}">`,
    signedPropertiesXml,
    `</ds:Object>`,
    `</ds:Signature>`,
  ].join("");

  // 11. Insertar la firma dentro de <factura> (justo antes del cierre </factura>)
  const signedXmlContent = xmlContent.replace(endTag, `${signatureXml}${endTag}`);

  // 12. Guardar archivo firmado sobrescribiendo el original
  await fs.writeFile(xmlPath, signedXmlContent, "utf8");

  return xmlPath;
}
