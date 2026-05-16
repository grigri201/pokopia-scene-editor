import { getAssetById } from '../../domain/assets';
import type { CellContext } from '../../domain/scene';
import type { AssetPlacementPreview } from '../../state';

interface SelectionInspectorProps {
  selectedContext: CellContext | null;
  targetContext: CellContext | null;
  targetPlacement: AssetPlacementPreview | null;
}

export function SelectionInspector({ selectedContext, targetContext, targetPlacement }: SelectionInspectorProps) {
  return (
    <section className="selection-inspector" aria-label="Selection context">
      <ContextBlock title="Selected" labelPrefix="Selected" context={selectedContext} />
      <ContextBlock
        title="Target"
        labelPrefix="Target"
        context={targetContext}
        placement={targetPlacement}
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
