import { useState } from 'react';
import { newCard, newCardClass } from './store';

function Section({ title, children }) {
  return (
    <div className="editor-section">
      <div className="editor-section-title">{title}</div>
      {children}
    </div>
  );
}

// A small, fixed-size preview — never grows with the number of classes a
// card has. Click it to open the full editor; the checkbox is for bulk
// selection and doesn't open anything.
function CardPreview({ card, classes, selected, onToggleSelect, onOpen }) {
  const classNames = card.classIds.map((id) => classes.find((c) => c.id === id)?.name).filter(Boolean);
  return (
    <div className="card-preview" style={{ borderTopColor: card.color }} onClick={onOpen}>
      <input
        type="checkbox"
        className="card-preview-check"
        checked={selected}
        onClick={(e) => e.stopPropagation()}
        onChange={onToggleSelect}
      />
      <div className="card-preview-name">{card.name}</div>
      {classNames.length > 0 && <div className="card-preview-classes">{classNames.join(', ')}</div>}
    </div>
  );
}

function CardEditor({ card, classes, onChange, onDelete, onClose }) {
  const toggleClass = (classId) => {
    const has = card.classIds.includes(classId);
    onChange({ ...card, classIds: has ? card.classIds.filter((id) => id !== classId) : [...card.classIds, classId] });
  };

  return (
    <div className="side-panel-backdrop" onClick={onClose}>
      <div className="side-panel wide" onClick={(e) => e.stopPropagation()}>
        <div className="side-panel-head">
          <span>Edit Card</span>
          <button className="icon-btn" title="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="side-panel-body">
          <label className="field-label">
            Name
            <input value={card.name} onChange={(e) => onChange({ ...card, name: e.target.value })} />
          </label>
          <label className="field-label">
            Color
            <input type="color" className="color-input" value={card.color} onChange={(e) => onChange({ ...card, color: e.target.value })} />
          </label>
          <label className="field-label">
            Description
            <textarea
              className="card-description"
              placeholder="Description shown in the UI…"
              value={card.description}
              onChange={(e) => onChange({ ...card, description: e.target.value })}
            />
          </label>
          <div className="field-label">
            Classes
            {classes.length === 0 ? (
              <div className="empty-hint">No classes yet — add one below first.</div>
            ) : (
              <div className="card-class-chips">
                {classes.map((c) => (
                  <button
                    key={c.id}
                    className={`class-chip${card.classIds.includes(c.id) ? ' active' : ''}`}
                    onClick={() => toggleClass(c.id)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn btn-danger" onClick={onDelete}>
            Delete Card
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CardsPage({ cardClasses, setCardClasses, cards, setCards }) {
  const [editingId, setEditingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const addClass = () => setCardClasses([...cardClasses, newCardClass(`Class ${cardClasses.length + 1}`)]);
  const updateClass = (id, patch) => setCardClasses(cardClasses.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const removeClass = (id) => {
    setCardClasses(cardClasses.filter((c) => c.id !== id));
    setCards(cards.map((card) => ({ ...card, classIds: card.classIds.filter((cid) => cid !== id) })));
  };

  const addCard = () => setCards([...cards, newCard(`Card ${cards.length + 1}`)]);
  const updateCard = (next) => setCards(cards.map((c) => (c.id === next.id ? next : c)));
  const removeCard = (id) => {
    setCards(cards.filter((c) => c.id !== id));
    setSelectedIds((prev) => prev.filter((sid) => sid !== id));
    if (editingId === id) setEditingId(null);
  };

  const toggleSelect = (id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleSelectAll = () => setSelectedIds(selectedIds.length === cards.length ? [] : cards.map((c) => c.id));
  const deleteSelected = () => {
    setCards(cards.filter((c) => !selectedIds.includes(c.id)));
    setSelectedIds([]);
  };

  const editingCard = cards.find((c) => c.id === editingId) ?? null;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Cards</h1>
      </div>

      <Section title="Classes">
        {cardClasses.length === 0 && <div className="empty-hint">No classes yet — try "Red", "Spade", "Enemy Card".</div>}
        <div className="resource-list">
          {cardClasses.map((c) => (
            <div className="connect-row" key={c.id}>
              <input className="resource-name" value={c.name} onChange={(e) => updateClass(c.id, { name: e.target.value })} />
              <button className="icon-btn danger" title="Remove class" onClick={() => removeClass(c.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
        <button className="add-pill" onClick={addClass}>
          + Class
        </button>
      </Section>

      <Section title="Cards">
        {cards.length > 0 && (
          <div className="bulk-bar">
            <label className="bulk-select-all">
              <input type="checkbox" checked={selectedIds.length === cards.length} onChange={toggleSelectAll} />
              Select all
            </label>
            {selectedIds.length > 0 && (
              <button className="btn btn-sm btn-danger" onClick={deleteSelected}>
                Delete Selected ({selectedIds.length})
              </button>
            )}
          </div>
        )}
        {cards.length === 0 && <div className="empty-hint">No cards yet.</div>}
        <div className="card-preview-grid">
          {cards.map((card) => (
            <CardPreview
              key={card.id}
              card={card}
              classes={cardClasses}
              selected={selectedIds.includes(card.id)}
              onToggleSelect={() => toggleSelect(card.id)}
              onOpen={() => setEditingId(card.id)}
            />
          ))}
        </div>
        <button className="add-pill" onClick={addCard}>
          + Card
        </button>
      </Section>

      {editingCard && (
        <CardEditor
          card={editingCard}
          classes={cardClasses}
          onChange={updateCard}
          onDelete={() => removeCard(editingCard.id)}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
