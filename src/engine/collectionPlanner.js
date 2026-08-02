import { breedableIds, calculateChild, palsById } from './breeding.js';

const DEFAULT_MAX_BREEDS = 32;
const DEFAULT_MAX_PAIRS = 20_000_000;

const unique = (values) => [...new Set((values || []).filter(Boolean))];

const breedablePals = [...breedableIds].map((id) => palsById[id]);
const palIndexById = new Map(breedablePals.map((pal, index) => [pal.id, index]));
const pairWidth = breedablePals.length;
// Espacio real de claves de estado: especies x 2 sexos x 16 máscaras de pasivas (~9504).
// El presupuesto por defecto se deriva de ese espacio para que 'state-budget' sea
// alcanzable: el antiguo valor fijo de 12000 lo superaba y jamás podía dispararse,
// dejando que las búsquedas sin ruta degeneraran en millones de parejas evaluadas.
const DEFAULT_MAX_STATES = Math.floor(pairWidth * 2 * 16 * 0.75);
const childByMaleFemalePair = new Array(pairWidth * pairWidth);
for (let maleIndex = 0; maleIndex < pairWidth; maleIndex++) {
  for (let femaleIndex = 0; femaleIndex < pairWidth; femaleIndex++) {
    const child = calculateChild(breedablePals[maleIndex], breedablePals[femaleIndex], 'M', 'F');
    childByMaleFemalePair[maleIndex * pairWidth + femaleIndex] = child && breedableIds.has(child.id) ? child : null;
  }
}

const stateKey = (palIndex, gender, mask) => ((palIndex * 2 + (gender === 'F' ? 1 : 0)) * 16) + mask;

class MinHeap {
  constructor(compare) {
    this.items = [];
    this.compare = compare;
  }

  get size() { return this.items.length; }

  push(value) {
    const items = this.items;
    items.push(value);
    let index = items.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.compare(items[parent], value) <= 0) break;
      items[index] = items[parent];
      index = parent;
    }
    items[index] = value;
  }

  pop() {
    const items = this.items;
    if (!items.length) return null;
    const first = items[0];
    const last = items.pop();
    if (items.length && last) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        if (left >= items.length) break;
        const smallest = right < items.length && this.compare(items[right], items[left]) < 0 ? right : left;
        if (this.compare(last, items[smallest]) <= 0) break;
        items[index] = items[smallest];
        index = smallest;
      }
      items[index] = last;
    }
    return first;
  }
}

const stateCompare = (a, b) =>
  a.cost - b.cost ||
  a.depth - b.depth ||
  a.competitorCount - b.competitorCount ||
  b.ivScore - a.ivScore ||
  b.level - a.level ||
  a.key - b.key ||
  String(a.instance?.instanceId || '').localeCompare(String(b.instance?.instanceId || ''));

const isBetter = (candidate, current) => !current || stateCompare(candidate, current) < 0;

function flattenSteps(root) {
  const steps = [];
  const emitted = new Set();
  const visit = (node) => {
    if (!node?.action) return;
    visit(node.action.parentA);
    visit(node.action.parentB);
    if (emitted.has(node.action.id)) return;
    emitted.add(node.action.id);
    steps.push({
      id: node.action.id,
      parentA: node.action.parentA,
      parentB: node.action.parentB,
      child: node,
      competitorPassiveIds: node.action.competitorPassiveIds,
    });
  };
  visit(root);
  return steps;
}

function finalizePlan(rootState, desiredPassiveIds, stats, warnings) {
  const root = { ...rootState, isTarget: true };
  const steps = flattenSteps(root);
  return {
    status: 'success',
    strategy: steps.length ? 'collection-genetics' : 'already-owned',
    guaranteed: steps.length === 0,
    root,
    steps,
    breedingCount: steps.length,
    desiredPassiveIds,
    stats,
    warnings,
  };
}

export function findCollectionPlan({
  instances,
  targetId,
  desiredPassiveIds = [],
  maxBreeds = DEFAULT_MAX_BREEDS,
  maxStates = DEFAULT_MAX_STATES,
  maxPairs = DEFAULT_MAX_PAIRS,
  onProgress = () => {},
} = {}) {
  const target = palsById[targetId];
  if (!target || !breedableIds.has(targetId)) {
    return { status: 'error', reason: 'invalid-target' };
  }

  const desired = unique(desiredPassiveIds);
  if (desired.length > 4) return { status: 'error', reason: 'too-many-passives' };
  const fullMask = (1 << desired.length) - 1;
  const bitByPassive = new Map(desired.map((id, index) => [id, 1 << index]));
  const desiredSet = new Set(desired);
  const availableDesired = new Set();
  // Pasivas deseadas vistas solo en ejemplares descartados: id -> motivos de descarte.
  const discardedDesired = new Map();
  const warnings = { skippedUnknownGender: 0, skippedUnknownSpecies: 0, missingPassiveIds: [] };

  const noteDiscarded = (instance, discardReason) => {
    for (const id of unique(instance.passiveIds)) {
      if (!desiredSet.has(id)) continue;
      const reasons = discardedDesired.get(id) || new Set();
      reasons.add(discardReason);
      discardedDesired.set(id, reasons);
    }
  };

  const maskFor = (passiveIds) => {
    let mask = 0;
    for (const id of passiveIds || []) {
      const bit = bitByPassive.get(id);
      if (bit) {
        mask |= bit;
        availableDesired.add(id);
      }
    }
    return mask;
  };

  const desiredIdsForMask = (mask) => desired.filter((_, index) => mask & (1 << index));
  const best = new Map();
  const heap = new MinHeap(stateCompare);

  for (const instance of instances || []) {
    const palIndex = palIndexById.get(instance.palId);
    if (palIndex == null) {
      warnings.skippedUnknownSpecies++;
      noteDiscarded(instance, 'unknown-species');
      continue;
    }
    if (instance.gender !== 'M' && instance.gender !== 'F') {
      warnings.skippedUnknownGender++;
      noteDiscarded(instance, 'unknown-gender');
      continue;
    }
    const passiveIds = unique(instance.passiveIds);
    const mask = maskFor(passiveIds);
    const competitorPassiveIds = passiveIds.filter((id) => !desiredSet.has(id));
    const state = {
      key: stateKey(palIndex, instance.gender, mask),
      palId: instance.palId,
      palIndex,
      gender: instance.gender,
      mask,
      carriedPassiveIds: desiredIdsForMask(mask),
      passiveIds,
      competitorPassiveIds,
      competitorCount: competitorPassiveIds.length,
      cost: 0,
      depth: 0,
      ivScore: ['hp', 'attack', 'defense'].reduce((sum, key) => sum + (Number(instance.ivs?.[key]) || 0), 0),
      level: Number(instance.level) || 0,
      sourceKind: 'owned',
      instance,
      action: null,
    };
    const current = best.get(state.key);
    if (isBetter(state, current)) best.set(state.key, state);
  }

  for (const state of best.values()) heap.push(state);
  if (!heap.size) return { status: 'error', reason: 'no-compatible-pals', warnings };

  // Distingue las deseadas ausentes de toda la colección de las que sí existen
  // pero solo en ejemplares descartados (especie o sexo desconocidos).
  const unavailableDesired = desired.filter((id) => !availableDesired.has(id));
  warnings.missingPassiveIds = unavailableDesired.filter((id) => !discardedDesired.has(id));
  const discardedPassives = unavailableDesired
    .filter((id) => discardedDesired.has(id))
    .map((id) => ({ passiveId: id, discardReasons: [...discardedDesired.get(id)] }));
  if (warnings.missingPassiveIds.length) {
    return { status: 'error', reason: 'missing-passives', discardedPassives, warnings };
  }
  if (discardedPassives.length) {
    return { status: 'error', reason: 'passives-on-discarded', discardedPassives, warnings };
  }

  const alreadyOwned = [...best.values()]
    .filter((state) => state.palId === targetId && state.mask === fullMask)
    .sort(stateCompare)[0];
  if (alreadyOwned) {
    return finalizePlan(alreadyOwned, desired, { exploredStates: 0, evaluatedPairs: 0 }, warnings);
  }

  const settled = new Map();
  const settledByGender = { M: [], F: [] };
  let actionCounter = 0;
  let evaluatedPairs = 0;
  let budgetReason = '';

  while (heap.size) {
    const state = heap.pop();
    if (!state || best.get(state.key) !== state || settled.has(state.key)) continue;
    settled.set(state.key, state);
    settledByGender[state.gender].push(state);

    if (state.palId === targetId && state.mask === fullMask) {
      const plan = finalizePlan(state, desired, { exploredStates: settled.size, evaluatedPairs }, warnings);
      // maxBreeds se evalúa contra las cruzas reales (pasos deduplicados),
      // no contra el coste-árbol del estado.
      if (plan.breedingCount <= maxBreeds) return plan;
      budgetReason = 'breed-budget';
      break;
    }

    if (settled.size >= maxStates) {
      budgetReason = 'state-budget';
      break;
    }

    const otherGender = state.gender === 'M' ? 'F' : 'M';
    for (const other of settledByGender[otherGender]) {
      evaluatedPairs++;
      if (evaluatedPairs > maxPairs) {
        budgetReason = 'pair-budget';
        break;
      }
      if (state.instance?.instanceId && state.instance.instanceId === other.instance?.instanceId) continue;

      const parentA = state.gender === 'M' ? state : other;
      const parentB = state.gender === 'F' ? state : other;
      const child = childByMaleFemalePair[parentA.palIndex * pairWidth + parentB.palIndex];
      if (!child) continue;
      const childPalIndex = palIndexById.get(child.id);

      const mask = parentA.mask | parentB.mask;
      const carriedPassiveIds = desiredIdsForMask(mask);
      // Unión de las pasivas NO deseadas de ambos padres; los padres criados ya
      // traen las suyas propagadas en competitorPassiveIds, así que las cadenas
      // de 2+ pasos conservan las competidoras de toda la ascendencia.
      const competitorPassiveIds = unique([...parentA.competitorPassiveIds, ...parentB.competitorPassiveIds]);
      const actionId = `breed-${++actionCounter}`;
      // Coste-árbol con repeticiones: cada padre suma su subárbol completo aunque se
      // comparta, lo que mantiene la monotonía del heap pero sobreestima las cruzas
      // reales (los pasos deduplicados). Por eso no sirve para podar por maxBreeds;
      // la profundidad sí es cota inferior de las cruzas reales y poda sin descartar
      // planes cuyo número deduplicado cabría.
      const cost = parentA.cost + parentB.cost + 1;
      const depth = Math.max(parentA.depth, parentB.depth) + 1;
      if (depth > maxBreeds) continue;

      for (const childGender of ['M', 'F']) {
        const candidateActionId = `${actionId}-${childGender}`;
        const candidate = {
          key: stateKey(childPalIndex, childGender, mask),
          palId: child.id,
          palIndex: childPalIndex,
          gender: childGender,
          mask,
          carriedPassiveIds,
          passiveIds: carriedPassiveIds,
          competitorPassiveIds,
          competitorCount: competitorPassiveIds.length,
          cost,
          depth,
          ivScore: Math.max(parentA.ivScore, parentB.ivScore),
          level: 1,
          sourceKind: 'bred',
          instance: null,
          action: {
            id: candidateActionId,
            parentA,
            parentB,
            competitorPassiveIds,
          },
        };
        const current = best.get(candidate.key);
        if (isBetter(candidate, current)) {
          best.set(candidate.key, candidate);
          heap.push(candidate);
        }
      }
    }

    if (budgetReason) break;
    if (settled.size % 250 === 0) {
      onProgress({ exploredStates: settled.size, evaluatedPairs, queuedStates: heap.size });
    }
  }

  return {
    status: 'error',
    reason: budgetReason || 'no-route',
    stats: { exploredStates: settled.size, evaluatedPairs },
    warnings,
  };
}
