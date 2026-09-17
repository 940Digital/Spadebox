import { useState } from 'react';
import { newCard, newCardAttribute, uid } from './store';

function Section({ title, children }) {
  return (
    <div className="editor-section">
      <div className="editor-section-title">{title}</div>
      {children}
    </div>
  );
}

// A small, fixed-size preview — stays the same size no matter how many
// attributes exist. Outside select mode, clicking it opens the full
// editor; in select mode, clicking anywhere on it toggles selection.
function CardPreview({ card, attributes, selectMode, selected, onToggleSelect, onOpen }) {
  const filled = attributes.map((a) => [a.name, card.attributes[a.id]]).filter(([, v]) => v);
  return (
    <div
      className={`card-preview${selected ? ' selected' : ''}`}
      style={{ borderTopColor: card.color }}
      onClick={selectMode ? onToggleSelect : onOpen}
    >
      {selectMode && <input type="checkbox" className="card-preview-check" checked={selected} readOnly />}
      <div className="card-preview-name">{card.name}</div>
      {filled.length > 0 && (
        <div className="card-preview-classes">{filled.map(([name, v]) => `${name}: ${v}`).join(', ')}</div>
      )}
    </div>
  );
}

function CardEditor({ card, attributes, onChange, onDuplicate, onDelete, onClose }) {
  const setAttribute = (attrId, value) => onChange({ ...card, attributes: { ...card.attributes, [attrId]: value } });

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

          {attributes.length > 0 && (
            <div className="field-label">
              Attributes
              <div className="card-attribute-fields">
                {attributes.map((a) => (
                  <label key={a.id} className="card-attribute-field">
                    <span>{a.name}</span>
                    <input value={card.attributes[a.id] ?? ''} onChange={(e) => setAttribute(a.id, e.target.value)} />
                  </label>
                ))}
              </div>
            </div>
          )}

          <button className="btn" onClick={onDuplicate}>
            Duplicate Card
          </button>
          <button className="btn btn-danger" onClick={onDelete}>
            Delete Card
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkEditPanel({ attributes, count, onApply, onClose }) {
  const [attrId, setAttrId] = useState('');
  const [value, setValue] = useState('');

  return (
    <div className="side-panel-backdrop" onClick={onClose}>
      <div className="side-panel" onClick={(e) => e.stopPropagation()}>
        <div className="side-panel-head">
          <span>Bulk Edit Attribute</span>
          <button className="icon-btn" title="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="side-panel-body">
          {attributes.length === 0 ? (
            <div className="empty-hint">No attributes yet — add one above first.</div>
          ) : (
            <>
              <label className="field-label">
                Attribute
                <select value={attrId} onChange={(e) => setAttrId(e.target.value)}>
                  <option value="" disabled>
                    choose…
                  </option>
                  {attributes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Set value to
                <input value={value} onChange={(e) => setValue(e.target.value)} />
              </label>
              <button
                className="btn btn-primary"
                disabled={!attrId}
                onClick={() => {
                  onApply(attrId, value);
                  onClose();
                }}
              >
                Apply to {count} card{count === 1 ? '' : 's'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CardsPage({ cardAttributes, setCardAttributes, cards, setCards }) {
  const [editingId, setEditingId] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkEditing, setBulkEditing] = useState(false);

  const addAttribute = () => setCardAttributes([...cardAttributes, newCardAttribute(`Attribute ${cardAttributes.length + 1}`)]);
  const updateAttribute = (id, patch) => setCardAttributes(cardAttributes.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const removeAttribute = (id) => {
    setCardAttributes(cardAttributes.filter((a) => a.id !== id));
    setCards(
      cards.map((card) => {
        const { [id]: _removed, ...rest } = card.attributes;
        return { ...card, attributes: rest };
      })
    );
  };

  const addCard = () => setCards([...cards, newCard(`Card ${cards.length + 1}`)]);
  const updateCard = (next) => setCards(cards.map((c) => (c.id === next.id ? next : c)));
  const removeCard = (id) => {
    setCards(cards.filter((c) => c.id !== id));
    setSelectedIds((prev) => prev.filter((sid) => sid !== id));
    if (editingId === id) setEditingId(null);
  };
  const duplicateCard = (id) => {
    const source = cards.find((c) => c.id === id);
    if (!source) return;
    const copy = { ...source, id: uid('card'), name: `${source.name} Copy`, attributes: { ...source.attributes } };
    const index = cards.findIndex((c) => c.id === id);
    setCards([...cards.slice(0, index + 1), copy, ...cards.slice(index + 1)]);
    setEditingId(copy.id);
  };

  const toggleSelect = (id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleSelectAll = () => setSelectedIds(selectedIds.length === cards.length ? [] : cards.map((c) => c.id));
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds([]);
  };
  const deleteSelected = () => {
    setCards(cards.filter((c) => !selectedIds.includes(c.id)));
    setSelectedIds([]);
  };
  const duplicateSelected = () => {
    const copies = cards.filter((c) => selectedIds.includes(c.id)).map((c) => ({ ...c, id: uid('card'), name: `${c.name} Copy`, attributes: { ...c.attributes } }));
    setCards([...cards, ...copies]);
    setSelectedIds(copies.map((c) => c.id));
  };
  const applyBulkAttribute = (attrId, value) =>
    setCards(cards.map((c) => (selectedIds.includes(c.id) ? { ...c, attributes: { ...c.attributes, [attrId]: value } } : c)));

  const editingCard = cards.find((c) => c.id === editingId) ?? null;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Cards</h1>
      </div>

      <Section title="Attributes">
        {cardAttributes.length === 0 && (
          <div className="empty-hint">No attributes yet — try "Color" and "Number". Every card gets its own value for each.</div>
        )}
        <div className="resource-list">
          {cardAttributes.map((a) => (
            <div className="connect-row" key={a.id}>
              <input className="resource-name" value={a.name} onChange={(e) => updateAttribute(a.id, { name: e.target.value })} />
              <button className="icon-btn danger" title="Remove attribute" onClick={() => removeAttribute(a.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
        <button className="add-pill" onClick={addAttribute}>
          + Attribute
        </button>
      </Section>

      <Section title="Cards">
        {cards.length > 0 && (
          <div className="bulk-bar">
            <button className="btn btn-sm" onClick={selectMode ? exitSelectMode : () => setSelectMode(true)}>
              {selectMode ? 'Done' : 'Select'}
            </button>
            {selectMode && (
              <>
                <label className="bulk-select-all">
                  <input type="checkbox" checked={selectedIds.length === cards.length} onChange={toggleSelectAll} />
                  Select all
                </label>
                {selectedIds.length > 0 && (
                  <>
                    <button className="btn btn-sm" onClick={duplicateSelected}>
                      Duplicate ({selectedIds.length})
                    </button>
                    <button className="btn btn-sm" onClick={() => setBulkEditing(true)}>
                      Edit Attribute ({selectedIds.length})
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={deleteSelected}>
                      Delete Selected ({selectedIds.length})
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}
        {cards.length === 0 && <div className="empty-hint">No cards yet.</div>}
        <div className="card-preview-grid">
          {cards.map((card) => (
            <CardPreview
              key={card.id}
              card={card}
              attributes={cardAttributes}
              selectMode={selectMode}
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
          attributes={cardAttributes}
          onChange={updateCard}
          onDuplicate={() => duplicateCard(editingCard.id)}
          onDelete={() => removeCard(editingCard.id)}
          onClose={() => setEditingId(null)}
        />
      )}

      {bulkEditing && (
        <BulkEditPanel
          attributes={cardAttributes}
          count={selectedIds.length}
          onApply={applyBulkAttribute}
          onClose={() => setBulkEditing(false)}
        />
      )}
    </div>
  );
}
