import { useEffect, useState } from 'react';
import {
  getCellContext,
  getPreviewInspectorContext,
  type CanvasCellContext,
  type GridCoordinate,
  type SceneDocument,
  type TileInstance,
} from '../../domain/scene';
import { getAssetById } from '../../domain/assets';

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
  const previewContext = getPreviewInspectorContext(scene, activeBuildingLevelId);
  const selectedContext = selectedCoordinate && previewContext.activeLevel.visible
    ? getCellContext(scene, selectedCoordinate, activeBuildingLevelId)
    : null;
  const previewCell = previewCoordinate
    ? previewContext.activeCells.find(
        (cell) => cell.coordinate.x === previewCoordinate.x && cell.coordinate.y === previewCoordinate.y,
      ) ?? null
    : null;
  const selectedInstance =
    selectedContext?.tileInstances.find((instance) => instance.instanceId === selectedInstanceId) ??
    selectedContext?.tileInstances.at(-1) ??
    null;
  const previewInstance = previewCell?.tileInstances.at(-1) ?? null;
  const visibleLayerCount = previewContext.visibleLevels.length;
  const visibleInstanceCount = previewContext.visibleTileInstances.length;
  const topViewSummary = `${previewContext.activeLayerInstances.length} current-layer item${
    previewContext.activeLayerInstances.length === 1 ? '' : 's'
  }`;
  const frontViewSummary = `${visibleLayerCount} visible layer${visibleLayerCount === 1 ? '' : 's'}, ${
    visibleInstanceCount
  } visible item${visibleInstanceCount === 1 ? '' : 's'}`;
  const selectedSummary = selectedCoordinate
    ? previewContext.activeLevel.visible
      ? `${selectedCoordinate.x},${selectedCoordinate.y}${
          selectedInstance ? ` · ${getInstanceLabel(selectedInstance.assetId)}` : ''
        }`
      : `${selectedCoordinate.x},${selectedCoordinate.y} · hidden layer`
    : 'No selection';
  const previewFocusSummary = previewCoordinate
    ? `${previewCoordinate.x},${previewCoordinate.y}${
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
          <div
            className="mini-grid"
            aria-label={`Top preview surface ${previewContext.activeLevel.name}, ${topViewSummary}`}
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
              {previewContext.activeCells.map((cell) => (
                <button
                  type="button"
                  className="mini-grid__cell"
                  aria-label={getPreviewCellLabel(cell)}
                  aria-pressed={coordinatesEqual(previewCoordinate, cell.coordinate)}
                  data-preview-area={cell.areaType}
                  data-has-instance={cell.tileInstances.length > 0}
                  key={cell.id}
                  onClick={() => setPreviewCoordinate(cell.coordinate)}
                >
                  {cell.tileInstances.at(-1) ? getInstanceShortLabel(cell.tileInstances.at(-1)!) : ''}
                </button>
              ))}
            </div>
          </div>
          <dl className="preview-summary">
            <div>
              <dt>Layer</dt>
              <dd aria-label="Top preview current layer">{previewContext.activeLevel.name}</dd>
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
          <div className="height-bars" aria-label={`Front preview ${frontViewSummary}`} role="list">
            {previewContext.visibleLevels.map((level) => (
              <span
                role="listitem"
                aria-label={`${level.displayId} ${level.name}, ${level.instanceCount} item${
                  level.instanceCount === 1 ? '' : 's'
                }, visible${level.id === activeBuildingLevelId ? ', active' : ''}`}
                data-active={level.id === activeBuildingLevelId}
                key={level.id}
                style={{ height: `${level.heightPercent}%` }}
              />
            ))}
          </div>
          <dl className="preview-summary">
            <div>
              <dt>Scope</dt>
              <dd aria-label="Front preview scope">Visible layers</dd>
            </div>
            <div>
              <dt>Levels</dt>
              <dd aria-label="Front preview layer summary">{frontViewSummary}</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd aria-label="Front preview mode">{readOnly ? 'Read-only preview' : 'Read-only derived preview'}</dd>
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

function getPreviewCellLabel(cell: CanvasCellContext): string {
  const coordinateLabel = `Top preview cell ${cell.coordinate.x},${cell.coordinate.y}`;
  const topInstance = cell.tileInstances.at(-1);

  if (!cell.buildingLevel.visible) {
    return `${coordinateLabel}, ${cell.areaType}, hidden layer`;
  }

  return `${coordinateLabel}, ${cell.areaType}, ${
    topInstance ? getInstanceLabel(topInstance.assetId) : 'empty'
  }`;
}

function coordinatesEqual(left: GridCoordinate | null, right: GridCoordinate): boolean {
  return left?.x === right.x && left.y === right.y;
}
