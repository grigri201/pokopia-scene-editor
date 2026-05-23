import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getAllVisibleFrontProjectionCellContexts,
  getCurrentLayerPreviewCellContexts,
  type FrontProjectionCellContext,
  type GridCoordinate,
  type PreviewCanvasCellContext,
  type SceneDocument,
} from '../../domain/scene';
import { getAssetById, toAssetSkillType } from '../../domain/assets';
import { defaultLocale, getAssetDisplay, getSkillDisplay, t, type Locale } from '../../i18n';

interface PreviewInspectorProps {
  locale?: Locale;
  scene: SceneDocument;
  activeBuildingLevelId: string;
  selectedCoordinate: GridCoordinate | null;
  selectedInstanceId: string | null;
  readOnly: boolean;
}

export function PreviewInspector({
  locale = defaultLocale,
  scene,
  activeBuildingLevelId,
  selectedCoordinate,
  readOnly,
}: PreviewInspectorProps) {
  const frontScrollRef = useRef<HTMLDivElement | null>(null);
  const [frontScrollHints, setFrontScrollHints] = useState({
    canScrollUp: false,
    canScrollDown: false,
  });
  const currentLayerCells = getCurrentLayerPreviewCellContexts(scene, activeBuildingLevelId);
  const frontProjectionCells = getAllVisibleFrontProjectionCellContexts(scene);
  const frontProjectionLevelCount = new Set(frontProjectionCells.map((cell) => cell.buildingLevel.id)).size;
  const hasFrontOverflowingLevels = frontProjectionLevelCount > 7;
  const frontScrollCanUp = frontScrollHints.canScrollUp;
  const frontScrollCanDown = frontScrollHints.canScrollDown || (hasFrontOverflowingLevels && !frontScrollCanUp);
  const selectedSummary = selectedCoordinate
    ? `${selectedCoordinate.x},${selectedCoordinate.y}`
    : t(locale, 'noSelection');
  const topItemSummary = t(locale, 'currentLayerPreviewItems', {
    count: currentLayerCells.filter((cell) => !cell.hidden && cell.tileInstances.length > 0).length,
  });
  const frontItemSummary = t(locale, 'visibleItemsAcrossLayers', {
    count: frontProjectionCells.reduce(
    (total, cell) => total + cell.tileInstances.length,
    0,
  ),
    layers: frontProjectionLevelCount,
  });

  const syncFrontScrollHints = useCallback(() => {
    const scrollElement = frontScrollRef.current;
    if (!scrollElement) {
      return;
    }

    const maxScrollTop = Math.max(0, scrollElement.scrollHeight - scrollElement.clientHeight);
    const nextHints = {
      canScrollUp: scrollElement.scrollTop > 1,
      canScrollDown: scrollElement.scrollTop < maxScrollTop - 1,
    };

    setFrontScrollHints((currentHints) =>
      currentHints.canScrollUp === nextHints.canScrollUp &&
      currentHints.canScrollDown === nextHints.canScrollDown
        ? currentHints
        : nextHints,
    );
  }, []);

  useEffect(() => {
    const scrollElement = frontScrollRef.current;
    if (!scrollElement) {
      return undefined;
    }

    const frame = requestAnimationFrame(syncFrontScrollHints);
    const ResizeObserverCtor = typeof ResizeObserver === 'undefined' ? null : ResizeObserver;
    const resizeObserver = ResizeObserverCtor ? new ResizeObserver(syncFrontScrollHints) : null;
    resizeObserver?.observe(scrollElement);
    if (scrollElement.firstElementChild) {
      resizeObserver?.observe(scrollElement.firstElementChild);
    }

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
    };
  }, [
    syncFrontScrollHints,
    frontProjectionCells.length,
    frontProjectionLevelCount,
  ]);

  return (
    <aside className="panel preview-panel inspector-panel" aria-label={t(locale, 'inspectorPreview')}>
      <span className="sr-only">{readOnly ? t(locale, 'viewOnly') : t(locale, 'topFront')}</span>
      <div className="preview-pair">
        <section className="preview-pane is-scrollable">
          <h3>{t(locale, 'frontView')}</h3>
          <div
            className="preview-scroll-shell"
            data-front-scroll-can-up={frontScrollCanUp}
            data-front-scroll-can-down={frontScrollCanDown}
          >
            <span className="preview-scroll-cue preview-scroll-cue--up" aria-hidden="true">
              <ScrollArrowUpIcon />
            </span>
            <div
              className="preview-scroll"
              aria-label={t(locale, 'frontScrollRegion')}
              role="region"
              tabIndex={0}
              data-front-visible-level-count={frontProjectionLevelCount}
              data-front-overflowing-levels={hasFrontOverflowingLevels}
              data-front-scroll-window-layers="7"
              onScroll={syncFrontScrollHints}
              ref={frontScrollRef}
            >
              <FrontProjectionGrid
                locale={locale}
                ariaLabel={t(locale, 'frontPreview')}
                cells={frontProjectionCells}
              />
            </div>
            <span className="preview-scroll-cue preview-scroll-cue--down" aria-hidden="true">
              <ScrollArrowDownIcon />
            </span>
          </div>
        </section>
        <section className="preview-pane">
          <h3>{t(locale, 'topView')}</h3>
          <PreviewGrid
            locale={locale}
            ariaLabel={t(locale, 'topPreview')}
            className="top-preview"
            cellClassName="top-cell"
            cells={currentLayerCells}
          />
        </section>
      </div>
      <dl className="sr-only">
        <div>
          <dt>Scope</dt>
          <dd aria-label={t(locale, 'topPreviewScope')}>
            {t(locale, 'currentLayerTopProjection')}
          </dd>
        </div>
        <div>
          <dt>Items</dt>
          <dd aria-label={t(locale, 'topPreviewItemSummary')}>{topItemSummary}</dd>
        </div>
        <div>
          <dt>Selected</dt>
          <dd aria-label={t(locale, 'topPreviewSelectionSummary')}>{selectedSummary}</dd>
        </div>
        <div>
          <dt>Mode</dt>
          <dd aria-label={t(locale, 'frontPreviewMode')}>
            All visible layers front projection {readOnly ? t(locale, 'readOnlyPreview') : t(locale, 'derivedPreview')}
          </dd>
        </div>
        <div>
          <dt>Items</dt>
          <dd aria-label={t(locale, 'frontPreviewItemSummary')}>{frontItemSummary}</dd>
        </div>
      </dl>
    </aside>
  );
}

function ScrollArrowUpIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4 10 8 6l4 4" />
    </svg>
  );
}

function ScrollArrowDownIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

function FrontProjectionGrid({
  locale,
  ariaLabel,
  cells,
}: {
  locale: Locale;
  ariaLabel: string;
  cells: FrontProjectionCellContext[];
}) {
  return (
    <div
      className="front-preview"
      aria-label={ariaLabel}
    >
      {cells.map((cell) => {
        const projectionInstance = cell.projectedInstance;
        const projectionAsset = getAssetById(projectionInstance?.assetId);
        const skillType = toAssetSkillType(cell.skillInstance?.skillType);
        const skillMarkerLabel = skillType ? getSkillDisplay(skillType, locale).marker : '';
        const cellLabel = projectionInstance
          ? `${cell.buildingLevel.displayId} x${cell.x}, projected y${projectionInstance.coordinate.y} ${getInstanceLabel(projectionInstance.assetId, locale)}`
          : `${cell.buildingLevel.displayId} x${cell.x}`;

        return (
          <span
            className={[
              'front-cell',
              cell.areaType === 'outer' ? 'outer' : '',
              projectionInstance ? 'fill' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label={cellLabel}
            data-front-x={cell.x}
            data-front-level-id={cell.buildingLevel.id}
            data-front-level-display-id={cell.buildingLevel.displayId}
            data-front-projected-y={projectionInstance?.coordinate.y ?? ''}
            data-preview-area={cell.areaType}
            data-preview-main-boundary={cell.mainBoundary}
            data-preview-has-instance={cell.tileInstances.length > 0}
            data-preview-instance-count={cell.tileInstances.length}
            data-preview-asset-id={projectionInstance?.assetId ?? ''}
            data-preview-instance-id={projectionInstance?.instanceId ?? ''}
            data-preview-requires-skill={Boolean(cell.skillInstance)}
            data-preview-skill-marker-label={skillMarkerLabel}
            key={cell.id}
          >
            {projectionAsset?.thumbnailUrl ? (
              <img src={projectionAsset.thumbnailUrl} alt="" />
            ) : projectionInstance ? (
              getInstanceShortLabel(projectionInstance.assetId, locale)
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

function PreviewGrid({
  locale,
  ariaLabel,
  className,
  cellClassName,
  cells,
}: {
  locale: Locale;
  ariaLabel: string;
  className: string;
  cellClassName: string;
  cells: PreviewCanvasCellContext[];
}) {
  return (
    <div
      className={className}
      aria-label={ariaLabel}
    >
      {cells.map((cell) => {
        const visibleCellInstances = cell.hidden ? [] : cell.tileInstances;
        const topInstance = visibleCellInstances.at(-1) ?? null;
        const topAsset = getAssetById(topInstance?.assetId);
        const skillInstance = visibleCellInstances.find((instance) => instance.requiresSkill) ?? null;
        const skillType = toAssetSkillType(skillInstance?.skillType);
        const skillMarkerLabel = skillType ? getSkillDisplay(skillType, locale).marker : '';
        const cellLabel = topInstance
          ? `${cell.coordinate.x},${cell.coordinate.y} ${getInstanceLabel(topInstance.assetId, locale)}`
          : `${cell.coordinate.x},${cell.coordinate.y}`;

        return (
          <span
            className={[
              cellClassName,
              cell.areaType === 'outer' ? 'outer' : '',
              topInstance ? 'fill' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label={cellLabel}
            data-preview-coordinate={`${cell.coordinate.x},${cell.coordinate.y}`}
            data-preview-area={cell.areaType}
            data-preview-main-boundary={cell.mainBoundary}
            data-preview-has-instance={visibleCellInstances.length > 0}
            data-preview-instance-count={visibleCellInstances.length}
            data-preview-asset-id={topInstance?.assetId ?? ''}
            data-preview-instance-id={topInstance?.instanceId ?? ''}
            data-preview-requires-skill={Boolean(skillInstance)}
            data-preview-skill-marker-label={skillMarkerLabel}
            key={`${className}-${cell.id}`}
          >
            {topAsset?.thumbnailUrl ? (
              <img src={topAsset.thumbnailUrl} alt="" />
            ) : topInstance ? (
              getInstanceShortLabel(topInstance.assetId, locale)
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

function getInstanceLabel(assetId: string, locale: Locale): string {
  const asset = getAssetById(assetId);

  return asset ? getAssetDisplay(asset, locale).name : `Unknown asset: ${assetId}`;
}

function getInstanceShortLabel(assetId: string, locale: Locale): string {
  const asset = getAssetById(assetId);

  return asset ? getAssetDisplay(asset, locale).name.slice(0, 1) : '?';
}
