const scaffoldAssets = ['Wooden Floor', 'Garden Plant', 'Outer Wall', 'Ditto Doll'];

interface AssetPickerProps {
  readOnly: boolean;
}

export function AssetPicker({ readOnly }: AssetPickerProps) {
  return (
    <aside className="panel asset-picker" aria-label="Asset picker">
      <div className="panel__header">
        <h2>素材栏</h2>
        <span>4 shown</span>
      </div>
      <label className="asset-search">
        Search assets
        <input aria-label="Search assets" placeholder="floor, plant, wall" readOnly={readOnly} />
      </label>
      <div className="filter-row" aria-label="Asset filters">
        <button type="button" aria-pressed="true" disabled={readOnly}>
          All
        </button>
        <button type="button" aria-pressed="false" disabled={readOnly}>
          Main
        </button>
        <button type="button" aria-pressed="false" disabled={readOnly}>
          Outer
        </button>
      </div>
      <div className="asset-list" aria-label="Asset results">
        {scaffoldAssets.map((asset) => (
          <button type="button" className="asset-row" disabled={readOnly} key={asset}>
            <span className="asset-thumb" aria-hidden="true" />
            <span>{asset}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
