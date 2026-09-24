(() => {
  const COLLAPSED = '{"v":1,"layout":{"split":"row","ratio":0.3,"a":{"leaf":true,"id":"L1","tabs":["timeline","config","assets"],"active":"timeline"},"b":{"split":"col","ratio":0.6,"a":{"leaf":true,"id":"L2","tabs":["game"],"active":"game"},"b":{"split":"row","ratio":0.5,"a":{"leaf":true,"id":"L3","tabs":["ref-a"],"active":"ref-a","collapsed":1},"b":{"leaf":true,"id":"L4","tabs":["ref-b","paytable"],"active":"ref-b","collapsed":2}}}},"floating":[{"id":"F1","x":420,"y":380,"w":360,"h":220,"z":21,"root":{"leaf":true,"id":"L5","tabs":["log"],"active":"log","collapsed":3}}]}';
  const THREE = '{"v":1,"layout":{"split":"row","ratio":0.5,"a":{"split":"row","ratio":0.5,"a":{"leaf":true,"id":"L1","tabs":["ref-a"],"active":"ref-a"},"b":{"leaf":true,"id":"L2","tabs":["ref-b"],"active":"ref-b"}},"b":{"leaf":true,"id":"L3","tabs":["paytable"],"active":"paytable"}},"floating":[]}';
  const api = window.__DOCK_FIDELITY__
    ? { load: (j) => window.__DOCK_FIDELITY__.handle.hydrate(j), dump: () => window.__DOCK_FIDELITY__.handle.serialize() }
    : { load: (j) => { hydrate(j); rerender(); }, dump: () => serialize() };

  const out = {};

  /* Rule 1 — drag the shaded float's LOG tab onto the group bar's empty area.
     Synthetic events: fine HERE, because both renderers receive byte-identical
     input and we are comparing them to each other, not proving a real drop. */
  api.load(COLLAPSED);
  const tab = document.querySelector(".dock-float .dock-tab");
  const bar = document.querySelector(".dock-group.col");
  const dt = new DataTransfer();
  const fire = (el, type, extra) => el.dispatchEvent(new DragEvent(type, Object.assign({ bubbles: true, cancelable: true, dataTransfer: dt }, extra)));
  fire(tab, "dragstart");
  const barBox = bar.getBoundingClientRect();
  const at = { clientX: Math.round(barBox.right - 40), clientY: Math.round(barBox.top + barBox.height / 2) };
  fire(bar, "dragover", at);
  fire(bar, "drop", at);
  fire(tab, "dragend");
  const shape = (n) => (n.leaf ? n.tabs.join("+") + (n.collapsed ? "(c)" : "") : `${`${`${`${`${n.split}${"{"}`}${shape(n.a)}`}${" , "}`}${shape(n.b)}`}${"}"}`);
  out.barDrop = shape(JSON.parse(api.dump()).layout);

  /* Rule 3 — dblclick the innermost divider of a three-pane row. */
  api.load(THREE);
  document.querySelector(".dock-divider").dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
  const width = (el) => Math.round(el.getBoundingClientRect().width);
  out.evenSplit = [...document.querySelectorAll(".dock-leaf")].map((l) => `${`${l.dataset.leaf}${":"}`}${width(l)}`).join(" | ");
  out.evenRatios = (() => { const r = JSON.parse(api.dump()).layout; return [r.ratio.toFixed(4), r.a.ratio.toFixed(4)].join(" / "); })();

  return JSON.stringify(out);
})()
