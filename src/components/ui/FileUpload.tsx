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
          "group relative flex flex-col items-center justify-center rounded-xl transition-all select-none overflow-hidden w-full h-40",
          isImage && hasCurrent && imageSource
            ? "border border-border/80 bg-card/50 shadow-2xs cursor-default"
            : clsx(
                "border border-dashed p-4 cursor-pointer",
                isDragging
                  ? "border-primary bg-primary/10"
                  : "border-border/80 hover:border-primary/60 hover:bg-muted/30 bg-background/40",
              ),
          disabled && "opacity-60 cursor-not-allowed hover:border-border hover:bg-transparent",
        )}
        style={
          isImage && hasCurrent && imageSource
            ? {
                backgroundImage:
                  "linear-gradient(45deg, rgba(128, 128, 128, 0.05) 25%, transparent 25%), linear-gradient(-45deg, rgba(128, 128, 128, 0.05) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(128, 128, 128, 0.05) 75%), linear-gradient(-45deg, transparent 75%, rgba(128, 128, 128, 0.05) 75%)",
                backgroundSize: "16px 16px",
                backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
              }
            : undefined
        }
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
          <div className="relative flex flex-col items-center justify-center w-full h-full p-3">
            {/* Status indicator */}
            <div className="absolute top-2.5 end-2.5 z-10 flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 backdrop-blur-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>
                {currentFileName
                  ? `${currentFileName}${currentFileSize ? ` (${formatSize(currentFileSize)})` : ""}`
                  : "تم الرفع"}
              </span>
            </div>

            {/* Centered Image Preview */}
            <div className="flex h-full w-full items-center justify-center py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSource}
                alt={label ?? "preview"}
                className="max-h-24 max-w-[75%] object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-102"
              />
            </div>

            {/* Action Buttons */}
            <div className="absolute bottom-2.5 inset-x-2.5 z-10 flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={disabled || pending}
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-background/90 px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-2xs backdrop-blur-xs transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 cursor-pointer"
                title="حذف الملف"
              >
                <Trash2 size={13} aria-hidden="true" />
                <span>حذف</span>
              </button>

              <button
                type="button"
                disabled={disabled || pending}
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground shadow-2xs backdrop-blur-xs transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary disabled:opacity-50 cursor-pointer"
                title="استبدال الملف"
              >
                <RotateCcw size={13} aria-hidden="true" />
                <span>استبدال</span>
              </button>
            </div>

            {pending ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-xs">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : null}
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
          <div className="flex flex-col items-center justify-center gap-1.5 py-2 text-center w-full h-full">
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
