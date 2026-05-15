import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDefaultSceneDocument, getBuildingLevelContexts } from '../../domain/scene';
import { BuildingLevelPanel } from './BuildingLevelPanel';

const scene = createDefaultSceneDocument({
  sceneId: 'scene-test',
  now: '2026-05-16T07:00:00.000Z',
});

describe('BuildingLevelPanel', () => {
  it('renders default building levels from high to low with current context', () => {
    render(<BuildingLevelPanel levels={getBuildingLevelContexts(scene)} readOnly={false} />);

    const rows = screen.getAllByTestId('building-level-row');

    expect(screen.getByLabelText('Current building level')).toHaveTextContent('Current L0');
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.dataset.displayId)).toEqual(['L2', 'L1', 'L0']);
    expect(rows.map((row) => row.dataset.levelNumber)).toEqual(['2', '1', '0']);
    expect(rows.map((row) => row.dataset.current)).toEqual(['false', 'false', 'true']);
    expect(screen.getByText('0 层')).toBeVisible();
    expect(screen.getByText('1 层')).toBeVisible();
    expect(screen.getByText('2 层')).toBeVisible();
  });

  it('exposes status and reserved layer actions with accessible names', () => {
    render(<BuildingLevelPanel levels={getBuildingLevelContexts(scene)} readOnly />);

    const currentRow = screen.getByLabelText(
      'L0, 0 层, 0 instances, visible, unlocked, current editing layer',
    );

    expect(within(currentRow).getByText('Visible')).toBeVisible();
    expect(within(currentRow).getByText('Unlocked')).toBeVisible();
    const setButton = within(currentRow).getByRole('button', { name: /Set 0 层 as current building layer/ });
    const hideButton = within(currentRow).getByRole('button', { name: /Hide 0 层/ });
    const lockButton = within(currentRow).getByRole('button', { name: /Lock 0 层/ });

    expect(setButton).toBeDisabled();
    expect(hideButton).toBeDisabled();
    expect(lockButton).toBeDisabled();
    expect(setButton).toHaveAttribute('data-disabled-reason', 'read-only');
    expect(hideButton).toHaveAttribute('data-disabled-reason', 'read-only');
    expect(lockButton).toHaveAttribute('data-disabled-reason', 'read-only');
  });

  it('distinguishes reserved desktop actions from read-only disabled actions', () => {
    render(<BuildingLevelPanel levels={getBuildingLevelContexts(scene)} readOnly={false} />);

    const currentRow = screen.getByLabelText(
      'L0, 0 层, 0 instances, visible, unlocked, current editing layer',
    );

    expect(
      within(currentRow).getByRole('button', { name: /Set 0 层 as current building layer/ }),
    ).toHaveAttribute('data-disabled-reason', 'reserved');
  });
});
