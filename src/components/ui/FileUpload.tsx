"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import {
  FileText,
  Image as ImageIcon,
  RotateCcw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import clsx from "clsx";
import { formatSize } from "@/lib/files";

export function FileUpload({
  label,
  accept,
  currentFileId,
  currentFileName,
  currentFileSize,
  isImage,
  disabled,
  pending,
  onFileSelect,
  onClear,
  hint,
}: {
  label?: string;
  accept?: string;
  currentFileId?: string | null;
  currentFileName?: string | null;
  currentFileSize?: number | null;
  isImage?: boolean;
  disabled?: boolean;
  pending?: boolean;
  onFileSelect: (file: File) => void;
  onClear?: () => void;
  hint?: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !pending) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled || pending) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFile = (file: File) => {
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
    onFileSelect(file);
  };

  const handleReset = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onClear?.();
  };

  const hasCurrent = Boolean(currentFileId || selectedFile);
  const imageSource = previewUrl ?? (currentFileId ? `/api/files/${currentFileId}?inline=1` : null);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label ? (
        <span className="text-sm font-medium text-foreground">{label}</span>
      ) : null}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled && !pending) {
            inputRef.current?.click();
          }
        }}
        className={clsx(
          "group relative flex flex-col items-center justify-center rounded border border-dashed p-3.5 transition-all cursor-pointer select-none",
          isDragging
            ? "border-primary bg-primary/10"
            : "border-border/80 hover:border-primary/60 hover:bg-muted/30 bg-background/40",
          disabled && "opacity-60 cursor-not-allowed hover:border-border hover:bg-transparent",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled || pending}
          onChange={handleChange}
          className="hidden"
        />

        {isImage && hasCurrent && imageSource ? (
          <div className="flex flex-col items-center gap-2.5 w-full py-1">
            <div className="relative flex h-20 w-36 items-center justify-center overflow-hidden rounded border border-border/80 bg-card p-1.5 shadow-2xs">
              <img
                src={imageSource}
                alt={label ?? "preview"}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono" dir="ltr">
                {selectedFile
                  ? `${selectedFile.name} (${formatSize(selectedFile.size)})`
                  : currentFileName
                    ? `${currentFileName}${currentFileSize ? ` (${formatSize(currentFileSize)})` : ""}`
                    : ""}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
                title="إزالة"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : !isImage && hasCurrent && selectedFile ? (
          <div className="flex items-center justify-between gap-3 w-full rounded border border-border bg-card p-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                <FileText size={16} aria-hidden="true" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-xs font-semibold text-foreground">
                  {selectedFile.name}
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums font-mono" dir="ltr">
                  {formatSize(selectedFile.size)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors shrink-0"
            >
              <RotateCcw size={14} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 py-2 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary transition-transform group-hover:scale-105">
              {isImage ? (
                <ImageIcon size={18} aria-hidden="true" />
              ) : (
                <UploadCloud size={18} aria-hidden="true" />
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-foreground">
                اسحب الملف إلى هنا أو انقر للاختيار
              </span>
              <span className="text-[11px] text-muted-foreground">
                {accept ? accept.split(",").join(" • ") : "جميع صيغ الملفات المدعومة"}
              </span>
            </div>
          </div>
        )}
      </div>

      {hint ? (
        <span className="text-xs text-muted-foreground ps-0.5">{hint}</span>
      ) : null}
    </div>
  );
}
