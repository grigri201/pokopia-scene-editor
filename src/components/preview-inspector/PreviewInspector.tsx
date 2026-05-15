export function PreviewInspector() {
  return (
    <aside className="panel preview-panel" aria-label="Preview inspector">
      <div className="panel__header">
        <h2>检查器预览</h2>
        <span>Top / Front</span>
      </div>
      <div className="preview-grid" aria-label="Dual preview inspector">
        <div className="preview-tile" aria-label="Top view preview">
          <span>Top</span>
          <div className="mini-grid" />
        </div>
        <div className="preview-tile" aria-label="Front view preview">
          <span>Front</span>
          <div className="height-bars">
            <i />
            <i />
            <i />
          </div>
        </div>
      </div>
    </aside>
  );
}
