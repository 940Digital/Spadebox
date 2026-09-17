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

export function newStep(type = 'add_resource') {
  return {
    id: uid('step'),
    type, // 'add_resource' | 'change_variable' | 'call_function'
    resourceId: '',
    variableId: '',
    op: 'set', // 'set' | 'add' — used by change_variable
    amount: 0,
    functionName: '',
  };
}

export function newPhase(name = 'New Phase') {
  return {
    id: uid('phase'),
    name,
    steps: [],
    loop: {
      targetPhaseId: '', // '' = no loop
      breakVariableId: '',
      breakOp: '==',
      breakValue: '',
    },
  };
}

const STORAGE_KEY = 'spadebox:state';

export function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
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
