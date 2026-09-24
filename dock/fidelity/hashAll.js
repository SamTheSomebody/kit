(async () => {
  const fixtures = {
    shell: '{"v":1,"layout":{"split":"row","ratio":0.3,"a":{"leaf":true,"id":"L1","tabs":["timeline","config","assets","paytable","fences","books","sim","notes"],"active":"timeline"},"b":{"split":"col","ratio":0.6,"a":{"leaf":true,"id":"L2","tabs":["game"],"active":"game"},"b":{"split":"row","ratio":0.5,"a":{"leaf":true,"id":"L3","tabs":["ref-a"],"active":"ref-a"},"b":{"leaf":true,"id":"L4","tabs":["ref-b"],"active":"ref-b"}}}},"floating":[{"id":"F1","x":420,"y":380,"w":360,"h":220,"z":21,"root":{"leaf":true,"id":"L5","tabs":["log"],"active":"log"}}]}',
    collapsed: '{"v":1,"layout":{"split":"row","ratio":0.3,"a":{"leaf":true,"id":"L1","tabs":["timeline","config","assets"],"active":"timeline"},"b":{"split":"col","ratio":0.6,"a":{"leaf":true,"id":"L2","tabs":["game"],"active":"game"},"b":{"split":"row","ratio":0.5,"a":{"leaf":true,"id":"L3","tabs":["ref-a"],"active":"ref-a","collapsed":1},"b":{"leaf":true,"id":"L4","tabs":["ref-b","paytable"],"active":"ref-b","collapsed":2}}}},"floating":[{"id":"F1","x":420,"y":380,"w":360,"h":220,"z":21,"root":{"leaf":true,"id":"L5","tabs":["log"],"active":"log","collapsed":3}}]}',
    stub: '{"v":1,"layout":{"split":"row","ratio":0.3,"a":{"leaf":true,"id":"L1","tabs":["timeline","config"],"active":"timeline","collapsed":1},"b":{"leaf":true,"id":"L2","tabs":["game"],"active":"game"}},"floating":[{"id":"F1","x":420,"y":380,"w":360,"h":220,"z":21,"root":{"leaf":true,"id":"L5","tabs":["log"],"active":"log"}}]}',
    sideBySide: '{"v":1,"layout":{"split":"row","ratio":0.3,"a":{"leaf":true,"id":"L1","tabs":["timeline","config"],"active":"timeline"},"b":{"split":"col","ratio":0.6,"a":{"leaf":true,"id":"L2","tabs":["game"],"active":"game"},"b":{"split":"row","ratio":0.5,"a":{"split":"row","ratio":0.5,"a":{"leaf":true,"id":"L3","tabs":["ref-a"],"active":"ref-a","collapsed":1},"b":{"leaf":true,"id":"L4","tabs":["ref-b"],"active":"ref-b","collapsed":2}},"b":{"leaf":true,"id":"L6","tabs":["paytable"],"active":"paytable"}}}},"floating":[]}',
  };
  const load = window.__DOCK_FIDELITY__
    ? (j) => window.__DOCK_FIDELITY__.handle.hydrate(j)
    : (j) => { hydrate(j); rerender(); };
  const source = await (await fetch(`${"/probe.js?x="}${Date.now()}`)).text();
  const out = {};
  for (const [name, json] of Object.entries(fixtures)) {
    load(json);
    await new Promise((r) => setTimeout(r, 30));
    // The probe IS a script fetched from this same dev server and evaluated
    // against the live page; that is what the fidelity harness measures.
    // Nothing user-supplied reaches here.
    // eslint-disable-next-line no-eval
    const probe = eval(source);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(probe));
    out[name] = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
  }
  return JSON.stringify(out);
})().catch((error) => console.error(error))
