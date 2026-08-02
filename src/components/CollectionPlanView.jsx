import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { palsById } from '../engine/breeding.js';
import {
  createPassiveLookup,
  getPassiveMeta,
  passiveName,
  rankTone,
} from '../data/passiveCatalog.js';

const copy = {
  es: {
    owned: 'PROPIO', bred: 'CRIAR PRIMERO', target: 'OBJETIVO',
    step: 'Cruce', cake: 'Usa pastel especial y repite hasta conservar las pasivas marcadas.',
    competing: 'Pasivas competidoras', level: 'Nv.', path: 'Ruta', tree: 'Árbol',
    treeCaption: 'El objetivo está arriba; sigue cada rama hacia abajo hasta los Pals que ya tienes.',
    tooDeep: 'Ruta demasiado profunda',
    zoomIn: 'Acercar', zoomOut: 'Alejar', center: 'Centrar',
    panHint: 'Arrastra para mover · rueda para acercar o alejar',
    location: { palbox: 'Palbox', party: 'Equipo', dimensional: 'Alm. dimensional', 'base-or-other': 'Base/otro', unknown: 'Ubicación desconocida' },
  },
  en: {
    owned: 'OWNED', bred: 'BREED FIRST', target: 'TARGET',
    step: 'Breeding step', cake: 'Use Special Cake and repeat until the marked passives are preserved.',
    competing: 'Competing passives', level: 'Lv.', path: 'Path', tree: 'Tree',
    treeCaption: 'The target is at the top; follow each branch down to the Pals you already own.',
    tooDeep: 'Route too deep',
    zoomIn: 'Zoom in', zoomOut: 'Zoom out', center: 'Center',
    panHint: 'Drag to move · use the wheel to zoom',
    location: { palbox: 'Palbox', party: 'Party', dimensional: 'Dimensional storage', 'base-or-other': 'Base/other', unknown: 'Unknown location' },
  },
};

const nodeParents = (node) => {
  const action = node?.action;
  if (!action) return [];
  const first = action.parentA || action.a;
  const second = action.parentB || action.b;
  return [first, second].filter(Boolean);
};

function flattenPlan(root) {
  const steps = [];
  const visited = new Set();
  const visit = (node) => {
    const parents = nodeParents(node);
    for (const parent of parents) visit(parent);
    if (!parents.length) return;
    const id = node.action?.id || node.actionId || `${node.palId}:${node.gender}:${steps.length}`;
    if (visited.has(id)) return;
    visited.add(id);
    steps.push({
      id,
      parentA: parents[0],
      parentB: parents[1],
      child: node,
      competitorPassiveIds: node.action?.competitorPassiveIds || node.competitorPassiveIds || [],
    });
  };
  visit(root);
  return steps;
}

function CrownIcon() {
  return (
    <svg className="target-crown" viewBox="0 0 64 40" aria-hidden="true">
      <path d="M6 31 2 7l18 12L32 3l12 16L62 7l-4 24H6Z" fill="currentColor" />
      <path d="M7 35h50" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function PlanPalCard({ node, targetId, language, customPassives, passiveLookup, desiredPassiveIds, forceTarget = false, isResult = false, treeCard = false }) {
  if (!node) return <div className="plan-pal-card" />;
  const text = copy[language] || copy.es;
  const pal = palsById[node.palId];
  if (!pal) return <div className="plan-pal-card" />;
  const instance = node.instance || node.ownedInstance || null;
  const target = forceTarget || node.isTarget;
  const kind = target ? 'target' : node.sourceKind === 'owned' || instance ? 'owned' : 'bred';
  const passiveIds = node.carriedPassiveIds || node.passiveIds || instance?.passiveIds || [];
  const shownPassives = passiveIds.filter((id) => desiredPassiveIds.includes(id));
  const lookup = passiveLookup || createPassiveLookup(customPassives);
  const badge = kind === 'target' ? text.target : kind === 'owned' ? text.owned : text.bred;
  const secondary = instance
    ? `${text.level} ${instance.level ?? '?'}${instance.location ? ` · ${text.location[instance.location] || text.location.unknown}` : ''}`
    : '';

  return (
    <div className={`plan-pal-card ${kind}${isResult ? ' child-card' : ''}${treeCard ? ' tree-card' : ''}`}>
      {target && treeCard && <CrownIcon />}
      <span className="pal-number">#{pal.index}{pal.suffix || ''}</span>
      <div className="plan-pal-main">
        <img src={`/pals/${pal.icon}.png`} alt="" />
        <span className="plan-pal-names">
          <strong>{instance?.nickname || pal.name}</strong>
          <small>{instance?.nickname ? `${pal.name} · ${secondary}` : secondary}</small>
        </span>
        <span className={`plan-sex gender${node.gender === 'F' ? ' female' : ''}`}>
          <span aria-hidden="true">{node.gender === 'M' ? '♂' : node.gender === 'F' ? '♀' : '?'}</span>
          <span className="visually-hidden">{node.gender === 'M' ? (language === 'en' ? 'male' : 'macho') : node.gender === 'F' ? (language === 'en' ? 'female' : 'hembra') : (language === 'en' ? 'unknown sex' : 'sexo desconocido')}</span>
        </span>
      </div>
      <span className="plan-state-badge">{badge}</span>
      {shownPassives.length > 0 && (
        <div className="plan-passives">
          {shownPassives.map((id) => {
            const passive = getPassiveMeta(id, customPassives, lookup);
            return <span key={id} className={rankTone(passive.rank)}>{passiveName(passive, language)}</span>;
          })}
        </div>
      )}
    </div>
  );
}

function PlanTreeNode({ ancestry = new Set(), depth = 0, ...props }) {
  const parents = nodeParents(props.node);
  const text = copy[props.language] || copy.es;
  const nodeKey = props.node?.action?.id || props.node?.actionId || props.node?.instance?.instanceId || `${props.node?.palId}:${props.node?.gender}:${depth}`;
  if (depth > 14 || ancestry.has(nodeKey)) {
    return <div className="plan-tree-limit">{text.tooDeep}</div>;
  }
  const nextAncestry = new Set(ancestry);
  nextAncestry.add(nodeKey);
  return (
    <div className={`plan-tree-node${parents.length ? ' has-parents' : ''}`}>
      <PlanPalCard {...props} forceTarget={props.isRoot} treeCard />
      {parents.length > 0 && (
        <div className="plan-tree-children">
          {parents.map((parent, index) => (
            <div className="plan-tree-branch" key={`${props.node.action?.id || props.node.palId}-${index}`}>
              <PlanTreeNode {...props} node={parent} isRoot={false} ancestry={nextAncestry} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const MIN_TREE_SCALE = 0.3;
const MAX_TREE_SCALE = 2;

function InteractivePlanTree({ plan, targetId, desiredPassiveIds, language, customPassives, passiveLookup }) {
  const text = copy[language] || copy.es;
  const viewportRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });

  const centerTree = useCallback(() => {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!viewport || !canvas) return;
    const width = Math.max(1, canvas.scrollWidth);
    const height = Math.max(1, canvas.scrollHeight);
    const availableWidth = Math.max(1, viewport.clientWidth - 64);
    const availableHeight = Math.max(1, viewport.clientHeight - 64);
    const scale = Math.min(1, Math.max(MIN_TREE_SCALE, Math.min(availableWidth / width, availableHeight / height)));
    setTransform({
      scale,
      x: (viewport.clientWidth - width * scale) / 2,
      y: Math.max(32, (viewport.clientHeight - height * scale) / 2),
    });
  }, []);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(centerTree);
    return () => cancelAnimationFrame(frame);
  }, [centerTree, plan]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => centerTree());
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [centerTree]);

  const zoomBy = useCallback((factor, clientX, clientY) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const pointX = clientX == null ? viewport.clientWidth / 2 : clientX - rect.left;
    const pointY = clientY == null ? viewport.clientHeight / 2 : clientY - rect.top;
    setTransform((current) => {
      const scale = Math.min(MAX_TREE_SCALE, Math.max(MIN_TREE_SCALE, current.scale * factor));
      const worldX = (pointX - current.x) / current.scale;
      const worldY = (pointY - current.y) / current.scale;
      return { scale, x: pointX - worldX * scale, y: pointY - worldY * scale };
    });
  }, []);

  const stepZoom = (direction) => {
    const factor = direction > 0 ? 1.2 : 1 / 1.2;
    zoomBy(factor);
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    const handleWheel = (event) => {
      event.preventDefault();
      zoomBy(Math.exp(-event.deltaY * 0.0015), event.clientX, event.clientY);
    };
    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', handleWheel);
  }, [zoomBy]);

  const handlePointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) {
      // Dos dedos: pellizco para zoom; se cancela el arrastre en curso.
      const [a, b] = [...pointersRef.current.values()];
      pinchRef.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) };
      dragRef.current = null;
      setDragging(false);
      return;
    }
    dragRef.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, x: transform.x, y: transform.y };
    setDragging(true);
  };

  const handlePointerMove = (event) => {
    const tracked = pointersRef.current.get(event.pointerId);
    if (tracked) {
      tracked.x = event.clientX;
      tracked.y = event.clientY;
    }
    if (pinchRef.current && pointersRef.current.size >= 2) {
      const [a, b] = [...pointersRef.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist > 0 && pinchRef.current.dist > 0) {
        zoomBy(dist / pinchRef.current.dist, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
      pinchRef.current.dist = dist;
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setTransform((current) => ({ ...current, x: drag.x + event.clientX - drag.clientX, y: drag.y + event.clientY - drag.clientY }));
  };

  const endDrag = (event) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      setDragging(false);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleKeyDown = (event) => {
    const moves = { ArrowLeft: [32, 0], ArrowRight: [-32, 0], ArrowUp: [0, 32], ArrowDown: [0, -32] };
    if (moves[event.key]) {
      event.preventDefault();
      const [x, y] = moves[event.key];
      setTransform((current) => ({ ...current, x: current.x + x, y: current.y + y }));
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      stepZoom(1);
    } else if (event.key === '-') {
      event.preventDefault();
      stepZoom(-1);
    } else if (event.key === '0') {
      event.preventDefault();
      centerTree();
    }
  };

  return (
    <figure className="plan-tree-figure">
      <div className="plan-tree-toolbar" aria-label={language === 'en' ? 'Tree view controls' : 'Controles de la gráfica'}>
        <span>{text.panHint}</span>
        <div>
          <button type="button" aria-label={text.zoomOut} title={text.zoomOut} onClick={() => stepZoom(-1)}>−</button>
          <output aria-live="polite">{Math.round(transform.scale * 100)}%</output>
          <button type="button" aria-label={text.zoomIn} title={text.zoomIn} onClick={() => stepZoom(1)}>+</button>
          <button type="button" className="tree-center-button" onClick={centerTree}>{text.center}</button>
        </div>
      </div>
      <div
        ref={viewportRef}
        className={`plan-tree-viewport${dragging ? ' dragging' : ''}`}
        role="group"
        aria-label={text.treeCaption}
        tabIndex="0"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={handleKeyDown}
      >
        <div
          ref={canvasRef}
          className="plan-tree-canvas"
          style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
        >
          <div className="plan-tree">
            <PlanTreeNode
              node={plan.root}
              isRoot
              targetId={targetId}
              desiredPassiveIds={desiredPassiveIds}
              language={language}
              customPassives={customPassives}
              passiveLookup={passiveLookup}
            />
          </div>
        </div>
      </div>
      <figcaption>{text.treeCaption}</figcaption>
    </figure>
  );
}

export default function CollectionPlanView({
  plan,
  targetId,
  desiredPassiveIds,
  language,
  customPassives,
  view,
}) {
  const text = copy[language] || copy.es;
  const steps = useMemo(
    () => plan?.steps?.length ? plan.steps : flattenPlan(plan?.root),
    [plan]
  );
  const passiveLookup = useMemo(() => createPassiveLookup(customPassives), [customPassives]);

  if (view === 'tree') {
    return (
      <InteractivePlanTree
        plan={plan}
        targetId={targetId}
        desiredPassiveIds={desiredPassiveIds}
        language={language}
        customPassives={customPassives}
        passiveLookup={passiveLookup}
      />
    );
  }

  return (
    <div className="genetic-steps">
      {steps.map((step, index) => {
        const parentA = step.parentA || step.a;
        const parentB = step.parentB || step.b;
        const child = step.child || step.result;
        const competitorIds = step.competitorPassiveIds || child?.competitorPassiveIds || [];
        return (
          <article className="genetic-step" key={step.id || index}>
            <div className="genetic-step-head">
              <strong>{text.step} {index + 1}</strong>
              <span>{child?.gender === 'F' ? '♀' : '♂'} {palsById[child?.palId]?.name}</span>
            </div>
            <div className="breeding-equation">
              <PlanPalCard node={parentA} targetId={targetId} desiredPassiveIds={desiredPassiveIds} language={language} customPassives={customPassives} passiveLookup={passiveLookup} />
              <span className="equation-symbol">+</span>
              <PlanPalCard node={parentB} targetId={targetId} desiredPassiveIds={desiredPassiveIds} language={language} customPassives={customPassives} passiveLookup={passiveLookup} />
              <span className="equation-symbol result-arrow">→</span>
              <PlanPalCard node={child} isResult forceTarget={index === steps.length - 1} targetId={targetId} desiredPassiveIds={desiredPassiveIds} language={language} customPassives={customPassives} passiveLookup={passiveLookup} />
            </div>
            {desiredPassiveIds.length > 0 && competitorIds.length > 0 && (
              <p className="competing-passives">
                {text.competing}: {competitorIds.map((id) => passiveName(getPassiveMeta(id, customPassives), language)).join(', ')}
              </p>
            )}
            {desiredPassiveIds.length > 0 && <p className="special-cake-note">{text.cake}</p>}
          </article>
        );
      })}
    </div>
  );
}
