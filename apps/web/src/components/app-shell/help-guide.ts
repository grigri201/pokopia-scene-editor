import type { CSSProperties } from 'react';
import type { MessageKey } from '../../i18n';

export type HelpGuideTargetKey = 'left-workbench' | 'assets-backpack' | 'canvas-editing' | 'skills-notes';

export interface HelpGuideTarget {
  key: HelpGuideTargetKey;
  selector: string;
  arrowSelector: string;
  titleKey: MessageKey;
  messageKeys: readonly MessageKey[];
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
  targets: Partial<Record<HelpGuideTargetKey, HelpGuideRect>>;
  arrowTargets: Partial<Record<HelpGuideTargetKey, HelpGuideRect>>;
}

interface HelpGuideLayout {
  noteStyle: CSSProperties;
  arrowPath: string;
}

export const helpGuideTargets: HelpGuideTarget[] = [
  {
    key: 'left-workbench',
    selector: '.workbench-left',
    arrowSelector: '.scene-controls',
    titleKey: 'helpOverlayLeftTitle',
    messageKeys: [
      'helpOverlayLeftActions',
      'helpOverlayLeftSceneSize',
      'helpOverlayLeftLayers',
    ],
  },
  {
    key: 'assets-backpack',
    selector: '.asset-sidebar',
    arrowSelector: '.asset-staging',
    titleKey: 'helpOverlayAssetsTitle',
    messageKeys: [
      'helpOverlayAssetsSelect',
      'helpOverlayAssetsBackpack',
    ],
  },
  {
    key: 'canvas-editing',
    selector: '.canvas-stage',
    arrowSelector: '.scene-canvas-viewport',
    titleKey: 'helpOverlayCanvasTitle',
    messageKeys: [
      'helpOverlayCanvasMoveZoom',
      'helpOverlayCanvasRectangle',
    ],
  },
  {
    key: 'skills-notes',
    selector: '.canvas-bottom-panels',
    arrowSelector: '.selection-inspector',
    titleKey: 'helpOverlayBottomTitle',
    messageKeys: [
      'helpOverlayBottomSkills',
      'helpOverlayBottomNotes',
    ],
  },
];

export function getHelpGuideLayouts(
  snapshot: HelpGuideSnapshot,
): Partial<Record<HelpGuideTargetKey, HelpGuideLayout>> {
  return helpGuideTargets.reduce<Partial<Record<HelpGuideTargetKey, HelpGuideLayout>>>(
    (layouts, target) => {
      const targetRect = snapshot.targets[target.key];
      if (!targetRect) {
        return layouts;
      }

      layouts[target.key] = getHelpGuideLayout(
        targetRect,
        snapshot.arrowTargets?.[target.key] ?? targetRect,
        target.key,
        snapshot,
      );
      return layouts;
    },
    {},
  );
}

function getHelpGuideLayout(
  targetRect: HelpGuideRect,
  arrowTargetRect: HelpGuideRect,
  targetKey: HelpGuideTargetKey,
  snapshot: HelpGuideSnapshot,
): HelpGuideLayout {
  const viewportWidth = snapshot.viewportWidth;
  const viewportHeight = snapshot.viewportHeight;
  const noteWidth =
    targetKey === 'left-workbench'
      ? Math.min(312, viewportWidth - 36)
      : targetKey === 'assets-backpack'
        ? Math.min(260, viewportWidth - 36)
        : Math.min(360, viewportWidth - 36);
  const noteHeight = targetKey === 'left-workbench' ? 162 : 138;
  const viewportPadding = 18;
  const targetPoint = getHelpGuideTargetPoint(arrowTargetRect, targetKey);
  let noteLeft = targetPoint.x - noteWidth / 2;
  let noteTop = targetRect.top + targetRect.height + 26;

  if (targetKey === 'left-workbench') {
    noteLeft = targetRect.left + 16;
    noteTop = targetRect.top + targetRect.height - noteHeight - 28;
  }

  if (targetKey === 'assets-backpack') {
    noteLeft = targetRect.left + Math.max(12, targetRect.width - noteWidth - 16);
    noteTop = targetRect.top + 18;
  }

  if (targetKey === 'canvas-editing') {
    noteLeft = targetRect.left + 24;
    noteTop = targetRect.top + 28;
  }

  if (targetKey === 'skills-notes') {
    noteLeft = targetRect.left + Math.min(24, targetRect.width * 0.12);
    noteTop = targetRect.top - noteHeight - 18;
  }

  noteLeft = clamp(noteLeft, viewportPadding, viewportWidth - noteWidth - viewportPadding);
  noteTop = clamp(noteTop, viewportPadding, viewportHeight - noteHeight - viewportPadding);

  const noteAnchorX = getHelpGuideNoteArrowAnchorX(targetPoint, targetKey, noteLeft, noteWidth);
  const noteAnchorY = 32;
  const anchorX = noteLeft + noteAnchorX;
  const anchorY = noteTop + noteAnchorY;
  const targetEdgePoint = getHelpGuideTargetEdgePoint(arrowTargetRect, targetPoint, {
    x: anchorX,
    y: anchorY,
  });

  return {
    noteStyle: {
      left: `${noteLeft}px`,
      top: `${noteTop}px`,
      width: `${noteWidth}px`,
    },
    arrowPath: getHelpGuideArrowPath({ x: anchorX, y: anchorY }, targetEdgePoint),
  };
}

function getHelpGuideNoteArrowAnchorX(
  targetPoint: { x: number; y: number },
  targetKey: HelpGuideTargetKey,
  noteLeft: number,
  noteWidth: number,
): number {
  if (targetPoint.x < noteLeft) {
    return 8;
  }

  if (targetPoint.x > noteLeft + noteWidth) {
    return getHelpGuideRightArrowAnchorX(targetKey, noteWidth);
  }

  return noteWidth / 2;
}

function getHelpGuideRightArrowAnchorX(targetKey: HelpGuideTargetKey, noteWidth: number): number {
  if (targetKey === 'assets-backpack') {
    return Math.min(noteWidth - 8, 292);
  }

  return noteWidth - 8;
}

function getHelpGuideArrowPath(
  startPoint: { x: number; y: number },
  endPoint: { x: number; y: number },
): string {
  const deltaX = endPoint.x - startPoint.x;
  const deltaY = endPoint.y - startPoint.y;
  const distance = Math.max(1, Math.hypot(deltaX, deltaY));
  const downwardCurveOffset = clamp(distance * 0.32, 34, 96);
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

function getHelpGuideTargetPoint(
  targetRect: HelpGuideRect,
  targetKey: HelpGuideTargetKey,
): { x: number; y: number } {
  if (targetKey === 'left-workbench') {
    return {
      x: targetRect.left + targetRect.width * 0.48,
      y: targetRect.top + Math.min(116, targetRect.height * 0.38),
    };
  }

  if (targetKey === 'assets-backpack') {
    return {
      x: targetRect.left + targetRect.width * 0.5,
      y: targetRect.top + Math.min(72, targetRect.height * 0.22),
    };
  }

  if (targetKey === 'canvas-editing') {
    return {
      x: targetRect.left + targetRect.width * 0.55,
      y: targetRect.top + targetRect.height * 0.5,
    };
  }

  if (targetKey === 'skills-notes') {
    return {
      x: targetRect.left + targetRect.width * 0.5,
      y: targetRect.top + targetRect.height * 0.4,
    };
  }

  return {
    x: targetRect.left + targetRect.width / 2,
    y: targetRect.top + targetRect.height / 2,
  };
}
