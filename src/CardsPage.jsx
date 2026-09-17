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

// Color, Description, and Attributes — the fields a single card and a
// bulk edit have in common (everything but the name).
function CardFieldset({ color, description, attributeValues, attributes, onColorChange, onDescriptionChange, onAttributeChange }) {
  return (
    <>
      <label className="field-label">
        Color
        <input type="color" className="color-input" value={color} onChange={(e) => onColorChange(e.target.value)} />
      </label>
      <label className="field-label">
        Description
        <textarea
          className="card-description"
          placeholder="Description shown in the UI…"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
      </label>
      {attributes.length > 0 && (
        <div className="field-label">
          Attributes
          <div className="card-attribute-fields">
            {attributes.map((a) => (
              <label key={a.id} className="card-attribute-field">
                <span>{a.name}</span>
                <input value={attributeValues[a.id] ?? ''} onChange={(e) => onAttributeChange(a.id, e.target.value)} />
              </label>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function CardEditor({ card, attributes, onChange, onDuplicate, onDelete, onClose }) {
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
          <CardFieldset
            color={card.color}
            description={card.description}
            attributeValues={card.attributes}
            attributes={attributes}
            onColorChange={(color) => onChange({ ...card, color })}
            onDescriptionChange={(description) => onChange({ ...card, description })}
            onAttributeChange={(attrId, value) => onChange({ ...card, attributes: { ...card.attributes, [attrId]: value } })}
          />
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

// The same editor, just with no name field — a shared name across many
// cards wouldn't mean anything. Only fields actually touched get applied,
// so leaving Description blank doesn't wipe out what was already there.
function BulkEditPanel({ attributes, count, onApply, onClose }) {
  const [color, setColor] = useState('#ffffff');
  const [description, setDescription] = useState('');
  const [attributeValues, setAttributeValues] = useState({});
  const [touched, setTouched] = useState({ color: false, description: false, attrs: new Set() });

  const touch = (key) => setTouched((prev) => ({ ...prev, [key]: true }));
  const touchAttr = (attrId) => setTouched((prev) => ({ ...prev, attrs: new Set(prev.attrs).add(attrId) }));

  const apply = () => {
    const patch = {};
    if (touched.color) patch.color = color;
    if (touched.description) patch.description = description;
    if (touched.attrs.size > 0) patch.attributes = Object.fromEntries([...touched.attrs].map((id) => [id, attributeValues[id] ?? '']));
    onApply(patch);
    onClose();
  };

  const hasChanges = touched.color || touched.description || touched.attrs.size > 0;

  return (
    <div className="side-panel-backdrop" onClick={onClose}>
      <div className="side-panel wide" onClick={(e) => e.stopPropagation()}>
        <div className="side-panel-head">
          <span>
            Bulk Edit {count} Card{count === 1 ? '' : 's'}
          </span>
          <button className="icon-btn" title="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="side-panel-body">
          <div className="empty-hint">Only fields you change here get applied — the rest are left alone.</div>
          <CardFieldset
            color={color}
            description={description}
            attributeValues={attributeValues}
            attributes={attributes}
            onColorChange={(v) => {
              setColor(v);
              touch('color');
            }}
            onDescriptionChange={(v) => {
              setDescription(v);
              touch('description');
            }}
            onAttributeChange={(attrId, v) => {
              setAttributeValues((prev) => ({ ...prev, [attrId]: v }));
              touchAttr(attrId);
            }}
          />
          <button className="btn btn-primary" disabled={!hasChanges} onClick={apply}>
            Apply to {count} card{count === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Duplicate names get an incrementing number at the end instead of
// "Copy" — strip any trailing number first so repeated duplicates don't
// pile up ("Card 1" -> "Card 2" -> "Card 3", not "Card 1 Copy Copy").
function nextDuplicateName(name, existingNames) {
  const base = name.replace(/\s+\d+$/, '');
  let n = 1;
  while (existingNames.includes(`${base} ${n}`)) n += 1;
  return `${base} ${n}`;
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
    const name = nextDuplicateName(source.name, cards.map((c) => c.name));
    const copy = { ...source, id: uid('card'), name, attributes: { ...source.attributes } };
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
    let names = cards.map((c) => c.name);
    const copies = [];
    cards
      .filter((c) => selectedIds.includes(c.id))
      .forEach((c) => {
        const name = nextDuplicateName(c.name, names);
        names = [...names, name];
        copies.push({ ...c, id: uid('card'), name, attributes: { ...c.attributes } });
      });
    setCards([...cards, ...copies]);
    setSelectedIds(copies.map((c) => c.id));
  };
  const applyBulkEdit = (patch) =>
    setCards(
      cards.map((c) => {
        if (!selectedIds.includes(c.id)) return c;
        return {
          ...c,
          ...(patch.color !== undefined ? { color: patch.color } : null),
          ...(patch.description !== undefined ? { description: patch.description } : null),
          ...(patch.attributes ? { attributes: { ...c.attributes, ...patch.attributes } } : null),
        };
      })
    );

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
                      Bulk Edit ({selectedIds.length})
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
        <BulkEditPanel attributes={cardAttributes} count={selectedIds.length} onApply={applyBulkEdit} onClose={() => setBulkEditing(false)} />
      )}
    </div>
  );
}
