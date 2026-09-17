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

export function newResource(name = 'New Resource', value = 0) {
  return { id: uid('resource'), name, value: Number(value) || 0 };
}

export function newVariable(name = 'New Variable', value = 0) {
  return { id: uid('variable'), name, value: Number(value) || 0 };
}

// A condition is always variable-based: no other kind can gate a step or a
// transition yet.
export function newCondition() {
  return { variableId: '', op: '==', value: '' };
}

export function newStep(type = 'add_resource') {
  return {
    id: uid('step'),
    type, // 'add_resource' | 'change_variable' | 'call_function'
    resourceId: '',
    variableId: '',
    op: 'set', // 'set' | 'add' — used by change_variable
    amount: 0,
    functionName: '',
    condition: null, // null = always runs; set = "if this then do this"
  };
}

// A transition is "next phase: X on condition Y" — condition null means it
// always fires (an unconditional default). A phase can have several,
// evaluated in order; the first whose condition is met (or has none) wins.
// Pointing a transition at an earlier phase is how looping works.
export function newTransition(targetPhaseId = '') {
  return { id: uid('transition'), targetPhaseId, condition: null };
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

// Upgrades state saved by older versions of the app (e.g. phases that still
// have the old single `loop` field instead of `transitions`).
function normalize(state) {
  return {
    resources: state.resources ?? [],
    variables: state.variables ?? [],
    phases: (state.phases ?? []).map((p) => {
      if (p.transitions) return { ...p, steps: (p.steps ?? []).map((s) => ({ condition: null, ...s })) };
      const legacyLoop = p.loop;
      const transitions = legacyLoop?.targetPhaseId
        ? [
            {
              id: uid('transition'),
              targetPhaseId: legacyLoop.targetPhaseId,
              condition: legacyLoop.breakVariableId
                ? { variableId: legacyLoop.breakVariableId, op: legacyLoop.breakOp, value: legacyLoop.breakValue }
                : null,
            },
          ]
        : [];
      const { loop, ...rest } = p;
      return { ...rest, steps: (p.steps ?? []).map((s) => ({ condition: null, ...s })), transitions };
    }),
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
  };
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable — session continues in-memory only
  }
}
