import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react';
import {
  assetCatalog,
  assetCategoryLabels,
  assetMatchesPokemonFavorite,
  assetRenderLimit,
  canAssetRequirePlacementSkill,
  defaultAssetFilters,
  filterAssetCatalog,
  getAssetAreaLabel,
  getAssetById,
  getAssetSkillLabel,
  type AssetCategory,
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
  selectedPokemonKey: PokemonKey;
  currentBuildingLevelName: string;
  placementRequiresSkill: boolean;
  onPlacementRequiresSkillChange: (requiresSkill: boolean) => void;
  onAssetSelect: (assetId: string) => void;
}

export function AssetPicker({
  readOnly,
  selectedAssetId,
  selectedPokemonKey,
  placementRequiresSkill,
  onPlacementRequiresSkillChange,
  onAssetSelect,
}: AssetPickerProps) {
  const assetPickerId = useId();
  const [filters, setFilters] = useState<AssetFilterState>(
    () => readUiPreferencesFromStorage(getUiPreferencesStorage()).assetFilters,
  );
  const [renderLimit, setRenderLimit] = useState(assetRenderLimit);
  const [viewedAssetId, setViewedAssetId] = useState<string | null>(selectedAssetId);
  const selectedAsset = getAssetById(selectedAssetId);
  const viewedAsset = getAssetById(viewedAssetId) ?? selectedAsset;
  const filterResult = useMemo(
    () => filterAssetCatalog(assetCatalog, filters, selectedPokemonKey, renderLimit),
    [filters, renderLimit, selectedPokemonKey],
  );

  useEffect(() => {
    if (selectedAssetId) {
      setViewedAssetId(selectedAssetId);
    }
  }, [selectedAssetId]);

  useEffect(() => {
    setRenderLimit(assetRenderLimit);
  }, [filters, selectedPokemonKey]);

  const handleAssetKeyDown = (event: KeyboardEvent<HTMLButtonElement>, assetId: string) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusSiblingAsset(event.currentTarget, event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleAssetActivation(assetId);
    }
  };

  const handleAssetActivation = (assetId: string) => {
    setViewedAssetId(assetId);

    if (readOnly) {
      return;
    }

    onAssetSelect(assetId);
  };

  const updateFilters = (nextFilters: Partial<AssetFilterState>) => {
    setFilters((currentFilters) => {
      const updatedFilters = { ...currentFilters, ...nextFilters };
      writeAssetFilterPreferencesToStorage(getUiPreferencesStorage(), updatedFilters);

      return updatedFilters;
    });
  };

  const resetFilters = () => {
    writeAssetFilterPreferencesToStorage(getUiPreferencesStorage(), defaultAssetFilters);
    setFilters(defaultAssetFilters);
  };

  const clearFavoriteFilter = () => {
    updateFilters({ favoriteOnly: false });
  };

  const showMoreAssets = () => {
    setRenderLimit((currentLimit) => currentLimit + assetRenderLimit);
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
          {String(filterResult.filteredCount).padStart(3, '0')} results
        </span>
      </div>
      <label className="asset-search">
        <span className="sr-only">Search assets</span>
        <input
          aria-label="Search assets"
          placeholder="围栏"
          value={filters.query}
          onChange={(event) => updateFilters({ query: event.target.value })}
        />
      </label>
      <fieldset className="asset-category-tabs" aria-label="Asset category filters">
        <legend className="sr-only">Category</legend>
        {categoryFilterOptions.map((option) => (
          <button
            type="button"
            aria-pressed={filters.category === option.value}
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
      {filterResult.renderLimited ? (
        <p className="asset-limit-note" role="status">
          Showing first {filterResult.renderedAssets.length} results.
          <button type="button" onClick={showMoreAssets}>
            Show more
          </button>
        </p>
      ) : null}
      <div className="asset-list" aria-label="Asset results">
        {filterResult.renderedAssets.map((asset) => {
          const selected = asset.assetId === selectedAssetId;
          const ids = getAssetRowIds(assetPickerId, asset.assetId);

          return (
            <article
              className={selected ? 'asset-row asset-row--selected' : 'asset-row'}
              data-asset-id={asset.assetId}
              data-selected={selected}
              key={asset.assetId}
            >
              <button
                type="button"
                className="asset-select-button"
                aria-pressed={selected}
                aria-labelledby={`${ids.name} ${ids.meta}`}
                onClick={() => handleAssetActivation(asset.assetId)}
                onKeyDown={(event) => handleAssetKeyDown(event, asset.assetId)}
              >
                <img src={asset.thumbnailUrl} alt="" className="asset-thumb" />
                <span className="asset-row__body">
                  <strong id={ids.name}>{asset.name}</strong>
                  <span className="asset-row__meta" id={ids.meta}>
                    {assetCategoryLabels[asset.category]} · {asset.tags.slice(0, 1).join('')}
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
                onClick={() => setViewedAssetId(asset.assetId)}
              >
                Details
              </button>
            </article>
          );
        })}
        {filterResult.filteredCount === 0 ? (
          <AssetEmptyState
            favoriteOnly={filters.favoriteOnly}
            categoryActive={filters.category !== 'all'}
            queryActive={Boolean(filters.query.trim())}
            onClearFilters={resetFilters}
            onShowAll={resetFilters}
            onClearFavorite={clearFavoriteFilter}
            onSwitchCategory={() => updateFilters({ category: 'all' })}
            onClearQuery={() => updateFilters({ query: '' })}
          />
        ) : null}
      </div>
      <div className="sr-only">
        <AssetDetail asset={viewedAsset} selectedPokemonKey={selectedPokemonKey} />
      </div>
    </aside>
  );
}

function AssetEmptyState({
  favoriteOnly,
  categoryActive,
  queryActive,
  onClearFilters,
  onShowAll,
  onClearFavorite,
  onSwitchCategory,
  onClearQuery,
}: {
  favoriteOnly: boolean;
  categoryActive: boolean;
  queryActive: boolean;
  onClearFilters: () => void;
  onShowAll: () => void;
  onClearFavorite: () => void;
  onSwitchCategory: () => void;
  onClearQuery: () => void;
}) {
  const secondaryRecovery = getSecondaryRecoveryAction({
    favoriteOnly,
    categoryActive,
    queryActive,
    onClearFavorite,
    onSwitchCategory,
    onClearQuery,
  });

  return (
    <section className="asset-empty-state" aria-label="No matching assets">
      <strong>No assets match</strong>
      <span>Adjust filters to restore the asset list.</span>
      <div className="asset-empty-actions">
        <button type="button" onClick={onClearFilters}>
          Clear filters
        </button>
        <button type="button" onClick={onShowAll}>
          Show all
        </button>
        <button type="button" onClick={secondaryRecovery.onClick}>
          {secondaryRecovery.label}
        </button>
      </div>
    </section>
  );
}

function getSecondaryRecoveryAction({
  favoriteOnly,
  categoryActive,
  queryActive,
  onClearFavorite,
  onSwitchCategory,
  onClearQuery,
}: {
  favoriteOnly: boolean;
  categoryActive: boolean;
  queryActive: boolean;
  onClearFavorite: () => void;
  onSwitchCategory: () => void;
  onClearQuery: () => void;
}) {
  if (favoriteOnly) {
    return { label: 'Disable favorite', onClick: onClearFavorite };
  }

  if (categoryActive) {
    return { label: 'All categories', onClick: onSwitchCategory };
  }

  if (queryActive) {
    return { label: 'Clear search', onClick: onClearQuery };
  }

  return { label: 'Reset filters', onClick: onSwitchCategory };
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
  const canConfigurePlacementSkill = Boolean(asset && canAssetRequirePlacementSkill(asset));

  return (
    <label className="placement-skill-toggle sr-only">
      <input
        type="checkbox"
        checked={Boolean(asset && canConfigurePlacementSkill && placementRequiresSkill)}
        disabled={readOnly || !asset || !canConfigurePlacementSkill}
        onChange={(event) => onPlacementRequiresSkillChange(canConfigurePlacementSkill && event.target.checked)}
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
          <dd>{asset.tags.join(', ')}</dd>
        </div>
        <div>
          <dt>Area</dt>
          <dd>{getAssetAreaLabel(asset)}</dd>
        </div>
        <div>
          <dt>Favorite</dt>
          <dd>{assetMatchesPokemonFavorite(asset, selectedPokemonKey) ? selectedPokemonKey : 'No match'}</dd>
        </div>
        <div>
          <dt>Skill</dt>
          <dd>{getAssetSkillLabel(asset)}</dd>
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
  ...Object.entries(assetCategoryLabels).map(([value, label]) => ({
    value: value as AssetCategory,
    label,
  })),
];

function getAssetRowIds(assetPickerId: string, assetId: string) {
  const safeAssetId = assetId.replace(/[^a-z0-9_-]/gi, '-');

  return {
    name: `${assetPickerId}-${safeAssetId}-name`,
    meta: `${assetPickerId}-${safeAssetId}-meta`,
    tags: `${assetPickerId}-${safeAssetId}-tags`,
    skill: `${assetPickerId}-${safeAssetId}-skill`,
    candidate: `${assetPickerId}-${safeAssetId}-candidate`,
    favorite: `${assetPickerId}-${safeAssetId}-favorite`,
  };
}
