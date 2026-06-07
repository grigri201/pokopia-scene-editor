import type { CSSProperties } from 'react';
import type { MessageKey } from '../../i18n';

export type HelpGuideStepKey = 'left-workbench' | 'assets-backpack' | 'canvas-editing' | 'skills-notes';

export type HelpGuideCalloutKey =
  | 'header-download'
  | 'header-file-actions'
  | 'scene-size'
  | 'building-layer-create'
  | 'building-layer-select-sort'
  | 'asset-select'
  | 'asset-filter'
  | 'asset-backpack'
  | 'canvas-pan-zoom'
  | 'canvas-rectangle'
  | 'bottom-skills'
  | 'bottom-notes';

type HelpGuideCalloutPlacement = 'above' | 'below' | 'left' | 'right' | 'inside-top' | 'inside-bottom';

export interface HelpGuideCallout {
  key: HelpGuideCalloutKey;
  selector: string;
  arrowSelector?: string;
  messageKey: MessageKey;
  placement: HelpGuideCalloutPlacement;
  noteWidth?: number;
  noteHeight?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface HelpGuideStep {
  key: HelpGuideStepKey;
  callouts: readonly HelpGuideCallout[];
}

export interface HelpGuideRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface HelpGuideSnapshot {
  viewportWidth: number;
  viewportHeight: number;
  targets: Partial<Record<HelpGuideCalloutKey, HelpGuideRect>>;
  arrowTargets: Partial<Record<HelpGuideCalloutKey, HelpGuideRect>>;
}

interface HelpGuideLayout {
  noteStyle: CSSProperties;
  arrowPath: string;
}

export const helpGuideSteps: HelpGuideStep[] = [
  {
    key: 'left-workbench',
    callouts: [
      {
        key: 'header-download',
        selector: '.app-header__actions .app-header-icon-button:not(.file-actions-menu__trigger)',
        messageKey: 'helpOverlayHeaderDownload',
        placement: 'below',
        noteWidth: 238,
        offsetX: -166,
        offsetY: 10,
      },
      {
        key: 'header-file-actions',
        selector: '.file-actions-menu__trigger',
        messageKey: 'helpOverlayHeaderFileActions',
        placement: 'below',
        noteWidth: 250,
        offsetX: 84,
        offsetY: 10,
      },
      {
        key: 'scene-size',
        selector: '.scene-size-control',
        messageKey: 'helpOverlayLeftSceneSize',
        placement: 'right',
        noteWidth: 230,
        offsetX: 16,
      },
      {
        key: 'building-layer-create',
        selector: '.level-create-button',
        messageKey: 'helpOverlayLeftLayerCreate',
        placement: 'right',
        noteWidth: 146,
        offsetX: 16,
        offsetY: -6,
      },
      {
        key: 'building-layer-select-sort',
        selector: '.level-list',
        arrowSelector: '.level-row--current',
        messageKey: 'helpOverlayLeftLayerSelectSort',
        placement: 'right',
        noteWidth: 226,
        offsetX: 16,
        offsetY: 46,
      },
    ],
  },
  {
    key: 'assets-backpack',
    callouts: [
      {
        key: 'asset-backpack',
        selector: '.asset-staging',
        messageKey: 'helpOverlayAssetsBackpack',
        placement: 'left',
        noteWidth: 270,
        offsetX: -12,
      },
      {
        key: 'asset-filter',
        selector: '.asset-filter-row',
        arrowSelector: '.asset-category-select',
        messageKey: 'helpOverlayAssetsFilter',
        placement: 'left',
        noteWidth: 252,
        offsetX: -12,
        offsetY: 18,
      },
      {
        key: 'asset-select',
        selector: '.asset-picker .asset-row:first-of-type .asset-select-button',
        messageKey: 'helpOverlayAssetsSelect',
        placement: 'left',
        noteWidth: 282,
        offsetX: -12,
        offsetY: 38,
      },
    ],
  },
  {
    key: 'canvas-editing',
    callouts: [
      {
        key: 'canvas-pan-zoom',
        selector: '.scene-canvas-viewport',
        messageKey: 'helpOverlayCanvasMoveZoom',
        placement: 'inside-top',
        noteWidth: 300,
        offsetX: 18,
        offsetY: 16,
      },
      {
        key: 'canvas-rectangle',
        selector: '.scene-canvas',
        arrowSelector: '.scene-cell[data-coordinate="3,3"]',
        messageKey: 'helpOverlayCanvasRectangle',
        placement: 'inside-bottom',
        noteWidth: 326,
        offsetX: 18,
        offsetY: -16,
      },
    ],
  },
  {
    key: 'skills-notes',
    callouts: [
      {
        key: 'bottom-skills',
        selector: '.current-selection-bar',
        arrowSelector: '.current-selection-bar__actions',
        messageKey: 'helpOverlayBottomSkills',
        placement: 'above',
        noteWidth: 300,
        offsetX: -24,
        offsetY: -14,
      },
      {
        key: 'bottom-notes',
        selector: '.layer-note-form',
        messageKey: 'helpOverlayBottomNotes',
        placement: 'above',
        noteWidth: 286,
        offsetX: 52,
        offsetY: -14,
      },
    ],
  },
];

export const helpGuideCallouts = helpGuideSteps.flatMap((step) => step.callouts);

export function getHelpGuideLayouts(
  snapshot: HelpGuideSnapshot,
): Partial<Record<HelpGuideCalloutKey, HelpGuideLayout>> {
  return helpGuideCallouts.reduce<Partial<Record<HelpGuideCalloutKey, HelpGuideLayout>>>(
    (layouts, callout) => {
      const targetRect = snapshot.targets[callout.key];
      if (!targetRect) {
        return layouts;
      }

      layouts[callout.key] = getHelpGuideLayout(
        callout,
        targetRect,
        snapshot.arrowTargets?.[callout.key] ?? targetRect,
        snapshot,
      );
      return layouts;
    },
    {},
  );
}

function getHelpGuideLayout(
  callout: HelpGuideCallout,
  targetRect: HelpGuideRect,
  arrowTargetRect: HelpGuideRect,
  snapshot: HelpGuideSnapshot,
): HelpGuideLayout {
  const noteWidth = Math.min(callout.noteWidth ?? 260, snapshot.viewportWidth - 36);
  const noteHeight = callout.noteHeight ?? 74;
  const viewportPadding = 18;
  const targetPoint = getHelpGuideTargetPoint(arrowTargetRect);
  let noteLeft = targetPoint.x - noteWidth / 2;
  let noteTop = targetPoint.y - noteHeight / 2;

  if (callout.placement === 'above') {
    noteTop = targetRect.top - noteHeight - 18;
  }

  if (callout.placement === 'below') {
    noteTop = targetRect.top + targetRect.height + 18;
  }

  if (callout.placement === 'left') {
    noteLeft = targetRect.left - noteWidth - 18;
  }

  if (callout.placement === 'right') {
    noteLeft = targetRect.left + targetRect.width + 18;
  }

  if (callout.placement === 'inside-top') {
    noteLeft = targetRect.left + 18;
    noteTop = targetRect.top + 18;
  }

  if (callout.placement === 'inside-bottom') {
    noteLeft = targetRect.left + 18;
    noteTop = targetRect.top + targetRect.height - noteHeight - 18;
  }

  noteLeft += callout.offsetX ?? 0;
  noteTop += callout.offsetY ?? 0;
  noteLeft = clamp(noteLeft, viewportPadding, snapshot.viewportWidth - noteWidth - viewportPadding);
  noteTop = clamp(noteTop, viewportPadding, snapshot.viewportHeight - noteHeight - viewportPadding);

  const noteAnchor = getHelpGuideNoteAnchor(targetPoint, noteLeft, noteTop, noteWidth, noteHeight);
  const targetEdgePoint = getHelpGuideTargetEdgePoint(arrowTargetRect, targetPoint, noteAnchor);

  return {
    noteStyle: {
      left: `${noteLeft}px`,
      top: `${noteTop}px`,
      width: `${noteWidth}px`,
    },
    arrowPath: getHelpGuideArrowPath(noteAnchor, targetEdgePoint),
  };
}

function getHelpGuideNoteAnchor(
  targetPoint: { x: number; y: number },
  noteLeft: number,
  noteTop: number,
  noteWidth: number,
  noteHeight: number,
): { x: number; y: number } {
  return {
    x: clamp(targetPoint.x, noteLeft + 8, noteLeft + noteWidth - 8),
    y: clamp(targetPoint.y, noteTop + 8, noteTop + noteHeight - 8),
  };
}

function getHelpGuideArrowPath(
  startPoint: { x: number; y: number },
  endPoint: { x: number; y: number },
): string {
  const deltaX = endPoint.x - startPoint.x;
  const deltaY = endPoint.y - startPoint.y;
  const distance = Math.max(1, Math.hypot(deltaX, deltaY));
  const downwardCurveOffset = clamp(distance * 0.24, 20, 76);
  const controlPoint = {
    x: startPoint.x + deltaX * 0.5,
    y: Math.max(startPoint.y, endPoint.y) + downwardCurveOffset,
  };

  return `M ${formatSvgNumber(startPoint.x)} ${formatSvgNumber(startPoint.y)} Q ${formatSvgNumber(controlPoint.x)} ${formatSvgNumber(controlPoint.y)} ${formatSvgNumber(endPoint.x)} ${formatSvgNumber(endPoint.y)}`;
}

function getHelpGuideTargetEdgePoint(
  targetRect: HelpGuideRect,
  targetPoint: { x: number; y: number },
  fromPoint: { x: number; y: number },
): { x: number; y: number } {
  const deltaX = fromPoint.x - targetPoint.x;
  const deltaY = fromPoint.y - targetPoint.y;
  const candidates: Array<{ x: number; y: number; distance: number }> = [];
  const right = targetRect.left + targetRect.width;
  const bottom = targetRect.top + targetRect.height;

  if (deltaX !== 0) {
    const edgeX = deltaX > 0 ? right : targetRect.left;
    const distance = (edgeX - targetPoint.x) / deltaX;
    const y = targetPoint.y + deltaY * distance;
    if (distance > 0 && y >= targetRect.top && y <= bottom) {
      candidates.push({ x: edgeX, y, distance });
    }
  }

  if (deltaY !== 0) {
    const edgeY = deltaY > 0 ? bottom : targetRect.top;
    const distance = (edgeY - targetPoint.y) / deltaY;
    const x = targetPoint.x + deltaX * distance;
    if (distance > 0 && x >= targetRect.left && x <= right) {
      candidates.push({ x, y: edgeY, distance });
    }
  }

  const nearestEdgePoint = candidates.sort((first, second) => first.distance - second.distance)[0];
  if (!nearestEdgePoint) {
    return targetPoint;
  }

  return {
    x: nearestEdgePoint.x,
    y: nearestEdgePoint.y,
  };
}

function formatSvgNumber(value: number): string {
  return value.toFixed(1);
}

export function getPaddedHelpGuideRect(targetRect: HelpGuideRect, snapshot: HelpGuideSnapshot): HelpGuideRect {
  const left = Math.max(8, targetRect.left - 8);
  const top = Math.max(8, targetRect.top - 8);

  return {
    left,
    top,
    width: Math.min(targetRect.width + 16, snapshot.viewportWidth - left - 8),
    height: Math.min(targetRect.height + 16, snapshot.viewportHeight - top - 8),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getHelpGuideTargetPoint(targetRect: HelpGuideRect): { x: number; y: number } {
  return {
    x: targetRect.left + targetRect.width / 2,
    y: targetRect.top + targetRect.height / 2,
  };
}
