import { useState } from 'react';
import { newCondition, newPhase, newResource, newStep, newTransition, newVariable, OPERATORS } from './store';

const STEP_TYPES = [
  { value: 'add_resource', label: 'Add resource' },
  { value: 'change_variable', label: 'Change variable' },
  { value: 'call_function', label: 'Call function' },
];

function EntityPicker({ entities, value, onChange, onCreate, placeholder }) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState('');

  if (creating) {
    return (
      <input
        autoFocus
        className="entity-picker-input"
        placeholder={placeholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft.trim()) {
            const id = onCreate(draft.trim());
            onChange(id);
          }
          setCreating(false);
          setDraft('');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            setCreating(false);
            setDraft('');
          }
        }}
      />
    );
  }

  return (
    <select
      value={value ?? ''}
      onChange={(e) => {
        if (e.target.value === '__new__') setCreating(true);
        else onChange(e.target.value);
      }}
    >
      <option value="" disabled>
        choose…
      </option>
      {entities.map((ent) => (
        <option key={ent.id} value={ent.id}>
          {ent.name}
        </option>
      ))}
      <option value="__new__">+ New…</option>
    </select>
  );
}

// A single "[variable] [operator] [value]" row — shared by step conditions
// and phase transition conditions, since both are the same shape.
function ConditionFields({ condition, onChange, variables, createVariable }) {
  return (
    <span className="condition-fields">
      <EntityPicker
        entities={variables}
        value={condition.variableId}
        onChange={(variableId) => onChange({ ...condition, variableId })}
        onCreate={(name) => createVariable(name)}
        placeholder="variable name"
      />
      <select value={condition.op} onChange={(e) => onChange({ ...condition, op: e.target.value })}>
        {OPERATORS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <input
        className="step-number"
        value={condition.value}
        onChange={(e) => onChange({ ...condition, value: e.target.value })}
      />
    </span>
  );
}

function StepRow({ step, onChange, onRemove, resources, variables, createResource, createVariable }) {
  return (
    <div className="step-row">
      {step.condition ? (
        <div className="step-condition-row">
          <span className="step-word">If</span>
          <ConditionFields
            condition={step.condition}
            onChange={(condition) => onChange({ ...step, condition })}
            variables={variables}
            createVariable={createVariable}
          />
          <button className="btn btn-sm" onClick={() => onChange({ ...step, condition: null })}>
            remove condition
          </button>
        </div>
      ) : (
        <button className="btn btn-sm add-condition-btn" onClick={() => onChange({ ...step, condition: newCondition() })}>
          + If…
        </button>
      )}

      <div className="step-action-row">
        {step.condition && <span className="step-word">then</span>}
        <select value={step.type} onChange={(e) => onChange({ ...step, type: e.target.value })}>
          {STEP_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        {step.type === 'add_resource' && (
          <span className="step-fields">
            <EntityPicker
              entities={resources}
              value={step.resourceId}
              onChange={(resourceId) => onChange({ ...step, resourceId })}
              onCreate={(name) => createResource(name)}
              placeholder="resource name"
            />
            <span className="step-word">by</span>
            <input
              type="number"
              className="step-number"
              value={step.amount}
              onChange={(e) => onChange({ ...step, amount: Number(e.target.value) })}
            />
          </span>
        )}

        {step.type === 'change_variable' && (
          <span className="step-fields">
            <EntityPicker
              entities={variables}
              value={step.variableId}
              onChange={(variableId) => onChange({ ...step, variableId })}
              onCreate={(name) => createVariable(name)}
              placeholder="variable name"
            />
            <select value={step.op} onChange={(e) => onChange({ ...step, op: e.target.value })}>
              <option value="set">set to</option>
              <option value="add">add</option>
            </select>
            <input
              type="number"
              className="step-number"
              value={step.amount}
              onChange={(e) => onChange({ ...step, amount: Number(e.target.value) })}
            />
          </span>
        )}

        {step.type === 'call_function' && (
          <span className="step-fields">
            <input
              placeholder="function name"
              value={step.functionName}
              onChange={(e) => onChange({ ...step, functionName: e.target.value })}
            />
          </span>
        )}

        <button className="btn btn-sm btn-danger" onClick={onRemove}>
          ✕
        </button>
      </div>
    </div>
  );
}

function TransitionRow({ transition, phases, currentPhaseId, variables, createVariable, onChange, onRemove }) {
  return (
    <div className="transition-row">
      <span className="step-word">Next phase:</span>
      <select value={transition.targetPhaseId} onChange={(e) => onChange({ ...transition, targetPhaseId: e.target.value })}>
        <option value="" disabled>
          choose a phase…
        </option>
        {phases.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.id === currentPhaseId ? ' (itself)' : ''}
          </option>
        ))}
      </select>

      {transition.condition ? (
        <>
          <span className="step-word">on</span>
          <ConditionFields
            condition={transition.condition}
            onChange={(condition) => onChange({ ...transition, condition })}
            variables={variables}
            createVariable={createVariable}
          />
          <button className="btn btn-sm" onClick={() => onChange({ ...transition, condition: null })}>
            remove condition
          </button>
        </>
      ) : (
        <>
          <span className="step-word step-word-muted">(always)</span>
          <button className="btn btn-sm" onClick={() => onChange({ ...transition, condition: newCondition() })}>
            + on condition…
          </button>
        </>
      )}

      <button className="btn btn-sm btn-danger" onClick={onRemove}>
        ✕
      </button>
    </div>
  );
}

export default function PhasesPage({ phases, setPhases, resources, setResources, variables, setVariables }) {
  const [selectedId, setSelectedId] = useState(phases[0]?.id ?? null);
  const selected = phases.find((p) => p.id === selectedId) ?? null;

  const createResource = (name) => {
    const r = newResource(name, 0);
    setResources((prev) => [...prev, r]);
    return r.id;
  };
  const createVariable = (name) => {
    const v = newVariable(name, 0);
    setVariables((prev) => [...prev, v]);
    return v.id;
  };

  const updatePhase = (id, patch) => setPhases(phases.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const addPhase = () => {
    const p = newPhase(`Phase ${phases.length + 1}`);
    setPhases([...phases, p]);
    setSelectedId(p.id);
  };
  const removePhase = (id) => {
    setPhases(
      phases
        .filter((p) => p.id !== id)
        .map((p) => ({ ...p, transitions: p.transitions.filter((t) => t.targetPhaseId !== id) }))
    );
    if (selectedId === id) setSelectedId(null);
  };

  const addStep = () => updatePhase(selected.id, { steps: [...selected.steps, newStep('add_resource')] });
  const updateStep = (stepId, next) => updatePhase(selected.id, { steps: selected.steps.map((s) => (s.id === stepId ? next : s)) });
  const removeStep = (stepId) => updatePhase(selected.id, { steps: selected.steps.filter((s) => s.id !== stepId) });

  const addTransition = () => updatePhase(selected.id, { transitions: [...selected.transitions, newTransition()] });
  const updateTransition = (transId, next) =>
    updatePhase(selected.id, { transitions: selected.transitions.map((t) => (t.id === transId ? next : t)) });
  const removeTransition = (transId) =>
    updatePhase(selected.id, { transitions: selected.transitions.filter((t) => t.id !== transId) });

  const conditionSummary = (condition) => {
    const v = variables.find((x) => x.id === condition.variableId);
    return `${v?.name ?? 'variable'} ${OPERATORS.find((o) => o.value === condition.op)?.label ?? condition.op} ${condition.value}`;
  };

  const stepSummary = (step) => {
    const prefix = step.condition ? `if ${conditionSummary(step.condition)} → ` : '';
    if (step.type === 'add_resource') {
      const r = resources.find((x) => x.id === step.resourceId);
      return `${prefix}+${step.amount} ${r?.name ?? 'resource'}`;
    }
    if (step.type === 'change_variable') {
      const v = variables.find((x) => x.id === step.variableId);
      return `${prefix}${v?.name ?? 'variable'} ${step.op === 'set' ? '=' : '+='} ${step.amount}`;
    }
    return `${prefix}call ${step.functionName || '…'}`;
  };

  return (
    <div className="page phases-page">
      <div className="page-header">
        <h1>Phases</h1>
      </div>

      <div className="phases-layout">
        <div className="phase-flow">
          {phases.map((phase, i) => (
            <div className="phase-flow-item" key={phase.id}>
              {i > 0 && <div className="flow-connector" />}
              <button
                className={`phase-node${selectedId === phase.id ? ' active' : ''}`}
                onClick={() => setSelectedId(phase.id)}
              >
                <div className="phase-node-name">{phase.name}</div>
                {phase.steps.length > 0 && (
                  <div className="phase-node-chips">
                    {phase.steps.map((s) => (
                      <span className="phase-chip" key={s.id}>
                        {stepSummary(s)}
                      </span>
                    ))}
                  </div>
                )}
                {phase.transitions.map((t) => (
                  <div className="phase-transition-badge" key={t.id}>
                    → {phases.find((p) => p.id === t.targetPhaseId)?.name ?? '…'}
                    {t.condition ? ` on ${conditionSummary(t.condition)}` : ' (always)'}
                  </div>
                ))}
              </button>
            </div>
          ))}
          <div className="flow-connector" />
          <button className="btn add-phase-btn" onClick={addPhase}>
            + Add Phase
          </button>
        </div>

        <div className="phase-editor">
          {!selected ? (
            <div className="empty-hint">Select a phase to edit it.</div>
          ) : (
            <>
              <div className="phase-editor-head">
                <input
                  className="phase-name-input"
                  value={selected.name}
                  onChange={(e) => updatePhase(selected.id, { name: e.target.value })}
                />
                {phases.length > 1 && (
                  <button className="btn btn-sm btn-danger" onClick={() => removePhase(selected.id)}>
                    Delete Phase
                  </button>
                )}
              </div>

              <div className="phase-editor-section">
                <div className="phase-editor-section-title">Steps</div>
                {selected.steps.length === 0 && <div className="empty-hint">No steps yet.</div>}
                {selected.steps.map((step) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    onChange={(next) => updateStep(step.id, next)}
                    onRemove={() => removeStep(step.id)}
                    resources={resources}
                    variables={variables}
                    createResource={createResource}
                    createVariable={createVariable}
                  />
                ))}
                <button className="btn btn-sm" onClick={addStep}>
                  + Add Step
                </button>
              </div>

              <div className="phase-editor-section">
                <div className="phase-editor-section-title">Next Phase</div>
                {selected.transitions.length === 0 && (
                  <div className="empty-hint">No transitions set — this phase just flows into the next one in the list above.</div>
                )}
                {selected.transitions.map((t) => (
                  <TransitionRow
                    key={t.id}
                    transition={t}
                    phases={phases}
                    currentPhaseId={selected.id}
                    variables={variables}
                    createVariable={createVariable}
                    onChange={(next) => updateTransition(t.id, next)}
                    onRemove={() => removeTransition(t.id)}
                  />
                ))}
                <button className="btn btn-sm" onClick={addTransition}>
                  + Add Transition
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
