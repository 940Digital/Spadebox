import { useState } from 'react';
import { newDeck, newDiscard, newHand, newPlayer, newResource, RESOURCE_KINDS } from './store';

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

// The starting composition of a card-holding zone — "how many of each
// card does this pile start with". This is what the engine expands into
// an actual stack when a play session starts (see engine.js).
function CardCountsEditor({ cardCounts, onChange, cards }) {
  const setQty = (cardId, qty) => {
    const n = Math.max(0, Number(qty) || 0);
    const next = { ...cardCounts };
    if (n === 0) delete next[cardId];
    else next[cardId] = n;
    onChange(next);
  };

  if (cards.length === 0) return <div className="empty-hint">No cards defined yet — add some in the Cards tab.</div>;

  return (
    <div className="resource-list">
      {cards.map((c) => (
        <div className="connect-row" key={c.id}>
          <span className="resource-name">{c.name}</span>
          <input
            type="number"
            className="step-number"
            min="0"
            value={cardCounts[c.id] ?? 0}
            onChange={(e) => setQty(c.id, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}

function ResourceEditor({ item, kind, onChange, onDelete, onClose, connectOptions, cards }) {
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

          {kind !== 'resource' && (
            <div className="field-label">
              Starting Cards
              <CardCountsEditor cardCounts={item.cardCounts} onChange={(cardCounts) => onChange({ ...item, cardCounts })} cards={cards} />
            </div>
          )}

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
  cards,
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
                {kind !== 'resource' && Object.keys(item.cardCounts ?? {}).length > 0 && (
                  <span className="phase-chip">{Object.values(item.cardCounts).reduce((a, b) => a + b, 0)} cards</span>
                )}
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
          cards={cards}
        />
      )}
    </div>
  );
}
