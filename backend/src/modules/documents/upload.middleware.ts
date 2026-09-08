import multer from "multer";
import { env } from "../../config/env.js";
import { ValidationError } from "../../utils/appError.js";

// Conservative allow-list: legal-record-relevant document/image types only.
// Executables, scripts, and other active-content types are never accepted.
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.FILE_MAX_SIZE_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new ValidationError(`File type "${file.mimetype}" is not permitted`));
      return;
    }
    cb(null, true);
  },
}).single("file");

// NOTE: MIME-type sniffing from the client-supplied Content-Type is not
// itself sufficient hardening — before this goes to production, wire in
// magic-byte verification and the malware-scanning hook called out in
// docs/architecture.md §13/§16 (left as a pluggable hook, no scanner
// bundled by default).
