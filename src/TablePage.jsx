import { useRef } from 'react';

// Matches the canvas's dot-grid background spacing — dragging always lands
// a box on a visible point instead of anywhere in between.
const GRID = 24;
const snap = (v) => Math.round(v / GRID) * GRID;

function TableBox({ item, pos, onMove }) {
  const boxRef = useRef(null);
  const dragState = useRef(null);

  const onPointerDown = (e) => {
    const canvas = boxRef.current.parentElement;
    const canvasRect = canvas.getBoundingClientRect();
    dragState.current = {
      offsetX: e.clientX - canvasRect.left - pos.x,
      offsetY: e.clientY - canvasRect.top - pos.y,
      canvasRect,
    };
    const onPointerMove = (ev) => {
      const { offsetX, offsetY, canvasRect: rect } = dragState.current;
      const x = Math.max(0, Math.min(rect.width - 120, snap(ev.clientX - rect.left - offsetX)));
      const y = Math.max(0, Math.min(rect.height - 70, snap(ev.clientY - rect.top - offsetY)));
      onMove(item.id, x, y);
    };
    const onPointerUp = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  };

  return (
    <div
      ref={boxRef}
      className={`table-box table-box-${item.kind}`}
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={onPointerDown}
    >
      <div className="table-box-label">{item.name}</div>
      <div className="table-box-sublabel">{item.sublabel}</div>
    </div>
  );
}

export default function TablePage({ resources, decks, discards, hands, layout, setLayout }) {
  const items = [
    ...resources.map((r) => ({ id: r.id, kind: 'resource', name: r.name, sublabel: `Resource · ${r.value}` })),
    ...decks.map((d) => ({ id: d.id, kind: 'deck', name: d.name, sublabel: 'Deck' })),
    ...discards.map((d) => ({ id: d.id, kind: 'discard', name: d.name, sublabel: 'Discard' })),
    ...hands.map((h) => ({ id: h.id, kind: 'hand', name: h.name, sublabel: 'Hand' })),
  ];

  const positionOf = (item, index) =>
    layout[item.id] ?? { x: snap(24 + (index % 5) * 144), y: snap(24 + Math.floor(index / 5) * 96) };

  const onMove = (id, x, y) => setLayout((prev) => ({ ...prev, [id]: { x, y } }));

  return (
    <div className="page table-page">
      <div className="page-header">
        <h1>Table</h1>
      </div>
      {items.length === 0 ? (
        <div className="empty-hint">Nothing to position yet — add resources, decks, discard piles, or hands in the Resources tab.</div>
      ) : (
        <div className="table-canvas">
          {items.map((item, i) => (
            <TableBox key={item.id} item={item} pos={positionOf(item, i)} onMove={onMove} />
          ))}
        </div>
      )}
    </div>
  );
}
