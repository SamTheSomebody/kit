/**
 * Fidelity probe — the measurement half of the artifact↔component check
 * (`docs/specs/2026-09-03-dock-kit-design.md` §Fidelity-check plan).
 *
 * Walks the dock chrome of whichever page it is evaluated in (the frozen
 * reference or the ported component), and emits every chrome element's
 * class, text, stage-relative rect and computed box/type/colour. Diffing
 * the two outputs is the pixel comparison, done in numbers: it names the
 * element and the property that drifted instead of leaving a coloured
 * blob on a screenshot. Content panes are not descended into — the kit
 * owns chrome only.
 *
 * Plain JS, no imports: it is fetched and evaluated in BOTH pages, and the
 * reference is a frozen classic-script document that must not be edited.
 */
(() => {
  const SEL = '.dock-root,.dock-split,.dock-divider,.dock-leaf,.dock-tabstrip,.dock-spill,.dock-tab,.dock-tab-label,.dock-tab-close,.dock-body,.dock-content,.dock-collapsed-stub,.dock-group,.dock-group-cell,.dock-group-tab,.dock-empty,.dock-float,.dock-float-grip,.dock-float-edge';
  const stage = document.querySelector('.dock-stage') || document.querySelector('#stage');
  const sr = stage.getBoundingClientRect();
  const round = n => Math.round(n * 10) / 10;
  const STYLE = ['display', 'flexDirection', 'flex', 'height', 'width', 'background', 'backgroundColor', 'color', 'borderBottom', 'borderBlockEndColor', 'borderBlockEndWidth', 'borderRight', 'padding', 'gap', 'fontSize', 'fontFamily', 'letterSpacing', 'lineHeight', 'maxWidth', 'overflowX', 'overflowY', 'position', 'zIndex', 'boxShadow', 'borderRadius', 'cursor', 'opacity', 'textOverflow', 'whiteSpace', 'scrollbarWidth', 'alignItems', 'justifyContent', 'boxSizing', 'outline', 'transition'];
  const walk = (el, path) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const style = {};
    for (const k of STYLE) {
      style[k] = cs[k];
    }
    const node = {
      path,
      cls: [...el.classList].sort((left, right) => Number(left > right) - Number(left < right)).join(' '),
      tag: el.tagName.toLowerCase(),
      fit: el.dataset.fit ?? null,
      dir: el.dataset.dir ?? null,
      text: el.matches('.dock-tab-label,.dock-group-tab,.dock-tab-close,.dock-collapsed-stub,.dock-group.row,.dock-float-grip,.dock-empty,.dock-spill button') ? (el.textContent || '').trim() : null,
      rect: [round(r.left - sr.left), round(r.top - sr.top), round(r.width), round(r.height)],
      style,
      children: [],
    };
    let index = 0;
    for (const child of el.children) {
      if (child.matches(SEL)) {
        node.children.push(walk(child, `${`${`${`${`${path}${'/'}`}${node.cls.split(' ')[0]}`}${'['}`}${index++}`}${']'}`));
      } else if (child.matches('.dock-spill')) {
        node.children.push(walk(child, `${path}${'/spill'}`));
      }
    }
    return node;
  };
  const roots = [...stage.children].filter(c => c.matches(SEL)).map((c, i) => walk(c, `${'#'}${i}`));
  return JSON.stringify({ stage: [round(sr.width), round(sr.height)], roots }, null, 1);
})();
