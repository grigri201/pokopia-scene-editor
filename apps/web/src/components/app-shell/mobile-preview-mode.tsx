import { t, type Locale } from '../../i18n';
import { ExportPreviewContent } from '../export-preview/ExportPreview';
import type { MobilePreviewState } from './mobile-preview-state';

interface MobilePreviewModeProps {
  locale: Locale;
  state: MobilePreviewState;
  onImportRequest: () => void;
  onRemoteLossyCancel?: () => void;
  onRemoteLossyConfirm?: () => void;
  onRemoteRetry?: () => void;
}

export function MobilePreviewMode({
  locale,
  state,
  onImportRequest,
  onRemoteLossyCancel,
  onRemoteLossyConfirm,
  onRemoteRetry,
}: MobilePreviewModeProps) {
  return (
    <section
      className="mobile-preview-mode"
      aria-label={t(locale, 'mobilePreviewMode')}
      data-mobile-preview-state={state.status}
    >
      <span className="sr-only status-pill" aria-label="Interaction mode">
        {t(locale, 'mobilePreviewMode')}
      </span>
      <div className="mobile-preview-mode__header">
        <p className="eyebrow">{t(locale, 'mobilePreviewMode')}</p>
        <h1>{getMobilePreviewTitle(state, locale)}</h1>
      </div>

      {state.status === 'preview-ready' ? (
        <div className="mobile-preview-mode__inline-preview">
          <ExportPreviewContent locale={locale} summary={state.summary} />
        </div>
      ) : (
        <MobilePreviewNotice
          locale={locale}
          state={state}
          onRemoteLossyCancel={onRemoteLossyCancel}
          onRemoteLossyConfirm={onRemoteLossyConfirm}
          onRemoteRetry={onRemoteRetry}
        />
      )}

      <button
        type="button"
        className="mobile-preview-mode__import"
        aria-label={t(locale, 'mobilePreviewImportAction')}
        onClick={onImportRequest}
      >
        {t(locale, 'mobilePreviewImportAction')}
      </button>
    </section>
  );
}

function MobilePreviewNotice({
  locale,
  onRemoteLossyCancel,
  onRemoteLossyConfirm,
  onRemoteRetry,
  state,
}: {
  locale: Locale;
  onRemoteLossyCancel?: () => void;
  onRemoteLossyConfirm?: () => void;
  onRemoteRetry?: () => void;
  state: Exclude<MobilePreviewState, { status: 'preview-ready' }>;
}) {
  if (state.status === 'empty') {
    return (
      <div className="mobile-preview-mode__notice">
        <p>
          {state.reason === 'storage-unavailable'
            ? t(locale, 'mobilePreviewStorageUnavailableBody')
            : t(locale, 'mobilePreviewEmptyBody')}
        </p>
      </div>
    );
  }

  if (state.status === 'remote-loading') {
    return (
      <div className="mobile-preview-mode__notice" role="status">
        <p>{t(locale, 'remoteSceneImportLoading', { sceneId: state.sceneId })}</p>
      </div>
    );
  }

  if (state.status === 'remote-error') {
    return (
      <div className="mobile-preview-mode__notice mobile-preview-mode__notice--invalid" role="alert">
        <p>{state.message}</p>
        {state.errors?.length ? (
          <ul aria-label={t(locale, 'mobilePreviewRecoveryErrorsLabel')}>
            {state.errors.map((error, index) => (
              <li key={`${error.fieldPath}-${index}`}>
                <strong>{error.fieldPath}</strong>
                <span>{error.reason}</span>
                <span>{t(locale, 'expected')}: {error.expected}</span>
                <span>{t(locale, 'actual')}: {error.actual}</span>
                <span>{error.recoveryAction}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {onRemoteRetry ? (
          <button type="button" className="mobile-preview-mode__secondary-action" onClick={onRemoteRetry}>
            {t(locale, 'remoteSceneImportRetry')}
          </button>
        ) : null}
      </div>
    );
  }

  if (state.status === 'remote-lossy') {
    return (
      <div className="mobile-preview-mode__notice mobile-preview-mode__notice--invalid" role="alert">
        <p>{t(locale, 'remoteSceneImportLossySummary', { count: state.droppedTileDetails.length })}</p>
        <ul aria-label={t(locale, 'remoteSceneImportLossyDetails')}>
          {state.droppedTileDetails.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
        <div className="mobile-preview-mode__remote-actions">
          <button type="button" className="mobile-preview-mode__secondary-action" onClick={onRemoteLossyCancel}>
            {t(locale, 'remoteSceneImportCancelAction')}
          </button>
          <button type="button" className="mobile-preview-mode__secondary-action" onClick={onRemoteLossyConfirm}>
            {t(locale, 'remoteSceneImportLossyConfirmAction')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-preview-mode__notice mobile-preview-mode__notice--invalid">
      <p>{t(locale, 'mobilePreviewInvalidBody')}</p>
      <ul aria-label={t(locale, 'mobilePreviewRecoveryErrorsLabel')}>
        {state.errors.map((error, index) => (
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
  );
}

function getMobilePreviewTitle(state: MobilePreviewState, locale: Locale): string {
  if (state.status === 'preview-ready') {
    return t(locale, 'mobilePreviewReadyTitle');
  }

  if (state.status === 'remote-loading') {
    return t(locale, 'remoteSceneImportLoadingTitle');
  }

  if (state.status === 'remote-error') {
    return t(locale, 'remoteSceneImportErrorTitle');
  }

  if (state.status === 'remote-lossy') {
    return t(locale, 'remoteSceneImportLossyTitle');
  }

  if (state.status === 'invalid') {
    return t(locale, 'mobilePreviewInvalidTitle');
  }

  if (state.reason === 'storage-unavailable') {
    return t(locale, 'mobilePreviewStorageUnavailableTitle');
  }

  return t(locale, 'mobilePreviewEmptyTitle');
}
