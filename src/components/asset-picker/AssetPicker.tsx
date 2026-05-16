import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react';
import {
  assetCatalog,
  assetCategoryLabels,
  assetMatchesPokemonFavorite,
  areaLabels,
  assetRenderLimit,
  assetSkillTypes,
  canAssetRequirePlacementSkill,
  defaultAssetFilters,
  filterAssetCatalog,
  getAssetAreaLabel,
  getAssetById,
  getAssetSkillLabel,
  hasActiveAssetFilters,
  type AssetAreaFilter,
  type AssetCategory,
  type AssetCategoryFilter,
  type AssetDefinition,
  type AssetFilterState,
  type AssetSkillFilter,
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
  currentBuildingLevelName,
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
  const countWidth = `${String(assetCatalog.length).length * 2 + 3}ch`;
  const filterResult = useMemo(
    () => filterAssetCatalog(assetCatalog, filters, selectedPokemonKey, renderLimit),
    [filters, renderLimit, selectedPokemonKey],
  );
  const hasActiveFilters = hasActiveAssetFilters(filters);

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
      <div className="panel__header">
        <h2>素材栏</h2>
        <span
          className="asset-count"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          aria-label="Asset result count"
          style={{ width: countWidth }}
        >
          {filterResult.filteredCount.toString().padStart(2, '0')} / {filterResult.totalCount.toString().padStart(2, '0')}
        </span>
      </div>
      <label className="asset-search">
        Search assets
        <input
          aria-label="Search assets"
          placeholder="floor, plant, wall"
          value={filters.query}
          onChange={(event) => updateFilters({ query: event.target.value })}
        />
      </label>
      <fieldset className="filter-row" aria-label="Asset category filters">
        <legend>Category</legend>
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
      <fieldset className="filter-row" aria-label="Asset area filters">
        <legend>Area</legend>
        {areaFilterOptions.map((option) => (
          <button
            type="button"
            aria-pressed={filters.area === option.value}
            onClick={() => updateFilters({ area: option.value })}
            key={option.value}
          >
            {option.label}
          </button>
        ))}
      </fieldset>
      <fieldset className="filter-row" aria-label="Asset filters">
        <legend>Skill and favorites</legend>
        <button type="button" aria-pressed={!filters.favoriteOnly} onClick={clearFavoriteFilter}>
          All
        </button>
        <button
          type="button"
          aria-label="Show favorite assets"
          aria-pressed={filters.favoriteOnly}
          onClick={() => updateFilters({ favoriteOnly: true })}
        >
          Favorite
        </button>
        <label className="asset-filter-field">
          Skill
          <select
            aria-label="Skill filter"
            value={filters.skill}
            onChange={(event) => updateFilters({ skill: event.target.value as AssetSkillFilter })}
          >
            {skillFilterOptions.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" disabled={!hasActiveFilters} onClick={resetFilters}>
          Clear
        </button>
      </fieldset>
      <CurrentAssetSummary
        asset={selectedAsset}
        currentBuildingLevelName={currentBuildingLevelName}
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
                aria-describedby={`${ids.tags} ${ids.skill} ${ids.candidate} ${ids.favorite}`}
                onClick={() => handleAssetActivation(asset.assetId)}
                onKeyDown={(event) => handleAssetKeyDown(event, asset.assetId)}
              >
                <img src={asset.thumbnailUrl} alt="" className="asset-thumb" />
                <span className="asset-row__body">
                  <strong id={ids.name}>{asset.name}</strong>
                  <span className="asset-row__meta" id={ids.meta}>
                    No. {asset.officialId} · {assetCategoryLabels[asset.category]} · {getAssetAreaLabel(asset)}
                  </span>
                  <span className="asset-tags" aria-label={`${asset.name} tags`} id={ids.tags}>
                    {asset.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </span>
                </span>
                <span className="asset-skill-state" id={ids.skill}>
                  {getAssetSkillLabel(asset)}
                </span>
                <span className="asset-candidate-state" id={ids.candidate}>
                  {asset.skillCandidate ? 'Placement skill candidate' : 'Not a placement skill candidate'}
                </span>
                <span className="asset-favorite-state" id={ids.favorite}>
                  {assetMatchesPokemonFavorite(asset, selectedPokemonKey)
                    ? `Favorite for ${selectedPokemonKey}`
                    : 'No current Pokemon favorite match'}
                </span>
              </button>
              <button
                type="button"
                className="asset-detail-button"
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
      <AssetDetail asset={viewedAsset} selectedPokemonKey={selectedPokemonKey} />
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

function CurrentAssetSummary({
  asset,
  currentBuildingLevelName,
  placementRequiresSkill,
  onPlacementRequiresSkillChange,
  readOnly,
}: {
  asset: AssetDefinition | null;
  currentBuildingLevelName: string;
  placementRequiresSkill: boolean;
  onPlacementRequiresSkillChange: (requiresSkill: boolean) => void;
  readOnly: boolean;
}) {
  const canConfigurePlacementSkill = Boolean(asset && canAssetRequirePlacementSkill(asset));

  return (
    <section className="current-asset" aria-label="Current placement asset">
      <span>Current Asset</span>
      <strong>{asset?.name ?? 'None'}</strong>
      <em>
        {asset
          ? `${getAssetSkillLabel(asset)} · ${currentBuildingLevelName} · ${
              readOnly ? 'View only details' : `Ready to place in ${getAssetAreaLabel(asset)} cells`
            }`
          : `${currentBuildingLevelName} · ${readOnly ? 'View only' : 'Choose an asset to place'}`}
      </em>
      <label className="placement-skill-toggle">
        <input
          type="checkbox"
          checked={Boolean(asset && canConfigurePlacementSkill && placementRequiresSkill)}
          disabled={readOnly || !asset || !canConfigurePlacementSkill}
          onChange={(event) => onPlacementRequiresSkillChange(canConfigurePlacementSkill && event.target.checked)}
        />
        Requires Ditto skill
      </label>
    </section>
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
          <dt>Rotatable</dt>
          <dd>{asset.rotatable ? 'Yes' : 'No'}</dd>
        </div>
        <div>
          <dt>Stackable</dt>
          <dd>{asset.stackable ? 'Yes' : 'No'}</dd>
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
  { value: 'all', label: 'All Categories' },
  ...Object.entries(assetCategoryLabels).map(([value, label]) => ({
    value: value as AssetCategory,
    label,
  })),
];

const areaFilterOptions: readonly { value: AssetAreaFilter; label: string }[] = [
  { value: 'all', label: 'All Areas' },
  { value: 'main', label: areaLabels.main },
  { value: 'outer', label: areaLabels.outer },
];

const skillFilterOptions: readonly { value: AssetSkillFilter; label: string }[] = [
  { value: 'all', label: 'All skills' },
  { value: 'requires-skill', label: 'Default skill' },
  { value: 'skill-candidate', label: 'Skill candidate' },
  ...assetSkillTypes.map((skillType) => ({ value: skillType, label: skillType })),
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
