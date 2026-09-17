import { useState } from 'react';
import {
  FUNCTION_ACTIONS,
  newDeck,
  newDiscard,
  newFunctionClause,
  newHand,
  newPlayer,
  newResource,
  newResourceFunction,
  OPERATORS,
  RESOURCE_KINDS,
} from './store';

function Section({ title, children }) {
  return (
    <div className="editor-section">
      <div className="editor-section-title">{title}</div>
      {children}
    </div>
  );
}

function ConnectSelect({ value, onChange, options, none = 'none' }) {
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">{none}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}

// A side panel of every resource kind there is — opened by "+ Add
// Resource". Picking one creates that kind instead of each kind having
// its own separate add button.
function ResourcePicker({ onSelect, onClose }) {
  return (
    <div className="side-panel-backdrop" onClick={onClose}>
      <div className="side-panel" onClick={(e) => e.stopPropagation()}>
        <div className="side-panel-head">
          <span>Add Resource</span>
          <button className="icon-btn" title="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="step-picker-list">
          {RESOURCE_KINDS.map((k) => (
            <button key={k.value} className="step-picker-option" onClick={() => onSelect(k.value)}>
              {k.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// "(attribute) of (card source)" — the source is either the active card
// (the one being checked) or the top card of a named deck/discard/hand.
function FieldRefEditor({ value, onChange, cardAttributes, cardSources }) {
  return (
    <span className="condition-fields">
      <select value={value.attrId} onChange={(e) => onChange({ ...value, attrId: e.target.value })}>
        <option value="" disabled>
          attribute…
        </option>
        {cardAttributes.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      <span className="step-word">of</span>
      <select value={value.source} onChange={(e) => onChange({ ...value, source: e.target.value })}>
        <option value="active_card">Active Card</option>
        {cardSources.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </span>
  );
}

function FunctionRule({ fn, onChange, onRemove, cardAttributes, cardSources }) {
  return (
    <div className="function-rule">
      <div className="function-rule-head">
        <label className="bulk-select-all">
          <input type="checkbox" checked={fn.negate} onChange={(e) => onChange({ ...fn, negate: e.target.checked })} />
          If not
        </label>
        <span className="step-word">then</span>
        <select value={fn.action} onChange={(e) => onChange({ ...fn, action: e.target.value })}>
          {FUNCTION_ACTIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <button className="icon-btn danger" title="Remove function" onClick={onRemove}>
          ✕
        </button>
      </div>
      <div className="clause-list">
        {fn.clauses.map((clause, i) => (
          <div className="clause-row" key={clause.id}>
            {i > 0 && (
              <select className="combine-select" value={fn.combine} onChange={(e) => onChange({ ...fn, combine: e.target.value })}>
                <option value="and">AND</option>
                <option value="or">OR</option>
              </select>
            )}
            <FieldRefEditor
              value={clause.left}
              onChange={(left) => onChange({ ...fn, clauses: fn.clauses.map((c) => (c.id === clause.id ? { ...c, left } : c)) })}
              cardAttributes={cardAttributes}
              cardSources={cardSources}
            />
            <select value={clause.op} onChange={(e) => onChange({ ...fn, clauses: fn.clauses.map((c) => (c.id === clause.id ? { ...c, op: e.target.value } : c)) })}>
              {OPERATORS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <FieldRefEditor
              value={clause.right}
              onChange={(right) => onChange({ ...fn, clauses: fn.clauses.map((c) => (c.id === clause.id ? { ...c, right } : c)) })}
              cardAttributes={cardAttributes}
              cardSources={cardSources}
            />
            {fn.clauses.length > 1 && (
              <button
                className="icon-btn danger"
                title="Remove condition"
                onClick={() => onChange({ ...fn, clauses: fn.clauses.filter((c) => c.id !== clause.id) })}
              >
                ✕
              </button>
            )}
            {i === fn.clauses.length - 1 && (
              <button
                className="icon-btn"
                title="Add another condition (AND/OR)"
                onClick={() => onChange({ ...fn, clauses: [...fn.clauses, newFunctionClause()] })}
              >
                +
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResourceEditor({ item, kind, onChange, onDelete, onClose, connectOptions, cardAttributes, cardSources }) {
  const addFunction = () => onChange({ ...item, functions: [...item.functions, newResourceFunction()] });
  const updateFunction = (id, next) => onChange({ ...item, functions: item.functions.map((f) => (f.id === id ? next : f)) });
  const removeFunction = (id) => onChange({ ...item, functions: item.functions.filter((f) => f.id !== id) });

  return (
    <div className="side-panel-backdrop" onClick={onClose}>
      <div className="side-panel wide" onClick={(e) => e.stopPropagation()}>
        <div className="side-panel-head">
          <span>Edit {RESOURCE_KINDS.find((k) => k.value === kind)?.label}</span>
          <button className="icon-btn" title="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="side-panel-body">
          <label className="field-label">
            Name
            <input value={item.name} onChange={(e) => onChange({ ...item, name: e.target.value })} />
          </label>

          {kind === 'resource' && (
            <label className="field-label">
              Value
              <input type="number" value={item.value} onChange={(e) => onChange({ ...item, value: Number(e.target.value) })} />
            </label>
          )}
          {kind === 'deck' && (
            <label className="field-label">
              Reshuffles from
              <ConnectSelect value={item.reshuffleFromDiscardId} onChange={(v) => onChange({ ...item, reshuffleFromDiscardId: v })} options={connectOptions.discards} none="no discard" />
            </label>
          )}
          {kind === 'discard' && (
            <label className="field-label">
              Connects to
              <ConnectSelect value={item.connectsToDeckId} onChange={(v) => onChange({ ...item, connectsToDeckId: v })} options={connectOptions.decks} none="no deck" />
            </label>
          )}
          {kind === 'hand' && (
            <>
              <label className="field-label">
                Belongs to
                <ConnectSelect value={item.playerId} onChange={(v) => onChange({ ...item, playerId: v })} options={connectOptions.players} none="no player" />
              </label>
              <label className="field-label">
                Discards to
                <ConnectSelect value={item.discardId} onChange={(v) => onChange({ ...item, discardId: v })} options={connectOptions.discards} none="no discard" />
              </label>
            </>
          )}

          <div className="field-label">
            Functions
            {item.functions.length === 0 && <div className="empty-hint">No functions yet.</div>}
            <div className="step-list">
              {item.functions.map((fn) => (
                <FunctionRule
                  key={fn.id}
                  fn={fn}
                  onChange={(next) => updateFunction(fn.id, next)}
                  onRemove={() => removeFunction(fn.id)}
                  cardAttributes={cardAttributes}
                  cardSources={cardSources}
                />
              ))}
              <button className="add-pill" onClick={addFunction}>
                + Function
              </button>
            </div>
          </div>

          <button className="btn btn-danger" onClick={onDelete}>
            Delete {RESOURCE_KINDS.find((k) => k.value === kind)?.label}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResourcesPage({
  resources,
  setResources,
  players,
  setPlayers,
  decks,
  setDecks,
  discards,
  setDiscards,
  hands,
  setHands,
  cardAttributes,
}) {
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState(null); // { kind, id }

  const setPlayerCount = (count) => {
    const n = Math.max(0, Number(count) || 0);
    if (n === players.length) return;
    if (n < players.length) {
      setPlayers(players.slice(0, n));
    } else {
      const added = Array.from({ length: n - players.length }, (_, i) => newPlayer(`Player ${players.length + i + 1}`));
      setPlayers([...players, ...added]);
    }
  };
  const renamePlayer = (id, name) => setPlayers(players.map((p) => (p.id === id ? { ...p, name } : p)));

  const listFor = (kind) => ({ resource: resources, deck: decks, discard: discards, hand: hands })[kind];
  const setterFor = (kind) => ({ resource: setResources, deck: setDecks, discard: setDiscards, hand: setHands })[kind];
  const factoryFor = (kind) => ({ resource: newResource, deck: newDeck, discard: newDiscard, hand: newHand })[kind];

  const addResourceOfKind = (kind) => {
    const list = listFor(kind);
    const item = factoryFor(kind)(`${RESOURCE_KINDS.find((k) => k.value === kind).label} ${list.length + 1}`);
    setterFor(kind)([...list, item]);
    setPicking(false);
    setEditing({ kind, id: item.id });
  };

  const updateItem = (kind, next) => setterFor(kind)(listFor(kind).map((i) => (i.id === next.id ? next : i)));
  const removeItem = (kind, id) => {
    setterFor(kind)(listFor(kind).filter((i) => i.id !== id));
    if (kind === 'discard') {
      setDecks(decks.map((d) => (d.reshuffleFromDiscardId === id ? { ...d, reshuffleFromDiscardId: '' } : d)));
      setHands(hands.map((h) => (h.discardId === id ? { ...h, discardId: '' } : h)));
    }
    if (kind === 'deck') {
      setDiscards(discards.map((d) => (d.connectsToDeckId === id ? { ...d, connectsToDeckId: '' } : d)));
    }
    setEditing(null);
  };

  const cardSources = [
    ...decks.map((d) => ({ value: `top:${d.id}`, label: `Top Card of ${d.name} (Deck)` })),
    ...discards.map((d) => ({ value: `top:${d.id}`, label: `Top Card of ${d.name} (Discard)` })),
    ...hands.map((h) => ({ value: `top:${h.id}`, label: `Top Card of ${h.name} (Hand)` })),
  ];

  const editingItem = editing ? listFor(editing.kind).find((i) => i.id === editing.id) : null;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Resources</h1>
        <button className="btn btn-primary" onClick={() => setPicking(true)}>
          + Add Resource
        </button>
      </div>

      <Section title="Players">
        <div className="player-count-row">
          <span className="step-word">Number of players:</span>
          <input type="number" className="step-number" min="0" value={players.length} onChange={(e) => setPlayerCount(e.target.value)} />
        </div>
        {players.length > 0 && (
          <div className="resource-list">
            {players.map((p) => (
              <div className="resource-row" key={p.id}>
                <input className="resource-name" value={p.name} onChange={(e) => renamePlayer(p.id, e.target.value)} />
              </div>
            ))}
          </div>
        )}
      </Section>

      {[
        { kind: 'resource', title: 'Resources', items: resources },
        { kind: 'deck', title: 'Decks', items: decks },
        { kind: 'discard', title: 'Discard Piles', items: discards },
        { kind: 'hand', title: 'Hands', items: hands },
      ].map(({ kind, title, items }) => (
        <Section title={title} key={kind}>
          {items.length === 0 && <div className="empty-hint">None yet.</div>}
          <div className="resource-list">
            {items.map((item) => (
              <button className="connect-row resource-open-row" key={item.id} onClick={() => setEditing({ kind, id: item.id })}>
                <span className="resource-name">{item.name}</span>
                {item.functions?.length > 0 && <span className="phase-chip">{item.functions.length} function{item.functions.length === 1 ? '' : 's'}</span>}
              </button>
            ))}
          </div>
        </Section>
      ))}

      {picking && <ResourcePicker onSelect={addResourceOfKind} onClose={() => setPicking(false)} />}

      {editingItem && (
        <ResourceEditor
          item={editingItem}
          kind={editing.kind}
          onChange={(next) => updateItem(editing.kind, next)}
          onDelete={() => removeItem(editing.kind, editingItem.id)}
          onClose={() => setEditing(null)}
          connectOptions={{ decks, discards, players }}
          cardAttributes={cardAttributes}
          cardSources={cardSources}
        />
      )}
    </div>
  );
}
