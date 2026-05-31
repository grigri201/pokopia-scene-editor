import { t, type Locale } from '../../i18n';
import { ExportPreviewContent } from '../export-preview/ExportPreview';
import type { MobilePreviewState } from './mobile-preview-state';

interface MobilePreviewModeProps {
  locale: Locale;
  state: MobilePreviewState;
  onImportRequest: () => void;
}

export function MobilePreviewMode({
  locale,
  state,
  onImportRequest,
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
        <MobilePreviewNotice locale={locale} state={state} />
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
  state,
}: {
  locale: Locale;
  state: Extract<MobilePreviewState, { status: 'empty' | 'invalid' }>;
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

  if (state.status === 'invalid') {
    return t(locale, 'mobilePreviewInvalidTitle');
  }

  if (state.reason === 'storage-unavailable') {
    return t(locale, 'mobilePreviewStorageUnavailableTitle');
  }

  return t(locale, 'mobilePreviewEmptyTitle');
}
