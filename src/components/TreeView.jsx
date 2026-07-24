import { genderMark } from '../engine/breeding.js';

function TreeNode({ node }) {
  return (
    <div className="tree-node">
      <div className={`tree-card${node.owned ? ' owned' : ''}`}>
        <img src={`/pals/${node.icon}.png`} alt={node.name} />
        {node.name}
        {genderMark(node.gender)}
        {node.owned && <span className="owned-tag">tuyo</span>}
      </div>
      {node.children.length > 0 && (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeNode key={child.branchKey} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TreeView({ tree }) {
  return (
    <div className="tree-root">
      <TreeNode node={tree} />
    </div>
  );
}
