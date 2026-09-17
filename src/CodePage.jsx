import { useRef, useState } from 'react';
import { createGame, RejectError } from './engine';

const API_REFERENCE = [
  'game.shuffle(zoneName)',
  'game.draw(fromZoneName, toZoneName, count)',
  "game.deal(fromZoneName, count)  // deals to every hand",
  'game.topCard(zoneName)  // -> card def id, or null',
  'game.allCards(zoneName)  // -> array of card def ids',
  'game.moveCard(cardIdOrName, fromZoneName, toZoneName)',
  'game.hide(zoneName) / game.show(zoneName)',
  'game.attr(cardIdOrName, attributeName)',
  'game.cardName(cardIdOrName)',
  'game.getVar(name) / game.setVar(name, value)',
  'game.players  // [{ id, name }]',
  "game.on(eventName, handler)  // e.g. game.on('cardPlayed', ({card, from, to}) => {...})",
  'game.reject(reason)  // call inside a handler to block a move',
  'game.log(message)',
];

export default function CodePage({ code, setCode, players, decks, discards, hands, cards, cardAttributes, variables }) {
  const [log, setLog] = useState([]);
  const [session, setSession] = useState(null); // { game, _internal }
  const [error, setError] = useState(null);
  const [eventName, setEventName] = useState('cardPlayed');
  const [cardId, setCardId] = useState('');
  const [fromZone, setFromZone] = useState('');
  const [toZone, setToZone] = useState('');
  const logEndRef = useRef(null);

  const appendLog = (message) => {
    setLog((prev) => [...prev.slice(-199), { id: prev.length, message }]);
    requestAnimationFrame(() => logEndRef.current?.scrollIntoView({ block: 'nearest' }));
  };

  const runSetup = () => {
    setError(null);
    setLog([]);
    const built = createGame({ players, decks, discards, hands, cards, cardAttributes, variables }, { onLog: appendLog });
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('game', code);
      fn(built.game);
      appendLog('Setup code ran.');
      setSession(built);
    } catch (err) {
      setError(err instanceof RejectError ? `Rejected: ${err.message}` : err.message);
      setSession(built);
    }
  };

  // Zones are mutated in place inside the engine session, so after firing
  // an event we bump a counter just to force the live pile view to re-read
  // them (log lines already flow through appendLog as they happen).
  const [, setTick] = useState(0);

  const fireEvent = () => {
    if (!session) return;
    setError(null);
    try {
      session._internal.fire(eventName, { card: cardId, from: fromZone, to: toZone });
      setTick((t) => t + 1);
    } catch (err) {
      setError(err.message);
    }
  };

  const allZoneNames = [...decks, ...discards, ...hands].map((z) => z.name);

  return (
    <div className="page code-page">
      <div className="page-header">
        <h1>Code</h1>
        <button className="btn btn-primary" onClick={runSetup}>
          Run Setup
        </button>
      </div>

      <div className="code-layout">
        <div className="code-editor-col">
          <textarea className="code-editor" value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} />
          {error && <div className="code-error">{error}</div>}
        </div>

        <div className="code-side-col">
          <div className="editor-section">
            <div className="editor-section-title">API Reference</div>
            <div className="api-reference">
              {API_REFERENCE.map((line) => (
                <div key={line} className="api-reference-line">
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div className="editor-section">
            <div className="editor-section-title">Fire a Test Event</div>
            <div className="connect-row">
              <input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="event name" style={{ width: 100 }} />
              <select value={cardId} onChange={(e) => setCardId(e.target.value)}>
                <option value="">card…</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select value={fromZone} onChange={(e) => setFromZone(e.target.value)}>
                <option value="">from…</option>
                {allZoneNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <select value={toZone} onChange={(e) => setToZone(e.target.value)}>
                <option value="">to…</option>
                {allZoneNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <button className="btn btn-sm" disabled={!session} onClick={fireEvent}>
                Fire
              </button>
            </div>
            {!session && <div className="empty-hint">Run Setup first to start a play session.</div>}
          </div>

          {session && (
            <div className="editor-section">
              <div className="editor-section-title">Live Piles</div>
              <div className="resource-list">
                {session._internal.zones().map((z) => (
                  <div className="connect-row" key={z.id}>
                    <span className="resource-name">
                      {z.name} ({z.kind})
                    </span>
                    <span className="step-word">{z.pile.map((id) => session.game.cardName(id)).join(', ') || 'empty'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="editor-section">
            <div className="editor-section-title">Log</div>
            <div className="event-log-list code-log">
              {log.map((l) => (
                <div className="event-log-row" key={l.id}>
                  {l.message}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
