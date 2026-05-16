import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultSceneDocument, getBuildingLevelContexts } from '../../domain/scene';
import { BuildingLevelPanel } from './BuildingLevelPanel';

const scene = createDefaultSceneDocument({
  sceneId: 'scene-test',
  now: '2026-05-16T07:00:00.000Z',
});

describe('BuildingLevelPanel', () => {
  it('renders default building levels from high to low with current context', () => {
    render(<BuildingLevelPanel {...defaultProps()} levels={getBuildingLevelContexts(scene)} readOnly={false} />);

    const rows = screen.getAllByTestId('building-level-row');

    expect(screen.getByLabelText('Current building level')).toHaveTextContent('Current L0');
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.dataset.displayId)).toEqual(['L2', 'L1', 'L0']);
    expect(rows.map((row) => row.dataset.levelNumber)).toEqual(['2', '1', '0']);
    expect(rows.map((row) => row.dataset.current)).toEqual(['false', 'false', 'true']);
    expect(screen.getByDisplayValue('0 层')).toBeVisible();
    expect(screen.getByDisplayValue('1 层')).toBeVisible();
    expect(screen.getByDisplayValue('2 层')).toBeVisible();
  });

  it('exposes status and read-only layer actions with accessible names', () => {
    render(<BuildingLevelPanel {...defaultProps()} levels={getBuildingLevelContexts(scene)} readOnly />);

    const currentRow = screen.getByLabelText(
      'L0, 0 层, 0 instances, visible, unlocked, viewing layer',
    );

    expect(within(currentRow).getByText('Visible')).toBeVisible();
    expect(within(currentRow).getByText('Unlocked')).toBeVisible();
    const setButton = within(currentRow).getByRole('button', { name: /View 0 层 as viewing layer/ });
    const hideButton = within(currentRow).getByRole('button', { name: /Hide 0 层/ });
    const lockButton = within(currentRow).getByRole('button', { name: /Lock 0 层/ });

    expect(setButton).toBeDisabled();
    expect(hideButton).toBeDisabled();
    expect(lockButton).toBeDisabled();
    expect(setButton).toHaveAttribute('data-disabled-reason', 'current');
    expect(hideButton).toHaveAttribute('data-disabled-reason', 'read-only');
    expect(lockButton).toHaveAttribute('data-disabled-reason', 'read-only');
    expect(screen.getByRole('button', { name: 'New layer' })).toBeDisabled();
    expect(
      within(screen.getByLabelText('L1, 1 层, 0 instances, visible, unlocked')).getByRole('button', {
        name: /View 1 层 as viewing layer/,
      }),
    ).toBeEnabled();
  });

  it('emits building layer management actions in desktop edit mode', () => {
    const props = defaultProps();
    render(<BuildingLevelPanel {...props} levels={getBuildingLevelContexts(scene)} readOnly={false} />);

    const standbyRow = screen.getByLabelText('L1, 1 层, 0 instances, visible, unlocked');

    fireEvent.click(screen.getByRole('button', { name: 'New layer' }));
    fireEvent.click(within(standbyRow).getByRole('button', { name: /Set 1 层 as current building layer/ }));
    fireEvent.click(within(standbyRow).getByRole('button', { name: /Hide 1 层/ }));
    fireEvent.click(within(standbyRow).getByRole('button', { name: /Lock 1 层/ }));
    const nameInput = within(standbyRow).getByLabelText('Rename 1 层');
    fireEvent.change(nameInput, { target: { value: '屋顶层' } });
    fireEvent.blur(nameInput);

    expect(props.onCreateLayer).toHaveBeenCalledTimes(1);
    expect(props.onSetCurrentLayer).toHaveBeenCalledWith('level-1');
    expect(props.onSetLayerVisible).toHaveBeenCalledWith('level-1', false);
    expect(props.onSetLayerLocked).toHaveBeenCalledWith('level-1', true);
    expect(props.onRenameLayer).toHaveBeenCalledWith('level-1', '屋顶层');
  });

  it('shows hidden and locked states with multiple visible cues', () => {
    const managedScene = {
      ...scene,
      buildingLevels: scene.buildingLevels.map((level) =>
        level.id === 'level-1' ? { ...level, visible: false, locked: true } : level,
      ),
    };

    render(<BuildingLevelPanel {...defaultProps()} levels={getBuildingLevelContexts(managedScene)} readOnly={false} />);

    const lockedRow = screen.getByLabelText('L1, 1 层, 0 instances, hidden, locked');
    expect(lockedRow).toHaveClass('level-row--hidden');
    expect(lockedRow).toHaveClass('level-row--locked');
    expect(within(lockedRow).getByText('Hidden')).toBeVisible();
    expect(within(lockedRow).getByText('Locked')).toBeVisible();
  });
});

function defaultProps() {
  return {
    feedback: null,
    onCreateLayer: vi.fn(),
    onRenameLayer: vi.fn(),
    onSetCurrentLayer: vi.fn(),
    onSetLayerVisible: vi.fn(),
    onSetLayerLocked: vi.fn(),
  };
}
