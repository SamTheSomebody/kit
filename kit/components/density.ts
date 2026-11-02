/* DENSITY — whether a control sits in a dense pane (`dense.css`, the
 * Inspector's). Most of density is CSS; this is for the few controls whose
 * BEHAVIOUR changes with it: a number line's label scrubs its value, as
 * Unity's does. Set once by the pane, read by whatever it renders. */

import { getContext, setContext } from "svelte";

const DENSE = Symbol("kit-dense");

/** Marks everything this component renders as dense. Call during component init. */
export const setDense = (dense = true): void => {
	setContext(DENSE, dense);
};

/** Whether a pane above this component is dense. Call during component init. */
export const isDense = (): boolean => getContext<boolean | undefined>(DENSE) === true;
