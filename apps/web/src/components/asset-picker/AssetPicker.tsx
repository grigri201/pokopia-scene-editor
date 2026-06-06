import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import {
  assetCatalog,
  assetCategories,
  filterAssetCatalog,
  getAssetById,
  type AssetCategoryFilter,
  type AssetDefinition,
  type AssetFilterState,
  type PokemonKey,
  type RotationDegrees,
} from '@pokopia-scene-editor/scene-core';
import {
  defaultLocale,
  getAssetCategoryLabel,
  getAssetDisplay,
  t,
  type Locale,
} from '../../i18n';
import {
  getUiPreferencesStorage,
  readAssetStagingPreferencesFromStorage,
  readUiPreferencesFromStorage,
  writeAssetStagingPreferencesToStorage,
  writeAssetFilterPreferencesToStorage,
} from '../../io';

const assetDragDataType = 'application/x-pokopia-asset-id';

interface AssetPickerProps {
  locale?: Locale;
  readOnly: boolean;
  selectedAssetId: string | null;
  selectedAssetMode?: AssetSelectionMode;
  selectedPokemonKey: PokemonKey;
  currentBuildingLevelName: string;
  placementRequiresSkill: boolean;
  placementRotationDegrees?: RotationDegrees;
  onPlacementRequiresSkillChange: (requiresSkill: boolean) => void;
  onPlacementRotationChange?: (assetId: string) => void;
  onAssetSelect: (assetId: string, placementMode: AssetSelectionMode) => void;
}

export type AssetSelectionMode = 'single' | 'continuous';

export function AssetPicker({
  locale = defaultLocale,
  readOnly,
  selectedAssetId,
  selectedAssetMode = 'single',
  selectedPokemonKey,
  placementRequiresSkill,
  placementRotationDegrees = 0,
  onPlacementRequiresSkillChange,
  onPlacementRotationChange,
  onAssetSelect,
}: AssetPickerProps) {
  const assetPickerId = useId();
  const [filters, setFilters] = useState<AssetFilterState>(
    () =>
      readUiPreferencesFromStorage(getUiPreferencesStorage(), {
        persistNormalized: !readOnly,
      }).assetFilters,
  );
  const [assetStaging, setAssetStaging] = useState(() =>
    readAssetStagingPreferencesFromStorage(getUiPreferencesStorage(), {
      persistNormalized: !readOnly,
    }),
  );
  const draggedCatalogAssetIdRef = useRef<string | null>(null);
  const assetDragPreviewRef = useRef<HTMLElement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const selectedAsset = getAssetById(selectedAssetId);
  const stagedAssets = useMemo(
    () => assetStaging.stagedAssetIds
      .map((assetId) => getAssetById(assetId))
      .filter((asset): asset is AssetDefinition => asset !== null),
    [assetStaging.stagedAssetIds],
  );
  const hasStagedAssets = stagedAssets.length > 0;
  const stagingExpanded = assetStaging.expanded && hasStagedAssets;
  const filterResult = useMemo(
    () => filterAssetCatalog(assetCatalog, filters, selectedPokemonKey, currentPage),
    [filters, currentPage, selectedPokemonKey],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, selectedPokemonKey]);

  const handleAssetKeyDown = (event: KeyboardEvent<HTMLButtonElement>, assetId: string) => {
    if (readOnly && isAssetApplicationKey(event)) {
      event.preventDefault();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusSiblingAsset(event.currentTarget, event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleAssetActivation(assetId, 'single');
    }
  };

  const handleAssetClick = (event: MouseEvent<HTMLButtonElement>, assetId: string) => {
    if (event.detail > 1) {
      return;
    }

    handleAssetActivation(assetId, 'single');
  };

  const handleAssetActivation = (assetId: string, placementMode: AssetSelectionMode) => {
    if (readOnly) {
      return;
    }

    onAssetSelect(assetId, placementMode);
  };

  const updateFilters = (nextFilters: Partial<AssetFilterState>) => {
    if (readOnly) {
      return;
    }

    setFilters((currentFilters) => {
      const updatedFilters = { ...currentFilters, ...nextFilters };
      writeAssetFilterPreferencesToStorage(getUiPreferencesStorage(), updatedFilters);

      return updatedFilters;
    });
  };

  const goToAssetPage = (page: number) => {
    if (readOnly) {
      return;
    }

    setCurrentPage(page);
  };

  const updateAssetStaging = (
    updater: (currentStaging: typeof assetStaging) => Pick<typeof assetStaging, 'stagedAssetIds' | 'expanded'>,
  ) => {
    if (readOnly) {
      return;
    }

    setAssetStaging((currentStaging) =>
      writeAssetStagingPreferencesToStorage(getUiPreferencesStorage(), updater(currentStaging)),
    );
  };

  const stageAsset = (assetId: string) => {
    if (!getAssetById(assetId)) {
      return;
    }

    updateAssetStaging((currentStaging) => ({
      ...currentStaging,
      stagedAssetIds: [
        assetId,
        ...currentStaging.stagedAssetIds.filter((stagedAssetId) => stagedAssetId !== assetId),
      ],
    }));
  };

  const removeStagedAsset = (assetId: string) => {
    updateAssetStaging((currentStaging) => ({
      ...currentStaging,
      stagedAssetIds: currentStaging.stagedAssetIds.filter((stagedAssetId) => stagedAssetId !== assetId),
    }));
  };

  const setAssetStagingExpanded = (expanded: boolean) => {
    updateAssetStaging((currentStaging) => ({
      ...currentStaging,
      expanded,
    }));
  };

  const clearAssetDragPreview = () => {
    assetDragPreviewRef.current?.remove();
    assetDragPreviewRef.current = null;
  };

  const handleAssetDragStart = (event: DragEvent<HTMLElement>, asset: AssetDefinition) => {
    if (readOnly) {
      event.preventDefault();
      return;
    }

    draggedCatalogAssetIdRef.current = asset.assetId;
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(assetDragDataType, asset.assetId);
    event.dataTransfer.setData('text/plain', asset.assetId);

    const assetDisplay = getAssetDisplay(asset, locale);
    const dragPreview = createAssetDragPreviewElement(asset, assetDisplay.name);
    clearAssetDragPreview();
    assetDragPreviewRef.current = dragPreview;
    document.body.append(dragPreview);
    event.dataTransfer.setDragImage(dragPreview, dragPreview.offsetWidth / 2, dragPreview.offsetHeight / 2);
    window.setTimeout(() => {
      if (assetDragPreviewRef.current === dragPreview) {
        clearAssetDragPreview();
      }
    }, 0);
  };

  const handleAssetDragEnd = () => {
    draggedCatalogAssetIdRef.current = null;
    clearAssetDragPreview();
  };

  const handleAssetStagingDragOver = (event: DragEvent<HTMLElement>) => {
    if (readOnly || !canAcceptAssetDrag(event)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleAssetStagingDrop = (event: DragEvent<HTMLElement>) => {
    if (readOnly || !canAcceptAssetDrag(event)) {
      return;
    }

    event.preventDefault();
    const assetId = event.dataTransfer.getData(assetDragDataType) || draggedCatalogAssetIdRef.current;
    draggedCatalogAssetIdRef.current = null;
    if (assetId) {
      stageAsset(assetId);
    }
  };

  const canAcceptAssetDrag = (event: DragEvent<HTMLElement>): boolean => (
    draggedCatalogAssetIdRef.current !== null ||
    Array.from(event.dataTransfer.types).includes(assetDragDataType)
  );

  const renderAssetRow = (asset: AssetDefinition, source: 'catalog' | 'staging') => {
    const selected = asset.assetId === selectedAssetId;
    const selectedContinuously = selected && selectedAssetMode === 'continuous';
    const ids = getAssetRowIds(`${assetPickerId}-${source}`, asset.assetId);
    const assetDisplay = getAssetDisplay(asset, locale);
    const rotatable = isRotatableBeforePlacement(asset);
    const tagLabels = getAssetTagLabels(assetDisplay.categoryLabel, assetDisplay.tags);

    return (
      <article
        className={[
          'asset-row',
          selected ? 'asset-row--selected' : '',
          selectedContinuously ? 'asset-row--continuous' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-asset-id={asset.assetId}
        data-asset-source={source}
        data-selected={selected}
        data-selection-mode={selected ? selectedAssetMode : 'none'}
        data-placement-rotation={selected ? placementRotationDegrees : 0}
        draggable={source === 'catalog' && !readOnly}
        onDragStart={
          source === 'catalog'
            ? (event) => handleAssetDragStart(event, asset)
            : undefined
        }
        onDragEnd={source === 'catalog' ? handleAssetDragEnd : undefined}
        key={`${source}-${asset.assetId}`}
      >
        <button
          type="button"
          className="asset-select-button"
          aria-pressed={selected}
          aria-labelledby={`${ids.name} ${ids.tags}`}
          disabled={source === 'staging' && readOnly}
          onClick={(event) => handleAssetClick(event, asset.assetId)}
          onDoubleClick={() => handleAssetActivation(asset.assetId, 'continuous')}
          onKeyDown={(event) => handleAssetKeyDown(event, asset.assetId)}
        >
          <img src={asset.thumbnailUrl} alt="" className="asset-thumb" />
          <span className="asset-row__body">
            <strong id={ids.name}>{assetDisplay.name}</strong>
            <span className="asset-tags" id={ids.tags} aria-label={t(locale, 'tags')}>
              {tagLabels.map((tag) => <span key={tag}>{tag}</span>)}
            </span>
          </span>
        </button>
        <span className="asset-row__actions">
          {rotatable ? (
            <button
              type="button"
              className="asset-rotate-button has-icon-tooltip"
              aria-label={t(locale, 'rotatePlacementAsset', { name: assetDisplay.name })}
              aria-pressed={selected && placementRotationDegrees !== 0}
              data-rotation={selected ? placementRotationDegrees : 0}
              data-tooltip={t(locale, 'rotate90')}
              title={t(locale, 'rotatePlacementAsset', { name: assetDisplay.name })}
              disabled={readOnly}
              onClick={() => onPlacementRotationChange?.(asset.assetId)}
            >
              <RotateAssetIcon />
            </button>
          ) : null}
          {source === 'staging' ? (
            <button
              type="button"
              className="asset-staging-row__remove"
              aria-label={t(locale, 'removeStagedAsset', { name: assetDisplay.name })}
              disabled={readOnly}
              onClick={() => removeStagedAsset(asset.assetId)}
            >
              x
            </button>
          ) : null}
        </span>
      </article>
    );
  };

  return (
    <div
      className={[
        'asset-sidebar',
        stagingExpanded ? 'asset-sidebar--staging-expanded' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <section
        className={[
          'asset-staging',
          stagingExpanded ? 'asset-staging--expanded' : '',
          hasStagedAssets ? '' : 'asset-staging--empty',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={t(locale, 'assetStaging')}
        data-expanded={stagingExpanded}
        data-staged-count={stagedAssets.length}
        data-read-only={readOnly}
        onDragOver={handleAssetStagingDragOver}
        onDrop={handleAssetStagingDrop}
      >
        {!hasStagedAssets ? (
          <div className="asset-staging__placeholder">
            {t(locale, 'noStagedAssets')}
          </div>
        ) : (
          <>
            <div className="asset-staging__header">
              <span
                className="asset-staging__count"
                role="status"
                aria-live="polite"
                aria-atomic="true"
                aria-label={t(locale, 'assetStagingCountLabel')}
              >
                <span className="asset-staging__count-badge">{stagedAssets.length}</span>
              </span>
            </div>
            {stagingExpanded ? (
              <div
                className="asset-staging__list"
                aria-label={t(locale, 'stagedAssetList')}
                data-asset-list="staging"
              >
                {stagedAssets.map((asset) => renderAssetRow(asset, 'staging'))}
              </div>
            ) : (
              <ul className="asset-staging__recent" aria-label={t(locale, 'recentStagedAssets')}>
                {stagedAssets.slice(0, 3).map((asset) => {
                  const assetDisplay = getAssetDisplay(asset, locale);

                  return (
                    <li className="asset-staging-card" data-asset-id={asset.assetId} key={asset.assetId}>
                      <button
                        type="button"
                        className="asset-staging-card__select"
                        aria-label={assetDisplay.name}
                        disabled={readOnly}
                        onClick={() => handleAssetActivation(asset.assetId, 'single')}
                      >
                        <img src={asset.thumbnailUrl} alt="" className="asset-staging-card__thumb" />
                        <span>{assetDisplay.name}</span>
                      </button>
                      <button
                        type="button"
                        className="asset-staging-card__remove"
                        aria-label={t(locale, 'removeStagedAsset', { name: assetDisplay.name })}
                        disabled={readOnly}
                        onClick={() => removeStagedAsset(asset.assetId)}
                      >
                        x
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
        {hasStagedAssets ? (
          <button
            type="button"
            className="asset-staging__toggle"
            aria-expanded={stagingExpanded}
            aria-label={stagingExpanded ? t(locale, 'collapseAssetStaging') : t(locale, 'expandAssetStaging')}
            disabled={readOnly}
            onClick={() => setAssetStagingExpanded(!stagingExpanded)}
          >
            <span aria-hidden="true">{stagingExpanded ? '^' : 'v'}</span>
          </button>
        ) : null}
      </section>
      <aside className="panel asset-picker" aria-label={t(locale, 'assetPicker')}>
        {!stagingExpanded ? (
          <>
            <div className="asset-filter-row">
              <label className="asset-search">
                <span className="sr-only">{t(locale, 'searchAssets')}</span>
                <input
                  aria-label={t(locale, 'searchAssets')}
                  placeholder={t(locale, 'searchPlaceholder')}
                  value={filters.query}
                  readOnly={readOnly}
                  onChange={(event) => updateFilters({ query: event.target.value })}
                />
              </label>
              <label className="asset-category-select">
                <span className="sr-only">{t(locale, 'assetCategoryFilters')}</span>
                <select
                  aria-label={t(locale, 'assetCategoryFilters')}
                  value={filters.category}
                  disabled={readOnly}
                  onChange={(event) => updateFilters({ category: event.target.value as AssetCategoryFilter })}
                >
                  {getCategoryFilterOptions(locale).map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <PlacementSkillToggle
              locale={locale}
              asset={selectedAsset}
              placementRequiresSkill={placementRequiresSkill}
              onPlacementRequiresSkillChange={onPlacementRequiresSkillChange}
              readOnly={readOnly}
            />
            <div
              className={[
                'asset-catalog-panel',
                filterResult.pageCount > 1 ? 'asset-catalog-panel--paginated' : 'asset-catalog-panel--single-page',
              ].join(' ')}
              data-staging-expanded={assetStaging.expanded}
            >
              <div className="asset-list" aria-label={t(locale, 'assetResults')} data-asset-list="catalog">
                {filterResult.renderedAssets.map((asset) => renderAssetRow(asset, 'catalog'))}
                {filterResult.filteredCount === 0 ? (
                  <AssetEmptyState locale={locale} />
                ) : null}
              </div>
              {filterResult.pageCount > 1 ? (
                <nav className="asset-pagination" aria-label="Asset pagination">
                  <button
                    type="button"
                    aria-label={t(locale, 'previousAssetPage')}
                    disabled={readOnly || !filterResult.hasPreviousPage}
                    onClick={() => goToAssetPage(filterResult.currentPage - 1)}
                  >
                    &lt;
                  </button>
                  <span aria-label={t(locale, 'assetPageStatus')}>
                    {filterResult.currentPage} / {filterResult.pageCount}
                  </span>
                  <button
                    type="button"
                    aria-label={t(locale, 'nextAssetPage')}
                    disabled={readOnly || !filterResult.hasNextPage}
                    onClick={() => goToAssetPage(filterResult.currentPage + 1)}
                  >
                    &gt;
                  </button>
                </nav>
              ) : null}
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
}

function isRotatableBeforePlacement(asset: AssetDefinition): boolean {
  return asset.footprint.length !== 1 || asset.footprint.width !== 1;
}

function RotateAssetIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4.9 7.4h7.2a4.7 4.7 0 0 1 4.7 4.7v5" />
      <path d="m14.1 14.4 2.7 2.7 2.7-2.7" />
    </svg>
  );
}

function createAssetDragPreviewElement(asset: AssetDefinition, assetName: string): HTMLElement {
  const dragPreview = document.createElement('div');
  dragPreview.className = 'asset-drag-preview';
  dragPreview.setAttribute('aria-hidden', 'true');

  const thumbnail = document.createElement('img');
  thumbnail.src = asset.thumbnailUrl;
  thumbnail.alt = '';
  thumbnail.className = 'asset-drag-preview__thumb';

  const label = document.createElement('span');
  label.className = 'asset-drag-preview__label';
  label.textContent = assetName;

  dragPreview.append(thumbnail, label);

  return dragPreview;
}

function AssetEmptyState({ locale }: { locale: Locale }) {
  return (
    <section className="asset-empty-state" aria-label={locale === 'zh-CN' ? 'No matching assets' : t(locale, 'noAssetsMatch')}>
      <strong>{t(locale, 'noAssetsMatch')}</strong>
      <span>{t(locale, 'noAssetsMatchBody')}</span>
    </section>
  );
}

function PlacementSkillToggle({
  locale,
  asset,
  placementRequiresSkill,
  onPlacementRequiresSkillChange,
  readOnly,
}: {
  locale: Locale;
  asset: AssetDefinition | null;
  placementRequiresSkill: boolean;
  onPlacementRequiresSkillChange: (requiresSkill: boolean) => void;
  readOnly: boolean;
}) {
  return (
    <label className="placement-skill-toggle sr-only">
      <input
        type="checkbox"
        checked={Boolean(asset && placementRequiresSkill)}
        disabled={readOnly || !asset}
        onChange={(event) => onPlacementRequiresSkillChange(event.target.checked)}
      />
      {t(locale, 'requiresSkill')}
    </label>
  );
}

function focusSiblingAsset(currentButton: HTMLButtonElement, offset: number): void {
  const assetButtons = Array.from(
    currentButton
      .closest<HTMLElement>('[data-asset-list]')
      ?.querySelectorAll<HTMLButtonElement>('.asset-select-button') ?? [],
  );
  const currentIndex = assetButtons.indexOf(currentButton);

  if (currentIndex === -1) {
    return;
  }

  const nextIndex = (currentIndex + offset + assetButtons.length) % assetButtons.length;
  assetButtons[nextIndex]?.focus();
}

function isAssetApplicationKey(event: KeyboardEvent<HTMLButtonElement>): boolean {
  const normalizedKey = event.key.toLowerCase();

  return (
    normalizedKey === 'arrowup' ||
    normalizedKey === 'arrowdown' ||
    normalizedKey === 'enter' ||
    normalizedKey === ' ' ||
    normalizedKey === 'spacebar'
  );
}

function getCategoryFilterOptions(locale: Locale): readonly { value: AssetCategoryFilter; label: string }[] {
  return [
    { value: 'all', label: t(locale, 'all') },
    ...assetCategories.map((value) => ({
      value,
      label: getAssetCategoryLabel(value, locale),
    })),
  ];
}

function getAssetTagLabels(categoryLabel: string, tags: readonly string[]): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();

  for (const label of [categoryLabel, ...tags]) {
    const trimmedLabel = label.trim();
    const key = trimmedLabel.toLocaleLowerCase();
    if (!trimmedLabel || seen.has(key)) {
      continue;
    }

    seen.add(key);
    labels.push(trimmedLabel);
  }

  return labels;
}

function getAssetRowIds(assetPickerId: string, assetId: string) {
  const safeAssetId = assetId.replace(/[^a-z0-9_-]/gi, '-');

  return {
    name: `${assetPickerId}-${safeAssetId}-name`,
    tags: `${assetPickerId}-${safeAssetId}-tags`,
  };
}
