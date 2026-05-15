import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react';
import {
  assetCatalog,
  assetCategoryLabels,
  assetMatchesPokemonFavorite,
  filterAssetsByFavorite,
  getAssetAreaLabel,
  getAssetById,
  getAssetSkillLabel,
  type AssetDefinition,
  type PokemonKey,
} from '../../domain/assets';

interface AssetPickerProps {
  readOnly: boolean;
  selectedAssetId: string | null;
  selectedPokemonKey: PokemonKey;
  currentBuildingLevelName: string;
  onAssetSelect: (assetId: string) => void;
}

export function AssetPicker({
  readOnly,
  selectedAssetId,
  selectedPokemonKey,
  currentBuildingLevelName,
  onAssetSelect,
}: AssetPickerProps) {
  const assetPickerId = useId();
  const [query, setQuery] = useState('');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [viewedAssetId, setViewedAssetId] = useState<string | null>(selectedAssetId);
  const selectedAsset = getAssetById(selectedAssetId);
  const viewedAsset = getAssetById(viewedAssetId) ?? selectedAsset;
  const countWidth = `${String(assetCatalog.length).length * 2 + 3}ch`;
  const visibleAssets = useMemo(() => {
    const queryFilteredAssets = filterAssetsByQuery(assetCatalog, query);
    return filterAssetsByFavorite(queryFilteredAssets, selectedPokemonKey, favoriteOnly);
  }, [favoriteOnly, query, selectedPokemonKey]);

  useEffect(() => {
    if (selectedAssetId) {
      setViewedAssetId(selectedAssetId);
    }
  }, [selectedAssetId]);

  const handleAssetKeyDown = (event: KeyboardEvent<HTMLButtonElement>, assetId: string) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusSiblingAsset(event.currentTarget, event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onAssetSelect(assetId);
    }
  };

  return (
    <aside className="panel asset-picker" aria-label="Asset picker">
      <div className="panel__header">
        <h2>素材栏</h2>
        <span
          className="asset-count"
          aria-live="polite"
          aria-label="Asset result count"
          style={{ width: countWidth }}
        >
          {visibleAssets.length.toString().padStart(2, '0')} / {assetCatalog.length.toString().padStart(2, '0')}
        </span>
      </div>
      <label className="asset-search">
        Search assets
        <input
          aria-label="Search assets"
          placeholder="floor, plant, wall"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="filter-row" aria-label="Asset filters">
        <button type="button" aria-pressed={!favoriteOnly} onClick={() => setFavoriteOnly(false)}>
          All
        </button>
        <button
          type="button"
          aria-label="Show favorite assets"
          aria-pressed={favoriteOnly}
          onClick={() => setFavoriteOnly(true)}
        >
          Favorite
        </button>
      </div>
      <CurrentAssetSummary
        asset={selectedAsset}
        currentBuildingLevelName={currentBuildingLevelName}
        readOnly={readOnly}
      />
      <div className="asset-list" aria-label="Asset results">
        {visibleAssets.map((asset) => {
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
                aria-describedby={`${ids.tags} ${ids.skill} ${ids.favorite}`}
                onClick={() => onAssetSelect(asset.assetId)}
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
      </div>
      <AssetDetail asset={viewedAsset} selectedPokemonKey={selectedPokemonKey} />
    </aside>
  );
}

function CurrentAssetSummary({
  asset,
  currentBuildingLevelName,
  readOnly,
}: {
  asset: AssetDefinition | null;
  currentBuildingLevelName: string;
  readOnly: boolean;
}) {
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

function filterAssetsByQuery(assets: readonly AssetDefinition[], query: string): readonly AssetDefinition[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return assets;
  }

  return assets.filter(
    (asset) =>
      asset.name.toLowerCase().includes(normalizedQuery) ||
      asset.officialId.includes(normalizedQuery) ||
      asset.category.toLowerCase().includes(normalizedQuery) ||
      asset.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)),
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

function getAssetRowIds(assetPickerId: string, assetId: string) {
  const safeAssetId = assetId.replace(/[^a-z0-9_-]/gi, '-');

  return {
    name: `${assetPickerId}-${safeAssetId}-name`,
    meta: `${assetPickerId}-${safeAssetId}-meta`,
    tags: `${assetPickerId}-${safeAssetId}-tags`,
    skill: `${assetPickerId}-${safeAssetId}-skill`,
    favorite: `${assetPickerId}-${safeAssetId}-favorite`,
  };
}
