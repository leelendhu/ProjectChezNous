import { create } from 'zustand';
import { clearSaved, loadSaved, save } from './persistence';
import { defaultState, type OverrideKey, type ScenarioState } from './schema';
import { decodeHash, encodeHash, type Tab } from './urlHash';

type S = ScenarioState;
type Borrower = S['household']['borrowers'][number];
type Cover = S['loan']['insurance'][number];
type ExistingLoanRow = S['existingLoans'][number];

export interface Store {
  state: S;
  tab: Tab;
  /** Set when a shared link could not be read and defaults were used instead. */
  linkError: boolean;
  setTab: (tab: Tab) => void;
  setHousehold: (patch: Partial<S['household']>) => void;
  setBorrower: (index: number, patch: Partial<Borrower>) => void;
  setBorrowerCount: (count: 1 | 2) => void;
  setProject: (patch: Partial<S['project']>) => void;
  setLoan: (patch: Partial<S['loan']>) => void;
  setCover: (index: number, patch: Partial<Cover>) => void;
  setRules: (patch: Partial<S['rules']>) => void;
  setRvb: (patch: Partial<S['rvb']>) => void;
  addExistingLoan: () => void;
  updateExistingLoan: (id: string, patch: Partial<ExistingLoanRow>) => void;
  removeExistingLoan: (id: string) => void;
  setOverride: <K extends OverrideKey>(key: K, value: S['overrides'][K] | undefined) => void;
  resetOverrides: () => void;
  resetAll: () => void;
  replaceState: (state: S) => void;
  dismissLinkError: () => void;
}

let loanSeq = 0;
const newId = () => `l${Date.now().toString(36)}${(loanSeq++).toString(36)}`;

export const useStore = create<Store>((set) => {
  const patch = <K extends keyof S>(key: K, p: Partial<S[K]>) =>
    set((st) => ({ state: { ...st.state, [key]: { ...(st.state[key] as object), ...p } } }));

  return {
    state: structuredClone(defaultState),
    tab: 'loan',
    linkError: false,
    setTab: (tab) => set({ tab }),
    setHousehold: (p) => patch('household', p),
    setBorrower: (i, p) =>
      set((st) => {
        const borrowers = st.state.household.borrowers.map((b, j) => (j === i ? { ...b, ...p } : b));
        return { state: { ...st.state, household: { ...st.state.household, borrowers } } };
      }),
    setBorrowerCount: (count) =>
      set((st) => {
        const current = st.state.household.borrowers;
        const borrowers = count === 1 ? current.slice(0, 1) : [current[0]!, current[1] ?? { ...defaultState.household.borrowers[1]! }];
        const covers = st.state.loan.insurance;
        const insurance =
          count === 1
            ? [{ ...covers[0]!, quotite: 1 }]
            : [{ ...covers[0]!, quotite: 0.5 }, covers[1] ?? { ...defaultState.loan.insurance[1]! }];
        return { state: { ...st.state, household: { ...st.state.household, borrowers }, loan: { ...st.state.loan, insurance } } };
      }),
    setProject: (p) => patch('project', p),
    setLoan: (p) => patch('loan', p),
    setCover: (i, p) =>
      set((st) => {
        const insurance = st.state.loan.insurance.map((c, j) => (j === i ? { ...c, ...p } : c));
        return { state: { ...st.state, loan: { ...st.state.loan, insurance } } };
      }),
    setRules: (p) => patch('rules', p),
    setRvb: (p) => patch('rvb', p),
    addExistingLoan: () =>
      set((st) => ({
        state: {
          ...st.state,
          existingLoans: [...st.state.existingLoans, { id: newId(), label: '', monthlyPayment: 200, monthsRemaining: 12 }],
        },
      })),
    updateExistingLoan: (id, p) =>
      set((st) => ({ state: { ...st.state, existingLoans: st.state.existingLoans.map((l) => (l.id === id ? { ...l, ...p } : l)) } })),
    removeExistingLoan: (id) =>
      set((st) => ({ state: { ...st.state, existingLoans: st.state.existingLoans.filter((l) => l.id !== id) } })),
    setOverride: (key, value) =>
      set((st) => {
        const overrides = { ...st.state.overrides };
        if (value === undefined) delete overrides[key];
        else overrides[key] = value;
        return { state: { ...st.state, overrides } };
      }),
    resetOverrides: () => set((st) => ({ state: { ...st.state, overrides: {} } })),
    resetAll: () => {
      clearSaved();
      set({ state: structuredClone(defaultState) });
    },
    replaceState: (state) => set({ state }),
    dismissLinkError: () => set({ linkError: false }),
  };
});

/** Load from the URL first (a shared link wins), then localStorage, then defaults. */
export function hydrate(hash: string = typeof location === 'undefined' ? '' : location.hash): void {
  const fromHash = decodeHash(hash);
  const saved = fromHash.state ?? loadSaved();
  useStore.setState({ tab: fromHash.tab, linkError: fromHash.invalid, ...(saved ? { state: saved } : {}) });
}

/** Keep localStorage and the URL hash in sync with the store (debounced). */
export function startSync(delayMs = 300): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const write = () => {
    const { state, tab } = useStore.getState();
    save(state);
    const hash = encodeHash(tab, state);
    if (typeof location !== 'undefined' && location.hash !== hash) {
      history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
    }
  };
  const unsubscribe = useStore.subscribe((now, prev) => {
    if (now.tab !== prev.tab) {
      clearTimeout(timer);
      write();
      return;
    }
    if (now.state === prev.state) return;
    clearTimeout(timer);
    timer = setTimeout(write, delayMs);
  });
  const onHashChange = () => {
    const decoded = decodeHash(location.hash);
    useStore.setState({ tab: decoded.tab, ...(decoded.state ? { state: decoded.state } : {}) });
  };
  if (typeof window !== 'undefined') window.addEventListener('hashchange', onHashChange);
  return () => {
    unsubscribe();
    clearTimeout(timer);
    if (typeof window !== 'undefined') window.removeEventListener('hashchange', onHashChange);
  };
}
