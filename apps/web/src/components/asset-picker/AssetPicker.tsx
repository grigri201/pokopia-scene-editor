import { useEffect, useId, useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react';
import {
  assetCatalog,
  assetCategories,
  assetMatchesPokemonFavorite,
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
  readUiPreferencesFromStorage,
  writeAssetFilterPreferencesToStorage,
} from '../../io';

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
    <aside className="panel asset-picker" aria-label={t(locale, 'assetPicker')}>
      <div className="asset-picker__header">
        <h2>{t(locale, 'assets')}</h2>
        <span
          className="asset-count"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          aria-label={t(locale, 'assetResultCount')}
        >
          {t(locale, 'results', { count: filterResult.filteredCount })}
        </span>
      </div>
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
      <fieldset className="asset-category-tabs" aria-label={t(locale, 'assetCategoryFilters')}>
        <legend className="sr-only">{t(locale, 'category')}</legend>
        {getCategoryFilterOptions(locale).map((option) => (
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
        locale={locale}
        asset={selectedAsset}
        placementRequiresSkill={placementRequiresSkill}
        onPlacementRequiresSkillChange={onPlacementRequiresSkillChange}
        readOnly={readOnly}
      />
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
      <div className="asset-list" aria-label={t(locale, 'assetResults')}>
        {filterResult.renderedAssets.map((asset) => {
          const selected = asset.assetId === selectedAssetId;
          const selectedContinuously = selected && selectedAssetMode === 'continuous';
          const ids = getAssetRowIds(assetPickerId, asset.assetId);
          const assetDisplay = getAssetDisplay(asset, locale);
          const rotatable = isRotatableBeforePlacement(asset);

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
              data-placement-rotation={selected ? placementRotationDegrees : 0}
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
                  <strong id={ids.name}>{assetDisplay.name}</strong>
                  <span className="asset-row__meta" id={ids.meta}>
                    {formatAssetTags(assetDisplay.tags, locale)}
                  </span>
                </span>
                <span className="asset-row__official-id">
                  No. {asset.officialId}
                </span>
              </button>
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
              <button
                type="button"
                className="sr-only"
                aria-label={t(locale, 'viewAssetDetails', { name: assetDisplay.name })}
                disabled={readOnly}
                onClick={() => setViewedAssetId(asset.assetId)}
              >
                Details
              </button>
            </article>
          );
        })}
        {filterResult.filteredCount === 0 ? (
          <AssetEmptyState locale={locale} />
        ) : null}
      </div>
      <div className="sr-only">
        <AssetDetail locale={locale} asset={viewedAsset} selectedPokemonKey={selectedPokemonKey} />
      </div>
    </aside>
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

function AssetDetail({
  locale,
  asset,
  selectedPokemonKey,
}: {
  locale: Locale;
  asset: AssetDefinition | null;
  selectedPokemonKey: PokemonKey;
}) {
  if (!asset) {
    return (
      <section className="asset-detail" aria-label={t(locale, 'assetDetail')}>
        <span>{t(locale, 'assetDetail')}</span>
        <strong>{t(locale, 'noAssetSelected')}</strong>
      </section>
    );
  }

  const assetDisplay = getAssetDisplay(asset, locale);

  return (
    <section className="asset-detail" aria-label={`${assetDisplay.name} asset detail`}>
      <span>{t(locale, 'assetDetail')}</span>
      <img src={asset.thumbnailUrl} alt={assetDisplay.thumbnailAlt} className="asset-detail__thumb" />
      <strong>{assetDisplay.name}</strong>
      <dl>
        <div>
          <dt>{t(locale, 'assetId')}</dt>
          <dd>{asset.assetId}</dd>
        </div>
        <div>
          <dt>{t(locale, 'officialId')}</dt>
          <dd>No. {asset.officialId}</dd>
        </div>
        <div>
          <dt>{t(locale, 'category')}</dt>
          <dd>{assetDisplay.categoryLabel}</dd>
        </div>
        <div>
          <dt>{t(locale, 'tags')}</dt>
          <dd>{formatAssetTags(assetDisplay.tags, locale)}</dd>
        </div>
        <div>
          <dt>{t(locale, 'favorite')}</dt>
          <dd>{assetMatchesPokemonFavorite(asset, selectedPokemonKey) ? selectedPokemonKey : t(locale, 'noMatch')}</dd>
        </div>
        <div>
          <dt>{t(locale, 'dyeable')}</dt>
          <dd>{asset.dyeable ? t(locale, 'yes') : t(locale, 'no')}</dd>
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

function getCategoryFilterOptions(locale: Locale): readonly { value: AssetCategoryFilter; label: string }[] {
  return [
    { value: 'all', label: t(locale, 'all') },
    ...assetCategories.map((value) => ({
      value,
      label: getAssetCategoryLabel(value, locale),
    })),
  ];
}

function formatAssetTags(tags: readonly string[], locale: Locale): string {
  return tags.length > 0 ? tags.join(' · ') : t(locale, 'noTags');
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
