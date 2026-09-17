// The real runtime. This is the "jelly" — plain JavaScript, not blocks.
// The UI (Resources/Cards/Table) only manages data and layout; everything
// a game actually *does* is written as code against the `game` object
// this file builds. The test is whether this API is general enough to
// implement something like Uno, War, Rummy, Blackjack, or Go Fish without
// ever adding game-specific code to the platform itself.

export class RejectError extends Error {}

// Expands a zone's starting { cardDefId: qty } into an actual ordered
// stack of card def ids — index 0 is the top of the pile.
function expandCounts(cardCounts) {
  const stack = [];
  Object.entries(cardCounts || {}).forEach(([cardId, qty]) => {
    for (let i = 0; i < Number(qty) || 0; i += 1) stack.push(cardId);
  });
  return stack;
}

export function createGame({ players, decks, discards, hands, cards, cardAttributes, variables }, { onLog } = {}) {
  const zonesByName = new Map();
  const zonesById = new Map();
  const registerZone = (kind, z) => {
    const entry = { id: z.id, kind, name: z.name, pile: expandCounts(z.cardCounts), revealed: kind !== 'deck', meta: z };
    zonesByName.set(z.name, entry);
    zonesById.set(z.id, entry);
  };
  decks.forEach((z) => registerZone('deck', z));
  discards.forEach((z) => registerZone('discard', z));
  hands.forEach((z) => registerZone('hand', z));

  const cardsById = new Map(cards.map((c) => [c.id, c]));
  const cardsByName = new Map(cards.map((c) => [c.name, c]));
  const attrsByName = new Map(cardAttributes.map((a) => [a.name, a.id]));
  const varsByName = new Map(variables.map((v) => [v.name, v]));

  const log = (message) => onLog?.(message);

  function resolveZone(name) {
    const zone = zonesByName.get(name) ?? zonesById.get(name);
    if (!zone) throw new Error(`No resource named "${name}"`);
    return zone;
  }

  function resolveCard(ref) {
    // Accepts a card def id, or falls back to matching by name for
    // convenience when writing code by hand.
    if (cardsById.has(ref)) return cardsById.get(ref);
    if (cardsByName.has(ref)) return cardsByName.get(ref);
    return null;
  }

  const handlers = {};

  const game = {
    players: players.map((p) => ({ id: p.id, name: p.name })),

    shuffle(zoneName) {
      const zone = resolveZone(zoneName);
      for (let i = zone.pile.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [zone.pile[i], zone.pile[j]] = [zone.pile[j], zone.pile[i]];
      }
      log(`Shuffled ${zone.name}.`);
    },

    draw(fromName, toName, count = 1) {
      const from = resolveZone(fromName);
      const to = resolveZone(toName);
      const moved = [];
      for (let i = 0; i < count; i += 1) {
        const card = from.pile.shift();
        if (card === undefined) break;
        to.pile.unshift(card);
        moved.push(card);
      }
      log(`Drew ${moved.length} card(s) from ${from.name} to ${to.name}.`);
      return moved;
    },

    deal(fromName, count = 1) {
      const from = resolveZone(fromName);
      hands.forEach((h) => {
        const to = zonesById.get(h.id);
        for (let i = 0; i < count; i += 1) {
          const card = from.pile.shift();
          if (card === undefined) return;
          to.pile.unshift(card);
        }
      });
      log(`Dealt ${count} card(s) from ${from.name} to each hand.`);
    },

    topCard(zoneName) {
      const zone = resolveZone(zoneName);
      return zone.pile[0] ?? null;
    },

    allCards(zoneName) {
      return [...resolveZone(zoneName).pile];
    },

    moveCard(cardRef, fromName, toName) {
      const card = resolveCard(cardRef);
      const from = resolveZone(fromName);
      const to = resolveZone(toName);
      const cardId = card ? card.id : cardRef;
      const idx = from.pile.indexOf(cardId);
      if (idx === -1) throw new Error(`${cardRef} is not in ${from.name}`);
      from.pile.splice(idx, 1);
      to.pile.unshift(cardId);
      log(`Moved ${game.cardName(cardId)} from ${from.name} to ${to.name}.`);
    },

    hide(zoneName) {
      resolveZone(zoneName).revealed = false;
      log(`${zoneName} is now face down.`);
    },

    show(zoneName) {
      resolveZone(zoneName).revealed = true;
      log(`${zoneName} is now face up.`);
    },

    isRevealed(zoneName) {
      return resolveZone(zoneName).revealed;
    },

    attr(cardRef, attrName) {
      const card = resolveCard(cardRef);
      if (!card) return undefined;
      const attrId = attrsByName.get(attrName);
      if (!attrId) return undefined;
      return card.attributes[attrId];
    },

    cardName(cardRef) {
      const card = resolveCard(cardRef);
      return card ? card.name : String(cardRef);
    },

    getVar(name) {
      const v = varsByName.get(name);
      return v ? v.value : undefined;
    },

    setVar(name, value) {
      const v = varsByName.get(name);
      if (v) v.value = value;
      else varsByName.set(name, { id: name, name, value });
      log(`Set ${name} = ${value}.`);
    },

    on(eventName, handler) {
      (handlers[eventName] ??= []).push(handler);
    },

    reject(reason = 'Rejected') {
      throw new RejectError(reason);
    },

    log(message) {
      log(String(message));
    },
  };

  // Not part of the public `game` API — used by the Code tab's test
  // harness to fire an event and to read back the live pile contents.
  const _internal = {
    fire(eventName, payload) {
      const fns = handlers[eventName] ?? [];
      if (fns.length === 0) {
        log(`No handler registered for "${eventName}".`);
        return;
      }
      try {
        fns.forEach((fn) => fn(payload));
        log(`Fired "${eventName}" — ok.`);
      } catch (err) {
        if (err instanceof RejectError) log(`Rejected: ${err.message}`);
        else log(`Error in "${eventName}" handler: ${err.message}`);
      }
    },
    eventNames: () => Object.keys(handlers),
    zones: () => [...zonesByName.values()],
  };

  return { game, _internal };
}
