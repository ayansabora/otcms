/**
 * Verifies a file's actual bytes match its claimed MIME type, rather than
 * trusting the client-supplied Content-Type header alone (which is
 * trivially spoofable). This is the "magic-byte verification" gap flagged
 * in upload.middleware.ts — implemented for the types we actually accept.
 *
 * DOCX/DOC are ZIP-based/OLE-compound formats respectively; we verify the
 * outer container signature, which is a meaningful check (rejects a
 * renamed .exe/.sh claiming to be a .docx) even though it can't fully
 * validate the internal document structure. A dedicated malware scanner
 * remains the right tool for deep content inspection — see the
 * malware-scanning hook noted in docs/architecture.md §13/§16, not
 * implemented here.
 */

type SignatureCheck = (buffer: Buffer) => boolean;

const SIGNATURES: Record<string, SignatureCheck> = {
  "application/pdf": (buf) => buf.subarray(0, 5).toString("ascii") === "%PDF-",
  "image/jpeg": (buf) => buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  "image/png": (buf) =>
    buf.length > 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a,
  // .docx is a ZIP container (PK\x03\x04); this rejects anything that isn't
  // actually a ZIP, even if it claims to be a .docx.
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": (buf) =>
    buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07),
  // Legacy .doc is an OLE Compound File (D0 CF 11 E0 ...).
  "application/msword": (buf) =>
    buf.length > 4 && buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0,
};

export function matchesDeclaredType(buffer: Buffer, declaredMimeType: string): boolean {
  const check = SIGNATURES[declaredMimeType];
  if (!check) return false; // Unknown type — treated as a mismatch, never silently allowed.
  return check(buffer);
}
