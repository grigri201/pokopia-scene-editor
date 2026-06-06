import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, FocusEvent, KeyboardEvent, MouseEvent, WheelEvent } from 'react';
import {
  buildSceneOccupancy,
  getEffectiveAssetFootprint,
  getAssetById,
  getAssetSkillMarkerIconUrl,
  toAssetSkillType,
} from '@pokopia-scene-editor/scene-core';
import type {
  AssetDefinition,
  BlockingCell,
  CanvasCellContext,
  GridCoordinate,
  GridSize,
  SceneDocument,
  StackingRelation,
} from '@pokopia-scene-editor/scene-core';
import { moveCoordinate } from '../../state';
import type { AssetPlacementPreview } from '../../state';
import { defaultLocale, getAssetDisplay, getSkillDisplay, t, type Locale } from '../../i18n';
import { formatStackingFootprint, getStackingShortSideSplitAxis, getStackingSplitDisplay } from '../stacking-display';

interface SceneCanvasProps {
  locale?: Locale;
  canvasSize: GridSize;
  scene?: SceneDocument;
  cells: CanvasCellContext[];
  lowerLayerGhostEnabled?: boolean;
  readOnly: boolean;
  placementMode: boolean;
  selectedCoordinate: GridCoordinate | null;
  targetCoordinate: GridCoordinate | null;
  targetPlacement?: AssetPlacementPreview | null;
  onSelectCoordinate: (coordinate: GridCoordinate) => void;
  onViewCoordinate: (coordinate: GridCoordinate) => void;
  onDeleteCoordinate: (coordinate: GridCoordinate) => void;
  onHoverCoordinate: (coordinate: GridCoordinate | null) => void;
  onFocusCoordinate: (coordinate: GridCoordinate | null) => void;
}

export function SceneCanvas({
  locale = defaultLocale,
  canvasSize,
  scene,
  cells,
  lowerLayerGhostEnabled = true,
  readOnly,
  placementMode,
  selectedCoordinate,
  targetCoordinate,
  targetPlacement = null,
  onSelectCoordinate,
  onViewCoordinate,
  onDeleteCoordinate,
  onHoverCoordinate,
  onFocusCoordinate,
}: SceneCanvasProps) {
  const maxCanvasSide = Math.max(canvasSize.width, canvasSize.height);
  const canvasInlineScale = canvasSize.width / maxCanvasSide;
  const maxZoomScale = getMaxSceneCanvasZoomScale(canvasSize);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomOrigin, setZoomOrigin] = useState<SceneCanvasZoomOrigin>({ x: 50, y: 50 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const zoomScaleRef = useRef(1);
  const gestureStartZoomRef = useRef(1);
  const canvasGridStyle = {
    '--scene-canvas-columns': canvasSize.width,
    '--scene-canvas-rows': canvasSize.height,
    '--scene-canvas-max-side': maxCanvasSide,
    '--scene-canvas-aspect-ratio': `${canvasSize.width} / ${canvasSize.height}`,
    '--scene-canvas-width-large': createViewportBoundedCanvasWidth(canvasInlineScale, 100, 212, 660, 'px', 100, '%'),
    '--scene-canvas-width-medium': createScaledCanvasWidth(canvasInlineScale, 100, '%', 620, 'px'),
    '--scene-canvas-width-mobile': createScaledCanvasWidth(canvasInlineScale, 100, '%', 92, 'vw'),
    '--scene-canvas-zoom-scale': formatSceneCanvasZoomScale(zoomScale),
    '--scene-canvas-zoom-max-scale': formatSceneCanvasZoomScale(maxZoomScale),
    '--scene-canvas-zoom-origin-x': `${formatSceneCanvasZoomPercent(zoomOrigin.x)}%`,
    '--scene-canvas-zoom-origin-y': `${formatSceneCanvasZoomPercent(zoomOrigin.y)}%`,
  } as CSSProperties;
  const canvasDensity = canvasSize.width > 7 || canvasSize.height > 7 ? 'compact' : 'standard';
  const rows = Array.from({ length: canvasSize.height }, (_, rowIndex) =>
    cells.slice(rowIndex * canvasSize.width, rowIndex * canvasSize.width + canvasSize.width),
  );
  const footprintView = buildFootprintCanvasView({
    scene,
    cells,
    canvasSize,
    targetCoordinate,
    targetPlacement,
    locale,
  });
  const lowerLayerGhostOverlays = buildLowerLayerGhostOverlays({
    scene,
    cells,
    canvasSize,
    enabled: lowerLayerGhostEnabled && !readOnly,
  });

  useEffect(() => {
    zoomScaleRef.current = zoomScale;
  }, [zoomScale]);

  useEffect(() => {
    setZoomOrigin({ x: 50, y: 50 });
    setZoomScale((currentScale) => {
      const nextScale = clampSceneCanvasZoomScale(currentScale, maxZoomScale);
      zoomScaleRef.current = nextScale;

      return nextScale;
    });
  }, [canvasSize.height, canvasSize.width, maxZoomScale]);

  const handleWheelZoom = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      if (readOnly || !Number.isFinite(event.deltaY) || event.deltaY === 0) {
        return;
      }

      const nextScale = getNextWheelZoomScale(
        zoomScaleRef.current,
        normalizeWheelDeltaY(event.deltaY, event.deltaMode),
        maxZoomScale,
      );

      if (nextScale === zoomScaleRef.current) {
        return;
      }

      event.preventDefault();
      zoomScaleRef.current = nextScale;
      const viewport = viewportRef.current ?? event.currentTarget;
      setZoomOrigin(getSceneCanvasZoomOriginFromPoint(viewport, event.clientX, event.clientY));
      setZoomScale(nextScale);
    },
    [maxZoomScale, readOnly],
  );

  useEffect(() => {
    const viewport = viewportRef.current;

    if (readOnly || !viewport || typeof window === 'undefined' || !('ongesturechange' in window)) {
      return undefined;
    }
    const gestureTarget: EventTarget = viewport;
    const listenerOptions: AddEventListenerOptions = { passive: false };

    const handleGestureStart = (event: Event) => {
      event.preventDefault();
      gestureStartZoomRef.current = zoomScaleRef.current;
      const gestureEvent = event as SceneCanvasGestureEvent;
      setZoomOrigin(getSceneCanvasZoomOriginFromPoint(viewport, gestureEvent.clientX, gestureEvent.clientY));
    };

    const handleGestureChange = (event: Event) => {
      event.preventDefault();
      const gestureEvent = event as SceneCanvasGestureEvent;
      const eventScale = gestureEvent.scale;
      const gestureScale = typeof eventScale === 'number' && Number.isFinite(eventScale) && eventScale > 0
        ? eventScale
        : 1;
      setZoomOrigin(getSceneCanvasZoomOriginFromPoint(viewport, gestureEvent.clientX, gestureEvent.clientY));
      const nextScale = clampSceneCanvasZoomScale(gestureStartZoomRef.current * gestureScale, maxZoomScale);
      zoomScaleRef.current = nextScale;
      setZoomScale(nextScale);
    };

    gestureTarget.addEventListener('gesturestart', handleGestureStart, listenerOptions);
    gestureTarget.addEventListener('gesturechange', handleGestureChange, listenerOptions);

    return () => {
      gestureTarget.removeEventListener('gesturestart', handleGestureStart, listenerOptions);
      gestureTarget.removeEventListener('gesturechange', handleGestureChange, listenerOptions);
    };
  }, [maxZoomScale, readOnly]);

  return (
    <div
      className="scene-canvas-viewport"
      ref={viewportRef}
      data-testid="scene-canvas-viewport"
      data-zoom-scale={formatSceneCanvasZoomScale(zoomScale)}
      data-zoom-min-scale="1"
      data-zoom-max-scale={formatSceneCanvasZoomScale(maxZoomScale)}
      data-zoom-origin={`${formatSceneCanvasZoomPercent(zoomOrigin.x)},${formatSceneCanvasZoomPercent(zoomOrigin.y)}`}
      onWheel={handleWheelZoom}
      style={canvasGridStyle}
    >
      <div
        className="scene-canvas"
        role="grid"
        aria-label={
          readOnly
            ? t(locale, 'sceneCanvasReadOnly', { width: canvasSize.width, height: canvasSize.height })
            : t(locale, 'sceneCanvas', { width: canvasSize.width, height: canvasSize.height })
        }
        aria-rowcount={canvasSize.height}
        aria-colcount={canvasSize.width}
        data-testid="scene-canvas"
        data-read-only={readOnly}
        data-canvas-density={canvasDensity}
        data-lower-layer-ghost-count={lowerLayerGhostOverlays.length}
        style={canvasGridStyle}
      >
        {rows.map((row, rowIndex) => (
          <div className="scene-row" role="row" aria-rowindex={rowIndex + 1} key={rowIndex}>
            {row.map((cell) => {
              const coordinate = cell.coordinate;
              const footprintState = footprintView.cellsByCoordinate.get(getCoordinateKey(coordinate)) ?? emptyFootprintCellState;
              const placeable = cell.placeable && !footprintState.heightBlocked;
              const editable = isCellEditable(placeable, readOnly);
              const stateLabel = getCellStateLabel(placeable, readOnly);
              const selected = coordinatesEqual(selectedCoordinate, coordinate);
              const targeted = coordinatesEqual(targetCoordinate, coordinate);
              const visibleInstances = cell.tileInstances;
              const topInstance = visibleInstances.at(-1) ?? null;
              const topAsset = getAssetById(topInstance?.assetId);
              const topAssetLabel = topInstance ? getInstanceDisplayLabel(topInstance.assetId, locale) : null;
              const otherLayerInstanceCount = cell.otherVisibleLayerInstances.length;
              const topSkillInstance = topInstance?.requiresSkill ? topInstance : null;
              const topCellSkillMarker = cell.skillMarkers.at(-1) ?? null;
              const skillMarkerType = topSkillInstance?.skillType ?? topCellSkillMarker?.skillType ?? null;
              const hasSkillMarker = Boolean(skillMarkerType);
              const normalizedSkillType = toAssetSkillType(skillMarkerType);
              const skillMarkerLabel = normalizedSkillType ? getSkillDisplay(normalizedSkillType, locale).marker : null;
              const skillMarkerIconUrl = skillMarkerType
                ? getAssetSkillMarkerIconUrl(skillMarkerType)
                : null;
              const skillMarkerTooltip = normalizedSkillType ? getSkillDisplay(normalizedSkillType, locale).name : null;
              const skillMarkerAriaLabel = topSkillInstance
                ? getInstanceSkillMarkerLabel(topSkillInstance.assetId, skillMarkerLabel, locale)
                : topCellSkillMarker
                  ? getCellSkillMarkerLabel(skillMarkerLabel, locale)
                  : null;
              const footprintHeight = topInstance && topAsset ? topAsset.footprint.height : 1;
              const heightMarkerExtra = footprintHeight > 1 ? footprintHeight - 1 : 0;
              const rotationDegrees = topInstance?.rotationDegrees ?? 0;
              const rotationLabel = rotationDegrees ? `${rotationDegrees}` : null;
              const dyeColor = topInstance?.dyeColor ?? null;
              const interactionCoordinate = getInteractionCoordinate(coordinate, footprintState, placementMode);
              const stackingState = footprintState.stackingState;
              const stackingBaseAsset = getAssetById(stackingState?.baseAssetId);
              const stackingTopAsset = getAssetById(stackingState?.topAssetId);
              const stackingLabel = getStackingLabel(stackingState, locale);
              const shouldRenderStackingSplit = Boolean(stackingState && stackingBaseAsset && stackingTopAsset);
              const stackingBaseFootprint = stackingState?.baseFootprint ?? stackingBaseAsset?.footprint ?? null;
              const stackingTopFootprint = stackingState?.topFootprint ?? stackingTopAsset?.footprint ?? null;
              const stackingDisplay = getStackingSplitDisplay({
                topFootprint: stackingTopFootprint,
                baseFootprint: stackingBaseFootprint,
              });
              const stackingTopUsesOverlay = Boolean(stackingState && footprintView.overlayInstanceIds.has(stackingState.topInstanceId));
              const stackingBaseUsesOverlay = Boolean(stackingState && footprintView.overlayInstanceIds.has(stackingState.baseInstanceId));
              const hideStackingBaseImage = !stackingDisplay.showBaseImage || stackingBaseUsesOverlay;
              const stackingBaseFootprintLabel = formatStackingFootprint(stackingBaseFootprint);
              const stackingTopFootprintLabel = formatStackingFootprint(stackingTopFootprint);
              const shouldRenderInlineAsset = Boolean(topAsset && topInstance && !footprintView.overlayInstanceIds.has(topInstance.instanceId) && !shouldRenderStackingSplit);
              const visibleInstanceCount = stackingState?.kind === 'placed'
                ? 2
                : topInstance
                  ? 1
                  : 0;

              return (
                <button
                type="button"
                role="gridcell"
                className={[
                  'scene-cell',
                  `scene-cell--${cell.areaType}`,
                  cell.mainBoundary ? 'scene-cell--main-boundary' : '',
                  !editable ? 'scene-cell--non-editable' : '',
                  selected ? 'scene-cell--selected' : '',
                  targeted ? 'scene-cell--targeted' : '',
                  footprintState.footprintRole === 'occupied' ? 'scene-cell--footprint-occupied' : '',
                  footprintState.heightBlocked ? 'scene-cell--height-blocked' : '',
                  footprintState.placementRole !== 'none' ? 'scene-cell--placement-preview' : '',
                  footprintState.placementConflicts.length > 0 ? 'scene-cell--placement-conflict' : '',
                  stackingState ? `scene-cell--stacking-${stackingState.kind}` : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-colindex={coordinate.x + 1}
                aria-selected={selected}
                aria-current={selected ? 'location' : undefined}
                aria-label={`${t(locale, 'cellLabel', {
                  x: coordinate.x,
                  y: coordinate.y,
                  area: cell.areaType,
                  levelId: cell.buildingLevel.id,
                  state: stateLabel,
                })}${
                  topAssetLabel ? `, ${topAssetLabel}` : ''
                }${
                  otherLayerInstanceCount > 0
                    ? `, ${t(locale, 'otherLayerItems', {
                        count: otherLayerInstanceCount,
                        plural: otherLayerInstanceCount === 1 ? '' : 's',
                      })}`
                    : ''
                }${
                  rotationLabel ? `, ${t(locale, 'rotated', { degrees: rotationLabel })}` : ''
                }${dyeColor ? `, ${t(locale, 'dyed', { color: dyeColor })}` : ''}${
                  skillMarkerAriaLabel ? `, ${skillMarkerAriaLabel}` : ''
                }${footprintState.footprintLabel ? `, ${footprintState.footprintLabel}` : ''}${
                  footprintState.heightBlockLabel ? `, ${footprintState.heightBlockLabel}` : ''
                }${footprintState.placementLabel ? `, ${footprintState.placementLabel}` : ''
                }${stackingLabel ? `, ${stackingLabel}` : ''
                }`}
                onClick={() =>
                  handleCellPointerSelect(readOnly, interactionCoordinate, onSelectCoordinate, onViewCoordinate)
                }
                onContextMenu={(event) =>
                  handleCellContextMenu(event, readOnly, interactionCoordinate, onDeleteCoordinate)
                }
                onFocus={(event) =>
                  readOnly ? undefined : handleCellFocus(event, coordinate, onFocusCoordinate)
                }
                onBlur={() => {
                  if (!readOnly) {
                    onFocusCoordinate(null);
                  }
                }}
                onMouseEnter={() => onHoverCoordinate(toGridCoordinate(coordinate))}
                onMouseLeave={() => onHoverCoordinate(null)}
                onKeyDown={(event) =>
                  handleCellKeyDown(
                    event,
                    interactionCoordinate,
                    readOnly,
                    placementMode,
                    onSelectCoordinate,
                    onViewCoordinate,
                    onFocusCoordinate,
                    canvasSize,
                  )
                }
                data-testid="scene-cell"
                data-coordinate={`${coordinate.x},${coordinate.y}`}
                data-area={cell.areaType}
                data-placeable={placeable}
                data-editable={editable}
                data-selected={selected}
                data-targeted={targeted}
                data-main-boundary={cell.mainBoundary}
                data-has-instance={Boolean(topInstance)}
                data-instance-count={visibleInstanceCount}
                data-footprint-role={footprintState.footprintRole}
                data-footprint-instance-id={footprintState.instanceId ?? ''}
                data-footprint-anchor-coordinate={footprintState.anchorCoordinate ? formatCoordinate(footprintState.anchorCoordinate) : ''}
                data-height-blocked={footprintState.heightBlocked}
                data-blocked-by-instance-id={footprintState.blockingCell?.blockedByInstanceId ?? ''}
                data-blocked-by-asset-id={footprintState.blockingCell?.blockedByAssetId ?? ''}
                data-blocked-by-building-level-id={footprintState.blockingCell?.blockedByBuildingLevelId ?? ''}
                data-placement-preview={footprintState.placementRole}
                data-placement-status={targetPlacement?.status ?? 'none'}
                data-placement-conflicts={footprintState.placementConflicts.join(',')}
                data-stacking-state={stackingState?.kind ?? 'none'}
                data-stacking-base-instance-id={stackingState?.baseInstanceId ?? ''}
                data-stacking-top-instance-id={stackingState?.topInstanceId ?? ''}
                data-stacking-base-asset-id={stackingState?.baseAssetId ?? ''}
                data-stacking-top-asset-id={stackingState?.topAssetId ?? ''}
                data-stacking-base-footprint={stackingBaseFootprintLabel}
                data-stacking-top-footprint={stackingTopFootprintLabel}
                data-stacking-base-visibility={stackingState ? stackingDisplay.baseVisibility : ''}
                data-stacking-base-render={stackingBaseUsesOverlay ? 'overlay' : stackingState ? 'cell' : ''}
                data-stacking-top-render={stackingTopUsesOverlay ? 'overlay' : stackingState ? 'cell' : ''}
                data-stacking-split-axis={stackingState ? stackingDisplay.splitAxis : ''}
                data-stacking-surface-kind={stackingState?.surfaceKind ?? ''}
                data-other-layer-instance-count={otherLayerInstanceCount}
                data-requires-skill={hasSkillMarker}
                data-skill-marker-label={skillMarkerLabel ?? ''}
                data-rotation={topInstance?.rotationDegrees ?? 0}
                data-footprint-height={topInstance && topAsset ? footprintHeight : ''}
                data-dye-color={dyeColor ?? ''}
                key={cell.id}
              >
                <span className="cell-coordinate-watermark" aria-hidden="true">
                  {coordinate.x},{coordinate.y}
                </span>
                <span className="cell-area">{cell.areaType}</span>
                <span className="cell-placeable">{readOnly ? t(locale, 'view') : editable ? t(locale, 'place') : stateLabel}</span>
                {shouldRenderStackingSplit && stackingState && stackingBaseAsset && stackingTopAsset ? (
                  <span
                    className={[
                      'cell-stacking-split',
                      `cell-stacking-split--${stackingState.kind}`,
                      `cell-stacking-split--${stackingDisplay.splitAxis}`,
                      hideStackingBaseImage ? 'cell-stacking-split--base-hidden' : 'cell-stacking-split--base-visible',
                    ].filter(Boolean).join(' ')}
                    data-stacking-base-footprint={stackingBaseFootprintLabel}
                    data-stacking-top-footprint={stackingTopFootprintLabel}
                    data-stacking-base-visibility={stackingDisplay.baseVisibility}
                    data-stacking-base-render={stackingBaseUsesOverlay ? 'overlay' : 'cell'}
                    data-stacking-top-render={stackingTopUsesOverlay ? 'overlay' : 'cell'}
                    data-stacking-split-axis={stackingDisplay.splitAxis}
                    aria-hidden="true"
                  >
                    <span
                      className="cell-stacking-split__slot cell-stacking-split__slot--top"
                      data-stacking-role="top"
                      data-instance-id={stackingState.topInstanceId}
                      data-asset-id={stackingState.topAssetId}
                      data-top-image-visible={stackingTopUsesOverlay ? 'false' : 'true'}
                    >
                      {stackingTopUsesOverlay ? null : <img src={stackingTopAsset.thumbnailUrl} alt="" />}
                    </span>
                    <span
                      className="cell-stacking-split__slot cell-stacking-split__slot--base"
                      data-stacking-role="base"
                      data-instance-id={stackingState.baseInstanceId}
                      data-asset-id={stackingState.baseAssetId}
                      data-base-image-visible={hideStackingBaseImage ? 'false' : 'true'}
                    >
                      {hideStackingBaseImage ? null : <img src={stackingBaseAsset.thumbnailUrl} alt="" />}
                    </span>
                  </span>
                ) : null}
                {shouldRenderInlineAsset && topAsset ? (
                  <span className="cell-asset-token">
                    <img src={topAsset.thumbnailUrl} alt="" className="cell-asset-thumb" />
                    <span className="sr-only">{topAssetLabel}</span>
                  </span>
                ) : null}
                {heightMarkerExtra ? (
                  <span
                    className="cell-height-marker"
                    data-tooltip={t(locale, 'heightMarker', { extra: heightMarkerExtra })}
                    title={t(locale, 'heightMarker', { extra: heightMarkerExtra })}
                    aria-label={t(locale, 'heightMarker', { extra: heightMarkerExtra })}
                  >
                    +{heightMarkerExtra}
                  </span>
                ) : null}
                {rotationLabel ? (
                  <span
                    className={[
                      'cell-rotation-marker',
                      'has-icon-tooltip',
                      heightMarkerExtra ? 'cell-rotation-marker--with-height' : '',
                    ].filter(Boolean).join(' ')}
                    data-tooltip={t(locale, 'rotationDegrees', { degrees: rotationLabel })}
                    title={t(locale, 'rotationDegrees', { degrees: rotationLabel })}
                    aria-label={t(locale, 'rotationDegrees', { degrees: rotationLabel })}
                  >
                    <svg viewBox="0 0 28 24" aria-hidden="true">
                      <path
                        className="cell-rotation-marker__blob"
                        d="M4.4 13.1C2.7 8.4 5.4 4.3 10.1 4.6c1.4-2.4 5.2-2.3 6.4.1 4.2-.4 7.6 3.1 6.6 7.5 1.8 2.7-.1 6.3-3.6 6.5-2.6 2.4-7.1 2.2-9.2-.2-3.6.7-6.9-2-5.9-5.4Z"
                      />
                      <g
                        className="cell-rotation-marker__arrow"
                        style={{ '--rotation': `${rotationDegrees}deg` } as CSSProperties}
                      >
                        <path d="M14 17.5v-11" />
                        <path d="m9.7 10.8 4.3-4.3 4.3 4.3" />
                      </g>
                    </svg>
                  </span>
                ) : null}
                {dyeColor ? (
                  <span
                    className="cell-dye-marker"
                    aria-label={t(locale, 'dye', { color: dyeColor })}
                    style={{ backgroundColor: dyeColor }}
                  />
                ) : null}
                {hasSkillMarker ? (
                  <span
                    className="cell-skill-marker has-icon-tooltip"
                    aria-label={skillMarkerAriaLabel ?? t(locale, 'skillMarker')}
                    data-tooltip={skillMarkerTooltip ?? skillMarkerLabel ?? t(locale, 'skillMarker')}
                    title={skillMarkerTooltip ?? skillMarkerLabel ?? t(locale, 'skillMarker')}
                  >
                    {skillMarkerIconUrl ? (
                      <img src={skillMarkerIconUrl} alt="" />
                    ) : (
                      <span className="cell-skill-marker__fallback">{skillMarkerLabel}</span>
                    )}
                  </span>
                ) : null}
                </button>
              );
            })}
          </div>
        ))}
        {footprintView.overlays.length > 0 ? (
          <div className="scene-footprint-layer" aria-hidden="true">
            {footprintView.overlays.map((overlay) => (
              <span
                className={[
                  'scene-footprint-overlay',
                  `scene-footprint-overlay--${overlay.kind}`,
                  overlay.conflictTypes.length > 0 ? 'scene-footprint-overlay--conflict' : '',
                  overlay.stackingRole === 'top' ? 'scene-footprint-overlay--stacking-top' : '',
                ].filter(Boolean).join(' ')}
                data-testid={overlay.kind === 'placement' ? 'placement-footprint-overlay' : `scene-footprint-overlay-${overlay.id}`}
                data-instance-id={overlay.instanceId ?? ''}
                data-asset-id={overlay.asset.assetId}
                data-anchor-coordinate={formatCoordinate(overlay.anchor)}
                data-effective-footprint={formatFootprint(overlay.effectiveFootprint)}
                data-placement-status={overlay.placementStatus ?? ''}
                data-conflicts={overlay.conflictTypes.join(',')}
                data-stacking-role={overlay.stackingRole ?? ''}
                data-stacking-relation-id={overlay.stackingState ? `${overlay.stackingState.baseInstanceId}:${overlay.stackingState.topInstanceId}` : ''}
                data-stacking-base-instance-id={overlay.stackingState?.baseInstanceId ?? ''}
                data-stacking-top-instance-id={overlay.stackingState?.topInstanceId ?? ''}
                data-stacking-top-crop-axis={overlay.stackingRole === 'top' ? getStackingShortSideSplitAxis(overlay.effectiveFootprint) : ''}
                style={getOverlayGridStyle(overlay)}
                key={overlay.id}
              >
                <img src={overlay.asset.thumbnailUrl} alt="" />
              </span>
            ))}
          </div>
        ) : null}
        {lowerLayerGhostOverlays.length > 0 ? (
          <div className="scene-lower-layer-ghost-layer" aria-hidden="true">
            {lowerLayerGhostOverlays.map((overlay) => (
              <span
                className="scene-lower-layer-ghost"
                data-testid={`lower-layer-ghost-${overlay.instanceId}`}
                data-lower-layer-ghost="true"
                data-instance-id={overlay.instanceId}
                data-asset-id={overlay.asset.assetId}
                data-building-level-id={overlay.buildingLevelId}
                data-anchor-coordinate={formatCoordinate(overlay.anchor)}
                data-effective-footprint={formatFootprint(overlay.effectiveFootprint)}
                data-rotation={overlay.rotationDegrees}
                data-dye-color={overlay.dyeColor ?? ''}
                style={getGhostOverlayStyle(overlay)}
                key={overlay.id}
              >
                <img src={overlay.asset.thumbnailUrl} alt="" />
                {overlay.rotationDegrees ? (
                  <span
                    className="scene-lower-layer-ghost__rotation"
                    data-rotation-marker={overlay.rotationDegrees}
                  />
                ) : null}
                {overlay.dyeColor ? (
                  <span
                    className="scene-lower-layer-ghost__dye"
                    data-dye-marker={overlay.dyeColor}
                    style={{ backgroundColor: overlay.dyeColor }}
                  />
                ) : null}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface SceneCanvasZoomOrigin {
  x: number;
  y: number;
}

interface SceneCanvasGestureEvent extends Event {
  clientX?: number;
  clientY?: number;
  scale?: number;
}

function getMaxSceneCanvasZoomScale(canvasSize: GridSize): number {
  return Math.max(1, Math.max(canvasSize.width, canvasSize.height) / 6);
}

function clampSceneCanvasZoomScale(scale: number, maxZoomScale: number): number {
  if (scale === Infinity) {
    return maxZoomScale;
  }

  if (!Number.isFinite(scale)) {
    return 1;
  }

  return Math.min(Math.max(scale, 1), maxZoomScale);
}

function getNextWheelZoomScale(currentScale: number, normalizedDeltaY: number, maxZoomScale: number): number {
  if (!Number.isFinite(normalizedDeltaY)) {
    return currentScale;
  }

  const zoomFactor = Math.exp(-normalizedDeltaY / 360);

  return clampSceneCanvasZoomScale(currentScale * zoomFactor, maxZoomScale);
}

function normalizeWheelDeltaY(deltaY: number, deltaMode: number): number {
  if (deltaMode === 1) {
    return deltaY * 16;
  }

  if (deltaMode === 2) {
    return deltaY * 120;
  }

  return deltaY;
}

function getSceneCanvasZoomOriginFromPoint(
  element: HTMLElement,
  clientX: number | undefined,
  clientY: number | undefined,
): SceneCanvasZoomOrigin {
  const rect = element.getBoundingClientRect();
  const pointX = clientX;
  const pointY = clientY;

  if (
    typeof pointX !== 'number'
    || typeof pointY !== 'number'
    || !Number.isFinite(pointX)
    || !Number.isFinite(pointY)
    || rect.width <= 0
    || rect.height <= 0
  ) {
    return { x: 50, y: 50 };
  }

  return {
    x: clampSceneCanvasZoomPercent(((pointX - rect.left) / rect.width) * 100),
    y: clampSceneCanvasZoomPercent(((pointY - rect.top) / rect.height) * 100),
  };
}

function clampSceneCanvasZoomPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 50;
  }

  return Math.min(Math.max(value, 0), 100);
}

function formatSceneCanvasZoomScale(scale: number): string {
  return Number(scale.toFixed(4)).toString();
}

function formatSceneCanvasZoomPercent(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function createScaledCanvasWidth(
  scale: number,
  firstValue: number,
  firstUnit: string,
  secondValue: number,
  secondUnit: string,
  thirdValue?: number,
  thirdUnit?: string,
): string {
  const terms = [
    `${formatScaledDimension(firstValue, scale)}${firstUnit}`,
    `${formatScaledDimension(secondValue, scale)}${secondUnit}`,
    ...(thirdValue !== undefined && thirdUnit ? [`${formatScaledDimension(thirdValue, scale)}${thirdUnit}`] : []),
  ];

  return `min(${terms.join(', ')})`;
}

function createViewportBoundedCanvasWidth(
  scale: number,
  viewportPercent: number,
  viewportOffsetPx: number,
  secondValue: number,
  secondUnit: string,
  thirdValue?: number,
  thirdUnit?: string,
): string {
  const viewportTerm = `calc(${formatScaledDimension(viewportPercent, scale)}vh - ${formatScaledDimension(viewportOffsetPx, scale)}px)`;
  const terms = [
    viewportTerm,
    `${formatScaledDimension(secondValue, scale)}${secondUnit}`,
    ...(thirdValue !== undefined && thirdUnit ? [`${formatScaledDimension(thirdValue, scale)}${thirdUnit}`] : []),
  ];

  return `min(${terms.join(', ')})`;
}

function formatScaledDimension(value: number, scale: number): string {
  return Number((value * scale).toFixed(4)).toString();
}

interface BuildFootprintCanvasViewInput {
  scene: SceneDocument | undefined;
  cells: readonly CanvasCellContext[];
  canvasSize: GridSize;
  targetCoordinate: GridCoordinate | null;
  targetPlacement: AssetPlacementPreview | null;
  locale: Locale;
}

interface FootprintCellState {
  footprintRole: 'none' | 'anchor' | 'occupied';
  instanceId: string | null;
  anchorCoordinate: GridCoordinate | null;
  footprintLabel: string;
  heightBlocked: boolean;
  blockingCell: BlockingCell | null;
  heightBlockLabel: string;
  placementRole: 'none' | 'anchor' | 'occupied';
  placementLabel: string;
  placementConflicts: string[];
  stackingState: StackingCellState | null;
}

interface FootprintOverlay {
  id: string;
  kind: 'placed' | 'placement';
  asset: AssetDefinition;
  anchor: GridCoordinate;
  effectiveFootprint: AssetDefinition['footprint'];
  stackingRole: 'top' | null;
  stackingState: StackingCellState | null;
  gridColumnStart: number;
  gridRowStart: number;
  gridColumnSpan: number;
  gridRowSpan: number;
  instanceId?: string;
  placementStatus?: string;
  conflictTypes: string[];
}

interface LowerLayerGhostOverlay {
  id: string;
  asset: AssetDefinition;
  anchor: GridCoordinate;
  effectiveFootprint: AssetDefinition['footprint'];
  gridColumnStart: number;
  gridRowStart: number;
  gridColumnSpan: number;
  gridRowSpan: number;
  instanceId: string;
  buildingLevelId: string;
  rotationDegrees: NonNullable<SceneDocument['tileInstances'][number]['rotationDegrees']>;
  dyeColor: string | null;
}

interface StackingCellState {
  kind: 'placed' | 'placement' | 'conflict';
  baseInstanceId: string;
  baseAssetId: string;
  baseFootprint: AssetDefinition['footprint'] | null;
  topInstanceId: string;
  topAssetId: string;
  topFootprint: AssetDefinition['footprint'] | null;
  surfaceKind?: StackingRelation['surfaceKind'];
  conflictTypes: string[];
}

const emptyFootprintCellState: FootprintCellState = {
  footprintRole: 'none',
  instanceId: null,
  anchorCoordinate: null,
  footprintLabel: '',
  heightBlocked: false,
  blockingCell: null,
  heightBlockLabel: '',
  placementRole: 'none',
  placementLabel: '',
  placementConflicts: [],
  stackingState: null,
};

function buildFootprintCanvasView(input: BuildFootprintCanvasViewInput): {
  cellsByCoordinate: Map<string, FootprintCellState>;
  overlays: FootprintOverlay[];
  overlayInstanceIds: Set<string>;
} {
  const cellsByCoordinate = new Map<string, FootprintCellState>();
  const overlays: FootprintOverlay[] = [];
  const overlayInstanceIds = new Set<string>();
  const activeLevel = input.cells[0]?.buildingLevel;

  for (const cell of input.cells) {
    cellsByCoordinate.set(getCoordinateKey(cell.coordinate), createEmptyFootprintCellState());
  }

  if (!input.scene || !activeLevel) {
    return { cellsByCoordinate, overlays, overlayInstanceIds };
  }

  const occupancy = buildSceneOccupancy(input.scene);
  const occupancyInstanceById = new Map(occupancy.instances.map((instance) => [instance.instanceId, instance]));
  const stackingStateByTopInstanceId = new Map(
    occupancy.stackingRelations
      .filter((candidate) => candidate.buildingLevelId === activeLevel.id)
      .map((relation) => [relation.topInstanceId, toPlacedStackingCellState(relation, occupancyInstanceById)]),
  );
  const activeInstances = occupancy.instances.filter((instance) => instance.buildingLevelId === activeLevel.id);

  for (const occupancyInstance of activeInstances) {
    const shouldUseOverlay = isMultiCellFootprint(occupancyInstance.effectiveFootprint);
    const overlay = shouldUseOverlay
      ? createFootprintOverlay({
          id: occupancyInstance.instanceId,
          kind: 'placed',
          asset: occupancyInstance.asset,
          anchor: occupancyInstance.instance.coordinate,
          effectiveFootprint: occupancyInstance.effectiveFootprint,
          canvasSize: input.canvasSize,
          instanceId: occupancyInstance.instanceId,
          stackingState: stackingStateByTopInstanceId.get(occupancyInstance.instanceId) ?? null,
        })
      : null;

    if (overlay) {
      overlays.push(overlay);
      overlayInstanceIds.add(occupancyInstance.instanceId);
    }

    for (const coordinate of occupancyInstance.occupiedCells) {
      const state = cellsByCoordinate.get(getCoordinateKey(coordinate));

      if (!state) {
        continue;
      }

      const anchor = occupancyInstance.instance.coordinate;
      const isAnchor = coordinatesEqual(anchor, coordinate);
      state.footprintRole = isAnchor ? 'anchor' : 'occupied';
      state.instanceId = occupancyInstance.instanceId;
      state.anchorCoordinate = { x: anchor.x, y: anchor.y };
      state.footprintLabel = isAnchor
        ? ''
        : `occupied by ${getInstanceDisplayLabel(occupancyInstance.assetId, input.locale)} anchor ${formatCoordinate(anchor)}`;
    }
  }

  for (const relation of occupancy.stackingRelations.filter((candidate) => candidate.buildingLevelId === activeLevel.id)) {
    applyStackingState(cellsByCoordinate, relation.coordinates, toPlacedStackingCellState(relation, occupancyInstanceById));
  }

  for (const blockingCell of occupancy.blockingCells) {
    if (blockingCell.buildingLevelId !== activeLevel.id) {
      continue;
    }

    const state = cellsByCoordinate.get(getCoordinateKey(blockingCell.coordinate));

    if (!state) {
      continue;
    }

    state.heightBlocked = true;
    state.blockingCell = blockingCell;
    state.heightBlockLabel = `blocked by ${getInstanceDisplayLabel(blockingCell.blockedByAssetId, input.locale)} on ${blockingCell.blockedByBuildingLevelId}`;
  }

  if (input.targetPlacement && input.targetCoordinate) {
    const placementConflictTypes = Array.from(new Set(input.targetPlacement.footprintConflicts.map((conflict) => conflict.conflictType)));
    const placementStackingRelation = input.targetPlacement.stackingRelations[0];
    const placementStackingConflict = input.targetPlacement.footprintConflicts.find((conflict) =>
      conflict.conflictType === 'unsupported-stack-surface' ||
      conflict.conflictType === 'surface-capacity-conflict',
    );

    for (const coordinate of input.targetPlacement.occupiedCells) {
      const state = cellsByCoordinate.get(getCoordinateKey(coordinate));

      if (!state) {
        continue;
      }

      const isAnchor = coordinatesEqual(input.targetCoordinate, coordinate);
      state.placementRole = isAnchor ? 'anchor' : 'occupied';
      state.placementLabel = isAnchor ? 'placement preview anchor' : 'placement preview footprint';
      state.placementConflicts = placementConflictTypes;
    }

    if (placementStackingRelation) {
      const baseInstance = occupancyInstanceById.get(placementStackingRelation.baseInstanceId);

      applyStackingState(cellsByCoordinate, placementStackingRelation.coordinates, {
        kind: 'placement',
        baseInstanceId: placementStackingRelation.baseInstanceId,
        baseAssetId: placementStackingRelation.baseAssetId,
        baseFootprint: baseInstance?.effectiveFootprint ?? null,
        topInstanceId: placementStackingRelation.topInstanceId,
        topAssetId: placementStackingRelation.topAssetId,
        topFootprint: input.targetPlacement.effectiveFootprint,
        surfaceKind: placementStackingRelation.surfaceKind,
        conflictTypes: [],
      });
    }

    if (placementStackingConflict && input.targetPlacement.asset) {
      const baseInstance = placementStackingConflict.blockingInstanceId
        ? occupancyInstanceById.get(placementStackingConflict.blockingInstanceId)
        : null;

      applyStackingState(cellsByCoordinate, placementStackingConflict.coordinates, {
        kind: 'conflict',
        baseInstanceId: placementStackingConflict.blockingInstanceId ?? '',
        baseAssetId: placementStackingConflict.blockingAssetId ?? '',
        baseFootprint: baseInstance?.effectiveFootprint ?? null,
        topInstanceId: placementStackingConflict.instanceId,
        topAssetId: input.targetPlacement.asset.assetId,
        topFootprint: input.targetPlacement.effectiveFootprint,
        surfaceKind: placementStackingConflict.surfaceKind,
        conflictTypes: placementConflictTypes,
      });
    }

    const placementOverlay = input.targetPlacement.asset && input.targetPlacement.effectiveFootprint && isMultiCellFootprint(input.targetPlacement.effectiveFootprint)
      ? createFootprintOverlay({
          id: 'placement-preview',
          kind: 'placement',
          asset: input.targetPlacement.asset,
          anchor: input.targetCoordinate,
          effectiveFootprint: input.targetPlacement.effectiveFootprint,
          canvasSize: input.canvasSize,
          placementStatus: input.targetPlacement.status,
          conflictTypes: placementConflictTypes,
        })
      : null;

    if (placementOverlay) {
      overlays.push(placementOverlay);
    }
  }

  return { cellsByCoordinate, overlays, overlayInstanceIds };
}

function buildLowerLayerGhostOverlays(input: {
  scene: SceneDocument | undefined;
  cells: readonly CanvasCellContext[];
  canvasSize: GridSize;
  enabled: boolean;
}): LowerLayerGhostOverlay[] {
  const activeLevel = input.cells[0]?.buildingLevel;

  if (!input.enabled || !input.scene || !activeLevel) {
    return [];
  }

  const lowerLevel = getDirectLowerBuildingLevel(input.scene, activeLevel.id);
  if (!lowerLevel) {
    return [];
  }

  const overlays: LowerLayerGhostOverlay[] = [];
  for (const instance of input.scene.tileInstances) {
    if (instance.buildingLevelId !== lowerLevel.id) {
      continue;
    }

    const asset = getAssetById(instance.assetId);
    if (!asset) {
      continue;
    }

    const rotationDegrees = instance.rotationDegrees ?? 0;
    const overlay = createLowerLayerGhostOverlay({
      id: `lower-layer-ghost-${instance.instanceId}`,
      asset,
      anchor: instance.coordinate,
      effectiveFootprint: getEffectiveAssetFootprint(asset.footprint, rotationDegrees),
      canvasSize: input.canvasSize,
      instanceId: instance.instanceId,
      buildingLevelId: lowerLevel.id,
      rotationDegrees,
      dyeColor: instance.dyeColor ?? null,
    });

    if (overlay) {
      overlays.push(overlay);
    }
  }

  return overlays;
}

function getDirectLowerBuildingLevel(scene: SceneDocument, activeBuildingLevelId: string): SceneDocument['buildingLevels'][number] | null {
  const activeLevel = scene.buildingLevels.find((level) => level.id === activeBuildingLevelId);
  if (!activeLevel) {
    return null;
  }

  return [...scene.buildingLevels]
    .filter((level) => level.levelNumber < activeLevel.levelNumber)
    .sort((left, right) => right.levelNumber - left.levelNumber || right.id.localeCompare(left.id))[0] ?? null;
}

function createEmptyFootprintCellState(): FootprintCellState {
  return {
    footprintRole: 'none',
    instanceId: null,
    anchorCoordinate: null,
    footprintLabel: '',
    heightBlocked: false,
    blockingCell: null,
    heightBlockLabel: '',
    placementRole: 'none',
    placementLabel: '',
    placementConflicts: [],
    stackingState: null,
  };
}

function applyStackingState(
  cellsByCoordinate: Map<string, FootprintCellState>,
  coordinates: readonly GridCoordinate[],
  stackingState: StackingCellState,
): void {
  for (const coordinate of coordinates) {
    const state = cellsByCoordinate.get(getCoordinateKey(coordinate));

    if (!state) {
      continue;
    }

    state.stackingState = stackingState;
  }
}

function toPlacedStackingCellState(
  relation: StackingRelation,
  occupancyInstanceById: ReadonlyMap<string, { effectiveFootprint: AssetDefinition['footprint'] }>,
): StackingCellState {
  const baseInstance = occupancyInstanceById.get(relation.baseInstanceId);
  const topInstance = occupancyInstanceById.get(relation.topInstanceId);

  return {
    kind: 'placed',
    baseInstanceId: relation.baseInstanceId,
    baseAssetId: relation.baseAssetId,
    baseFootprint: baseInstance?.effectiveFootprint ?? null,
    topInstanceId: relation.topInstanceId,
    topAssetId: relation.topAssetId,
    topFootprint: topInstance?.effectiveFootprint ?? null,
    surfaceKind: relation.surfaceKind,
    conflictTypes: [],
  };
}

function isMultiCellFootprint(footprint: AssetDefinition['footprint']): boolean {
  return footprint.length > 1 || footprint.width > 1;
}

function createFootprintOverlay(input: {
  id: string;
  kind: 'placed' | 'placement';
  asset: AssetDefinition;
  anchor: GridCoordinate;
  effectiveFootprint: AssetDefinition['footprint'];
  canvasSize: GridSize;
  instanceId?: string;
  stackingState?: StackingCellState | null;
  placementStatus?: string;
  conflictTypes?: string[];
}): FootprintOverlay | null {
  const visibleStartX = Math.max(0, input.anchor.x);
  const visibleStartY = Math.max(0, input.anchor.y);
  const visibleEndX = Math.min(input.canvasSize.width, input.anchor.x + input.effectiveFootprint.length);
  const visibleEndY = Math.min(input.canvasSize.height, input.anchor.y + input.effectiveFootprint.width);

  if (visibleEndX <= visibleStartX || visibleEndY <= visibleStartY) {
    return null;
  }

  return {
    id: input.id,
    kind: input.kind,
    asset: input.asset,
    anchor: { x: input.anchor.x, y: input.anchor.y },
    effectiveFootprint: input.effectiveFootprint,
    stackingRole: input.stackingState ? 'top' : null,
    stackingState: input.stackingState ?? null,
    gridColumnStart: visibleStartX + 1,
    gridRowStart: visibleStartY + 1,
    gridColumnSpan: visibleEndX - visibleStartX,
    gridRowSpan: visibleEndY - visibleStartY,
    instanceId: input.instanceId,
    placementStatus: input.placementStatus,
    conflictTypes: input.conflictTypes ?? [],
  };
}

function createLowerLayerGhostOverlay(input: {
  id: string;
  asset: AssetDefinition;
  anchor: GridCoordinate;
  effectiveFootprint: AssetDefinition['footprint'];
  canvasSize: GridSize;
  instanceId: string;
  buildingLevelId: string;
  rotationDegrees: NonNullable<SceneDocument['tileInstances'][number]['rotationDegrees']>;
  dyeColor: string | null;
}): LowerLayerGhostOverlay | null {
  const visibleStartX = Math.max(0, input.anchor.x);
  const visibleStartY = Math.max(0, input.anchor.y);
  const visibleEndX = Math.min(input.canvasSize.width, input.anchor.x + input.effectiveFootprint.length);
  const visibleEndY = Math.min(input.canvasSize.height, input.anchor.y + input.effectiveFootprint.width);

  if (visibleEndX <= visibleStartX || visibleEndY <= visibleStartY) {
    return null;
  }

  return {
    id: input.id,
    asset: input.asset,
    anchor: { x: input.anchor.x, y: input.anchor.y },
    effectiveFootprint: input.effectiveFootprint,
    gridColumnStart: visibleStartX + 1,
    gridRowStart: visibleStartY + 1,
    gridColumnSpan: visibleEndX - visibleStartX,
    gridRowSpan: visibleEndY - visibleStartY,
    instanceId: input.instanceId,
    buildingLevelId: input.buildingLevelId,
    rotationDegrees: input.rotationDegrees,
    dyeColor: input.dyeColor,
  };
}

function getOverlayGridStyle(overlay: {
  gridColumnStart: number;
  gridColumnSpan: number;
  gridRowStart: number;
  gridRowSpan: number;
}): CSSProperties {
  return {
    gridColumn: `${overlay.gridColumnStart} / span ${overlay.gridColumnSpan}`,
    gridRow: `${overlay.gridRowStart} / span ${overlay.gridRowSpan}`,
  };
}

function getGhostOverlayStyle(overlay: LowerLayerGhostOverlay): CSSProperties {
  return {
    ...getOverlayGridStyle(overlay),
    '--lower-layer-ghost-rotation': `${overlay.rotationDegrees}deg`,
    '--lower-layer-ghost-dye-color': overlay.dyeColor ?? 'transparent',
  } as CSSProperties;
}

function getInteractionCoordinate(
  coordinate: GridCoordinate,
  footprintState: FootprintCellState,
  placementMode: boolean,
): GridCoordinate {
  if (placementMode || footprintState.footprintRole !== 'occupied' || !footprintState.anchorCoordinate) {
    return coordinate;
  }

  return footprintState.anchorCoordinate;
}

function handleCellKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
  coordinate: GridCoordinate,
  readOnly: boolean,
  placementMode: boolean,
  onSelectCoordinate: (coordinate: GridCoordinate) => void,
  onViewCoordinate: (coordinate: GridCoordinate) => void,
  onFocusCoordinate: (coordinate: GridCoordinate | null) => void,
  canvasSize: GridSize,
): void {
  if (readOnly) {
    if (isReadOnlyApplicationKey(event)) {
      event.preventDefault();
    }
    return;
  }

  const directionByKey = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
  } as const;

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    dispatchCoordinate(
      readOnly,
      placementMode ? getGridKeyboardTarget(event.currentTarget) ?? coordinate : coordinate,
      onSelectCoordinate,
      onViewCoordinate,
    );
    return;
  }

  const direction = directionByKey[event.key as keyof typeof directionByKey];
  if (!direction) {
    return;
  }

  event.preventDefault();
  const baseCoordinate = getGridKeyboardTarget(event.currentTarget) ?? coordinate;
  const nextCoordinate = moveCoordinate(baseCoordinate, direction, canvasSize);
  const grid = event.currentTarget.closest('[role="grid"]');
  setGridKeyboardTarget(event.currentTarget, nextCoordinate);
  if (!placementMode) {
    dispatchCoordinate(readOnly, nextCoordinate, onSelectCoordinate, onViewCoordinate);
  }
  onFocusCoordinate(nextCoordinate);
  requestAnimationFrame(() => {
    grid
      ?.querySelector<HTMLButtonElement>(`[data-coordinate="${nextCoordinate.x},${nextCoordinate.y}"]`)
      ?.focus();
  });
}

function handleCellFocus(
  event: FocusEvent<HTMLButtonElement>,
  coordinate: GridCoordinate,
  onFocusCoordinate: (coordinate: GridCoordinate | null) => void,
): void {
  setGridKeyboardTarget(event.currentTarget, coordinate);
  onFocusCoordinate(toGridCoordinate(coordinate));
}

function coordinatesEqual(left: GridCoordinate | null, right: GridCoordinate): boolean {
  return left?.x === right.x && left.y === right.y;
}

function handleCellPointerSelect(
  readOnly: boolean,
  coordinate: GridCoordinate,
  onSelectCoordinate: (coordinate: GridCoordinate) => void,
  onViewCoordinate: (coordinate: GridCoordinate) => void,
): void {
  dispatchCoordinate(readOnly, coordinate, onSelectCoordinate, onViewCoordinate);
}

function handleCellContextMenu(
  event: MouseEvent<HTMLButtonElement>,
  readOnly: boolean,
  coordinate: GridCoordinate,
  onDeleteCoordinate: (coordinate: GridCoordinate) => void,
): void {
  if (readOnly) {
    return;
  }

  event.preventDefault();
  onDeleteCoordinate(toGridCoordinate(coordinate));
}

function dispatchCoordinate(
  readOnly: boolean,
  coordinate: GridCoordinate,
  onSelectCoordinate: (coordinate: GridCoordinate) => void,
  onViewCoordinate: (coordinate: GridCoordinate) => void,
): void {
  const nextCoordinate = toGridCoordinate(coordinate);
  if (readOnly) {
    onViewCoordinate(nextCoordinate);
    return;
  }

  onSelectCoordinate(nextCoordinate);
}

function toGridCoordinate(coordinate: GridCoordinate): GridCoordinate {
  return { x: coordinate.x, y: coordinate.y };
}

function getInstanceDisplayLabel(assetId: string, locale: Locale): string {
  const asset = getAssetById(assetId);

  return asset ? getAssetDisplay(asset, locale).name : `Unknown asset: ${assetId}`;
}

function getStackingLabel(stackingState: StackingCellState | null, locale: Locale): string {
  if (!stackingState) {
    return '';
  }

  const topLabel = getInstanceDisplayLabel(stackingState.topAssetId, locale);
  const baseLabel = getInstanceDisplayLabel(stackingState.baseAssetId, locale);

  if (stackingState.kind === 'conflict') {
    return `unsupported stacking ${topLabel} on ${baseLabel}`;
  }

  if (stackingState.kind === 'placement') {
    return `placement preview stacking ${topLabel} on ${baseLabel}`;
  }

  return `stacked ${topLabel} on ${baseLabel}`;
}

function getInstanceSkillMarkerLabel(assetId: string, markerLabel: string | null, locale: Locale): string {
  const assetLabel = getInstanceDisplayLabel(assetId, locale);

  return `${t(locale, 'skillMarker')} ${assetLabel} ${markerLabel ?? t(locale, 'skillMarker')}`;
}

function getCellSkillMarkerLabel(markerLabel: string | null, locale: Locale): string {
  return `${t(locale, 'skillMarker')} ${markerLabel ?? t(locale, 'skillMarker')}`;
}

function getCoordinateKey(coordinate: GridCoordinate): string {
  return `${coordinate.x},${coordinate.y}`;
}

function formatCoordinate(coordinate: GridCoordinate): string {
  return `${coordinate.x},${coordinate.y}`;
}

function formatFootprint(footprint: AssetDefinition['footprint']): string {
  return `${footprint.length}x${footprint.width}x${footprint.height}`;
}

function setGridKeyboardTarget(cell: HTMLButtonElement, coordinate: GridCoordinate): void {
  cell.closest<HTMLElement>('[role="grid"]')?.setAttribute('data-keyboard-coordinate', `${coordinate.x},${coordinate.y}`);
}

function getGridKeyboardTarget(cell: HTMLButtonElement): GridCoordinate | null {
  const value = cell.closest<HTMLElement>('[role="grid"]')?.getAttribute('data-keyboard-coordinate');
  const match = value?.match(/^(\d+),(\d+)$/);

  if (!match) {
    return null;
  }

  return {
    x: Number(match[1]),
    y: Number(match[2]),
  };
}

function isCellEditable(placeable: boolean, readOnly: boolean): boolean {
  return placeable && !readOnly;
}

function getCellStateLabel(placeable: boolean, readOnly: boolean): string {
  if (readOnly) {
    return 'read-only';
  }

  return placeable ? 'placeable' : 'not placeable';
}

function isReadOnlyApplicationKey(event: KeyboardEvent<HTMLButtonElement>): boolean {
  const normalizedKey = event.key.toLowerCase();

  return (
    normalizedKey === 'arrowup' ||
    normalizedKey === 'arrowdown' ||
    normalizedKey === 'arrowleft' ||
    normalizedKey === 'arrowright' ||
    normalizedKey === 'enter' ||
    normalizedKey === ' ' ||
    normalizedKey === 'spacebar' ||
    normalizedKey === 'escape' ||
    normalizedKey === 'delete' ||
    normalizedKey === 'backspace' ||
    ((event.metaKey || event.ctrlKey) && normalizedKey === 's')
  );
}
