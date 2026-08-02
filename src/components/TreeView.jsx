import { genderMark } from '../engine/breeding.js';

function TreeNode({ node, ownedLabel }) {
  return (
    <div className="tree-node">
      <div className={`tree-card${node.owned ? ' owned' : ''}`}>
        <img src={`/pals/${node.icon}.png`} alt={node.name} />
        {node.name}
        {genderMark(node.gender)}
        {node.owned && <span className="owned-tag">{ownedLabel}</span>}
      </div>
      {node.children.length > 0 && (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeNode key={child.branchKey} node={child} ownedLabel={ownedLabel} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TreeView({ tree, language = 'es' }) {
  return (
    <div className="tree-root">
      <TreeNode node={tree} ownedLabel={language === 'en' ? 'owned' : 'tuyo'} />
    </div>
  );
}
