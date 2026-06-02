import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  createBuildingLevel,
  createDefaultSceneDocument,
  getBuildingLevelContexts,
  maxBuildingLevels,
} from '@pokopia-scene-editor/scene-core';
import { BuildingLevelPanel } from './BuildingLevelPanel';

const scene = createDefaultSceneDocument({
  sceneId: 'scene-test',
  now: '2026-05-16T07:00:00.000Z',
});
const multiLevelScene = {
  ...scene,
  buildingLevels: [createBuildingLevel(0), createBuildingLevel(1), createBuildingLevel(2)],
};
const sixLevelScene = {
  ...scene,
  buildingLevels: Array.from({ length: 6 }, (_, levelNumber) => createBuildingLevel(levelNumber)),
};

describe('BuildingLevelPanel', () => {
  it('renders the Open Design building levels from high to low', () => {
    render(<BuildingLevelPanel {...defaultProps()} levels={getBuildingLevelContexts(multiLevelScene)} readOnly={false} />);

    const rows = screen.getAllByTestId('building-level-row');

    expect(screen.getByRole('heading', { name: '建筑层' })).toBeVisible();
    const createLayerButton = screen.getByRole('button', { name: '新建层' });
    expect(createLayerButton).toBeEnabled();
    expect(createLayerButton).toHaveTextContent('+');
    expect(createLayerButton.querySelector('svg')).toBeNull();
    expect(createLayerButton).toHaveAttribute('data-tooltip', '新建层');
    expect(createLayerButton).not.toHaveTextContent('新建层');
    expect(screen.getByLabelText('Current building level')).toHaveTextContent('Current L1');
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.dataset.displayId)).toEqual(['L3', 'L2', 'L1']);
    expect(rows.map((row) => row.dataset.current)).toEqual(['false', 'false', 'true']);
    expect(rows.map((row) => row.getAttribute('draggable'))).toEqual(['true', 'true', 'true']);
    expect(screen.queryByRole('button', { name: /Reorder/ })).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('1层')).toBeVisible();
    expect(screen.getAllByLabelText(/^Rename /)).toHaveLength(3);
    expect(screen.getByLabelText('Rename 3层')).toBeEnabled();
  });

  it('keeps only copy and delete actions visible in read-only mode', () => {
    const props = defaultProps();
    render(<BuildingLevelPanel {...props} levels={getBuildingLevelContexts(multiLevelScene)} readOnly />);

    const currentRow = screen.getByLabelText('L1, 1层, 0 instances, viewing layer');
    const standbyRow = screen.getByLabelText('L2, 2层, 0 instances');

    expect(screen.getByLabelText('Building layer edit mode')).toHaveTextContent(
      'Mobile View-only Mode · Layer edits disabled',
    );
    expect(screen.getByRole('button', { name: '新建层' })).toBeDisabled();
    expect(currentRow).toHaveAttribute('draggable', 'false');
    expect(within(currentRow).getAllByRole('button')).toHaveLength(2);
    expect(within(standbyRow).getAllByRole('button')).toHaveLength(2);
    expect(within(currentRow).queryByRole('button', { name: /View 1层/ })).not.toBeInTheDocument();
    expect(within(currentRow).queryByRole('button', { name: /Hide 1层/ })).not.toBeInTheDocument();
    expect(within(currentRow).queryByRole('button', { name: /Lock 1层/ })).not.toBeInTheDocument();
    expect(within(currentRow).getByRole('button', { name: /Copy 1层.*read-only mode/ })).toBeDisabled();
    expect(within(currentRow).getByRole('button', { name: /Delete 1层.*read-only mode/ })).toBeDisabled();
    expect(within(currentRow).queryByRole('button', { name: /Reorder 1层/ })).not.toBeInTheDocument();
    for (const keyEvent of readOnlyApplicationKeyEvents) {
      fireEvent.keyDown(standbyRow, keyEvent);
    }
    expect(props.onSelectLayer).not.toHaveBeenCalled();
    expect(props.onCreateLayer).not.toHaveBeenCalled();
    expect(props.onCopyLayer).not.toHaveBeenCalled();
    expect(props.onDeleteLayer).not.toHaveBeenCalled();
    expect(props.onRenameLayer).not.toHaveBeenCalled();
    expect(props.onReorderLayer).not.toHaveBeenCalled();
  });

  it('disables new building layers after 30 layers', () => {
    const props = defaultProps();
    const cappedScene = {
      ...scene,
      buildingLevels: Array.from({ length: maxBuildingLevels }, (_, levelNumber) => createBuildingLevel(levelNumber)),
    };

    render(<BuildingLevelPanel {...props} levels={getBuildingLevelContexts(cappedScene)} readOnly={false} />);

    const createLayerButton = screen.getByRole('button', { name: '新建层' });
    const rows = screen.getAllByTestId('building-level-row');
    const topCopyButton = within(rows[0]).getByRole('button', { name: /Copy 30层 \(L30\)/ });
    expect(rows).toHaveLength(maxBuildingLevels);
    expect(createLayerButton).toBeDisabled();
    expect(createLayerButton).toHaveAttribute('data-disabled-reason', 'max-layers');
    expect(createLayerButton).toHaveAttribute('data-tooltip', '最多 30 个建筑层');
    expect(topCopyButton).toBeDisabled();
    expect(topCopyButton).toHaveAttribute('data-disabled-reason', 'max-layers');
    expect(topCopyButton).toHaveAttribute('data-tooltip', '最多 30 个建筑层');

    fireEvent.click(createLayerButton);
    fireEvent.click(topCopyButton);

    expect(props.onCreateLayer).not.toHaveBeenCalled();
    expect(props.onCopyLayer).not.toHaveBeenCalled();
  });

  it('emits building layer management actions in desktop edit mode', () => {
    const props = defaultProps();
    render(<BuildingLevelPanel {...props} levels={getBuildingLevelContexts(multiLevelScene)} readOnly={false} />);

    const standbyRow = screen.getByLabelText('L2, 2层, 0 instances');
    const copyButton = within(standbyRow).getByRole('button', { name: /Copy 2层 \(L2\)/ });
    const deleteButton = within(standbyRow).getByRole('button', { name: /Delete 2层 \(L2\)/ });

    fireEvent.click(screen.getByRole('button', { name: '新建层' }));
    expect(within(standbyRow).getAllByRole('button')).toHaveLength(2);
    expect(copyButton.querySelector('svg')).not.toBeNull();
    expect(copyButton).toHaveAttribute('data-tooltip', '复制建筑层');
    expect(copyButton).not.toHaveTextContent('C');
    expect(deleteButton.querySelector('svg')).not.toBeNull();
    expect(deleteButton).toHaveAttribute('data-tooltip', '删除建筑层');
    expect(deleteButton).not.toHaveTextContent('D');
    fireEvent.click(copyButton);
    fireEvent.click(deleteButton);
    const nameInput = within(standbyRow).getByLabelText('Rename 2层');
    fireEvent.change(nameInput, { target: { value: '屋顶层' } });
    fireEvent.blur(nameInput);

    expect(props.onCreateLayer).toHaveBeenCalledTimes(1);
    expect(props.onCopyLayer).toHaveBeenCalledWith('level-1');
    expect(props.onDeleteLayer).toHaveBeenCalledWith('level-1');
    expect(props.onRenameLayer).toHaveBeenCalledWith('level-1', '屋顶层');
    expect(props.onSelectLayer).not.toHaveBeenCalled();
  });

  it('previews drag reorder locally and commits the display order only on drop', () => {
    const props = defaultProps();
    render(<BuildingLevelPanel {...props} levels={getBuildingLevelContexts(multiLevelScene)} readOnly={false} />);

    mockRowRects();
    const sourceRow = screen.getByLabelText('L1, 1层, 0 instances, current editing layer');
    fireEvent.dragStart(sourceRow, { dataTransfer: createDataTransfer() });
    fireDragOver(screen.getByRole('list', { name: 'Building levels high to low' }), 1);

    expect(screen.getAllByTestId('building-level-row').map((row) => row.dataset.displayId)).toEqual(['L1', 'L3', 'L2']);
    expect(props.onReorderLayer).not.toHaveBeenCalled();

    fireDrop(screen.getByRole('list', { name: 'Building levels high to low' }), 1);

    expect(props.onReorderLayer).toHaveBeenCalledWith(['level-0', 'level-2', 'level-1']);
  });

  it('commits drop order from the drop target without relying on preview state', () => {
    const props = defaultProps();
    render(<BuildingLevelPanel {...props} levels={getBuildingLevelContexts(multiLevelScene)} readOnly={false} />);

    mockRowRects();
    fireEvent.dragStart(screen.getByLabelText('L1, 1层, 0 instances, current editing layer'), {
      dataTransfer: createDataTransfer(),
    });
    fireDrop(screen.getByRole('list', { name: 'Building levels high to low' }), 1);

    expect(props.onReorderLayer).toHaveBeenCalledWith(['level-0', 'level-2', 'level-1']);
  });

  it('commits a layer dropped between two rows', () => {
    const props = defaultProps();
    render(<BuildingLevelPanel {...props} levels={getBuildingLevelContexts(sixLevelScene)} readOnly={false} />);

    mockRowRects();
    fireEvent.dragStart(screen.getByLabelText('L6, 6层, 0 instances'), {
      dataTransfer: createDataTransfer(),
    });
    fireDragOver(screen.getByRole('list', { name: 'Building levels high to low' }), 205);

    expect(screen.getAllByTestId('building-level-row').map((row) => row.dataset.displayId)).toEqual([
      'L5',
      'L4',
      'L6',
      'L3',
      'L2',
      'L1',
    ]);

    mockRowRects();
    fireDrop(screen.getByRole('list', { name: 'Building levels high to low' }), 205);

    expect(props.onReorderLayer).toHaveBeenCalledWith([
      'level-4',
      'level-3',
      'level-5',
      'level-2',
      'level-1',
      'level-0',
    ]);
  });

  it('commits window drops beyond the list edges to the top or bottom position', () => {
    const props = defaultProps();
    render(<BuildingLevelPanel {...props} levels={getBuildingLevelContexts(multiLevelScene)} readOnly={false} />);

    mockRowRects();
    fireEvent.dragStart(screen.getByLabelText('L1, 1层, 0 instances, current editing layer'), {
      dataTransfer: createDataTransfer(),
    });
    fireWindowDragOver(-40);

    expect(screen.getAllByTestId('building-level-row').map((row) => row.dataset.displayId)).toEqual(['L1', 'L3', 'L2']);

    fireWindowDrop(-40);

    expect(props.onReorderLayer).toHaveBeenCalledWith(['level-0', 'level-2', 'level-1']);

    props.onReorderLayer.mockClear();
    mockRowRects();
    fireEvent.dragStart(screen.getByLabelText('L3, 3层, 0 instances'), {
      dataTransfer: createDataTransfer(),
    });
    fireWindowDragOver(1000);

    expect(screen.getAllByTestId('building-level-row').map((row) => row.dataset.displayId)).toEqual(['L2', 'L1', 'L3']);

    fireWindowDrop(1000);

    expect(props.onReorderLayer).toHaveBeenCalledWith(['level-1', 'level-0', 'level-2']);
  });

  it('allows dragging the row surface while preserving interactive row controls', () => {
    const props = defaultProps();
    render(<BuildingLevelPanel {...props} levels={getBuildingLevelContexts(multiLevelScene)} readOnly={false} />);

    mockRowRects();
    fireEvent.dragStart(screen.getByLabelText('L1, 1层, 0 instances, current editing layer'), {
      dataTransfer: createDataTransfer(),
    });
    fireDrop(screen.getByRole('list', { name: 'Building levels high to low' }), 1);

    expect(props.onReorderLayer).toHaveBeenCalledWith(['level-0', 'level-2', 'level-1']);

    props.onReorderLayer.mockClear();
    fireEvent.dragStart(screen.getByLabelText('Rename 1层'), {
      dataTransfer: createDataTransfer(),
    });
    fireDrop(screen.getByRole('list', { name: 'Building levels high to low' }), 1);

    expect(props.onReorderLayer).not.toHaveBeenCalled();
  });

  it('selects a building level from the row surface without hijacking row controls', () => {
    const props = defaultProps();
    render(<BuildingLevelPanel {...props} levels={getBuildingLevelContexts(multiLevelScene)} readOnly={false} />);

    const standbyRow = screen.getByLabelText('L2, 2层, 0 instances');
    const nameInput = within(standbyRow).getByLabelText('Rename 2层');
    const copyButton = within(standbyRow).getByRole('button', { name: /Copy 2层 \(L2\)/ });
    const deleteButton = within(standbyRow).getByRole('button', { name: /Delete 2层 \(L2\)/ });

    expect(standbyRow).toHaveAttribute('tabindex', '0');

    fireEvent.click(standbyRow);
    fireEvent.keyDown(standbyRow, { key: 'Enter' });
    fireEvent.keyDown(standbyRow, { key: ' ' });

    expect(props.onSelectLayer).toHaveBeenCalledTimes(3);
    expect(props.onSelectLayer).toHaveBeenNthCalledWith(1, 'level-1');
    expect(props.onSelectLayer).toHaveBeenNthCalledWith(2, 'level-1');
    expect(props.onSelectLayer).toHaveBeenNthCalledWith(3, 'level-1');

    props.onSelectLayer.mockClear();
    fireEvent.click(nameInput);
    fireEvent.click(copyButton);
    fireEvent.click(deleteButton);

    expect(props.onSelectLayer).not.toHaveBeenCalled();
  });

  it('keeps an in-progress layer name draft editable across parent rerenders', () => {
    const props = defaultProps();
    const { rerender } = render(
      <BuildingLevelPanel {...props} levels={getBuildingLevelContexts(multiLevelScene)} readOnly={false} />,
    );
    const roofNameInput = screen.getByLabelText('Rename 3层');

    fireEvent.focus(roofNameInput);
    fireEvent.change(roofNameInput, { target: { value: '可编辑屋顶层' } });
    rerender(<BuildingLevelPanel {...props} levels={getBuildingLevelContexts({ ...multiLevelScene })} readOnly={false} />);

    expect(roofNameInput).toHaveValue('可编辑屋顶层');

    fireEvent.blur(roofNameInput);

    expect(props.onRenameLayer).toHaveBeenCalledWith('level-2', '可编辑屋顶层');
  });

  it('does not expose removed visible or locked layer UI state', () => {
    render(<BuildingLevelPanel {...defaultProps()} levels={getBuildingLevelContexts(multiLevelScene)} readOnly={false} />);

    const row = screen.getByLabelText('L2, 2层, 0 instances');
    expect(row).not.toHaveClass('level-row--hidden');
    expect(row).not.toHaveClass('level-row--locked');
    expect(row).not.toHaveAttribute('data-visible');
    expect(row).not.toHaveAttribute('data-locked');
    expect(within(row).queryByRole('button', { name: /Hide|Show|Lock|Unlock/ })).not.toBeInTheDocument();
    const deleteButton = within(row).getByRole('button', {
      name: /Delete 2层 \(L2\)/,
    });
    expect(deleteButton).toBeEnabled();
    expect(deleteButton).toHaveAttribute('data-disabled-reason', 'available');
  });
});

function defaultProps() {
  return {
    onCreateLayer: vi.fn(),
    onSelectLayer: vi.fn(),
    onRenameLayer: vi.fn(),
    onCopyLayer: vi.fn(),
    onDeleteLayer: vi.fn(),
    onReorderLayer: vi.fn(),
  };
}

function createDataTransfer() {
  return {
    dropEffect: 'move',
    effectAllowed: 'move',
    setData: vi.fn(),
    getData: vi.fn(),
  };
}

function fireDragOver(element: HTMLElement, clientY: number) {
  fireDragEvent(element, 'dragover', clientY);
}

function fireDrop(element: HTMLElement, clientY: number) {
  fireDragEvent(element, 'drop', clientY);
}

function fireWindowDragOver(clientY: number) {
  fireDragEvent(window, 'dragover', clientY);
}

function fireWindowDrop(clientY: number) {
  fireDragEvent(window, 'drop', clientY);
}

function fireDragEvent(target: HTMLElement | Window, eventType: 'dragover' | 'drop', clientY: number) {
  const event = new Event(eventType, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clientY', { value: clientY });
  Object.defineProperty(event, 'dataTransfer', { value: createDataTransfer() });
  fireEvent(target, event);
}

function mockRowRects() {
  screen.getAllByTestId('building-level-row').forEach((row, index) => {
    row.getBoundingClientRect = vi.fn(() => ({
      bottom: index * 70 + 60,
      height: 60,
      left: 0,
      right: 320,
      top: index * 70,
      width: 320,
      x: 0,
      y: index * 70,
      toJSON: () => ({}),
    }));
  });
}

const readOnlyApplicationKeyEvents = [
  { key: 'Enter' },
  { key: ' ' },
  { key: 'Escape' },
  { key: 'Delete' },
  { key: 'Backspace' },
  { key: 's', metaKey: true },
  { key: 's', ctrlKey: true },
] as const;
