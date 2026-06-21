import { useRef, useState } from "react";

type UploadCoverImageProps = {
  binderId: string;
  coverImageUrl: string | null;
  onUploadCoverImage: (binderId: string, file: File) => Promise<boolean>;
};

export function UploadCoverImage({
  binderId,
  coverImageUrl,
  onUploadCoverImage,
}: UploadCoverImageProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(
    null
  );

  async function handleFileChange(file: File | undefined) {
    if (!file) {
      return;
    }

    setLocalErrorMessage(null);

    const isAllowedType = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(file.type);

    if (!isAllowedType) {
      setLocalErrorMessage("Only JPG, PNG, and WEBP images are allowed.");
      return;
    }

    if (file.size > 1 * 1024 * 1024) {
      setLocalErrorMessage("Cover image must be 1 MB or smaller.");
      return;
    }

    setIsUploading(true);

    try {
      await onUploadCoverImage(binderId, file);
    } finally {
      setIsUploading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <section className="cover-upload-panel">
      <div>
        <p className="eyebrow">Binder Cover</p>
        <h2>Cover image</h2>
        <p>Upload one JPG, PNG, or WEBP image up to 1 MB.</p>
      </div>

      {coverImageUrl ? (
        <img
          className="cover-image-preview"
          src={coverImageUrl}
          alt="Binder cover"
        />
      ) : (
        <div className="cover-image-placeholder">No cover image yet</div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          void handleFileChange(event.target.files?.[0]);
        }}
      />

      {localErrorMessage && <p className="form-error">{localErrorMessage}</p>}

      {isUploading && <p className="search-helper-text">Uploading cover...</p>}
    </section>
  );
}