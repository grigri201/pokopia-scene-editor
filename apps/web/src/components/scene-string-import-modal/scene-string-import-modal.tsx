import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { t, type Locale } from '../../i18n';
import type { RecoveryError } from '../../io';

export type SceneStringImportSubmitResult =
  | { status: 'success' }
  | { status: 'invalid'; errors: RecoveryError[] }
  | { status: 'lossy'; droppedTileDetails: string[] }
  | { status: 'storage-error'; message: string };

interface SceneStringImportModalProps {
  locale: Locale;
  open: boolean;
  onCancel: () => void;
  onClose: () => void;
  onSubmit: (
    sceneString: string,
    options: { allowLossy: boolean },
  ) => SceneStringImportSubmitResult;
}

export function SceneStringImportModal({
  locale,
  open,
  onCancel,
  onClose,
  onSubmit,
}: SceneStringImportModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [sceneString, setSceneString] = useState('');
  const [errors, setErrors] = useState<RecoveryError[]>([]);
  const [droppedTileDetails, setDroppedTileDetails] = useState<string[]>([]);
  const [emptyInput, setEmptyInput] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSceneString('');
    setErrors([]);
    setDroppedTileDetails([]);
    setEmptyInput(false);
    setStorageError(null);
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);
  }, [open]);

  if (!open) {
    return null;
  }

  const resetAndClose = (close: () => void) => {
    setSceneString('');
    setErrors([]);
    setDroppedTileDetails([]);
    setEmptyInput(false);
    setStorageError(null);
    close();
  };

  const handleSubmit = (allowLossy: boolean) => {
    if (!sceneString.trim()) {
      setEmptyInput(true);
      setErrors([]);
      setDroppedTileDetails([]);
      setStorageError(null);
      return;
    }

    const result = onSubmit(sceneString, { allowLossy });
    setEmptyInput(false);

    if (result.status === 'success') {
      resetAndClose(onClose);
      return;
    }

    if (result.status === 'lossy') {
      setDroppedTileDetails(result.droppedTileDetails);
      setErrors([]);
      setStorageError(null);
      return;
    }

    if (result.status === 'storage-error') {
      setStorageError(result.message);
      setErrors([]);
      return;
    }

    setErrors(result.errors);
    setDroppedTileDetails([]);
    setStorageError(null);
  };

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      resetAndClose(onClose);
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusableElements = getFocusableElements(dialogRef.current);
    if (focusableElements.length === 0) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1);
    if (!lastElement) {
      return;
    }

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  const showLossyConfirmation = droppedTileDetails.length > 0;

  return (
    <div
      className="scene-string-import-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={t(locale, 'sceneStringImportModalTitle')}
      onKeyDown={handleDialogKeyDown}
      ref={dialogRef}
    >
      <form
        className="scene-string-import-modal"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit(showLossyConfirmation);
        }}
      >
        <div className="scene-string-import-modal__header">
          <h2>{t(locale, 'sceneStringImportModalTitle')}</h2>
          <button
            type="button"
            className="scene-string-import-modal__close"
            aria-label={t(locale, 'close')}
            onClick={() => resetAndClose(onClose)}
            ref={closeButtonRef}
          >
            ×
          </button>
        </div>

        <label className="scene-string-import-modal__field">
          <span>{t(locale, 'sceneStringImportTextareaLabel')}</span>
          <textarea
            value={sceneString}
            onChange={(event) => {
              setSceneString(event.currentTarget.value);
              setEmptyInput(false);
              setErrors([]);
              setDroppedTileDetails([]);
              setStorageError(null);
            }}
            placeholder={t(locale, 'sceneStringImportTextareaPlaceholder')}
            rows={8}
          />
        </label>

        {emptyInput ? (
          <p className="scene-string-import-modal__error" role="alert">
            {t(locale, 'sceneStringImportEmptyInput')}
          </p>
        ) : null}

        {storageError ? (
          <p className="scene-string-import-modal__error" role="alert">
            {storageError}
          </p>
        ) : null}

        {errors.length > 0 ? (
          <div className="scene-string-import-modal__error" role="alert">
            <p>{t(locale, 'sceneStringImportInvalidSummary')}</p>
            <ul>
              {errors.map((error, index) => (
                <li key={`${error.fieldPath}-${index}`}>
                  <strong>{error.fieldPath}</strong>
                  <span>{error.reason}</span>
                  <span>{t(locale, 'expected')}: {error.expected}</span>
                  <span>{t(locale, 'actual')}: {error.actual}</span>
                  <span>{error.recoveryAction}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {showLossyConfirmation ? (
          <div className="scene-string-import-modal__lossy" role="alert">
            <p>
              {t(locale, 'sceneStringImportLossySummary', {
                count: droppedTileDetails.length,
              })}
            </p>
            <ul>
              {droppedTileDetails.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="scene-string-import-modal__actions">
          <button
            type="button"
            className="scene-string-import-modal__secondary"
            onClick={() => resetAndClose(onCancel)}
          >
            {t(locale, 'sceneStringImportCancelAction')}
          </button>
          <button type="submit" className="scene-string-import-modal__primary">
            {showLossyConfirmation
              ? t(locale, 'sceneStringImportLossyConfirmAction')
              : t(locale, 'sceneStringImportConfirmAction')}
          </button>
        </div>
      </form>
    </div>
  );
}

function getFocusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) {
    return [];
  }

  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button, textarea, input, select, a[href], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1);
}
