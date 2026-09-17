// Minimal shared state for the sandbox. Lifted into App.jsx and passed down
// as props — no context/reducer machinery yet, kept deliberately simple
// since we're rebuilding from scratch and more sections are coming later.

let counter = 0;
export function uid(prefix) {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

export const OPERATORS = [
  { value: '==', label: 'equals' },
  { value: '!=', label: 'does not equal' },
  { value: '>', label: 'is greater than' },
  { value: '<', label: 'is less than' },
  { value: '>=', label: 'is greater or equal to' },
  { value: '<=', label: 'is less or equal to' },
];

// Every kind of step a phase can contain. This is the exact list the
// "Add Step" side panel offers — nothing more, nothing less. Resources are
// no longer touched from a phase — they're set up entirely in the
// Resources tab now.
export const STEP_TYPES = [
  { value: 'condition', label: 'Condition' },
  { value: 'variable', label: 'Variable' },
  { value: 'deal', label: 'Deal' },
  { value: 'shuffle', label: 'Shuffle' },
  { value: 'discard', label: 'Discard' },
  { value: 'show', label: 'Show' },
  { value: 'hide', label: 'Hide' },
];

export const CARD_ZONES = [
  { value: 'hand', label: 'Hand' },
  { value: 'deck', label: 'Deck' },
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

// Decks, discards and hands are the connectable pieces of the table: a
// discard can feed back into a deck, a hand can discard into a discard
// pile, and a hand can belong to a player.
export function newDeck(name = 'New Deck') {
  return { id: uid('deck'), name, reshuffleFromDiscardId: '' };
}

export function newDiscard(name = 'New Discard') {
  return { id: uid('discard'), name, connectsToDeckId: '' };
}

export function newHand(name = 'New Hand') {
  return { id: uid('hand'), name, playerId: '', discardId: '' };
}

export function newCardClass(name = 'New Class') {
  return { id: uid('class'), name, color: '#6b3bff' };
}

export function newCard(name = 'New Card') {
  return { id: uid('card'), name, classIds: [], description: '', color: '#ffffff' };
}

// A condition clause is always variable-based: no other kind can gate a
// step or a transition yet.
export function newConditionClause() {
  return { id: uid('clause'), variableId: '', op: '==', value: '' };
}

export function newStep(type) {
  const base = { id: uid('step'), type };
  switch (type) {
    case 'variable':
      return { ...base, variableId: '', op: 'set', amount: 0 };
    case 'deal':
      return { ...base, fromZone: 'deck', toZone: 'hand', count: 1 };
    case 'shuffle':
      return base; // only the deck can be shuffled right now — nothing to configure
    case 'discard':
      return base;
    case 'show':
    case 'hide':
      return { ...base, count: 'all', zone: 'hand' };
    case 'condition':
    default:
      // A container: picking it just gives you somewhere to nest more
      // steps. Clauses combine with and/or, plus an optional else branch.
      // Nothing stops a condition's own then/else lists from containing
      // another condition, which is how you loop something inside itself
      // indefinitely.
      return {
        ...base,
        type: 'condition',
        clauses: [newConditionClause()],
        combine: 'and', // 'and' | 'or'
        thenSteps: [],
        elseSteps: null, // null = no else branch yet
      };
  }
}

// A transition is "next phase: X on condition Y" — an empty condition
// (no variable picked) just means it always fires. A phase can have
// several, evaluated in order; the first whose condition is met (or is
// empty) wins. Pointing a transition at an earlier phase (or itself) is
// how looping works — a phase can loop forever inside itself this way.
export function newTransition(targetPhaseId = '') {
  return { id: uid('transition'), targetPhaseId, condition: newConditionClause() };
}

export function newPhase(name = 'New Phase') {
  return {
    id: uid('phase'),
    name,
    steps: [],
    transitions: [],
  };
}

const STORAGE_KEY = 'spadebox:state';

// Converts one old-shape step into the current shape. Recurses into a
// condition's then/else branches, since those can hold old-shape steps too.
// "Add Resource" steps have no replacement — resources are configured in
// the Resources tab now, so those steps are simply dropped.
function migrateStep(s) {
  if (s.type === 'condition') {
    return {
      ...s,
      thenSteps: (s.thenSteps ?? []).map(migrateStep).filter(Boolean),
      elseSteps: s.elseSteps ? s.elseSteps.map(migrateStep).filter(Boolean) : null,
    };
  }
  if (s.type === 'change_variable') {
    return { id: s.id, type: 'variable', variableId: s.variableId ?? '', op: s.op ?? 'set', amount: s.amount ?? 0 };
  }
  if (s.type === 'add_resource') return null;
  if (s.type === 'function') {
    if (s.functionKind === 'add_resource') return null;
    return null;
  }
  if (s.condition) {
    // Oldest shape: a flat step with an attached `condition` — wrap it.
    const { condition, ...flat } = s;
    const migratedFlat = migrateStep(flat);
    if (!migratedFlat) return null;
    return {
      id: uid('step'),
      type: 'condition',
      clauses: [{ id: uid('clause'), ...condition }],
      combine: 'and',
      thenSteps: [migratedFlat],
      elseSteps: null,
    };
  }
  return s; // already current-shape
}

// Upgrades state saved by older versions of the app.
function normalize(state) {
  const migrateTransition = (t) => ({ ...t, condition: t.condition ?? newConditionClause() });

  const migratePhase = (p) => {
    if (p.transitions) return { ...p, steps: (p.steps ?? []).map(migrateStep).filter(Boolean), transitions: p.transitions.map(migrateTransition) };
    const legacyLoop = p.loop;
    const transitions = legacyLoop?.targetPhaseId
      ? [
          {
            id: uid('transition'),
            targetPhaseId: legacyLoop.targetPhaseId,
            condition: legacyLoop.breakVariableId
              ? { variableId: legacyLoop.breakVariableId, op: legacyLoop.breakOp, value: legacyLoop.breakValue }
              : newConditionClause(),
          },
        ]
      : [];
    const { loop, ...rest } = p;
    return { ...rest, steps: (p.steps ?? []).map(migrateStep).filter(Boolean), transitions };
  };

  return {
    resources: state.resources ?? [],
    variables: state.variables ?? [],
    phases: (state.phases ?? []).map(migratePhase),
    players: state.players ?? [],
    decks: state.decks ?? [],
    discards: state.discards ?? [],
    hands: state.hands ?? [],
    cardClasses: state.cardClasses ?? [],
    cards: state.cards ?? [],
    layout: state.layout ?? {},
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
    cardClasses: [],
    cards: [],
    layout: {},
  };
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable — session continues in-memory only
  }
}
