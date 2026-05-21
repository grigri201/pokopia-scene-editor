import { useEffect, useId, useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react';
import {
  assetCatalog,
  assetCategories,
  assetCategoryLabels,
  assetMatchesPokemonFavorite,
  filterAssetCatalog,
  getAssetById,
  type AssetCategoryFilter,
  type AssetDefinition,
  type AssetFilterState,
  type PokemonKey,
} from '../../domain/assets';
import {
  getUiPreferencesStorage,
  readUiPreferencesFromStorage,
  writeAssetFilterPreferencesToStorage,
} from '../../io';

interface AssetPickerProps {
  readOnly: boolean;
  selectedAssetId: string | null;
  selectedAssetMode?: AssetSelectionMode;
  selectedPokemonKey: PokemonKey;
  currentBuildingLevelName: string;
  placementRequiresSkill: boolean;
  onPlacementRequiresSkillChange: (requiresSkill: boolean) => void;
  onAssetSelect: (assetId: string, placementMode: AssetSelectionMode) => void;
}

export type AssetSelectionMode = 'single' | 'continuous';

export function AssetPicker({
  readOnly,
  selectedAssetId,
  selectedAssetMode = 'single',
  selectedPokemonKey,
  placementRequiresSkill,
  onPlacementRequiresSkillChange,
  onAssetSelect,
}: AssetPickerProps) {
  const assetPickerId = useId();
  const [filters, setFilters] = useState<AssetFilterState>(
    () =>
      readUiPreferencesFromStorage(getUiPreferencesStorage(), {
        persistNormalized: !readOnly,
      }).assetFilters,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [viewedAssetId, setViewedAssetId] = useState<string | null>(selectedAssetId);
  const selectedAsset = getAssetById(selectedAssetId);
  const viewedAsset = getAssetById(viewedAssetId) ?? selectedAsset;
  const filterResult = useMemo(
    () => filterAssetCatalog(assetCatalog, filters, selectedPokemonKey, currentPage),
    [filters, currentPage, selectedPokemonKey],
  );

  useEffect(() => {
    if (selectedAssetId) {
      setViewedAssetId(selectedAssetId);
    }
  }, [selectedAssetId]);

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
    setViewedAssetId(assetId);

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

  return (
    <aside className="panel asset-picker" aria-label="Asset picker">
      <div className="asset-picker__header">
        <h2>素材</h2>
        <label className="favorite-toggle">
          <input
            type="checkbox"
            aria-label="Show favorite assets"
            checked={filters.favoriteOnly}
            disabled={readOnly}
            onChange={(event) => updateFilters({ favoriteOnly: event.target.checked })}
          />
          只显示喜好
        </label>
        <span
          className="asset-count"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          aria-label="Asset result count"
        >
          {filterResult.filteredCount} results
        </span>
      </div>
      <label className="asset-search">
        <span className="sr-only">Search assets</span>
        <input
          aria-label="Search assets"
          placeholder="围栏"
          value={filters.query}
          readOnly={readOnly}
          onChange={(event) => updateFilters({ query: event.target.value })}
        />
      </label>
      <fieldset className="asset-category-tabs" aria-label="Asset category filters">
        <legend className="sr-only">Category</legend>
        {categoryFilterOptions.map((option) => (
          <button
            type="button"
            aria-pressed={filters.category === option.value}
            disabled={readOnly}
            onClick={() => updateFilters({ category: option.value })}
            key={option.value}
          >
            {option.label}
          </button>
        ))}
      </fieldset>
      <PlacementSkillToggle
        asset={selectedAsset}
        placementRequiresSkill={placementRequiresSkill}
        onPlacementRequiresSkillChange={onPlacementRequiresSkillChange}
        readOnly={readOnly}
      />
      {filterResult.pageCount > 1 ? (
        <nav className="asset-pagination" aria-label="Asset pagination">
          <button
            type="button"
            aria-label="Previous asset page"
            disabled={readOnly || !filterResult.hasPreviousPage}
            onClick={() => goToAssetPage(filterResult.currentPage - 1)}
          >
            &lt;
          </button>
          <span aria-label="Asset page status">
            {filterResult.currentPage} / {filterResult.pageCount}
          </span>
          <button
            type="button"
            aria-label="Next asset page"
            disabled={readOnly || !filterResult.hasNextPage}
            onClick={() => goToAssetPage(filterResult.currentPage + 1)}
          >
            &gt;
          </button>
        </nav>
      ) : null}
      <div className="asset-list" aria-label="Asset results">
        {filterResult.renderedAssets.map((asset) => {
          const selected = asset.assetId === selectedAssetId;
          const selectedContinuously = selected && selectedAssetMode === 'continuous';
          const ids = getAssetRowIds(assetPickerId, asset.assetId);

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
              data-selected={selected}
              data-selection-mode={selected ? selectedAssetMode : 'none'}
              key={asset.assetId}
            >
              <button
                type="button"
                className="asset-select-button"
                aria-pressed={selected}
                aria-labelledby={`${ids.name} ${ids.meta}`}
                onClick={(event) => handleAssetClick(event, asset.assetId)}
                onDoubleClick={() => handleAssetActivation(asset.assetId, 'continuous')}
                onKeyDown={(event) => handleAssetKeyDown(event, asset.assetId)}
              >
                <img src={asset.thumbnailUrl} alt="" className="asset-thumb" />
                <span className="asset-row__body">
                  <strong id={ids.name}>{asset.name}</strong>
                  <span className="asset-row__meta" id={ids.meta}>
                    {formatAssetTags(asset.tags)}
                  </span>
                </span>
                <span className="asset-row__official-id">
                  No. {asset.officialId}
                </span>
              </button>
              <button
                type="button"
                className="sr-only"
                aria-label={`View ${asset.name} details`}
                disabled={readOnly}
                onClick={() => setViewedAssetId(asset.assetId)}
              >
                Details
              </button>
            </article>
          );
        })}
        {filterResult.filteredCount === 0 ? (
          <AssetEmptyState />
        ) : null}
      </div>
      <div className="sr-only">
        <AssetDetail asset={viewedAsset} selectedPokemonKey={selectedPokemonKey} />
      </div>
    </aside>
  );
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

function AssetEmptyState() {
  return (
    <section className="asset-empty-state" aria-label="No matching assets">
      <strong>No assets match</strong>
      <span>No assets match the current filters.</span>
    </section>
  );
}

function PlacementSkillToggle({
  asset,
  placementRequiresSkill,
  onPlacementRequiresSkillChange,
  readOnly,
}: {
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
      Requires Ditto skill
    </label>
  );
}

function AssetDetail({
  asset,
  selectedPokemonKey,
}: {
  asset: AssetDefinition | null;
  selectedPokemonKey: PokemonKey;
}) {
  if (!asset) {
    return (
      <section className="asset-detail" aria-label="Asset detail">
        <span>Asset detail</span>
        <strong>No asset selected</strong>
      </section>
    );
  }

  return (
    <section className="asset-detail" aria-label={`${asset.name} asset detail`}>
      <span>Asset detail</span>
      <img src={asset.thumbnailUrl} alt={asset.thumbnailAlt} className="asset-detail__thumb" />
      <strong>{asset.name}</strong>
      <dl>
        <div>
          <dt>Asset ID</dt>
          <dd>{asset.assetId}</dd>
        </div>
        <div>
          <dt>Official ID</dt>
          <dd>No. {asset.officialId}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{assetCategoryLabels[asset.category]}</dd>
        </div>
        <div>
          <dt>Tags</dt>
          <dd>{formatAssetTags(asset.tags)}</dd>
        </div>
        <div>
          <dt>Favorite</dt>
          <dd>{assetMatchesPokemonFavorite(asset, selectedPokemonKey) ? selectedPokemonKey : 'No match'}</dd>
        </div>
        <div>
          <dt>Dyeable</dt>
          <dd>{asset.dyeable ? 'Yes' : 'No'}</dd>
        </div>
      </dl>
    </section>
  );
}

function focusSiblingAsset(currentButton: HTMLButtonElement, offset: number): void {
  const assetButtons = Array.from(
    currentButton
      .closest<HTMLElement>('.asset-list')
      ?.querySelectorAll<HTMLButtonElement>('.asset-select-button') ?? [],
  );
  const currentIndex = assetButtons.indexOf(currentButton);

  if (currentIndex === -1) {
    return;
  }

  const nextIndex = (currentIndex + offset + assetButtons.length) % assetButtons.length;
  assetButtons[nextIndex]?.focus();
}

const categoryFilterOptions: readonly { value: AssetCategoryFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  ...assetCategories.map((value) => ({
    value,
    label: assetCategoryLabels[value],
  })),
];

function formatAssetTags(tags: readonly string[]): string {
  return tags.length > 0 ? tags.join(' · ') : '无标签';
}

function getAssetRowIds(assetPickerId: string, assetId: string) {
  const safeAssetId = assetId.replace(/[^a-z0-9_-]/gi, '-');

  return {
    name: `${assetPickerId}-${safeAssetId}-name`,
    meta: `${assetPickerId}-${safeAssetId}-meta`,
    tags: `${assetPickerId}-${safeAssetId}-tags`,
    favorite: `${assetPickerId}-${safeAssetId}-favorite`,
  };
}
