import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SceneCanvas } from './SceneCanvas';

describe('SceneCanvas', () => {
  it('renders 49 addressable 0-based canvas cells', () => {
    render(<SceneCanvas readOnly={false} />);

    const cells = screen.getAllByRole('gridcell');

    expect(cells).toHaveLength(49);
    expect(screen.getByLabelText('Cell 0,0, outer area, layer 0, placeable')).toBeVisible();
    expect(screen.getByLabelText('Cell 6,6, outer area, layer 0, placeable')).toBeVisible();
    expect(screen.getByLabelText('Cell 1,1, main area, layer 0, placeable')).toBeVisible();
    expect(screen.getByLabelText('Cell 5,5, main area, layer 0, placeable')).toBeVisible();
  });

  it('marks main, outer, main-boundary, and placeable states for tests and styling', () => {
    render(<SceneCanvas readOnly={false} />);

    const cells = screen.getAllByTestId('scene-cell');

    expect(cells.filter((cell) => cell.dataset.area === 'main')).toHaveLength(25);
    expect(cells.filter((cell) => cell.dataset.area === 'outer')).toHaveLength(24);
    expect(cells.filter((cell) => cell.dataset.mainBoundary === 'true')).toHaveLength(16);
    expect(cells.every((cell) => cell.dataset.placeable === 'true')).toBe(true);
    expect(cells.every((cell) => cell.dataset.editable === 'true')).toBe(true);

    const coordinates = cells.map((cell) => cell.dataset.coordinate);
    const expectedCoordinates = Array.from({ length: 49 }, (_, index) => {
      const x = index % 7;
      const y = Math.floor(index / 7);
      return `${x},${y}`;
    });

    expect(new Set(coordinates).size).toBe(49);
    expect(coordinates).toEqual(expectedCoordinates);
  });

  it('separates domain placeability from current read-only editability', () => {
    render(<SceneCanvas readOnly />);

    const cells = screen.getAllByTestId('scene-cell');

    expect(screen.getByLabelText('Cell 0,0, outer area, layer 0, read-only')).toBeVisible();
    expect(cells.every((cell) => cell.dataset.placeable === 'true')).toBe(true);
    expect(cells.every((cell) => cell.dataset.editable === 'false')).toBe(true);
  });
});
