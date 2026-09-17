import { newCard, newCardClass } from './store';

function Section({ title, children }) {
  return (
    <div className="editor-section">
      <div className="editor-section-title">{title}</div>
      {children}
    </div>
  );
}

export default function CardsPage({ cardClasses, setCardClasses, cards, setCards }) {
  const addClass = () => setCardClasses([...cardClasses, newCardClass(`Class ${cardClasses.length + 1}`)]);
  const updateClass = (id, patch) => setCardClasses(cardClasses.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const removeClass = (id) => {
    setCardClasses(cardClasses.filter((c) => c.id !== id));
    setCards(cards.map((card) => ({ ...card, classIds: card.classIds.filter((cid) => cid !== id) })));
  };

  const addCard = () => setCards([...cards, newCard(`Card ${cards.length + 1}`)]);
  const updateCard = (id, patch) => setCards(cards.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const removeCard = (id) => setCards(cards.filter((c) => c.id !== id));
  const toggleCardClass = (card, classId) => {
    const has = card.classIds.includes(classId);
    updateCard(card.id, { classIds: has ? card.classIds.filter((id) => id !== classId) : [...card.classIds, classId] });
  };

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
              <input type="color" className="color-input" value={c.color} onChange={(e) => updateClass(c.id, { color: e.target.value })} />
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
        {cards.length === 0 && <div className="empty-hint">No cards yet.</div>}
        <div className="card-grid">
          {cards.map((card) => (
            <div className="card-editor" key={card.id} style={{ borderTopColor: card.color }}>
              <div className="card-editor-row">
                <input type="color" className="color-input" value={card.color} onChange={(e) => updateCard(card.id, { color: e.target.value })} />
                <input className="resource-name" value={card.name} onChange={(e) => updateCard(card.id, { name: e.target.value })} />
                <button className="icon-btn danger" title="Remove card" onClick={() => removeCard(card.id)}>
                  ✕
                </button>
              </div>
              <textarea
                className="card-description"
                placeholder="Description shown in the UI…"
                value={card.description}
                onChange={(e) => updateCard(card.id, { description: e.target.value })}
              />
              {cardClasses.length > 0 && (
                <div className="card-class-chips">
                  {cardClasses.map((c) => (
                    <button
                      key={c.id}
                      className={`class-chip${card.classIds.includes(c.id) ? ' active' : ''}`}
                      style={card.classIds.includes(c.id) ? { background: c.color, borderColor: c.color } : undefined}
                      onClick={() => toggleCardClass(card, c.id)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <button className="add-pill" onClick={addCard}>
          + Card
        </button>
      </Section>
    </div>
  );
}
