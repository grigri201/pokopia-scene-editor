import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  buildSceneOccupancy,
  getAllVisibleFrontProjectionCellContexts,
  getCurrentLayerPreviewCellContexts,
  getAssetById,
  toAssetSkillType,
  type AssetDefinition,
  type BlockingCell,
  type FrontProjectionCellContext,
  type GridCoordinate,
  type GridSize,
  type OccupancyInstance,
  type PreviewCanvasCellContext,
  type SceneDocument,
  type StackingRelation,
} from '@pokopia-scene-editor/scene-core';
import { defaultLocale, getAssetDisplay, getSkillDisplay, t, type Locale } from '../../i18n';
import { formatStackingFootprint, getStackingSplitDisplay } from '../stacking-display';

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
  const currentLayerCells = useMemo(
    () => getCurrentLayerPreviewCellContexts(scene, activeBuildingLevelId),
    [
      scene.buildingLevels,
      scene.canvasSize.height,
      scene.canvasSize.width,
      scene.outerPadding,
      scene.sceneSize.height,
      scene.sceneSize.width,
      scene.skillMarkers,
      scene.tileInstances,
      activeBuildingLevelId,
    ],
  );
  const frontProjectionCells = useMemo(
    () => getAllVisibleFrontProjectionCellContexts(scene),
    [
      scene.buildingLevels,
      scene.canvasSize.height,
      scene.canvasSize.width,
      scene.outerPadding,
      scene.sceneSize.height,
      scene.sceneSize.width,
      scene.skillMarkers,
      scene.tileInstances,
    ],
  );
  const topFootprintView = useMemo(
    () => buildTopFootprintView(scene, activeBuildingLevelId),
    [
      scene.buildingLevels,
      scene.canvasSize.height,
      scene.canvasSize.width,
      scene.outerPadding,
      scene.sceneSize.height,
      scene.sceneSize.width,
      scene.skillMarkers,
      scene.tileInstances,
      activeBuildingLevelId,
    ],
  );
  const frontFootprintView = useMemo(
    () => buildFrontFootprintView(scene, frontProjectionCells),
    [
      scene.buildingLevels,
      scene.canvasSize.height,
      scene.canvasSize.width,
      scene.outerPadding,
      scene.sceneSize.height,
      scene.sceneSize.width,
      scene.tileInstances,
      frontProjectionCells,
    ],
  );
  const frontProjectionLevelCount = useMemo(
    () => new Set(frontProjectionCells.map((cell) => cell.buildingLevel.id)).size,
    [frontProjectionCells],
  );
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
                canvasWidth={scene.canvasSize.width}
                levelCount={frontProjectionLevelCount}
                footprintView={frontFootprintView}
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
            canvasSize={scene.canvasSize}
            footprintView={topFootprintView}
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

const FrontProjectionGrid = memo(function FrontProjectionGrid({
  locale,
  ariaLabel,
  cells,
  canvasWidth,
  levelCount,
  footprintView,
}: {
  locale: Locale;
  ariaLabel: string;
  cells: FrontProjectionCellContext[];
  canvasWidth: number;
  levelCount: number;
  footprintView: FrontFootprintView;
}) {
  const previewGridStyle = getPreviewGridStyle(canvasWidth, Math.max(levelCount, 1));

  return (
    <div
      className="front-preview"
      aria-label={ariaLabel}
      data-preview-columns={canvasWidth}
      data-preview-rows={Math.max(levelCount, 1)}
      style={previewGridStyle}
    >
      {cells.map((cell) => {
        const projectionInstance = cell.projectedInstance;
        const projectionAsset = getAssetById(projectionInstance?.assetId);
        const stackingState = getFrontProjectedStackingState(cell, footprintView);
        const shouldRenderInlineAsset = Boolean(
          projectionInstance && !footprintView.overlayInstanceIds.has(projectionInstance.instanceId) && !stackingState,
        );
        const skillType = toAssetSkillType(cell.skillInstance?.skillType);
        const skillMarkerLabel = skillType ? getSkillDisplay(skillType, locale).marker : '';
        const blockedState = footprintView.cellsByKey.get(getFrontCellKey(cell.buildingLevel.id, cell.x));
        const cellLabel = stackingState
          ? `${cell.buildingLevel.displayId} x${cell.x}, stacked ${getInstanceLabel(stackingState.topAssetId, locale)} on ${getInstanceLabel(stackingState.baseAssetId, locale)}`
          : projectionInstance
          ? `${cell.buildingLevel.displayId} x${cell.x}, projected y${projectionInstance.coordinate.y} ${getInstanceLabel(projectionInstance.assetId, locale)}`
          : `${cell.buildingLevel.displayId} x${cell.x}`;

        return (
          <span
            className={[
              'front-cell',
              cell.areaType === 'outer' ? 'outer' : '',
              projectionInstance ? 'fill' : '',
              blockedState ? 'front-cell--footprint-blocked' : '',
              stackingState ? 'front-cell--stacking' : '',
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
            data-front-footprint-blocked={Boolean(blockedState)}
            data-front-blocked-by-instance-id={blockedState?.blockedByInstanceId ?? ''}
            data-front-blocked-by-asset-id={blockedState?.blockedByAssetId ?? ''}
            data-front-blocked-by-building-level-id={blockedState?.blockedByBuildingLevelId ?? ''}
            data-preview-stacking-state={stackingState ? 'placed' : ''}
            data-preview-stacking-base-instance-id={stackingState?.baseInstanceId ?? ''}
            data-preview-stacking-top-instance-id={stackingState?.topInstanceId ?? ''}
            data-preview-stacking-base-asset-id={stackingState?.baseAssetId ?? ''}
            data-preview-stacking-top-asset-id={stackingState?.topAssetId ?? ''}
            data-preview-stacking-surface-kind={stackingState?.surfaceKind ?? ''}
            key={cell.id}
          >
            {stackingState ? (
              <PreviewStackingSplit locale={locale} stackingState={stackingState} />
            ) : shouldRenderInlineAsset && projectionAsset?.thumbnailUrl ? (
              <img src={projectionAsset.thumbnailUrl} alt="" />
            ) : shouldRenderInlineAsset && projectionInstance ? (
              getInstanceShortLabel(projectionInstance.assetId, locale)
            ) : null}
          </span>
        );
      })}
      {footprintView.overlays.length > 0 ? (
        <div
          className="front-footprint-layer"
          aria-hidden="true"
          style={{
            gridTemplateRows: `repeat(${footprintView.levelCount}, var(--preview-cell-size))`,
          }}
        >
          {footprintView.overlays.map((overlay) => (
            <span
              className="front-footprint-overlay"
              data-testid={`front-height-footprint-overlay-${overlay.instanceId}`}
              data-footprint-instance-id={overlay.instanceId}
              data-footprint-asset-id={overlay.asset.assetId}
              data-effective-footprint={formatFootprint(overlay.effectiveFootprint)}
              data-footprint-height-span={overlay.heightSpan}
              data-blocked-level-ids={overlay.blockedLevelIds.join(',')}
              data-footprint-x-span={overlay.xSpan}
              key={overlay.instanceId}
              style={getFrontFootprintOverlayStyle(overlay)}
            >
              {overlay.asset.thumbnailUrl ? <img src={overlay.asset.thumbnailUrl} alt="" /> : getInstanceShortLabel(overlay.asset.assetId, locale)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
});

const PreviewGrid = memo(function PreviewGrid({
  locale,
  ariaLabel,
  className,
  cellClassName,
  cells,
  canvasSize,
  footprintView,
}: {
  locale: Locale;
  ariaLabel: string;
  className: string;
  cellClassName: string;
  cells: PreviewCanvasCellContext[];
  canvasSize: GridSize;
  footprintView: TopFootprintView;
}) {
  const previewGridStyle = getPreviewGridStyle(canvasSize.width, canvasSize.height);

  return (
    <div
      className={className}
      aria-label={ariaLabel}
      data-preview-columns={canvasSize.width}
      data-preview-rows={canvasSize.height}
      style={previewGridStyle}
    >
      {cells.map((cell) => {
        const visibleCellInstances = cell.hidden ? [] : cell.tileInstances;
        const topInstance = visibleCellInstances.at(-1) ?? null;
        const topAsset = getAssetById(topInstance?.assetId);
        const footprintState = footprintView.cellsByCoordinate.get(formatCoordinate(cell.coordinate)) ?? emptyTopFootprintCellState;
        const stackingState = footprintState.stackingState;
        const shouldRenderInlineAsset = Boolean(topInstance && !footprintView.overlayInstanceIds.has(topInstance.instanceId) && !stackingState);
        const skillInstance = visibleCellInstances.find((instance) => instance.requiresSkill) ?? null;
        const skillType = toAssetSkillType(skillInstance?.skillType);
        const skillMarkerLabel = skillType ? getSkillDisplay(skillType, locale).marker : '';
        const cellLabel = stackingState
          ? `${cell.coordinate.x},${cell.coordinate.y} stacked ${getInstanceLabel(stackingState.topAssetId, locale)} on ${getInstanceLabel(stackingState.baseAssetId, locale)}`
          : topInstance
          ? `${cell.coordinate.x},${cell.coordinate.y} ${getInstanceLabel(topInstance.assetId, locale)}`
          : `${cell.coordinate.x},${cell.coordinate.y}`;

        return (
          <span
            className={[
              cellClassName,
              cell.areaType === 'outer' ? 'outer' : '',
              topInstance ? 'fill' : '',
              footprintState.role === 'occupied' ? `${cellClassName}--footprint-occupied` : '',
              stackingState ? `${cellClassName}--stacking` : '',
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
            data-preview-footprint-role={footprintState.role}
            data-preview-footprint-instance-id={footprintState.instanceId ?? ''}
            data-preview-footprint-anchor-coordinate={footprintState.anchorCoordinate ? formatCoordinate(footprintState.anchorCoordinate) : ''}
            data-preview-effective-footprint={footprintState.effectiveFootprint ? formatFootprint(footprintState.effectiveFootprint) : ''}
            data-preview-stacking-state={stackingState ? 'placed' : ''}
            data-preview-stacking-base-instance-id={stackingState?.baseInstanceId ?? ''}
            data-preview-stacking-top-instance-id={stackingState?.topInstanceId ?? ''}
            data-preview-stacking-base-asset-id={stackingState?.baseAssetId ?? ''}
            data-preview-stacking-top-asset-id={stackingState?.topAssetId ?? ''}
            data-preview-stacking-surface-kind={stackingState?.surfaceKind ?? ''}
            key={`${className}-${cell.id}`}
          >
            {stackingState ? (
              <PreviewStackingSplit locale={locale} stackingState={stackingState} />
            ) : shouldRenderInlineAsset && topAsset?.thumbnailUrl ? (
              <img src={topAsset.thumbnailUrl} alt="" />
            ) : shouldRenderInlineAsset && topInstance ? (
              getInstanceShortLabel(topInstance.assetId, locale)
            ) : null}
          </span>
        );
      })}
      {footprintView.overlays.length > 0 ? (
        <div className="top-footprint-layer" aria-hidden="true">
          {footprintView.overlays.map((overlay) => (
            <span
              className="top-footprint-overlay"
              data-testid={`top-footprint-overlay-${overlay.instanceId}`}
              data-footprint-instance-id={overlay.instanceId}
              data-footprint-asset-id={overlay.asset.assetId}
              data-effective-footprint={formatFootprint(overlay.effectiveFootprint)}
              data-footprint-anchor-coordinate={formatCoordinate(overlay.anchor)}
              key={overlay.instanceId}
              style={getTopFootprintOverlayStyle(overlay)}
            >
              {overlay.asset.thumbnailUrl ? <img src={overlay.asset.thumbnailUrl} alt="" /> : getInstanceShortLabel(overlay.asset.assetId, locale)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
});

function getPreviewGridStyle(columns: number, rows: number): CSSProperties {
  return {
    '--preview-grid-columns': columns,
    '--preview-grid-rows': rows,
    '--preview-cell-size': columns > 7 ? '10px' : '16px',
  } as CSSProperties;
}

function getFrontProjectedStackingState(
  cell: FrontProjectionCellContext,
  footprintView: FrontFootprintView,
): PreviewStackingCellState | null {
  const stackingStates = footprintView.stackingCellsByKey.get(getFrontCellKey(cell.buildingLevel.id, cell.x)) ?? [];

  if (!cell.projectedInstance) {
    return stackingStates[0] ?? null;
  }

  return stackingStates.find((state) =>
    state.topInstanceId === cell.projectedInstance?.instanceId ||
    state.baseInstanceId === cell.projectedInstance?.instanceId,
  ) ?? null;
}

function PreviewStackingSplit({
  locale,
  stackingState,
}: {
  locale: Locale;
  stackingState: PreviewStackingCellState;
}) {
  const display = getStackingSplitDisplay({
    topFootprint: stackingState.topFootprint,
    baseFootprint: stackingState.baseFootprint,
  });
  const hideBaseImage = !display.showBaseImage;
  const baseFootprintLabel = formatStackingFootprint(stackingState.baseFootprint);
  const topFootprintLabel = formatStackingFootprint(stackingState.topFootprint);

  return (
    <span
      className={[
        'preview-stacking-split',
        `preview-stacking-split--${display.splitAxis}`,
        hideBaseImage ? 'preview-stacking-split--base-hidden' : 'preview-stacking-split--base-visible',
      ].filter(Boolean).join(' ')}
      data-stacking-base-footprint={baseFootprintLabel}
      data-stacking-top-footprint={topFootprintLabel}
      data-stacking-base-visibility={display.baseVisibility}
      data-stacking-split-axis={display.splitAxis}
      aria-hidden="true"
    >
      <PreviewStackingSlot locale={locale} role="top" instanceId={stackingState.topInstanceId} assetId={stackingState.topAssetId} />
      <PreviewStackingSlot
        locale={locale}
        role="base"
        instanceId={stackingState.baseInstanceId}
        assetId={stackingState.baseAssetId}
        hideImage={hideBaseImage}
      />
    </span>
  );
}

function PreviewStackingSlot({
  locale,
  role,
  instanceId,
  assetId,
  hideImage = false,
}: {
  locale: Locale;
  role: 'top' | 'base';
  instanceId: string;
  assetId: string;
  hideImage?: boolean;
}) {
  const asset = getAssetById(assetId);

  return (
    <span
      className={`preview-stacking-split__slot preview-stacking-split__slot--${role}`}
      data-stacking-role={role}
      data-instance-id={instanceId}
      data-asset-id={assetId}
      data-base-image-visible={role === 'base' ? (hideImage ? 'false' : 'true') : undefined}
    >
      {hideImage ? null : asset?.thumbnailUrl ? <img src={asset.thumbnailUrl} alt="" /> : getInstanceShortLabel(assetId, locale)}
    </span>
  );
}

interface TopFootprintCellState {
  role: 'none' | 'anchor' | 'occupied';
  instanceId: string | null;
  anchorCoordinate: GridCoordinate | null;
  effectiveFootprint: AssetDefinition['footprint'] | null;
  stackingState: PreviewStackingCellState | null;
}

interface TopFootprintOverlay {
  instanceId: string;
  asset: AssetDefinition;
  anchor: GridCoordinate;
  effectiveFootprint: AssetDefinition['footprint'];
}

interface TopFootprintView {
  overlays: TopFootprintOverlay[];
  overlayInstanceIds: Set<string>;
  cellsByCoordinate: Map<string, TopFootprintCellState>;
}

interface FrontFootprintCellState {
  blockedByInstanceId: string;
  blockedByAssetId: string;
  blockedByBuildingLevelId: string;
}

interface PreviewStackingCellState {
  baseInstanceId: string;
  baseAssetId: string;
  baseFootprint: AssetDefinition['footprint'] | null;
  topInstanceId: string;
  topAssetId: string;
  topFootprint: AssetDefinition['footprint'] | null;
  surfaceKind: StackingRelation['surfaceKind'];
}

interface FrontFootprintOverlay {
  instanceId: string;
  asset: AssetDefinition;
  effectiveFootprint: AssetDefinition['footprint'];
  rowStart: number;
  rowSpan: number;
  columnStart: number;
  xSpan: number;
  heightSpan: number;
  blockedLevelIds: string[];
}

interface FrontFootprintView {
  overlays: FrontFootprintOverlay[];
  overlayInstanceIds: Set<string>;
  cellsByKey: Map<string, FrontFootprintCellState>;
  stackingCellsByKey: Map<string, PreviewStackingCellState[]>;
  levelCount: number;
}

const emptyTopFootprintCellState: TopFootprintCellState = {
  role: 'none',
  instanceId: null,
  anchorCoordinate: null,
  effectiveFootprint: null,
  stackingState: null,
};

function buildTopFootprintView(scene: SceneDocument, activeBuildingLevelId: string): TopFootprintView {
  const occupancy = buildSceneOccupancy(scene);
  const occupancyInstanceById = new Map(occupancy.instances.map((instance) => [instance.instanceId, instance]));
  const overlays: TopFootprintOverlay[] = [];
  const overlayInstanceIds = new Set<string>();
  const cellsByCoordinate = new Map<string, TopFootprintCellState>();

  for (const occupancyInstance of occupancy.instances.filter((instance) => instance.buildingLevelId === activeBuildingLevelId)) {
    const shouldUseOverlay = isMultiCellFootprint(occupancyInstance.effectiveFootprint);

    if (shouldUseOverlay) {
      overlays.push({
        instanceId: occupancyInstance.instanceId,
        asset: occupancyInstance.asset,
        anchor: { ...occupancyInstance.instance.coordinate },
        effectiveFootprint: cloneFootprint(occupancyInstance.effectiveFootprint),
      });
      overlayInstanceIds.add(occupancyInstance.instanceId);
    }

    for (const coordinate of occupancyInstance.occupiedCells) {
      const anchor = occupancyInstance.instance.coordinate;
      const isAnchor = coordinate.x === anchor.x && coordinate.y === anchor.y;
      cellsByCoordinate.set(formatCoordinate(coordinate), {
        role: isAnchor ? 'anchor' : 'occupied',
        instanceId: occupancyInstance.instanceId,
        anchorCoordinate: { ...anchor },
        effectiveFootprint: cloneFootprint(occupancyInstance.effectiveFootprint),
        stackingState: null,
      });
    }
  }

  for (const relation of occupancy.stackingRelations.filter((candidate) => candidate.buildingLevelId === activeBuildingLevelId)) {
    applyTopStackingState(cellsByCoordinate, relation.coordinates, toPreviewStackingCellState(relation, occupancyInstanceById));
  }

  return {
    overlays,
    overlayInstanceIds,
    cellsByCoordinate,
  };
}

function buildFrontFootprintView(scene: SceneDocument, cells: readonly FrontProjectionCellContext[]): FrontFootprintView {
  const occupancy = buildSceneOccupancy(scene);
  const occupancyInstanceById = new Map(occupancy.instances.map((instance) => [instance.instanceId, instance]));
  const visibleLevels = getUniqueFrontLevels(cells);
  const rowByLevelId = new Map(visibleLevels.map((level, index) => [level.id, index + 1]));
  const cellsByKey = buildFrontBlockedCells(occupancy.blockingCells);
  const stackingCellsByKey = buildFrontStackingCells(occupancy.stackingRelations, occupancyInstanceById);
  const overlays: FrontFootprintOverlay[] = [];
  const overlayInstanceIds = new Set<string>();

  for (const occupancyInstance of occupancy.instances) {
    if (occupancyInstance.effectiveFootprint.height <= 1) {
      continue;
    }

    const overlay = buildFrontFootprintOverlay(occupancyInstance, occupancy.blockingCells, rowByLevelId);

    if (!overlay) {
      continue;
    }

    overlays.push(overlay);
    overlayInstanceIds.add(occupancyInstance.instanceId);
  }

  return {
    overlays,
    overlayInstanceIds,
    cellsByKey,
    stackingCellsByKey,
    levelCount: visibleLevels.length,
  };
}

function applyTopStackingState(
  cellsByCoordinate: Map<string, TopFootprintCellState>,
  coordinates: readonly GridCoordinate[],
  stackingState: PreviewStackingCellState,
): void {
  for (const coordinate of coordinates) {
    const state = cellsByCoordinate.get(formatCoordinate(coordinate));

    if (state) {
      state.stackingState = stackingState;
    }
  }
}

function buildFrontStackingCells(
  stackingRelations: readonly StackingRelation[],
  occupancyInstanceById: ReadonlyMap<string, OccupancyInstance>,
): Map<string, PreviewStackingCellState[]> {
  const cellsByKey = new Map<string, PreviewStackingCellState[]>();

  for (const relation of stackingRelations) {
    for (const coordinate of relation.coordinates) {
      const key = getFrontCellKey(relation.buildingLevelId, coordinate.x);
      const states = cellsByKey.get(key) ?? [];
      states.push(toPreviewStackingCellState(relation, occupancyInstanceById));
      cellsByKey.set(key, states);
    }
  }

  return cellsByKey;
}

function toPreviewStackingCellState(
  relation: StackingRelation,
  occupancyInstanceById: ReadonlyMap<string, OccupancyInstance>,
): PreviewStackingCellState {
  const baseInstance = occupancyInstanceById.get(relation.baseInstanceId);
  const topInstance = occupancyInstanceById.get(relation.topInstanceId);

  return {
    baseInstanceId: relation.baseInstanceId,
    baseAssetId: relation.baseAssetId,
    baseFootprint: baseInstance?.effectiveFootprint ? cloneFootprint(baseInstance.effectiveFootprint) : null,
    topInstanceId: relation.topInstanceId,
    topAssetId: relation.topAssetId,
    topFootprint: topInstance?.effectiveFootprint ? cloneFootprint(topInstance.effectiveFootprint) : null,
    surfaceKind: relation.surfaceKind,
  };
}

function buildFrontFootprintOverlay(
  occupancyInstance: OccupancyInstance,
  blockingCells: readonly BlockingCell[],
  rowByLevelId: ReadonlyMap<string, number>,
): FrontFootprintOverlay | null {
  const baseRow = rowByLevelId.get(occupancyInstance.buildingLevelId);
  const ownBlockingCells = blockingCells.filter((cell) => cell.blockedByInstanceId === occupancyInstance.instanceId);
  const blockedLevelIds = Array.from(new Set(ownBlockingCells.map((cell) => cell.buildingLevelId)));
  const levelRows = [baseRow, ...blockedLevelIds.map((levelId) => rowByLevelId.get(levelId))]
    .filter((row): row is number => typeof row === 'number');

  if (!baseRow || levelRows.length <= 1) {
    return null;
  }

  const xCoordinates = occupancyInstance.occupiedCells.map((coordinate) => coordinate.x);
  const minX = Math.min(...xCoordinates);
  const maxX = Math.max(...xCoordinates);
  const minRow = Math.min(...levelRows);
  const maxRow = Math.max(...levelRows);

  return {
    instanceId: occupancyInstance.instanceId,
    asset: occupancyInstance.asset,
    effectiveFootprint: cloneFootprint(occupancyInstance.effectiveFootprint),
    rowStart: minRow,
    rowSpan: maxRow - minRow + 1,
    columnStart: minX + 1,
    xSpan: maxX - minX + 1,
    heightSpan: levelRows.length,
    blockedLevelIds,
  };
}

function buildFrontBlockedCells(blockingCells: readonly BlockingCell[]): Map<string, FrontFootprintCellState> {
  const cellsByKey = new Map<string, FrontFootprintCellState>();

  for (const cell of blockingCells) {
    cellsByKey.set(getFrontCellKey(cell.buildingLevelId, cell.coordinate.x), {
      blockedByInstanceId: cell.blockedByInstanceId,
      blockedByAssetId: cell.blockedByAssetId,
      blockedByBuildingLevelId: cell.blockedByBuildingLevelId,
    });
  }

  return cellsByKey;
}

function getUniqueFrontLevels(cells: readonly FrontProjectionCellContext[]): FrontProjectionCellContext['buildingLevel'][] {
  const levels: FrontProjectionCellContext['buildingLevel'][] = [];
  const seen = new Set<string>();

  for (const cell of cells) {
    if (seen.has(cell.buildingLevel.id)) {
      continue;
    }

    seen.add(cell.buildingLevel.id);
    levels.push(cell.buildingLevel);
  }

  return levels;
}

function getTopFootprintOverlayStyle(overlay: TopFootprintOverlay): CSSProperties {
  return {
    gridColumn: `${overlay.anchor.x + 1} / span ${overlay.effectiveFootprint.length}`,
    gridRow: `${overlay.anchor.y + 1} / span ${overlay.effectiveFootprint.width}`,
  };
}

function getFrontFootprintOverlayStyle(overlay: FrontFootprintOverlay): CSSProperties {
  return {
    gridColumn: `${overlay.columnStart} / span ${overlay.xSpan}`,
    gridRow: `${overlay.rowStart} / span ${overlay.rowSpan}`,
  };
}

function isMultiCellFootprint(footprint: AssetDefinition['footprint']): boolean {
  return footprint.length > 1 || footprint.width > 1;
}

function cloneFootprint(footprint: AssetDefinition['footprint']): AssetDefinition['footprint'] {
  return {
    length: footprint.length,
    width: footprint.width,
    height: footprint.height,
  };
}

function formatFootprint(footprint: AssetDefinition['footprint']): string {
  return `${footprint.length}x${footprint.width}x${footprint.height}`;
}

function formatCoordinate(coordinate: GridCoordinate): string {
  return `${coordinate.x},${coordinate.y}`;
}

function getFrontCellKey(buildingLevelId: string, x: number): string {
  return `${buildingLevelId}:${x}`;
}

function getInstanceLabel(assetId: string, locale: Locale): string {
  const asset = getAssetById(assetId);

  return asset ? getAssetDisplay(asset, locale).name : `Unknown asset: ${assetId}`;
}

function getInstanceShortLabel(assetId: string, locale: Locale): string {
  const asset = getAssetById(assetId);

  return asset ? getAssetDisplay(asset, locale).name.slice(0, 1) : '?';
}
