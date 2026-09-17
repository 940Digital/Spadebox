import { useState } from 'react';
import { CARD_ZONES, newConditionClause, newPhase, newStep, newTransition, newVariable, OPERATORS, STEP_TYPES } from './store';

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

function ZoneSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {CARD_ZONES.map((z) => (
        <option key={z.value} value={z.value}>
          {z.label}
        </option>
      ))}
    </select>
  );
}

function CountControl({ count, onChange }) {
  const isAll = count === 'all';
  return (
    <span className="step-fields">
      <select value={isAll ? 'all' : 'number'} onChange={(e) => onChange(e.target.value === 'all' ? 'all' : 1)}>
        <option value="all">All</option>
        <option value="number">#</option>
      </select>
      {!isAll && (
        <input
          type="number"
          className="step-number"
          value={count}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      )}
    </span>
  );
}

// One "[variable] [operator] [value]" clause — shared by a condition step's
// clause list and a phase transition's condition.
function ClauseFields({ clause, onChange, variables, createVariable }) {
  return (
    <span className="condition-fields">
      <EntityPicker
        entities={variables}
        value={clause.variableId}
        onChange={(variableId) => onChange({ ...clause, variableId })}
        onCreate={(name) => createVariable(name)}
        placeholder="variable name"
      />
      <select value={clause.op} onChange={(e) => onChange({ ...clause, op: e.target.value })}>
        {OPERATORS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <input className="step-number" value={clause.value} onChange={(e) => onChange({ ...clause, value: e.target.value })} />
    </span>
  );
}

function clauseSummary(clause, variables, emptyLabel = 'not set') {
  if (!clause.variableId) return emptyLabel;
  const v = variables.find((x) => x.id === clause.variableId);
  return `${v?.name ?? 'variable'} ${OPERATORS.find((o) => o.value === clause.op)?.label ?? clause.op} ${clause.value}`;
}

const ZONE_LABEL = (value) => CARD_ZONES.find((z) => z.value === value)?.label ?? value;
const STEP_LABEL = (type) => STEP_TYPES.find((t) => t.value === type)?.label ?? type;

function stepSummary(step, variables) {
  switch (step.type) {
    case 'variable': {
      const v = variables.find((x) => x.id === step.variableId);
      return `${v?.name ?? 'variable'} ${step.op === 'set' ? '=' : '+='} ${step.amount}`;
    }
    case 'deal':
      return `Deal ${step.count} from ${ZONE_LABEL(step.fromZone)} to ${ZONE_LABEL(step.toZone)}`;
    case 'shuffle':
      return 'Shuffle the Deck';
    case 'discard':
      return 'Discard';
    case 'show':
      return `Show ${step.count === 'all' ? 'all' : step.count} from ${ZONE_LABEL(step.zone)}`;
    case 'hide':
      return `Hide ${step.count === 'all' ? 'all' : step.count} from ${ZONE_LABEL(step.zone)}`;
    case 'condition': {
      const joiner = step.combine === 'or' ? ' OR ' : ' AND ';
      const cond = step.clauses.map((c) => clauseSummary(c, variables)).join(joiner);
      const thenCount = step.thenSteps.length;
      const elseCount = step.elseSteps ? step.elseSteps.length : 0;
      return `if ${cond} → ${thenCount} step${thenCount === 1 ? '' : 's'}${step.elseSteps ? `, else ${elseCount} step${elseCount === 1 ? '' : 's'}` : ''}`;
    }
    default:
      return step.type;
  }
}

// A side panel of every step kind there is — opened by any "+ Step"
// button. Picking one adds it exactly where that button lives.
function StepPicker({ onSelect, onClose }) {
  return (
    <div className="side-panel-backdrop" onClick={onClose}>
      <div className="side-panel" onClick={(e) => e.stopPropagation()}>
        <div className="side-panel-head">
          <span>Add Step</span>
          <button className="icon-btn" title="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="step-picker-list">
          {STEP_TYPES.map((t) => (
            <button key={t.value} className="step-picker-option" onClick={() => onSelect(t.value)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepNode({ step, onChange, onRemove, variables, createVariable, openPicker }) {
  return (
    <div className={`step-node${step.type === 'condition' ? ' step-node-condition' : ''}`}>
      <div className="step-head-row">
        <span className="step-type-badge">{STEP_LABEL(step.type)}</span>

        {step.type === 'variable' && (
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

        {step.type === 'deal' && (
          <span className="step-fields">
            <span className="step-word">from</span>
            <ZoneSelect value={step.fromZone} onChange={(fromZone) => onChange({ ...step, fromZone })} />
            <span className="step-word">to</span>
            <ZoneSelect value={step.toZone} onChange={(toZone) => onChange({ ...step, toZone })} />
            <span className="step-word">#</span>
            <input
              type="number"
              className="step-number"
              value={step.count}
              onChange={(e) => onChange({ ...step, count: Number(e.target.value) })}
            />
          </span>
        )}

        {(step.type === 'show' || step.type === 'hide') && (
          <span className="step-fields">
            <CountControl count={step.count} onChange={(count) => onChange({ ...step, count })} />
            <span className="step-word">from</span>
            <ZoneSelect value={step.zone} onChange={(zone) => onChange({ ...step, zone })} />
          </span>
        )}

        <button className="icon-btn danger" title="Remove step" onClick={onRemove}>
          ✕
        </button>
      </div>

      {step.type === 'condition' && (
        <div className="condition-body">
          <div className="clause-list">
            {step.clauses.map((clause, i) => (
              <div className="clause-row" key={clause.id}>
                {i === 0 ? (
                  <span className="step-word">If</span>
                ) : (
                  <select
                    className="combine-select"
                    value={step.combine}
                    onChange={(e) => onChange({ ...step, combine: e.target.value })}
                  >
                    <option value="and">AND</option>
                    <option value="or">OR</option>
                  </select>
                )}
                <ClauseFields
                  clause={clause}
                  onChange={(next) => onChange({ ...step, clauses: step.clauses.map((c) => (c.id === clause.id ? next : c)) })}
                  variables={variables}
                  createVariable={createVariable}
                />
                {step.clauses.length > 1 && (
                  <button
                    className="icon-btn danger"
                    title="Remove condition"
                    onClick={() => onChange({ ...step, clauses: step.clauses.filter((c) => c.id !== clause.id) })}
                  >
                    ✕
                  </button>
                )}
                {i === step.clauses.length - 1 && (
                  <button
                    className="icon-btn"
                    title="Add another condition (AND/OR)"
                    onClick={() => onChange({ ...step, clauses: [...step.clauses, newConditionClause()] })}
                  >
                    +
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="branch">
            <div className="branch-label">Then</div>
            <StepList
              steps={step.thenSteps}
              onChange={(thenSteps) => onChange({ ...step, thenSteps })}
              variables={variables}
              createVariable={createVariable}
              openPicker={openPicker}
            />
          </div>

          {step.elseSteps ? (
            <div className="branch">
              <div className="branch-label">
                Else
                <button className="icon-btn danger" title="Remove else branch" onClick={() => onChange({ ...step, elseSteps: null })}>
                  ✕
                </button>
              </div>
              <StepList
                steps={step.elseSteps}
                onChange={(elseSteps) => onChange({ ...step, elseSteps })}
                variables={variables}
                createVariable={createVariable}
                openPicker={openPicker}
              />
            </div>
          ) : (
            <button className="add-pill" onClick={() => onChange({ ...step, elseSteps: [] })}>
              + Else
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StepList({ steps, onChange, variables, createVariable, openPicker }) {
  const update = (i, next) => onChange(steps.map((s, idx) => (idx === i ? next : s)));
  const remove = (i) => onChange(steps.filter((_, idx) => idx !== i));
  return (
    <div className="step-list">
      {steps.map((step, i) => (
        <StepNode
          key={step.id}
          step={step}
          onChange={(next) => update(i, next)}
          onRemove={() => remove(i)}
          variables={variables}
          createVariable={createVariable}
          openPicker={openPicker}
        />
      ))}
      <button className="add-pill" onClick={() => openPicker(onChange, steps)}>
        + Step
      </button>
    </div>
  );
}

function TransitionRow({ transition, phases, currentPhaseId, variables, createVariable, onChange, onRemove }) {
  return (
    <div className="transition-row">
      <span className="step-word">Next:</span>
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
      <span className="step-word">if</span>
      <ClauseFields
        clause={transition.condition}
        onChange={(condition) => onChange({ ...transition, condition })}
        variables={variables}
        createVariable={createVariable}
      />
      <span className="step-word step-word-muted">{transition.condition.variableId ? '' : '(leave blank for always)'}</span>

      <button className="icon-btn danger" title="Remove transition" onClick={onRemove}>
        ✕
      </button>
    </div>
  );
}

export default function PhasesPage({ phases, setPhases, variables, setVariables }) {
  const [selectedId, setSelectedId] = useState(phases[0]?.id ?? null);
  const [picker, setPicker] = useState(null);
  const selected = phases.find((p) => p.id === selectedId) ?? null;

  const openPicker = (onChange, steps) => {
    setPicker({
      onSelect: (type) => {
        onChange([...steps, newStep(type)]);
        setPicker(null);
      },
    });
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

  const addTransition = () => updatePhase(selected.id, { transitions: [...selected.transitions, newTransition()] });
  const updateTransition = (transId, next) =>
    updatePhase(selected.id, { transitions: selected.transitions.map((t) => (t.id === transId ? next : t)) });
  const removeTransition = (transId) =>
    updatePhase(selected.id, { transitions: selected.transitions.filter((t) => t.id !== transId) });

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
                        {stepSummary(s, variables)}
                      </span>
                    ))}
                  </div>
                )}
                {phase.transitions.map((t) => (
                  <div className="phase-transition-badge" key={t.id}>
                    → {phases.find((p) => p.id === t.targetPhaseId)?.name ?? '…'}
                    {t.condition.variableId ? ` on ${clauseSummary(t.condition, variables)}` : ' (always)'}
                  </div>
                ))}
              </button>
            </div>
          ))}
          <div className="flow-connector" />
          <button className="add-pill add-phase-btn" onClick={addPhase}>
            + Phase
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
                  <button className="icon-btn danger" title="Delete phase" onClick={() => removePhase(selected.id)}>
                    🗑
                  </button>
                )}
              </div>

              <div className="phase-editor-section">
                <div className="phase-editor-section-title">Steps</div>
                {selected.steps.length === 0 && <div className="empty-hint">No steps yet.</div>}
                <StepList
                  steps={selected.steps}
                  onChange={(steps) => updatePhase(selected.id, { steps })}
                  variables={variables}
                  createVariable={createVariable}
                  openPicker={openPicker}
                />
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
                <button className="add-pill" onClick={addTransition}>
                  + Transition
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {picker && <StepPicker onSelect={picker.onSelect} onClose={() => setPicker(null)} />}
    </div>
  );
}
