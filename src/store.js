// Minimal shared state for the sandbox. Lifted into App.jsx and passed down
// as props — no context/reducer machinery yet, kept deliberately simple
// since we're rebuilding from scratch and more sections are coming later.
//
// The UI here only manages data and layout: cards, resources, positions.
// Actual game behavior is written as real JavaScript in the Code tab
// against the engine API (see engine.js) — there's no visual logic
// builder anymore.

let counter = 0;
export function uid(prefix) {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

// The exact set of kinds the "+ Add Resource" picker offers.
export const RESOURCE_KINDS = [
  { value: 'resource', label: 'Resource' },
  { value: 'deck', label: 'Deck' },
  { value: 'discard', label: 'Discard Pile' },
  { value: 'hand', label: 'Hand' },
];

export function newResource(name = 'New Resource', value = 0) {
  return { id: uid('resource'), name, value: Number(value) || 0 };
}

export function newVariable(name = 'New Variable', value = 0) {
  return { id: uid('variable'), name, value: Number(value) || 0 };
}

export function newPlayer(name = 'Player') {
  return { id: uid('player'), name };
}

// Decks, discards and hands are the connectable, card-holding pieces of
// the table: a discard can feed back into a deck, a hand can discard into
// a discard pile, and a hand can belong to a player. `cardCounts` is the
// starting composition — { cardDefId: quantity } — expanded into an
// actual stack of cards when a play session starts (see engine.js).
export function newDeck(name = 'New Deck') {
  return { id: uid('deck'), name, reshuffleFromDiscardId: '', cardCounts: {} };
}

export function newDiscard(name = 'New Discard') {
  return { id: uid('discard'), name, connectsToDeckId: '', cardCounts: {} };
}

export function newHand(name = 'New Hand') {
  return { id: uid('hand'), name, playerId: '', discardId: '', cardCounts: {} };
}

// An attribute is a shared property definition every card has a slot for —
// like a spreadsheet column ("Color", "Number", "Suit"). Every card fills
// in its own value; there's no picking which attributes apply, since they
// all do. This is what lets "if this card's Suit equals that card's Suit"
// mean something in code, which a plain grouping/tag never could.
export function newCardAttribute(name = 'New Attribute') {
  return { id: uid('attr'), name };
}

export function newCard(name = 'New Card') {
  return { id: uid('card'), name, description: '', color: '#ffffff', attributes: {} };
}

// A phase is just a named step in the general turn sequence now — a label
// to write code against (e.g. `game.phase === 'Draw'`), not a container
// for logic. Nothing here is executable; the Code tab is.
export function newPhase(name = 'New Phase') {
  return { id: uid('phase'), name };
}

const STORAGE_KEY = 'spadebox:state';

const DEFAULT_CODE = `// Write real JavaScript here against the built-in \`game\` API.
// Everything below is optional starter code — replace it with your own.
//
// game.shuffle(zoneName)
// game.draw(fromZoneName, toZoneName, count)
// game.deal(fromZoneName, count)            // deals to every hand
// game.topCard(zoneName)                    // -> card def id, or null
// game.moveCard(cardId, fromZoneName, toZoneName)
// game.hide(zoneName) / game.show(zoneName) // face down / face up
// game.attr(cardId, attributeName)          // read a card's attribute
// game.cardName(cardId)
// game.getVar(name) / game.setVar(name, value)
// game.players                              // [{ id, name }]
// game.on(eventName, handler)               // register a background rule
// game.reject(reason)                       // call inside a handler to block a move
// game.log(message)

game.on('cardPlayed', ({ card, from, to }) => {
  const topOfDiscard = game.topCard('Discard');
  if (!topOfDiscard) return; // nothing to match yet
  const sameColor = game.attr(card, 'Color') === game.attr(topOfDiscard, 'Color');
  const sameNumber = game.attr(card, 'Number') === game.attr(topOfDiscard, 'Number');
  if (!sameColor && !sameNumber) {
    game.reject(\`\${game.cardName(card)} doesn't match the top of the discard pile\`);
  }
});
`;

// Upgrades state saved by older versions of the app. Anything from the
// retired Phases step-builder or resource Functions builder has no
// equivalent anymore — it's just dropped, keeping names where sensible.
function normalize(state) {
  const migratePhase = (p) => ({ id: p.id, name: p.name });

  const migrateZone = (z) => ({
    id: z.id,
    name: z.name,
    ...(('reshuffleFromDiscardId' in z) && { reshuffleFromDiscardId: z.reshuffleFromDiscardId }),
    ...(('connectsToDeckId' in z) && { connectsToDeckId: z.connectsToDeckId }),
    ...(('playerId' in z) && { playerId: z.playerId }),
    ...(('discardId' in z) && { discardId: z.discardId }),
    cardCounts: z.cardCounts ?? {},
  });

  const migrateCard = (c) => {
    if (c.attributes) return c;
    const { classIds, ...rest } = c;
    return { ...rest, attributes: {} };
  };

  return {
    resources: state.resources ?? [],
    variables: state.variables ?? [],
    phases: (state.phases ?? []).map(migratePhase),
    players: state.players ?? [],
    decks: (state.decks ?? []).map(migrateZone),
    discards: (state.discards ?? []).map(migrateZone),
    hands: (state.hands ?? []).map(migrateZone),
    cardAttributes: state.cardAttributes ?? [],
    cards: (state.cards ?? []).map(migrateCard),
    layout: state.layout ?? {},
    code: typeof state.code === 'string' ? state.code : DEFAULT_CODE,
  };
}

export function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {
    // fall through to defaults
  }
  return {
    resources: [],
    variables: [],
    phases: [newPhase('Set Up')],
    players: [],
    decks: [],
    discards: [],
    hands: [],
    cardAttributes: [],
    cards: [],
    layout: {},
    code: DEFAULT_CODE,
  };
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable — session continues in-memory only
  }
}
