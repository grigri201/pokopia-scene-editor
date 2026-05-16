import { useEffect, useState } from 'react';
import {
  getCellContext,
  getAllVisibleFrontPreviewContexts,
  getAllVisiblePreviewCellContexts,
  getCurrentLayerFrontPreviewContexts,
  getCurrentLayerPreviewCellContexts,
  getPreviewInspectorContext,
  getVisibleBuildingLevelContextsInRenderOrder,
  type GridCoordinate,
  type PreviewCanvasCellContext,
  type BuildingLevelContext,
  type SceneDocument,
  type TileInstance,
} from '../../domain/scene';
import { getAssetById, getAssetSkillMarkerLabel } from '../../domain/assets';

type PreviewLayerScope = 'current-layer' | 'all-visible-layers';

interface PreviewInspectorProps {
  scene: SceneDocument;
  activeBuildingLevelId: string;
  selectedCoordinate: GridCoordinate | null;
  selectedInstanceId: string | null;
  readOnly: boolean;
}

export function PreviewInspector({
  scene,
  activeBuildingLevelId,
  selectedCoordinate,
  selectedInstanceId,
  readOnly,
}: PreviewInspectorProps) {
  const [previewCoordinate, setPreviewCoordinate] = useState<GridCoordinate | null>(selectedCoordinate);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewPan, setPreviewPan] = useState({ x: 0, y: 0 });
  const [previewScope, setPreviewScope] = useState<PreviewLayerScope>('current-layer');
  const previewContext = getPreviewInspectorContext(scene, activeBuildingLevelId);
  const currentLayerPreviewCells = getCurrentLayerPreviewCellContexts(scene, activeBuildingLevelId);
  const allVisiblePreviewCells = getAllVisiblePreviewCellContexts(scene);
  const currentLayerFrontPreviewLevels = getCurrentLayerFrontPreviewContexts(scene, activeBuildingLevelId);
  const allVisibleFrontPreviewLevels = getAllVisibleFrontPreviewContexts(scene);
  const visibleLevelsInRenderOrder = getVisibleBuildingLevelContextsInRenderOrder(scene);
  const topPreviewCells = previewScope === 'current-layer' ? currentLayerPreviewCells : allVisiblePreviewCells;
  const topPreviewInstances = topPreviewCells.flatMap((cell) => cell.tileInstances);
  const frontPreviewLevels = previewScope === 'current-layer'
    ? currentLayerFrontPreviewLevels
    : allVisibleFrontPreviewLevels;
  const frontPreviewInstanceCount = frontPreviewLevels.reduce(
    (instanceCount, level) => instanceCount + level.totalInstanceCount,
    0,
  );
  const selectedContext = selectedCoordinate && previewContext.activeLevel.visible
    ? getCellContext(scene, selectedCoordinate, activeBuildingLevelId)
    : null;
  const previewCell = previewCoordinate
    ? topPreviewCells.find(
        (cell) => cell.coordinate.x === previewCoordinate.x && cell.coordinate.y === previewCoordinate.y,
      ) ?? null
    : null;
  const selectedInstance =
    selectedContext?.tileInstances.find((instance) => instance.instanceId === selectedInstanceId) ??
    selectedContext?.tileInstances.at(-1) ??
    null;
  const previewInstance = previewCell?.hidden ? null : previewCell?.tileInstances.at(-1) ?? null;
  const topViewSummary = previewScope === 'current-layer'
    ? `${topPreviewInstances.length} current-layer item${topPreviewInstances.length === 1 ? '' : 's'}`
    : `${topPreviewInstances.length} visible item${topPreviewInstances.length === 1 ? '' : 's'} across ${
        visibleLevelsInRenderOrder.length
      } layer${visibleLevelsInRenderOrder.length === 1 ? '' : 's'}`;
  const frontViewSummary = `${frontPreviewLevels.length} visible layer${frontPreviewLevels.length === 1 ? '' : 's'}, ${
    frontPreviewInstanceCount
  } visible item${frontPreviewInstanceCount === 1 ? '' : 's'}`;
  const layerSummary = previewScope === 'current-layer'
    ? formatLevelSummary(previewContext.activeLevel)
    : visibleLevelsInRenderOrder.length > 0
      ? visibleLevelsInRenderOrder.map(formatLevelSummary).join(' → ')
      : 'No visible layers';
  const scopeSummary = previewScope === 'current-layer' ? 'Current layer preview' : 'All visible layers preview';
  const topPreviewSurfaceLabel = `${scopeSummary}, ${layerSummary}, ${topViewSummary}`;
  const scopeControlLabel = previewScope === 'current-layer' ? '当前层' : '全部可见层';
  const frontPreviewMode = readOnly
    ? `${scopeControlLabel} read-only preview`
    : `${scopeControlLabel} derived preview`;
  const selectedSummary = selectedCoordinate
    ? previewContext.activeLevel.visible
      ? `${selectedCoordinate.x},${selectedCoordinate.y}${
          selectedInstance ? ` · ${getInstanceLabel(selectedInstance.assetId)}` : ''
        }`
      : `${selectedCoordinate.x},${selectedCoordinate.y} · hidden layer`
    : 'No selection';
  const previewFocusSummary = previewCoordinate
    ? previewCell?.hidden
      ? `${previewCoordinate.x},${previewCoordinate.y} · hidden layer`
      : `${previewCoordinate.x},${previewCoordinate.y}${
          previewInstance ? ` · ${getInstanceLabel(previewInstance.assetId)}` : ''
        }`
    : 'No preview focus';

  useEffect(() => {
    setPreviewCoordinate(selectedCoordinate);
  }, [selectedCoordinate?.x, selectedCoordinate?.y]);

  return (
    <aside className="panel preview-panel" aria-label="Preview inspector">
      <div className="panel__header">
        <h2>检查器预览</h2>
        <span>{readOnly ? 'View only' : 'Top / Front'}</span>
      </div>
      <div className="preview-grid" aria-label="Dual preview inspector">
        <div className="preview-tile" aria-label="Top view preview">
          <span>Top</span>
          <div className="preview-scope-control" role="group" aria-label="Preview layer scope">
            <button
              type="button"
              aria-label="Preview current layer"
              aria-pressed={previewScope === 'current-layer'}
              onClick={() => setPreviewScope('current-layer')}
            >
              当前层
            </button>
            <button
              type="button"
              aria-label="Preview all visible layers"
              aria-pressed={previewScope === 'all-visible-layers'}
              onClick={() => setPreviewScope('all-visible-layers')}
            >
              全部可见层
            </button>
          </div>
          <div
            className="mini-grid"
            aria-label={`Top preview surface ${topPreviewSurfaceLabel}`}
            data-zoom={previewZoom}
            data-pan-x={previewPan.x}
            data-pan-y={previewPan.y}
          >
            <div
              className="mini-grid__cells"
              style={{
                transform: `translate(${previewPan.x}px, ${previewPan.y}px) scale(${previewZoom})`,
              }}
            >
              {topPreviewCells.map((cell) => {
                const visibleCellInstances = cell.hidden ? [] : cell.tileInstances;
                const topInstance = visibleCellInstances.at(-1) ?? null;
                const skillInstances = visibleCellInstances.filter((instance) => instance.requiresSkill);
                const topSkillInstance = skillInstances.at(-1) ?? null;
                const skillMarkerLabel = topSkillInstance
                  ? getAssetSkillMarkerLabel(topSkillInstance.skillType)
                  : '';
                const assetStackLabel = getPreviewAssetStackLabel(cell);
                const lockedLayerCount = cell.instanceLayerContexts.filter((level) => level.locked).length;

                return (
                  <button
                    type="button"
                    className="mini-grid__cell"
                    aria-label={getPreviewCellLabel(cell, previewScope)}
                    aria-pressed={coordinatesEqual(previewCoordinate, cell.coordinate)}
                    data-preview-scope={previewScope}
                    data-preview-coordinate={`${cell.coordinate.x},${cell.coordinate.y}`}
                    data-preview-area={cell.areaType}
                    data-preview-main-boundary={cell.mainBoundary}
                    data-preview-has-instance={visibleCellInstances.length > 0}
                    data-preview-instance-count={visibleCellInstances.length}
                    data-preview-layer-count={cell.instanceLayerContexts.length}
                    data-preview-layer-stack={cell.instanceLayerContexts.map((level) => level.displayId).join(',')}
                    data-preview-locked-layer-count={lockedLayerCount}
                    data-preview-asset-stack={assetStackLabel}
                    data-preview-asset-id={topInstance?.assetId ?? ''}
                    data-preview-instance-id={topInstance?.instanceId ?? ''}
                    data-preview-requires-skill={skillInstances.length > 0}
                    data-preview-skill-marker-label={skillMarkerLabel}
                    data-preview-skill-instance-id={topSkillInstance?.instanceId ?? ''}
                    key={cell.id}
                    onClick={() => setPreviewCoordinate(cell.coordinate)}
                  >
                    <span className="mini-grid__coordinate">
                      {cell.coordinate.x},{cell.coordinate.y}
                    </span>
                    <span className="mini-grid__area">{cell.areaType === 'main' ? 'M' : 'O'}</span>
                    {topInstance ? (
                      <span className="mini-grid__asset">{getInstanceShortLabel(topInstance)}</span>
                    ) : null}
                    {topSkillInstance ? (
                      <span className="mini-grid__skill" aria-label={`Top preview skill ${skillMarkerLabel}`}>
                        {skillMarkerLabel}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
          <dl className="preview-summary">
            <div>
              <dt>Scope</dt>
              <dd aria-label="Top preview scope">{scopeSummary}</dd>
            </div>
            <div>
              <dt>Layer</dt>
              <dd aria-label="Top preview layer summary">{layerSummary}</dd>
            </div>
            <div>
              <dt>Items</dt>
              <dd aria-label="Top preview item summary">{topViewSummary}</dd>
            </div>
            <div>
              <dt>Selected</dt>
              <dd aria-label="Top preview selection summary">{selectedSummary}</dd>
            </div>
            <div>
              <dt>Focus</dt>
              <dd aria-label="Top preview local focus">{previewFocusSummary}</dd>
            </div>
            <div>
              <dt>View</dt>
              <dd aria-label="Top preview view state">
                {Math.round(previewZoom * 100)}%, pan {previewPan.x},{previewPan.y}
              </dd>
            </div>
          </dl>
          <div className="preview-view-controls" aria-label="Top preview view controls">
            <button type="button" aria-label="Zoom in preview" onClick={() => setPreviewZoom((zoom) => Math.min(2, zoom + 0.25))}>
              +
            </button>
            <button type="button" aria-label="Zoom out preview" onClick={() => setPreviewZoom((zoom) => Math.max(1, zoom - 0.25))}>
              -
            </button>
            <button type="button" aria-label="Pan preview left" onClick={() => setPreviewPan((pan) => ({ ...pan, x: Math.max(-16, pan.x - 4) }))}>
              Left
            </button>
            <button type="button" aria-label="Pan preview right" onClick={() => setPreviewPan((pan) => ({ ...pan, x: Math.min(16, pan.x + 4) }))}>
              Right
            </button>
          </div>
        </div>
        <div className="preview-tile" aria-label="Front view preview">
          <span>Front</span>
          <div className="height-bars" aria-hidden="true">
            {frontPreviewLevels.map((level) => (
              <span
                data-active={level.id === activeBuildingLevelId}
                data-preview-layer-id={level.id}
                data-preview-layer-locked={level.locked}
                key={level.id}
                style={{ height: `${level.heightPercent}%` }}
              />
            ))}
          </div>
          <div
            className="front-structure"
            aria-label={`Front structure preview ${frontViewSummary}`}
            data-front-rendering="structure-only"
            data-front-scroll="independent"
            role="list"
          >
            {frontPreviewLevels.length > 0 ? (
              frontPreviewLevels.map((level) => (
                <div
                  className="front-structure__layer"
                  aria-label={`${level.displayId} ${level.name}, height ${Math.round(level.heightPercent)}%, ${
                    level.totalInstanceCount
                  } item${level.totalInstanceCount === 1 ? '' : 's'}, main ${level.mainInstanceCount}, outer ${
                    level.outerInstanceCount
                  }, skill ${level.skillInstanceCount}, visible, ${level.locked ? 'locked' : 'unlocked'}${
                    level.id === activeBuildingLevelId ? ', active' : ''
                  }`}
                  data-front-layer-id={level.id}
                  data-front-layer-height={Math.round(level.heightPercent)}
                  data-front-layer-main-count={level.mainInstanceCount}
                  data-front-layer-outer-count={level.outerInstanceCount}
                  data-front-layer-skill-count={level.skillInstanceCount}
                  data-front-layer-locked={level.locked}
                  key={level.id}
                  role="listitem"
                >
                  <span className="front-structure__level">{level.displayId}</span>
                  <span className="front-structure__height" style={{ inlineSize: `${level.heightPercent}%` }} />
                  <span className="front-structure__area">main {level.mainInstanceCount}</span>
                  <span className="front-structure__area">outer {level.outerInstanceCount}</span>
                  <span className="front-structure__skill">skill {level.skillInstanceCount}</span>
                </div>
              ))
            ) : (
              <div className="front-structure__empty" role="listitem" aria-label="Front structure empty">
                No visible layers
              </div>
            )}
          </div>
          <dl className="preview-summary">
            <div>
              <dt>Scope</dt>
              <dd aria-label="Front preview scope">{scopeSummary}</dd>
            </div>
            <div>
              <dt>Levels</dt>
              <dd aria-label="Front preview layer summary">{frontViewSummary}</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd aria-label="Front preview mode">{frontPreviewMode}</dd>
            </div>
          </dl>
        </div>
      </div>
    </aside>
  );
}

function getInstanceLabel(assetId: string): string {
  return getAssetById(assetId)?.name ?? `Unknown asset: ${assetId}`;
}

function getInstanceShortLabel(instance: TileInstance): string {
  return getAssetById(instance.assetId)?.name.slice(0, 1) ?? '?';
}

function getPreviewCellLabel(cell: PreviewCanvasCellContext, previewScope: PreviewLayerScope): string {
  const coordinateLabel = `Top preview cell ${cell.coordinate.x},${cell.coordinate.y}`;
  const boundarySuffix = cell.mainBoundary ? ', main boundary' : '';

  if (cell.hidden) {
    return `${coordinateLabel}, ${cell.areaType}, hidden layer${boundarySuffix}`;
  }

  const topInstance = cell.tileInstances.at(-1);
  const topSkillInstance = cell.tileInstances.filter((instance) => instance.requiresSkill).at(-1) ?? null;
  const skillSuffix = topSkillInstance
    ? `, skill ${getAssetSkillMarkerLabel(topSkillInstance.skillType)}`
    : '';
  const layerSuffix = previewScope === 'all-visible-layers' && cell.instanceLayerContexts.length > 0
    ? `, layers ${cell.instanceLayerContexts.map(formatLevelSummary).join(' → ')}`
    : '';
  const assetStackSuffix = previewScope === 'all-visible-layers' && cell.tileInstances.length > 1
    ? `, asset stack ${getPreviewAssetStackLabel(cell)}`
    : '';

  return `${coordinateLabel}, ${cell.areaType}, ${
    topInstance
      ? `${getInstanceLabel(topInstance.assetId)}, ${cell.tileInstances.length} item${
          cell.tileInstances.length === 1 ? '' : 's'
        }`
      : 'empty'
  }${layerSuffix}${assetStackSuffix}${skillSuffix}${boundarySuffix}`;
}

function coordinatesEqual(left: GridCoordinate | null, right: GridCoordinate): boolean {
  return left?.x === right.x && left.y === right.y;
}

function formatLevelSummary(
  level: Pick<BuildingLevelContext, 'name'> & Partial<Pick<BuildingLevelContext, 'displayId' | 'levelNumber' | 'locked'>>,
): string {
  const lockState = typeof level.locked === 'boolean' ? ` ${level.locked ? 'locked' : 'unlocked'}` : '';

  return `${level.displayId ?? `L${level.levelNumber}`} ${level.name}${lockState}`;
}

function getPreviewAssetStackLabel(cell: PreviewCanvasCellContext): string {
  return cell.tileInstances
    .map((instance) => {
      const level = cell.instanceLayerContexts.find((candidate) => candidate.id === instance.buildingLevelId);
      const levelLabel = level ? `${level.displayId} ${level.locked ? 'locked' : 'unlocked'}` : instance.buildingLevelId;

      return `${levelLabel} ${getInstanceLabel(instance.assetId)}`;
    })
    .join(' → ');
}
