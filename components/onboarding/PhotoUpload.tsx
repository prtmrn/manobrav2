"use client";

import { useRef, useState, useCallback } from "react";
import Image from "next/image";

interface PhotoUploadProps {
  value: File | null;
  currentPhotoUrl?: string | null;
  onChange: (file: File | null) => void;
  error?: string;
}

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_MB = 5;

export default function PhotoUpload({
  value,
  currentPhotoUrl,
  onChange,
  error,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl ?? null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function processFile(file: File) {
    setLocalError(null);

    if (!ALLOWED.includes(file.type)) {
      setLocalError("Format non supporté. Utilisez JPG, PNG, WebP ou GIF.");
      return;
    }
    if (file.size / 1024 / 1024 > MAX_MB) {
      setLocalError(`Fichier trop volumineux (max ${MAX_MB} Mo).`);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    onChange(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRemove() {
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const displayError = error ?? localError;

  return (
    <div className="space-y-2">
      <p className="block text-sm font-medium text-gray-700">
        Photo de profil
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !preview && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-colors
          ${isDragging ? "border-brand-400 bg-brand-50" : "border-gray-300 bg-gray-50"}
          ${preview ? "cursor-default p-2" : "cursor-pointer p-8 hover:border-brand-400 hover:bg-brand-50"}`}
      >
        {preview ? (
          /* ── Aperçu de la photo ─────────────────────────────────────── */
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-28 h-28 rounded-full overflow-hidden ring-4 ring-white shadow-lg">
              <Image
                src={preview}
                alt="Aperçu photo de profil"
                fill
                className="object-cover"
                unoptimized={preview.startsWith("blob:")}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 underline"
              >
                Changer
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={handleRemove}
                className="text-xs font-medium text-red-500 hover:text-red-600 underline"
              >
                Supprimer
              </button>
            </div>
            {value && (
              <p className="text-xs text-gray-400">
                {value.name} - {(value.size / 1024 / 1024).toFixed(2)} Mo
              </p>
            )}
          </div>
        ) : (
          /* ── Zone de dépôt ──────────────────────────────────────────── */
          <div className="flex flex-col items-center gap-3 pointer-events-none select-none">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">
                Glissez votre photo ici
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                ou <span className="text-brand-600 font-semibold">parcourir</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                JPG, PNG, WebP - max {MAX_MB} Mo
              </p>
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED.join(",")}
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      {displayError && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {displayError}
        </p>
      )}
    </div>
  );
}
