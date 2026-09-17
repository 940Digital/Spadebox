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

// The only three kinds of step a phase can contain. A resource change is a
// built-in kind of Function, not its own step type.
export const STEP_TYPES = [
  { value: 'variable', label: 'Variable' },
  { value: 'function', label: 'Function' },
  { value: 'condition', label: 'Condition' },
];

export const FUNCTION_KINDS = [
  { value: 'add_resource', label: 'Add Resource' },
  { value: 'custom', label: 'Custom Function' },
];

export function newResource(name = 'New Resource', value = 0) {
  return { id: uid('resource'), name, value: Number(value) || 0 };
}

export function newVariable(name = 'New Variable', value = 0) {
  return { id: uid('variable'), name, value: Number(value) || 0 };
}

// A condition clause is always variable-based: no other kind can gate a
// step or a transition yet.
export function newConditionClause() {
  return { id: uid('clause'), variableId: '', op: '==', value: '' };
}

export function newStep(type = 'variable') {
  const base = { id: uid('step'), type };
  if (type === 'variable') {
    return { ...base, variableId: '', op: 'set', amount: 0 };
  }
  if (type === 'function') {
    return { ...base, functionKind: 'add_resource', resourceId: '', amount: 0, functionName: '' };
  }
  // 'condition' — a container: tapping it just gives you a place to nest
  // more steps. Supports combining clauses with and/or, plus an optional
  // else branch. Nothing stops a condition's own then/else lists from
  // containing another condition, which is how you loop something inside
  // itself indefinitely.
  return {
    ...base,
    clauses: [newConditionClause()],
    combine: 'and', // 'and' | 'or'
    thenSteps: [],
    elseSteps: null, // null = no else branch yet
  };
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

// Converts one old-shape step (type: add_resource | change_variable |
// call_function, optionally with an attached `condition`) into the new
// variable/function/condition shape.
function migrateStep(s) {
  let migrated;
  if (s.type === 'change_variable') {
    migrated = { id: s.id, type: 'variable', variableId: s.variableId ?? '', op: s.op ?? 'set', amount: s.amount ?? 0 };
  } else if (s.type === 'add_resource') {
    migrated = { id: s.id, type: 'function', functionKind: 'add_resource', resourceId: s.resourceId ?? '', amount: s.amount ?? 0, functionName: '' };
  } else if (s.type === 'call_function') {
    migrated = { id: s.id, type: 'function', functionKind: 'custom', functionName: s.functionName ?? '', resourceId: '', amount: 0 };
  } else {
    return s; // already new-shape
  }
  if (s.condition) {
    return {
      id: uid('step'),
      type: 'condition',
      clauses: [{ id: uid('clause'), ...s.condition }],
      combine: 'and',
      thenSteps: [migrated],
      elseSteps: null,
    };
  }
  return migrated;
}

// Upgrades state saved by older versions of the app.
function normalize(state) {
  const migrateTransition = (t) => ({ ...t, condition: t.condition ?? newConditionClause() });

  const migratePhase = (p) => {
    if (p.transitions) return { ...p, steps: (p.steps ?? []).map(migrateStep), transitions: p.transitions.map(migrateTransition) };
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
    return { ...rest, steps: (p.steps ?? []).map(migrateStep), transitions };
  };

  return {
    resources: state.resources ?? [],
    variables: state.variables ?? [],
    phases: (state.phases ?? []).map(migratePhase),
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
