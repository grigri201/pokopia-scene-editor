import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { getPokemonThemeDefinition } from '../../domain/assets';
import type {
  ExportLayerMaterialSummary,
  ImageExportCellSummary,
  ImageExportLayerSummary,
  ImageExportSummary,
} from '../../domain/scene';

interface ExportPreviewProps {
  summary: ImageExportSummary;
  downloadError?: string | null;
  downloadDisabled?: boolean;
  downloadStatus?: string | null;
  onClose: () => void;
  onDownloadImage?: () => void;
}

export function ExportPreview({
  summary,
  downloadError = null,
  downloadDisabled = false,
  downloadStatus = null,
  onClose,
  onDownloadImage,
}: ExportPreviewProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const isDownloadDisabled = downloadDisabled || !onDownloadImage;
  const selectedPokemon = getPokemonThemeDefinition(summary.selectedPokemonKey);
  const pokemonTitleImageStyle = {
    '--export-pokemon-background': selectedPokemon.background,
    '--export-pokemon-accent': selectedPokemon.accent,
  } as CSSProperties;

  useEffect(() => {
    const previouslyFocusedElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    closeButtonRef.current?.focus();

    return () => {
      if (previouslyFocusedElement?.isConnected) {
        previouslyFocusedElement.focus();
      }
    };
  }, []);

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusableElements = getFocusableElements(dialogRef.current);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1);

    if (!firstElement || !lastElement) {
      event.preventDefault();
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

  return (
    <div className="export-preview-backdrop">
      <section
        ref={dialogRef}
        className="export-preview"
        role="dialog"
        aria-modal="true"
        aria-label="图片导出预览"
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
      >
        <header className="export-preview__header">
          <div className="export-preview__title">
            <span
              className="export-preview__pokemon-title-image"
              aria-label={`${selectedPokemon.name}导出预览宝可梦图片`}
              style={pokemonTitleImageStyle}
            >
              <img src={selectedPokemon.portraitUrl} alt={`${selectedPokemon.name}宝可梦图片`} />
            </span>
            <div>
              <p className="eyebrow">Image Export Preview</p>
              <h2>{summary.sceneName}</h2>
              <p>{summary.canvasSize.width}x{summary.canvasSize.height} canvas · {summary.layers.length} building layers</p>
            </div>
          </div>
          <div className="export-preview__actions">
            <button
              type="button"
              className="app-action-button"
              disabled={isDownloadDisabled}
              onClick={onDownloadImage}
            >
              下载图片
            </button>
            <button ref={closeButtonRef} type="button" className="app-action-button" onClick={onClose}>
              关闭
            </button>
          </div>
        </header>
        {downloadStatus ? (
          <p className="export-preview__feedback" role="status" aria-label="Image export download status">
            {downloadStatus}
          </p>
        ) : null}
        {downloadError ? (
          <p className="export-preview__feedback export-preview__feedback--error" role="alert" aria-label="Image export download error">
            {downloadError}
          </p>
        ) : null}

        <section className="export-preview__body" aria-label="Export image content">
          <section className="export-preview__summary" aria-label="整体使用素材清单">
            <h3>整体使用素材</h3>
            {summary.overallMaterials.length > 0 ? (
              <MaterialList materials={summary.overallMaterials} showThumbnails />
            ) : (
              <p className="export-preview__empty">未放置素材</p>
            )}
          </section>

          <section className="export-preview__layers" aria-label="逐层图形和素材清单">
            {summary.layers.map((layer) => (
              <LayerPreview key={layer.id} layer={layer} />
            ))}
          </section>
        </section>
      </section>
    </div>
  );
}

function getFocusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) {
    return [];
  }

  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true');
}

function LayerPreview({ layer }: { layer: ImageExportLayerSummary }) {
  return (
    <article className="export-layer" aria-label={`${layer.displayId} ${layer.name}`}>
      <header className="export-layer__header">
        <div>
          <h3>{layer.displayId} · {layer.name}</h3>
        </div>
        {layer.empty ? <span className="status-pill">空层</span> : null}
      </header>
      <div className="export-layer__content">
        <div className="export-layer-grid" aria-label={`${layer.displayId} 7x7 图形`}>
          {layer.cells.map((cell) => (
            <ExportCell key={cell.id} cell={cell} />
          ))}
        </div>
        <section className="export-layer__materials" aria-label={`${layer.displayId} 使用素材清单`}>
          {layer.materials.length > 0 ? (
            <MaterialList materials={layer.materials} showThumbnails />
          ) : (
            <p className="export-preview__empty">该层没有素材</p>
          )}
        </section>
      </div>
    </article>
  );
}

function ExportCell({ cell }: { cell: ImageExportCellSummary }) {
  const firstInstance = cell.tileInstances[0] ?? null;
  const label = firstInstance
    ? `${cell.coordinate.x},${cell.coordinate.y}: ${cell.tileInstances.map((instance) => instance.assetName).join(', ')}`
    : `${cell.coordinate.x},${cell.coordinate.y}: empty`;

  return (
    <div
      className="export-layer-cell"
      data-area={cell.areaType}
      data-empty={cell.empty}
      aria-label={label}
    >
      {firstInstance?.thumbnailUrl ? (
        <img src={firstInstance.thumbnailUrl} alt="" title={firstInstance.assetName} />
      ) : null}
    </div>
  );
}

function MaterialList({
  materials,
  showThumbnails = false,
}: {
  materials: readonly (ExportLayerMaterialSummary | ImageExportSummary['overallMaterials'][number])[];
  showThumbnails?: boolean;
}) {
  return (
    <ul className={showThumbnails ? 'export-material-list export-material-list--with-thumbs' : 'export-material-list'}>
      {materials.map((material) => (
        <li key={material.assetId}>
          {showThumbnails ? (
            <span className="export-material-list__thumb">
              {material.thumbnailUrl ? (
                <img src={material.thumbnailUrl} alt={material.thumbnailAlt} />
              ) : (
                <span aria-hidden="true">{material.assetName.slice(0, 1)}</span>
              )}
            </span>
          ) : null}
          <div className="export-material-list__row">
            <strong>{material.assetName}</strong>
            <span>x{'count' in material ? material.count : material.totalCount}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
