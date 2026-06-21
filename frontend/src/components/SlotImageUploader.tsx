import { useRef, useState } from "react";
import type { BinderSlot } from "../types/binder";

type SlotImageUploaderProps = {
  selectedSlot: BinderSlot | undefined;
  onUploadSlotImage: (slotKey: string, file: File) => Promise<boolean>;
};

export function SlotImageUploader({
  selectedSlot,
  onUploadSlotImage,
}: SlotImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(
    null
  );

  const slotIsUnavailable =
    !selectedSlot ||
    !!selectedSlot.card ||
    !!selectedSlot.image ||
    !!selectedSlot.coveredBySlotKey;

  async function handleFileChange(file: File | undefined) {
    if (!selectedSlot || !file) {
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
      setLocalErrorMessage("Image must be 1 MB or smaller.");
      return;
    }

    setIsUploading(true);

    try {
      const wasUploaded = await onUploadSlotImage(selectedSlot.slotKey, file);

      if (!wasUploaded) {
        setLocalErrorMessage("Image could not be added to this slot.");
      }
    } finally {
      setIsUploading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <section className="slot-image-uploader">
      <div>
        <p className="eyebrow">Custom Image</p>
        <h2>Add image to slot</h2>
        <p>Upload a JPG, PNG, or WEBP image up to 1 MB. Each image uses one slot.</p>
      </div>

      <label className="secondary-button slot-image-upload-button">
        {isUploading ? "Uploading..." : "Upload Image"}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={slotIsUnavailable || isUploading}
          onChange={(event) => {
            void handleFileChange(event.target.files?.[0]);
          }}
        />
      </label>

      {selectedSlot ? (
        <p className="search-helper-text">
          Selected: page {selectedSlot.pageNumber}, slot {selectedSlot.slotNumber}
        </p>
      ) : (
        <p className="search-helper-text">Select an empty slot first.</p>
      )}

      {slotIsUnavailable && selectedSlot && (
        <p className="form-error">
          This slot already has content or is unavailable.
        </p>
      )}

      {localErrorMessage && <p className="form-error">{localErrorMessage}</p>}
    </section>
  );
}
