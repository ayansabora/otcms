import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from "react";
import { Upload, X, FileText, CheckCircle, AlertCircle } from "lucide-react";

interface FileUploadProps {
  onFile: (file: File) => void;
  accept?: string;
  maxSizeMb?: number;
  disabled?: boolean;
}

type FileState = "idle" | "selected" | "uploading" | "success" | "error";

export function FileUpload({ onFile, accept = "*/*", maxSizeMb = 15, disabled = false }: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [state, setState] = useState<FileState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = useCallback((file: File): string | null => {
    if (file.size > maxSizeMb * 1024 * 1024) return `File size must not exceed ${maxSizeMb} MB.`;
    return null;
  }, [maxSizeMb]);

  const handleFile = useCallback((file: File) => {
    const err = validate(file);
    if (err) { setErrorMsg(err); setState("error"); return; }
    setSelectedFile(file);
    setState("selected");
    setErrorMsg(null);
    onFile(file);
  }, [validate, onFile]);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clear = () => { setSelectedFile(null); setState("idle"); setErrorMsg(null); if (inputRef.current) inputRef.current.value = ""; };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (state === "selected" || state === "success" || state === "uploading") {
    return (
      <div className="border border-[var(--color-success)]/40 bg-[var(--color-success-bg)] rounded-xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
          <FileText size={20} className="text-[var(--color-success)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-ink)] truncate">{selectedFile?.name}</p>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">{selectedFile ? formatSize(selectedFile.size) : ""}</p>
          {state === "uploading" && (
            <div className="mt-2 h-1.5 bg-[var(--color-line)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--color-success)] rounded-full animate-pulse w-3/4" />
            </div>
          )}
        </div>
        {state === "success" ? (
          <CheckCircle size={20} className="text-[var(--color-success)] shrink-0" />
        ) : (
          <button onClick={clear} className="text-[var(--color-muted)] hover:text-[var(--color-danger)] transition-colors shrink-0">
            <X size={18} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-4 transition-all duration-200 cursor-pointer
          ${dragging
            ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)]"
            : "border-[var(--color-line-strong)] bg-[var(--color-bg)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <div className="w-14 h-14 rounded-full bg-[var(--color-surface)] border border-[var(--color-line)] flex items-center justify-center shadow-sm">
          <Upload size={24} className="text-[var(--color-primary)]" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-[var(--color-ink)] mb-1">
            Drag &amp; drop your document here
          </p>
          <p className="text-xs text-[var(--color-muted)]">or click to browse files</p>
        </div>
        <p className="text-[11px] text-[var(--color-faint)]">
          Supported: PDF, DOCX, JPG, PNG · Max {maxSizeMb} MB
        </p>
        <input ref={inputRef} type="file" accept={accept} onChange={onChange} className="hidden" disabled={disabled} />
      </div>

      {state === "error" && errorMsg && (
        <div className="flex items-center gap-2 mt-3 text-sm text-[var(--color-danger)]">
          <AlertCircle size={15} />
          {errorMsg}
        </div>
      )}
    </div>
  );
}
