import React from 'react';
import { FILE_LIMITS } from '../utils/fileValidation';
import { formatFileSize } from '../utils/imageCompression';

interface FileInputProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function FileInput({ 
  onFileSelect, 
  accept = FILE_LIMITS.ALLOWED_EXTENSIONS.join(','),
  disabled = false,
  className = '',
  children 
}: FileInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    // Reset input
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      <div onClick={() => inputRef.current?.click()} className={className}>
        {children}
      </div>
    </>
  );
}

interface FileValidationMessageProps {
  show?: boolean;
}

export function FileValidationMessage({ show = true }: FileValidationMessageProps) {
  if (!show) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
      <p className="font-medium mb-1">Limites de fichiers :</p>
      <ul className="space-y-0.5 ml-3 list-disc">
        <li>Taille max : {FILE_LIMITS.MAX_FILE_SIZE_MB} MB</li>
        <li>Formats : {FILE_LIMITS.ALLOWED_EXTENSIONS.join(', ')}</li>
      </ul>
    </div>
  );
}
