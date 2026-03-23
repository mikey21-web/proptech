'use client';

import { useState, useRef } from 'react';
import {
  Upload,
  X,
  File,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface DocumentUploadProps {
  documentType: string;
  documentLabel: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

export default function DocumentUpload({
  documentType,
  documentLabel,
  onSuccess,
  onCancel,
  className,
}: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [documentNo, setDocumentNo] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (f: File): string | null => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      return 'Only PDF, JPG, and PNG files are allowed.';
    }
    if (f.size > MAX_FILE_SIZE) {
      return 'File must be under 5MB.';
    }
    return null;
  };

  const handleFileSelect = (f: File) => {
    const err = validateFile(f);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      // In production, upload to S3/GCS first and get URL.
      // For now, simulate with a data URL or use placeholder URL.
      const fileUrl = `/uploads/${Date.now()}-${file.name}`;

      const res = await fetch('/api/customer/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: documentType,
          documentNo: documentNo || undefined,
          fileUrl,
          fileName: file.name,
          fileSize: file.size,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      setSuccess(true);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className={cn('text-center py-8', className)}>
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <h4 className="text-base font-semibold text-foreground mb-1">
          Document Uploaded
        </h4>
        <p className="text-sm text-muted-foreground">
          Your {documentLabel} has been uploaded and is under review.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <h4 className="text-base font-semibold text-foreground">
          Upload {documentLabel}
        </h4>
        <p className="text-xs text-muted-foreground mt-1">
          Accepted formats: PDF, JPG, PNG. Max size: 5MB.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Drop zone */}
      {!file ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors',
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-accent/50',
          )}
          role="button"
          tabIndex={0}
          aria-label={`Select file to upload ${documentLabel}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-foreground">
            Click or drag file to upload
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, JPG, PNG up to 5MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_EXTENSIONS.join(',')}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
            }}
            className="hidden"
            aria-hidden="true"
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/50 p-3">
          <File className="h-8 w-8 text-primary flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {file.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <button
            onClick={() => setFile(null)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Remove file"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Document number (optional) */}
      <div>
        <label htmlFor="doc-number" className="block text-sm font-medium text-foreground mb-1.5">
          Document Number (optional)
        </label>
        <input
          id="doc-number"
          type="text"
          value={documentNo}
          onChange={(e) => setDocumentNo(e.target.value)}
          placeholder={`e.g., ${documentType === 'pan' ? 'ABCDE1234F' : documentType === 'aadhaar' ? '1234 5678 9012' : 'Document number'}`}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            disabled={uploading}
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            file && !uploading
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed',
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload
            </>
          )}
        </button>
      </div>
    </div>
  );
}
