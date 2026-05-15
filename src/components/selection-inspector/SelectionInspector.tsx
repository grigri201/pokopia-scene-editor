import type { CellContext } from '../../domain/scene';

interface SelectionInspectorProps {
  selectedContext: CellContext | null;
  targetContext: CellContext | null;
}

export function SelectionInspector({ selectedContext, targetContext }: SelectionInspectorProps) {
  return (
    <section className="selection-inspector" aria-label="Selection context">
      <ContextBlock title="Selected" labelPrefix="Selected" context={selectedContext} />
      <ContextBlock title="Target" labelPrefix="Target" context={targetContext} />
    </section>
  );
}

interface ContextBlockProps {
  title: string;
  labelPrefix: 'Selected' | 'Target';
  context: CellContext | null;
}

function ContextBlock({ title, labelPrefix, context }: ContextBlockProps) {
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
    </div>
  );
}
