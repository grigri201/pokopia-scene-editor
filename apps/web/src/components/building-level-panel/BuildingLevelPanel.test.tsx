import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createBuildingLevel, createDefaultSceneDocument, getBuildingLevelContexts } from '@pokopia-scene-editor/scene-core';
import { BuildingLevelPanel } from './BuildingLevelPanel';

const scene = createDefaultSceneDocument({
  sceneId: 'scene-test',
  now: '2026-05-16T07:00:00.000Z',
});
const multiLevelScene = {
  ...scene,
  buildingLevels: [createBuildingLevel(0), createBuildingLevel(1), createBuildingLevel(2)],
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
    expect(screen.getByLabelText('Current building level')).toHaveTextContent('Current L0');
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.dataset.displayId)).toEqual(['L2', 'L1', 'L0']);
    expect(rows.map((row) => row.dataset.current)).toEqual(['false', 'false', 'true']);
    expect(screen.getByDisplayValue('0层')).toBeVisible();
    expect(screen.getAllByLabelText(/^Rename /)).toHaveLength(3);
    expect(screen.getByLabelText('Rename 2层')).toBeEnabled();
  });

  it('keeps only copy and delete actions visible in read-only mode', () => {
    const props = defaultProps();
    render(<BuildingLevelPanel {...props} levels={getBuildingLevelContexts(multiLevelScene)} readOnly />);

    const currentRow = screen.getByLabelText('L0, 0层, 0 instances, viewing layer');
    const standbyRow = screen.getByLabelText('L1, 1层, 0 instances');

    expect(screen.getByLabelText('Building layer edit mode')).toHaveTextContent(
      'Mobile View-only Mode · Layer edits disabled',
    );
    expect(screen.getByRole('button', { name: '新建层' })).toBeDisabled();
    expect(within(currentRow).getAllByRole('button')).toHaveLength(2);
    expect(within(standbyRow).getAllByRole('button')).toHaveLength(2);
    expect(within(currentRow).queryByRole('button', { name: /View 0层/ })).not.toBeInTheDocument();
    expect(within(currentRow).queryByRole('button', { name: /Hide 0层/ })).not.toBeInTheDocument();
    expect(within(currentRow).queryByRole('button', { name: /Lock 0层/ })).not.toBeInTheDocument();
    expect(within(currentRow).getByRole('button', { name: /Copy 0层.*read-only mode/ })).toBeDisabled();
    expect(within(currentRow).getByRole('button', { name: /Delete 0层.*read-only mode/ })).toBeDisabled();
    for (const keyEvent of readOnlyApplicationKeyEvents) {
      fireEvent.keyDown(standbyRow, keyEvent);
    }
    expect(props.onSelectLayer).not.toHaveBeenCalled();
    expect(props.onCreateLayer).not.toHaveBeenCalled();
    expect(props.onCopyLayer).not.toHaveBeenCalled();
    expect(props.onDeleteLayer).not.toHaveBeenCalled();
    expect(props.onRenameLayer).not.toHaveBeenCalled();
  });

  it('emits building layer management actions in desktop edit mode', () => {
    const props = defaultProps();
    render(<BuildingLevelPanel {...props} levels={getBuildingLevelContexts(multiLevelScene)} readOnly={false} />);

    const standbyRow = screen.getByLabelText('L1, 1层, 0 instances');
    const copyButton = within(standbyRow).getByRole('button', { name: /Copy 1层 \(L1\)/ });
    const deleteButton = within(standbyRow).getByRole('button', { name: /Delete 1层 \(L1\)/ });

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
    const nameInput = within(standbyRow).getByLabelText('Rename 1层');
    fireEvent.change(nameInput, { target: { value: '屋顶层' } });
    fireEvent.blur(nameInput);

    expect(props.onCreateLayer).toHaveBeenCalledTimes(1);
    expect(props.onCopyLayer).toHaveBeenCalledWith('level-1');
    expect(props.onDeleteLayer).toHaveBeenCalledWith('level-1');
    expect(props.onRenameLayer).toHaveBeenCalledWith('level-1', '屋顶层');
    expect(props.onSelectLayer).not.toHaveBeenCalled();
  });

  it('selects a building level from the row surface without hijacking row controls', () => {
    const props = defaultProps();
    render(<BuildingLevelPanel {...props} levels={getBuildingLevelContexts(multiLevelScene)} readOnly={false} />);

    const standbyRow = screen.getByLabelText('L1, 1层, 0 instances');
    const nameInput = within(standbyRow).getByLabelText('Rename 1层');
    const copyButton = within(standbyRow).getByRole('button', { name: /Copy 1层 \(L1\)/ });
    const deleteButton = within(standbyRow).getByRole('button', { name: /Delete 1层 \(L1\)/ });

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
    const roofNameInput = screen.getByLabelText('Rename 2层');

    fireEvent.focus(roofNameInput);
    fireEvent.change(roofNameInput, { target: { value: '可编辑屋顶层' } });
    rerender(<BuildingLevelPanel {...props} levels={getBuildingLevelContexts({ ...multiLevelScene })} readOnly={false} />);

    expect(roofNameInput).toHaveValue('可编辑屋顶层');

    fireEvent.blur(roofNameInput);

    expect(props.onRenameLayer).toHaveBeenCalledWith('level-2', '可编辑屋顶层');
  });

  it('does not expose removed visible or locked layer UI state', () => {
    render(<BuildingLevelPanel {...defaultProps()} levels={getBuildingLevelContexts(multiLevelScene)} readOnly={false} />);

    const row = screen.getByLabelText('L1, 1层, 0 instances');
    expect(row).not.toHaveClass('level-row--hidden');
    expect(row).not.toHaveClass('level-row--locked');
    expect(row).not.toHaveAttribute('data-visible');
    expect(row).not.toHaveAttribute('data-locked');
    expect(within(row).queryByRole('button', { name: /Hide|Show|Lock|Unlock/ })).not.toBeInTheDocument();
    const deleteButton = within(row).getByRole('button', {
      name: /Delete 1层 \(L1\)/,
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
  };
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
