import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { getAssetById, getPokemonThemeDefinition } from '@pokopia-scene-editor/scene-core';
import { defaultLocale, getPokemonDisplay, t, type Locale } from '../../i18n';
import type {
  ExportLayerMaterialSummary,
  ExportStackingRelationSummary,
  ExportTileInstanceSummary,
  ExportLayerSkillSummary,
  ExportMaterialSummary,
  ExportSkillSummary,
  ImageExportCellSummary,
  ImageExportLayerSummary,
  ImageExportSummary,
} from '@pokopia-scene-editor/scene-core';
import {
  formatStackingFootprint,
  getStackingShortSideSplitAxis,
  getStackingSplitDisplay,
  type StackingFootprint,
} from '../stacking-display';
import { createMaterialColor } from './material-colors';

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
  const materialColorByAssetId = createMaterialColorMap(summary.overallMaterials);
  const overallUsageItems = createUsageItems(summary.overallMaterials, summary.overallSkills);
  const canvasBuildingLayersKey = summary.layers.length === 1 ? 'canvasBuildingLayer' : 'canvasBuildingLayers';
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
              <h2>{summary.sceneName}</h2>
              <p>{t(locale, canvasBuildingLayersKey, {
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

          <section className="export-preview__layers" aria-label={t(locale, 'exportLayerGraphicsAndMaterials')}>
            {summary.layers.map((layer) => (
              <LayerPreview key={layer.id} locale={locale} layer={layer} materialColorByAssetId={materialColorByAssetId} />
            ))}
          </section>
        </section>
        <footer className="export-preview__footer">
          <span className="export-preview__pokokit-logo" aria-label={t(locale, 'pokokitColorLogo')}>
            pokokit
          </span>
        </footer>
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

function LayerPreview({
  locale,
  layer,
  materialColorByAssetId,
}: {
  locale: Locale;
  layer: ImageExportLayerSummary;
  materialColorByAssetId: ReadonlyMap<string, string>;
}) {
  const usageItems = createUsageItems(layer.materials, layer.skills, materialColorByAssetId);
  const instanceById = getLayerInstanceMap(layer);
  const footprintOverlays = getLayerFootprintOverlays(layer, materialColorByAssetId);
  const footprintOverlayInstanceIds = new Set(footprintOverlays.map((overlay) => overlay.instance.instanceId));
  const coordinateBounds = getLayerCoordinateBounds(layer);

  return (
    <article className="export-layer" aria-label={`${layer.displayId} ${layer.name}`}>
      <header className="export-layer__header">
        <div>
          <h3>{layer.displayId} · {layer.name}</h3>
        </div>
        {layer.empty ? <span className="status-pill">{t(locale, 'emptyLayer')}</span> : null}
      </header>
      <div className="export-layer__content">
        <div className="export-layer-grid-frame">
          <span className="export-layer-coordinate-label export-layer-coordinate-label--origin" aria-hidden="true">
            {coordinateBounds.origin}
          </span>
          <div className="export-layer-grid" aria-label={t(locale, 'layerGraphic', { displayId: layer.displayId })}>
            {layer.cells.map((cell) => (
              <ExportCell
                key={cell.id}
                locale={locale}
                cell={cell}
                footprintOverlayInstanceIds={footprintOverlayInstanceIds}
                materialColorByAssetId={materialColorByAssetId}
                instanceById={instanceById}
              />
            ))}
            {footprintOverlays.length > 0 ? (
              <div className="export-footprint-layer" aria-hidden="true">
                {footprintOverlays.map((overlay) => {
                  const baseFootprint = overlay.stackingRelation
                    ? getExportStackingFootprint(
                      overlay.stackingRelation.baseAssetId,
                      instanceById.get(overlay.stackingRelation.baseInstanceId),
                    )
                    : null;
                  const topFootprint = overlay.stackingRelation
                    ? getExportStackingFootprint(overlay.stackingRelation.topAssetId, overlay.instance)
                    : null;

                  return (
                    <span
                      className={[
                        'export-footprint-overlay',
                        overlay.stackingRole === 'top' ? 'export-footprint-overlay--stacking-top' : '',
                      ].filter(Boolean).join(' ')}
                      data-testid={`export-footprint-overlay-${overlay.instance.instanceId}`}
                      data-footprint-instance-id={overlay.instance.instanceId}
                      data-footprint-asset-id={overlay.instance.assetId}
                      data-effective-footprint={formatExportFootprint(overlay.instance.effectiveFootprint)}
                      data-occupied-cells={overlay.instance.occupiedCells.map(formatExportCoordinate).join(' ')}
                      data-material-color={overlay.materialColor}
                      data-stacking-state={overlay.stackingRelation ? 'placed' : ''}
                      data-stacking-role={overlay.stackingRole ?? ''}
                      data-stacking-relation-id={overlay.stackingRelation?.id ?? ''}
                      data-stacking-base-instance-id={overlay.stackingRelation?.baseInstanceId ?? ''}
                      data-stacking-top-instance-id={overlay.stackingRelation?.topInstanceId ?? ''}
                      data-stacking-base-asset-id={overlay.stackingRelation?.baseAssetId ?? ''}
                      data-stacking-top-asset-id={overlay.stackingRelation?.topAssetId ?? ''}
                      data-stacking-base-footprint={overlay.stackingRelation ? formatStackingFootprint(baseFootprint) : ''}
                      data-stacking-top-footprint={overlay.stackingRelation ? formatStackingFootprint(topFootprint) : ''}
                      data-stacking-top-crop-axis={overlay.stackingRole === 'top' ? getStackingShortSideSplitAxis(overlay.instance.effectiveFootprint) : ''}
                      data-stacking-surface-kind={overlay.stackingRelation?.surfaceKind ?? ''}
                      key={overlay.instance.instanceId}
                      style={getExportFootprintOverlayStyle(overlay)}
                    >
                      {overlay.instance.thumbnailUrl ? (
                        <img src={overlay.instance.thumbnailUrl} alt="" title={overlay.instance.assetName} />
                      ) : (
                        <span>{overlay.instance.assetName.slice(0, 1)}</span>
                      )}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
          <span className="export-layer-coordinate-label export-layer-coordinate-label--max" aria-hidden="true">
            {coordinateBounds.max}
          </span>
        </div>
        <div className="export-layer__details">
          <section className="export-layer__materials" aria-label={t(locale, 'layerMaterialsList', { displayId: layer.displayId })}>
            {usageItems.length > 0 ? (
              <UsageList items={usageItems} />
            ) : (
              <p className="export-preview__empty">{t(locale, 'layerNoMaterials')}</p>
            )}
          </section>
          {layer.notes.length > 0 ? <LayerNotes locale={locale} layer={layer} /> : null}
        </div>
      </div>
    </article>
  );
}

function LayerNotes({ locale, layer }: { locale: Locale; layer: ImageExportLayerSummary }) {
  return (
    <section className="export-layer-notes" aria-label={t(locale, 'layerNotesListExport', { displayId: layer.displayId })}>
      <h4>{t(locale, 'layerNotesExport')}</h4>
      <ol>
        {layer.notes.map((note) => (
          <li key={note.id}>{note.text}</li>
        ))}
      </ol>
    </section>
  );
}

function getLayerCoordinateBounds(layer: ImageExportLayerSummary): { origin: string; max: string } {
  const maxCoordinate = layer.cells.reduce(
    (max, cell) => ({
      x: Math.max(max.x, cell.coordinate.x),
      y: Math.max(max.y, cell.coordinate.y),
    }),
    { x: 0, y: 0 },
  );

  return {
    origin: '0,0',
    max: `${maxCoordinate.x},${maxCoordinate.y}`,
  };
}

function ExportCell({
  locale,
  cell,
  footprintOverlayInstanceIds,
  materialColorByAssetId,
  instanceById,
}: {
  locale: Locale;
  cell: ImageExportCellSummary;
  footprintOverlayInstanceIds: ReadonlySet<string>;
  materialColorByAssetId: ReadonlyMap<string, string>;
  instanceById: ReadonlyMap<string, ExportTileInstanceSummary>;
}) {
  const firstInstance = cell.tileInstances[0] ?? null;
  const firstSkillMarker = cell.skillMarkers[0] ?? null;
  const stackingRelation = cell.stackingRelations[0] ?? null;
  const stackingBaseFootprint = stackingRelation
    ? getExportStackingFootprint(stackingRelation.baseAssetId, instanceById.get(stackingRelation.baseInstanceId))
    : null;
  const stackingTopFootprint = stackingRelation
    ? getExportStackingFootprint(stackingRelation.topAssetId, instanceById.get(stackingRelation.topInstanceId))
    : null;
  const stackingDisplay = getStackingSplitDisplay({
    topFootprint: stackingTopFootprint,
    baseFootprint: stackingBaseFootprint,
  });
  const stackingBaseUsesOverlay = Boolean(stackingRelation && footprintOverlayInstanceIds.has(stackingRelation.baseInstanceId));
  const stackingTopUsesOverlay = Boolean(stackingRelation && footprintOverlayInstanceIds.has(stackingRelation.topInstanceId));
  const shouldRenderInlineInstance = Boolean(firstInstance && !footprintOverlayInstanceIds.has(firstInstance.instanceId) && !stackingRelation);
  const materialColor = firstInstance ? materialColorByAssetId.get(firstInstance.assetId) ?? null : null;
  const label = stackingRelation
    ? `${cell.coordinate.x},${cell.coordinate.y}: ${stackingRelation.topAssetName} stacked on ${stackingRelation.baseAssetName}`
    : firstInstance
    ? `${cell.coordinate.x},${cell.coordinate.y}: ${cell.tileInstances.map((instance) => instance.assetName).join(', ')}`
    : firstSkillMarker
      ? locale === 'zh-CN'
        ? `${cell.coordinate.x},${cell.coordinate.y}: ${firstSkillMarker.skillType}技能`
        : `${cell.coordinate.x},${cell.coordinate.y}: ${firstSkillMarker.skillLabel} ${t(locale, 'skillSuffix')}`
    : `${cell.coordinate.x},${cell.coordinate.y}: ${t(locale, 'emptyLayer')}`;

  return (
    <div
      className={['export-layer-cell', materialColor ? 'export-layer-cell--material' : ''].filter(Boolean).join(' ')}
      data-area={cell.areaType}
      data-empty={cell.empty}
      data-footprint-instance-id={firstInstance?.instanceId ?? ''}
      data-effective-footprint={firstInstance?.effectiveFootprint ? formatExportFootprint(firstInstance.effectiveFootprint) : ''}
      data-material-asset-id={firstInstance?.assetId ?? ''}
      data-material-color={materialColor ?? ''}
      data-stacking-state={stackingRelation ? 'placed' : ''}
      data-stacking-relation-id={stackingRelation?.id ?? ''}
      data-stacking-base-instance-id={stackingRelation?.baseInstanceId ?? ''}
      data-stacking-top-instance-id={stackingRelation?.topInstanceId ?? ''}
      data-stacking-base-asset-id={stackingRelation?.baseAssetId ?? ''}
      data-stacking-top-asset-id={stackingRelation?.topAssetId ?? ''}
      data-stacking-base-footprint={stackingRelation ? formatStackingFootprint(stackingBaseFootprint) : ''}
      data-stacking-top-footprint={stackingRelation ? formatStackingFootprint(stackingTopFootprint) : ''}
      data-stacking-base-visibility={stackingRelation ? stackingDisplay.baseVisibility : ''}
      data-stacking-base-render={stackingBaseUsesOverlay ? 'overlay' : stackingRelation ? 'cell' : ''}
      data-stacking-top-render={stackingTopUsesOverlay ? 'overlay' : stackingRelation ? 'cell' : ''}
      data-stacking-split-axis={stackingRelation ? stackingDisplay.splitAxis : ''}
      data-stacking-surface-kind={stackingRelation?.surfaceKind ?? ''}
      style={getExportMaterialColorStyle(materialColor)}
      aria-label={label}
    >
      {stackingRelation ? (
        <ExportStackingSplit
          stackingRelation={stackingRelation}
          baseFootprint={stackingBaseFootprint}
          topFootprint={stackingTopFootprint}
          baseUsesOverlay={stackingBaseUsesOverlay}
          topUsesOverlay={stackingTopUsesOverlay}
          baseMaterialColor={materialColorByAssetId.get(stackingRelation.baseAssetId) ?? defaultMaterialColor}
          topMaterialColor={materialColorByAssetId.get(stackingRelation.topAssetId) ?? defaultMaterialColor}
        />
      ) : shouldRenderInlineInstance && firstInstance?.thumbnailUrl ? (
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

function ExportStackingSplit({
  stackingRelation,
  baseFootprint = getExportStackingFootprint(stackingRelation.baseAssetId),
  topFootprint = getExportStackingFootprint(stackingRelation.topAssetId),
  baseUsesOverlay = false,
  topUsesOverlay = false,
  baseMaterialColor = defaultMaterialColor,
  topMaterialColor = defaultMaterialColor,
}: {
  stackingRelation: ExportStackingRelationSummary;
  baseFootprint?: StackingFootprint | null;
  topFootprint?: StackingFootprint | null;
  baseUsesOverlay?: boolean;
  topUsesOverlay?: boolean;
  baseMaterialColor?: string;
  topMaterialColor?: string;
}) {
  const display = getStackingSplitDisplay({ topFootprint, baseFootprint });
  const hideBaseImage = !display.showBaseImage || baseUsesOverlay;
  const baseFootprintLabel = formatStackingFootprint(baseFootprint);
  const topFootprintLabel = formatStackingFootprint(topFootprint);

  return (
    <span
      className={[
        'export-stacking-split',
        `export-stacking-split--${display.splitAxis}`,
        hideBaseImage ? 'export-stacking-split--base-hidden' : 'export-stacking-split--base-visible',
      ].filter(Boolean).join(' ')}
      data-stacking-base-footprint={baseFootprintLabel}
      data-stacking-top-footprint={topFootprintLabel}
      data-stacking-base-visibility={display.baseVisibility}
      data-stacking-base-render={baseUsesOverlay ? 'overlay' : 'cell'}
      data-stacking-top-render={topUsesOverlay ? 'overlay' : 'cell'}
      data-stacking-split-axis={display.splitAxis}
      aria-hidden="true"
    >
      <ExportStackingSlot
        role="top"
        instanceId={stackingRelation.topInstanceId}
        assetId={stackingRelation.topAssetId}
        assetName={stackingRelation.topAssetName}
        thumbnailUrl={stackingRelation.topThumbnailUrl}
        hideImage={topUsesOverlay}
        materialColor={topMaterialColor}
      />
      <ExportStackingSlot
        role="base"
        instanceId={stackingRelation.baseInstanceId}
        assetId={stackingRelation.baseAssetId}
        assetName={stackingRelation.baseAssetName}
        thumbnailUrl={stackingRelation.baseThumbnailUrl}
        hideImage={hideBaseImage}
        materialColor={baseMaterialColor}
      />
    </span>
  );
}

function ExportStackingSlot({
  role,
  instanceId,
  assetId,
  assetName,
  thumbnailUrl,
  hideImage = false,
  materialColor,
}: {
  role: 'top' | 'base';
  instanceId: string;
  assetId: string;
  assetName: string;
  thumbnailUrl: string | null;
  hideImage?: boolean;
  materialColor: string;
}) {
  return (
    <span
      className={`export-stacking-split__slot export-stacking-split__slot--${role}`}
      data-stacking-role={role}
      data-instance-id={instanceId}
      data-asset-id={assetId}
      data-top-image-visible={role === 'top' ? (hideImage ? 'false' : 'true') : undefined}
      data-base-image-visible={role === 'base' ? (hideImage ? 'false' : 'true') : undefined}
      data-material-color={materialColor}
      style={getExportMaterialColorStyle(materialColor)}
    >
      {hideImage ? null : thumbnailUrl ? <img src={thumbnailUrl} alt="" title={assetName} /> : <span>{assetName.slice(0, 1)}</span>}
    </span>
  );
}

interface ExportFootprintOverlay {
  instance: ExportTileInstanceSummary;
  anchorColumn: number;
  anchorRow: number;
  materialColor: string;
  stackingRole: 'top' | null;
  stackingRelation: ExportStackingRelationSummary | null;
}

function getLayerFootprintOverlays(
  layer: ImageExportLayerSummary,
  materialColorByAssetId: ReadonlyMap<string, string>,
): ExportFootprintOverlay[] {
  const stackingRelationByTopInstanceId = new Map(
    layer.stackingRelations.map((relation) => [relation.topInstanceId, relation]),
  );

  return layer.materials.flatMap((material) =>
    material.instances
      .filter((instance) => isMultiCellExportInstance(instance))
      .map((instance) => {
        const stackingRelation = stackingRelationByTopInstanceId.get(instance.instanceId) ?? null;

        return {
          instance,
          anchorColumn: instance.coordinate.x + 1,
          anchorRow: instance.coordinate.y + 1,
          materialColor: materialColorByAssetId.get(instance.assetId) ?? defaultMaterialColor,
          stackingRole: stackingRelation ? 'top' as const : null,
          stackingRelation,
        };
      }),
  );
}

function isMultiCellExportInstance(instance: ExportTileInstanceSummary): boolean {
  return Boolean(instance.effectiveFootprint && (instance.effectiveFootprint.length > 1 || instance.effectiveFootprint.width > 1));
}

function getLayerInstanceMap(layer: ImageExportLayerSummary): Map<string, ExportTileInstanceSummary> {
  return new Map(layer.materials.flatMap((material) =>
    material.instances.map((instance) => [instance.instanceId, instance] as const),
  ));
}

function getExportStackingFootprint(
  assetId: string,
  instance?: ExportTileInstanceSummary | null,
): StackingFootprint | null {
  return instance?.effectiveFootprint ?? getAssetById(assetId)?.footprint ?? null;
}

function getExportFootprintOverlayStyle(overlay: ExportFootprintOverlay): CSSProperties {
  const footprint = overlay.instance.effectiveFootprint;

  if (!footprint) {
    return {};
  }

  return {
    gridColumn: `${overlay.anchorColumn} / span ${footprint.length}`,
    gridRow: `${overlay.anchorRow} / span ${footprint.width}`,
    ...getExportMaterialColorStyle(overlay.materialColor),
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
  kind: 'material' | 'skill';
  assetId: string | null;
  name: string;
  count: number;
  thumbnailUrl: string | null;
  thumbnailAlt: string;
  fallbackText: string;
  materialColor: string | null;
}

function UsageList({ items }: { items: readonly ExportUsageItem[] }) {
  return (
    <ul className="export-material-list export-material-list--with-thumbs">
      {items.map((item) => (
        <li
          key={item.id}
          data-export-item-kind={item.kind}
          data-material-asset-id={item.assetId ?? ''}
          data-material-color={item.materialColor ?? ''}
          style={getExportMaterialColorStyle(item.materialColor)}
        >
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
  materialColorByAssetId?: ReadonlyMap<string, string>,
): ExportUsageItem[] {
  return [
    ...materials.map((material) => ({
      id: `material:${material.assetId}`,
      kind: 'material' as const,
      assetId: material.assetId,
      name: material.assetName,
      count: 'count' in material ? material.count : material.totalCount,
      thumbnailUrl: material.thumbnailUrl,
      thumbnailAlt: material.thumbnailAlt,
      fallbackText: material.assetName.slice(0, 1),
      materialColor: materialColorByAssetId ? materialColorByAssetId.get(material.assetId) ?? defaultMaterialColor : null,
    })),
    ...skills.map((skill) => ({
      id: `skill:${skill.skillType}`,
      kind: 'skill' as const,
      assetId: null,
      name: skill.skillName,
      count: 'count' in skill ? skill.count : skill.totalCount,
      thumbnailUrl: skill.iconUrl,
      thumbnailAlt: skill.iconAlt,
      fallbackText: skill.skillLabel,
      materialColor: null,
    })),
  ];
}

const defaultMaterialColor = createMaterialColor(0);

function createMaterialColorMap(materials: readonly ExportMaterialSummary[]): ReadonlyMap<string, string> {
  return new Map(materials.map((material, index) => [
    material.assetId,
    createMaterialColor(index),
  ]));
}

function getExportMaterialColorStyle(materialColor: string | null): CSSProperties | undefined {
  return materialColor
    ? ({ '--export-material-color': materialColor } as CSSProperties)
    : undefined;
}
