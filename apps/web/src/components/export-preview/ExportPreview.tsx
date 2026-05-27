import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { getPokemonThemeDefinition } from '@pokopia-scene-editor/scene-core';
import { defaultLocale, getPokemonDisplay, t, type Locale } from '../../i18n';
import type {
  ExportLayerMaterialSummary,
  ExportTileInstanceSummary,
  ExportLayerSkillSummary,
  ExportMaterialSummary,
  ExportSkillSummary,
  ImageExportCellSummary,
  ImageExportLayerSummary,
  ImageExportSummary,
} from '@pokopia-scene-editor/scene-core';

interface ExportPreviewProps {
  locale?: Locale;
  summary: ImageExportSummary;
  downloadDisabled?: boolean;
  onClose: () => void;
  onDownloadImage?: (previewElement: HTMLElement) => void | Promise<void>;
}

export function ExportPreview({
  locale = defaultLocale,
  summary,
  downloadDisabled = false,
  onClose,
  onDownloadImage,
}: ExportPreviewProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const isDownloadDisabled = downloadDisabled || !onDownloadImage;
  const selectedPokemon = getPokemonThemeDefinition(summary.selectedPokemonKey);
  const selectedPokemonName = getPokemonDisplay(selectedPokemon, locale);
  const overallUsageItems = createUsageItems(summary.overallMaterials, summary.overallSkills);
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

  const handleDownloadImage = () => {
    if (dialogRef.current) {
      void onDownloadImage?.(dialogRef.current);
    }
  };

  return (
    <div className="export-preview-backdrop">
      <section
        ref={dialogRef}
        className="export-preview"
        role="dialog"
        aria-modal="true"
        aria-label={t(locale, 'imageExportPreview')}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
      >
        <header className="export-preview__header">
          <div className="export-preview__title">
            <span
              className="export-preview__pokemon-title-image"
              aria-label={t(locale, 'pokemonExportImage', { name: selectedPokemonName })}
              style={pokemonTitleImageStyle}
            >
              <img src={selectedPokemon.portraitUrl} alt={t(locale, 'pokemonImageAlt', { name: selectedPokemonName })} />
            </span>
            <div>
              <p className="eyebrow">{t(locale, 'imageExportEyebrow')}</p>
              <h2>{summary.sceneName}</h2>
              <p>{t(locale, 'canvasBuildingLayers', {
                width: summary.canvasSize.width,
                height: summary.canvasSize.height,
                count: summary.layers.length,
              })}</p>
            </div>
          </div>
          <div className="export-preview__actions" data-image-export-exclude="true">
            <button
              type="button"
              className="app-action-button"
              data-image-export-exclude="true"
              disabled={isDownloadDisabled}
              onClick={handleDownloadImage}
            >
              {t(locale, 'downloadImage')}
            </button>
            <button
              ref={closeButtonRef}
              type="button"
              className="app-action-button"
              data-image-export-exclude="true"
              onClick={onClose}
            >
              {t(locale, 'close')}
            </button>
          </div>
        </header>
        <section className="export-preview__body" aria-label={t(locale, 'imageExportContent')}>
          <section className="export-preview__summary" aria-label={t(locale, 'overallMaterialsList')}>
            <h3>{t(locale, 'overallMaterials')}</h3>
            {overallUsageItems.length > 0 ? (
              <UsageList items={overallUsageItems} />
            ) : (
              <p className="export-preview__empty">{t(locale, 'noMaterialsPlaced')}</p>
            )}
          </section>

          <section className="export-preview__layers" aria-label="逐层图形和素材清单">
            {summary.layers.map((layer) => (
              <LayerPreview key={layer.id} locale={locale} layer={layer} />
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

function LayerPreview({ locale, layer }: { locale: Locale; layer: ImageExportLayerSummary }) {
  const usageItems = createUsageItems(layer.materials, layer.skills);
  const footprintOverlays = getLayerFootprintOverlays(layer);
  const footprintOverlayInstanceIds = new Set(footprintOverlays.map((overlay) => overlay.instance.instanceId));

  return (
    <article className="export-layer" aria-label={`${layer.displayId} ${layer.name}`}>
      <header className="export-layer__header">
        <div>
          <h3>{layer.displayId} · {layer.name}</h3>
        </div>
        {layer.empty ? <span className="status-pill">{t(locale, 'emptyLayer')}</span> : null}
      </header>
      <div className="export-layer__content">
        <div className="export-layer-grid" aria-label={t(locale, 'layerGraphic', { displayId: layer.displayId })}>
          {layer.cells.map((cell) => (
            <ExportCell key={cell.id} locale={locale} cell={cell} footprintOverlayInstanceIds={footprintOverlayInstanceIds} />
          ))}
          {footprintOverlays.length > 0 ? (
            <div className="export-footprint-layer" aria-hidden="true">
              {footprintOverlays.map((overlay) => (
                <span
                  className="export-footprint-overlay"
                  data-testid={`export-footprint-overlay-${overlay.instance.instanceId}`}
                  data-footprint-instance-id={overlay.instance.instanceId}
                  data-footprint-asset-id={overlay.instance.assetId}
                  data-effective-footprint={formatExportFootprint(overlay.instance.effectiveFootprint)}
                  data-occupied-cells={overlay.instance.occupiedCells.map(formatExportCoordinate).join(' ')}
                  key={overlay.instance.instanceId}
                  style={getExportFootprintOverlayStyle(overlay)}
                >
                  {overlay.instance.thumbnailUrl ? (
                    <img src={overlay.instance.thumbnailUrl} alt="" title={overlay.instance.assetName} />
                  ) : (
                    <span>{overlay.instance.assetName.slice(0, 1)}</span>
                  )}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <section className="export-layer__materials" aria-label={t(locale, 'layerMaterialsList', { displayId: layer.displayId })}>
          {usageItems.length > 0 ? (
            <UsageList items={usageItems} />
          ) : (
            <p className="export-preview__empty">{t(locale, 'layerNoMaterials')}</p>
          )}
        </section>
      </div>
    </article>
  );
}

function ExportCell({
  locale,
  cell,
  footprintOverlayInstanceIds,
}: {
  locale: Locale;
  cell: ImageExportCellSummary;
  footprintOverlayInstanceIds: ReadonlySet<string>;
}) {
  const firstInstance = cell.tileInstances[0] ?? null;
  const firstSkillMarker = cell.skillMarkers[0] ?? null;
  const shouldRenderInlineInstance = Boolean(firstInstance && !footprintOverlayInstanceIds.has(firstInstance.instanceId));
  const label = firstInstance
    ? `${cell.coordinate.x},${cell.coordinate.y}: ${cell.tileInstances.map((instance) => instance.assetName).join(', ')}`
    : firstSkillMarker
      ? locale === 'zh-CN'
        ? `${cell.coordinate.x},${cell.coordinate.y}: ${firstSkillMarker.skillType}技能`
        : `${cell.coordinate.x},${cell.coordinate.y}: ${firstSkillMarker.skillLabel} ${t(locale, 'skillSuffix')}`
    : `${cell.coordinate.x},${cell.coordinate.y}: ${t(locale, 'emptyLayer')}`;

  return (
    <div
      className="export-layer-cell"
      data-area={cell.areaType}
      data-empty={cell.empty}
      data-footprint-instance-id={firstInstance?.instanceId ?? ''}
      data-effective-footprint={firstInstance?.effectiveFootprint ? formatExportFootprint(firstInstance.effectiveFootprint) : ''}
      aria-label={label}
    >
      {shouldRenderInlineInstance && firstInstance?.thumbnailUrl ? (
        <img src={firstInstance.thumbnailUrl} alt="" title={firstInstance.assetName} />
      ) : shouldRenderInlineInstance && firstInstance ? (
        <span>{firstInstance.assetName.slice(0, 1)}</span>
      ) : firstSkillMarker?.iconUrl ? (
        <img
          src={firstSkillMarker.iconUrl}
          alt=""
          title={locale === 'zh-CN' ? `${firstSkillMarker.skillType}技能` : `${firstSkillMarker.skillLabel} ${t(locale, 'skillSuffix')}`}
        />
      ) : firstSkillMarker ? (
        <span>{firstSkillMarker.skillLabel}</span>
      ) : null}
    </div>
  );
}

interface ExportFootprintOverlay {
  instance: ExportTileInstanceSummary;
  anchorColumn: number;
  anchorRow: number;
}

function getLayerFootprintOverlays(layer: ImageExportLayerSummary): ExportFootprintOverlay[] {
  return layer.materials.flatMap((material) =>
    material.instances
      .filter((instance) => isMultiCellExportInstance(instance))
      .map((instance) => ({
        instance,
        anchorColumn: instance.coordinate.x + 1,
        anchorRow: instance.coordinate.y + 1,
      })),
  );
}

function isMultiCellExportInstance(instance: ExportTileInstanceSummary): boolean {
  return Boolean(instance.effectiveFootprint && (instance.effectiveFootprint.length > 1 || instance.effectiveFootprint.width > 1));
}

function getExportFootprintOverlayStyle(overlay: ExportFootprintOverlay): CSSProperties {
  const footprint = overlay.instance.effectiveFootprint;

  if (!footprint) {
    return {};
  }

  return {
    gridColumn: `${overlay.anchorColumn} / span ${footprint.length}`,
    gridRow: `${overlay.anchorRow} / span ${footprint.width}`,
  };
}

function formatExportFootprint(footprint: ExportTileInstanceSummary['effectiveFootprint']): string {
  return footprint ? `${footprint.length}x${footprint.width}x${footprint.height}` : '';
}

function formatExportCoordinate(coordinate: ImageExportCellSummary['coordinate']): string {
  return `${coordinate.x},${coordinate.y}`;
}

interface ExportUsageItem {
  id: string;
  name: string;
  count: number;
  thumbnailUrl: string | null;
  thumbnailAlt: string;
  fallbackText: string;
}

function UsageList({ items }: { items: readonly ExportUsageItem[] }) {
  return (
    <ul className="export-material-list export-material-list--with-thumbs">
      {items.map((item) => (
        <li key={item.id}>
          <span className="export-material-list__thumb">
            {item.thumbnailUrl ? (
              <img src={item.thumbnailUrl} alt={item.thumbnailAlt} />
            ) : (
              <span aria-hidden="true">{item.fallbackText}</span>
            )}
          </span>
          <div className="export-material-list__row">
            <strong>{item.name}</strong>
            <span>x{item.count}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function createUsageItems(
  materials: readonly (ExportMaterialSummary | ExportLayerMaterialSummary)[],
  skills: readonly (ExportSkillSummary | ExportLayerSkillSummary)[],
): ExportUsageItem[] {
  return [
    ...materials.map((material) => ({
      id: `material:${material.assetId}`,
      name: material.assetName,
      count: 'count' in material ? material.count : material.totalCount,
      thumbnailUrl: material.thumbnailUrl,
      thumbnailAlt: material.thumbnailAlt,
      fallbackText: material.assetName.slice(0, 1),
    })),
    ...skills.map((skill) => ({
      id: `skill:${skill.skillType}`,
      name: skill.skillName,
      count: 'count' in skill ? skill.count : skill.totalCount,
      thumbnailUrl: skill.iconUrl,
      thumbnailAlt: skill.iconAlt,
      fallbackText: skill.skillLabel,
    })),
  ];
}
