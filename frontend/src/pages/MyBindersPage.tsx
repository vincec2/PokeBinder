import { useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Binder, BinderLayout } from "../types/binder";
import { LogoutButton } from "../components/LogoutButton";

type MyBindersPageProps = {
  binders: Binder[];
  onCreateBinder: (layout: BinderLayout) => Promise<string>;
  onDeleteBinder: (binderId: string) => Promise<string | null>;
  onResetAllLocalData: () => void;
  onUploadCoverImage: (binderId: string, file: File) => Promise<boolean>;
};

export function MyBindersPage({
  binders,
  onCreateBinder,
  onDeleteBinder,
  onResetAllLocalData,
  onUploadCoverImage,
}: MyBindersPageProps) {
  const navigate = useNavigate();
  const [isChoosingLayout, setIsChoosingLayout] = useState(false);
  const [uploadingBinderId, setUploadingBinderId] = useState<string | null>(null);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);

  async function handleCreateBinder(layout: BinderLayout) {
    const newBinderId = await onCreateBinder(layout);
    navigate(`/binders/${newBinderId}`);
  }

  async function handleDeleteBinder(binderId: string) {
    const nextBinderId = await onDeleteBinder(binderId);

    if (nextBinderId) {
      navigate("/my-binders");
    }
  }

  async function handleCoverUpload(binderId: string, file: File | undefined) {
    if (!file) {
      return;
    }

    setCoverUploadError(null);
    setUploadingBinderId(binderId);

    try {
      const wasUploaded = await onUploadCoverImage(binderId, file);

      if (!wasUploaded) {
        setCoverUploadError("Cover image could not be uploaded.");
      }
    } finally {
      setUploadingBinderId(null);
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">My Binders</p>
          <h1>Your local collection</h1>
          <p>Choose a binder to edit, or create a new one.</p>
        </div>

        <div className="header-actions">
          <button
            className="primary-button button-reset"
            type="button"
            onClick={() => setIsChoosingLayout((current) => !current)}
          >
            New Binder
          </button>

          <button
            className="secondary-button"
            type="button"
            onClick={onResetAllLocalData}
          >
            Reset all local data
          </button>

          <LogoutButton />
        </div>
      </header>

      {isChoosingLayout && (
        <section className="new-binder-page-panel">
          <div>
            <p className="eyebrow">Choose Layout</p>
            <h2>Create a new binder</h2>
            <p>Select the binder size now. You will not be able to change it later.</p>
          </div>

          <div className="new-binder-page-actions">
            <button type="button" onClick={() => handleCreateBinder("2x2")}>
              Create 2x2 Binder
            </button>

            <button type="button" onClick={() => handleCreateBinder("3x3")}>
              Create 3x3 Binder
            </button>
          </div>
        </section>
      )}

      {coverUploadError && (
        <p className="form-error">{coverUploadError}</p>
      )}

      <section className="binder-card-grid">
        {binders.map((binder) => {
          const cardCount = binder.slots.filter((slot) => slot.card).length;

          return (
            <article className="binder-summary-card" key={binder.binderId}>

              <div className="binder-cover-preview">
                {binder.coverImageUrl ? (
                  <img src={binder.coverImageUrl} alt={`${binder.name} cover`} />
                ) : (
                  <div className="binder-cover-placeholder">
                    <span>No cover</span>
                  </div>
                )}
              </div>

              <div>
                <p className="eyebrow">{binder.layout} Binder</p>
                <h2>{binder.name}</h2>
                <p>{binder.description}</p>
                <small>
                  {cardCount} card{cardCount === 1 ? "" : "s"} added
                </small>
              </div>

              <div className="binder-summary-actions">

                <label className="secondary-button binder-cover-upload-button">
                  {uploadingBinderId === binder.binderId ? "Uploading..." : "Change Cover"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploadingBinderId === binder.binderId}
                    onChange={(event) => {
                      void handleCoverUpload(binder.binderId, event.target.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                
                <Link className="primary-button" to={`/binders/${binder.binderId}`}>
                  Open Binder
                </Link>

                {binders.length > 1 && (
                  <button
                    className="danger-text-button"
                    type="button"
                    onClick={() => handleDeleteBinder(binder.binderId)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}