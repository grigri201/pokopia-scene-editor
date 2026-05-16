import { useEffect, useState } from 'react';
import { getAssetById } from '../../domain/assets';
import {
  calculateAreaType,
  type CellContext,
  type GridCoordinate,
  type GridSize,
  type RotationDegrees,
  type SceneDimensions,
  type TileInstance,
} from '../../domain/scene';
import type { AssetPlacementPreview } from '../../state';

interface SelectionInspectorProps {
  selectedContext: CellContext | null;
  selectedInstance: TileInstance | null;
  selectedInstanceId: string | null;
  targetContext: CellContext | null;
  targetPlacement: AssetPlacementPreview | null;
  canvasSize: GridSize;
  sceneDimensions: SceneDimensions;
  currentLayerInstances: readonly TileInstance[];
  readOnly: boolean;
  editFeedback: string | null;
  onSelectedInstanceChange: (instanceId: string) => void;
  onDeleteInstance: (instanceId: string) => void;
  onMoveInstance: (instanceId: string, coordinate: GridCoordinate) => void;
  onRotateInstance: (instanceId: string, rotationDegrees: RotationDegrees) => void;
  onDyeInstance: (instanceId: string, dyeColor: string | null) => void;
  onSaveInstanceNote: (instanceId: string, note: string) => void;
}

export function SelectionInspector({
  selectedContext,
  selectedInstance,
  selectedInstanceId,
  targetContext,
  targetPlacement,
  canvasSize,
  sceneDimensions,
  currentLayerInstances,
  readOnly,
  editFeedback,
  onSelectedInstanceChange,
  onDeleteInstance,
  onMoveInstance,
  onRotateInstance,
  onDyeInstance,
  onSaveInstanceNote,
}: SelectionInspectorProps) {
  return (
    <section className="selection-inspector" aria-label="Selection context">
      <ContextBlock title="Selected" labelPrefix="Selected" context={selectedContext} />
      <ContextBlock
        title="Target"
        labelPrefix="Target"
        context={targetContext}
        placement={targetPlacement}
      />
      <InstanceEditor
        context={selectedContext}
        instance={selectedInstance}
        selectedInstanceId={selectedInstanceId}
        canvasSize={canvasSize}
        sceneDimensions={sceneDimensions}
        currentLayerInstances={currentLayerInstances}
        readOnly={readOnly}
        feedback={editFeedback}
        onSelectedInstanceChange={onSelectedInstanceChange}
        onDeleteInstance={onDeleteInstance}
        onMoveInstance={onMoveInstance}
        onRotateInstance={onRotateInstance}
        onDyeInstance={onDyeInstance}
        onSaveInstanceNote={onSaveInstanceNote}
      />
    </section>
  );
}

interface ContextBlockProps {
  title: string;
  labelPrefix: 'Selected' | 'Target';
  context: CellContext | null;
  placement?: AssetPlacementPreview | null;
}

function ContextBlock({ title, labelPrefix, context, placement }: ContextBlockProps) {
  if (!context) {
    return (
      <div className="selection-card">
        <span>{title}</span>
        <strong aria-label={`${labelPrefix} coordinate`}>None</strong>
        <em>Empty state</em>
      </div>
    );
  }

  return (
    <div className="selection-card">
      <span>{title}</span>
      <strong aria-label={`${labelPrefix} coordinate`}>
        {context.coordinate.x},{context.coordinate.y}
      </strong>
      <em aria-label={`${labelPrefix} area`}>{context.areaType}</em>
      <em aria-label={`${labelPrefix} layer`}>{context.buildingLevel.name}</em>
      <em aria-label={`${labelPrefix} occupancy`}>{context.empty ? 'Empty cell' : 'Has item'}</em>
      <em aria-label={`${labelPrefix} placeable`}>{context.placeable ? 'Placeable' : 'Blocked'}</em>
      {context.tileInstances.length > 0 ? (
        <>
          <em aria-label={`${labelPrefix} asset`}>
            {getInstanceLabel(context.tileInstances.at(-1)?.assetId)}
          </em>
          <em aria-label={`${labelPrefix} asset stack`}>
            {context.tileInstances.map((instance) => getInstanceLabel(instance.assetId)).join(' / ')}
          </em>
        </>
      ) : null}
      {placement ? (
        <>
          <em aria-label={`${labelPrefix} placement status`}>{placement.message}</em>
          <em aria-label={`${labelPrefix} skill status`}>{placement.skillLabel}</em>
          <em aria-label={`${labelPrefix} overwrite risk`}>{placement.overwriteLabel}</em>
          <em aria-label={`${labelPrefix} repair hint`}>{placement.repairHint}</em>
        </>
      ) : null}
    </div>
  );
}

function getInstanceLabel(assetId: string | undefined): string {
  if (!assetId) {
    return 'None';
  }

  return getAssetById(assetId)?.name ?? `Unknown asset: ${assetId}`;
}

interface InstanceEditorProps {
  context: CellContext | null;
  instance: TileInstance | null;
  selectedInstanceId: string | null;
  canvasSize: GridSize;
  sceneDimensions: SceneDimensions;
  currentLayerInstances: readonly TileInstance[];
  readOnly: boolean;
  feedback: string | null;
  onSelectedInstanceChange: (instanceId: string) => void;
  onDeleteInstance: (instanceId: string) => void;
  onMoveInstance: (instanceId: string, coordinate: GridCoordinate) => void;
  onRotateInstance: (instanceId: string, rotationDegrees: RotationDegrees) => void;
  onDyeInstance: (instanceId: string, dyeColor: string | null) => void;
  onSaveInstanceNote: (instanceId: string, note: string) => void;
}

function InstanceEditor({
  context,
  instance,
  selectedInstanceId,
  canvasSize,
  sceneDimensions,
  currentLayerInstances,
  readOnly,
  feedback,
  onSelectedInstanceChange,
  onDeleteInstance,
  onMoveInstance,
  onRotateInstance,
  onDyeInstance,
  onSaveInstanceNote,
}: InstanceEditorProps) {
  const asset = getAssetById(instance?.assetId);
  const [moveX, setMoveX] = useState('0');
  const [moveY, setMoveY] = useState('0');
  const [note, setNote] = useState('');
  const [dyeColor, setDyeColor] = useState('#ffffff');
  const disabledReason = getDisabledReason(context, readOnly);
  const canEdit = Boolean(instance && !disabledReason);
  const movePreview = instance
    ? getMovePreview({
        instance,
        currentLayerInstances,
        canvasSize,
        sceneDimensions,
        xValue: moveX,
        yValue: moveY,
      })
    : null;

  useEffect(() => {
    if (!instance) {
      setMoveX('0');
      setMoveY('0');
      setNote('');
      setDyeColor('#ffffff');
      return;
    }

    setMoveX(String(instance.coordinate.x));
    setMoveY(String(instance.coordinate.y));
    setNote(instance.note);
    setDyeColor(instance.dyeColor ?? '#ffffff');
  }, [instance?.instanceId, instance?.coordinate.x, instance?.coordinate.y, instance?.note, instance?.dyeColor]);

  if (!instance) {
    return (
      <div className="selection-card instance-editor" aria-label="Selected instance editor">
        <span>Instance</span>
        <strong aria-label="Selected instance">None</strong>
        <em>Select a placed asset instance</em>
      </div>
    );
  }

  const rotationDisabled = !canEdit || !asset?.rotatable;
  const dyeDisabled = !canEdit || !asset?.dyeable;
  const moveDisabled = !canEdit || movePreview?.status !== 'ready';

  return (
    <div className="selection-card instance-editor" aria-label="Selected instance editor">
      <span>Instance</span>
      <strong aria-label="Selected instance">{asset?.name ?? `Unknown asset: ${instance.assetId}`}</strong>
      <em aria-label="Selected instance id">{instance.instanceId}</em>
      <em aria-label="Selected instance rotation">{instance.rotationDegrees} deg</em>
      <em aria-label="Selected instance dye">{instance.dyeColor ?? 'No dye'}</em>
      <em aria-label="Selected instance note">{instance.note || 'No note'}</em>
      {disabledReason ? <em aria-label="Instance edit state">{disabledReason}</em> : null}
      {feedback ? <em aria-label="Instance edit feedback" role="status">{feedback}</em> : null}
      {context && context.tileInstances.length > 1 ? (
        <label className="instance-picker">
          Instance
          <select
            aria-label="Selected instance selector"
            value={selectedInstanceId ?? instance.instanceId}
            disabled={readOnly}
            onChange={(event) => onSelectedInstanceChange(event.target.value)}
          >
            {context.tileInstances.map((candidate, index) => (
              <option value={candidate.instanceId} key={candidate.instanceId}>
                {index + 1}. {getInstanceLabel(candidate.assetId)} ({candidate.instanceId})
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {!asset?.rotatable ? <em aria-label="Rotation edit state">This asset cannot rotate</em> : null}
      {!asset?.dyeable ? <em aria-label="Dye edit state">This asset cannot be dyed</em> : null}
      {movePreview ? <em aria-label="Move target preview">{movePreview.message}</em> : null}
      <div className="instance-actions">
        <button type="button" disabled={!canEdit} onClick={() => onDeleteInstance(instance.instanceId)}>
          Delete
        </button>
        <label>
          X
          <input
            aria-label="Move instance X"
            type="number"
            min="0"
            max="6"
            value={moveX}
            disabled={!canEdit}
            onChange={(event) => setMoveX(event.target.value)}
          />
        </label>
        <label>
          Y
          <input
            aria-label="Move instance Y"
            type="number"
            min="0"
            max="6"
            value={moveY}
            disabled={!canEdit}
            onChange={(event) => setMoveY(event.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={moveDisabled}
          onClick={() => {
            const coordinate = parseMoveCoordinate(moveX, moveY, canvasSize);
            if (coordinate) {
              onMoveInstance(instance.instanceId, coordinate);
            }
          }}
        >
          Move
        </button>
        <label>
          Rotation
          <select
            aria-label="Instance rotation"
            value={instance.rotationDegrees}
            disabled={rotationDisabled}
            onChange={(event) => onRotateInstance(instance.instanceId, Number(event.target.value) as RotationDegrees)}
          >
            <option value={0}>0</option>
            <option value={90}>90</option>
            <option value={180}>180</option>
            <option value={270}>270</option>
          </select>
        </label>
        <label>
          Dye
          <input
            aria-label="Instance dye color"
            type="color"
            value={dyeColor}
            disabled={dyeDisabled}
            onChange={(event) => {
              setDyeColor(event.target.value);
              onDyeInstance(instance.instanceId, event.target.value);
            }}
          />
        </label>
        <button type="button" disabled={dyeDisabled} onClick={() => onDyeInstance(instance.instanceId, null)}>
          Clear dye
        </button>
      </div>
      <label className="instance-note-field">
        Note
        <textarea
          aria-label="Instance note"
          value={note}
          disabled={!canEdit}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      <button type="button" disabled={!canEdit} onClick={() => onSaveInstanceNote(instance.instanceId, note)}>
        Save note
      </button>
    </div>
  );
}

function parseMoveCoordinate(xValue: string, yValue: string, canvasSize: GridSize): GridCoordinate | null {
  const x = Number(xValue);
  const y = Number(yValue);

  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0 ||
    x >= canvasSize.width ||
    y >= canvasSize.height
  ) {
    return null;
  }

  return { x, y };
}

function getMovePreview({
  instance,
  currentLayerInstances,
  canvasSize,
  sceneDimensions,
  xValue,
  yValue,
}: {
  instance: TileInstance;
  currentLayerInstances: readonly TileInstance[];
  canvasSize: GridSize;
  sceneDimensions: SceneDimensions;
  xValue: string;
  yValue: string;
}): { status: 'ready' | 'blocked' | 'invalid'; message: string } {
  const coordinate = parseMoveCoordinate(xValue, yValue, canvasSize);
  if (!coordinate) {
    return {
      status: 'invalid',
      message: `Invalid target. Use whole numbers inside 0..${canvasSize.width - 1}, 0..${canvasSize.height - 1}.`,
    };
  }

  const targetAreaType = calculateAreaType(coordinate, sceneDimensions);
  if (!getAssetById(instance.assetId)?.applicableAreas.includes(targetAreaType)) {
    return {
      status: 'blocked',
      message: `${getInstanceLabel(instance.assetId)} cannot move to ${targetAreaType}`,
    };
  }

  const targetInstances = currentLayerInstances.filter(
    (candidate) =>
      candidate.instanceId !== instance.instanceId &&
      candidate.coordinate.x === coordinate.x &&
      candidate.coordinate.y === coordinate.y,
  );
  const asset = getAssetById(instance.assetId);
  const stackAllowed =
    targetInstances.length === 0 ||
    Boolean(asset?.stackable && targetInstances.every((candidate) => getAssetById(candidate.assetId)?.stackable));

  if (!stackAllowed) {
    return {
      status: 'blocked',
      message: `Move blocked by ${targetInstances.length} item${targetInstances.length === 1 ? '' : 's'} at target. Choose an empty compatible cell or stackable target.`,
    };
  }

  if (targetInstances.length > 0) {
    return {
      status: 'ready',
      message: `Move will stack with ${targetInstances.length} item${targetInstances.length === 1 ? '' : 's'} at target.`,
    };
  }

  return { status: 'ready', message: 'Move target is clear.' };
}

function getDisabledReason(context: CellContext | null, readOnly: boolean): string | null {
  if (readOnly) {
    return 'Read-only mode';
  }

  if (!context?.buildingLevel.visible) {
    return 'Layer hidden';
  }

  if (context.buildingLevel.locked) {
    return 'Layer locked';
  }

  return null;
}
