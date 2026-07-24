import { palsById } from '../engine/breeding.js';

export default function SavedPaths({ saved, onLoad, onDelete }) {
  if (!saved.length) {
    return <div className="empty-state">No tienes rutas guardadas todavía.</div>;
  }
  return (
    <div className="saved-list">
      {saved.map((item) => {
        const target = palsById[item.targetId];
        return (
          <div className="saved-item" key={item.id}>
            <img src={`/pals/${target.icon}.png`} alt={target.name} />
            <span className="title">
              {item.name}
              <div className="meta">
                {item.ownedIds.length} Pals de origen · guardada {new Date(item.savedAt).toLocaleDateString()}
              </div>
            </span>
            <button className="btn-accent" onClick={() => onLoad(item)}>
              Cargar
            </button>
            <button className="btn-ghost" onClick={() => onDelete(item.id)}>
              Borrar
            </button>
          </div>
        );
      })}
    </div>
  );
}
