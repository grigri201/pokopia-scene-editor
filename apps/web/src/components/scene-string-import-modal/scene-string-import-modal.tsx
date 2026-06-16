import { useEffect, useRef, type KeyboardEvent } from 'react';
import { t, type Locale } from '../../i18n';
import type { RecoveryError } from '../../io';

interface SceneStringImportModalProps {
  droppedTileDetails: string[];
  emptyInput: boolean;
  errors: RecoveryError[];
  fileName: string;
  locale: Locale;
  open: boolean;
  storageError: string | null;
  onCancel: () => void;
  onChooseFile: () => void;
  onClose: () => void;
  onConfirmLossy: () => void;
}

export function SceneStringImportModal({
  droppedTileDetails,
  emptyInput,
  errors,
  fileName,
  locale,
  open,
  storageError,
  onCancel,
  onChooseFile,
  onClose,
  onConfirmLossy,
}: SceneStringImportModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    window.setTimeout(() => closeButtonRef.current?.focus(), 0);
  }, [open]);

  if (!open) {
    return null;
  }

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
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
  const primaryActionLabel = showLossyConfirmation
    ? t(locale, 'sceneStringImportLossyConfirmAction')
    : t(locale, 'sceneStringImportChooseFileAction');

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
          if (showLossyConfirmation) {
            onConfirmLossy();
            return;
          }

          onChooseFile();
        }}
      >
        <div className="scene-string-import-modal__header">
          <h2>{t(locale, 'sceneStringImportModalTitle')}</h2>
          <button
            type="button"
            className="scene-string-import-modal__close"
            aria-label={t(locale, 'close')}
            onClick={onClose}
            ref={closeButtonRef}
          >
            ×
          </button>
        </div>

        {fileName ? (
          <dl className="scene-string-import-modal__file">
            <dt>{t(locale, 'sceneStringImportFileNameLabel')}</dt>
            <dd>{fileName}</dd>
          </dl>
        ) : null}

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
            onClick={onCancel}
          >
            {t(locale, 'sceneStringImportCancelAction')}
          </button>
          <button type="submit" className="scene-string-import-modal__primary">
            {primaryActionLabel}
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
      'button, input, select, a[href], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1);
}
