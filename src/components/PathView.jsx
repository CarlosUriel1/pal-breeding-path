import { palsById, describeBreeding, genderMark } from '../engine/breeding.js';

function PalTag({ id, gender, isChild }) {
  const pal = palsById[id];
  return (
    <span className={`pal${isChild ? ' child' : ''}`}>
      <img src={`/pals/${pal.icon}.png`} alt={pal.name} />
      {pal.name}
      {genderMark(gender)}
    </span>
  );
}

export default function PathView({ steps }) {
  return (
    <div className="steps">
      {steps.map((step, i) => {
        const info = describeBreeding(step.a, step.b);
        return (
          <div className="step" key={i}>
            <span className="num">{i + 1}.</span>
            <PalTag id={step.a} gender={step.genderA} />
            <span className="op">+</span>
            <PalTag id={step.b} gender={step.genderB} />
            <span className="op">→</span>
            <PalTag id={step.child} isChild />
            {info?.unique && <span className="unique-tag">combo único</span>}
          </div>
        );
      })}
    </div>
  );
}
