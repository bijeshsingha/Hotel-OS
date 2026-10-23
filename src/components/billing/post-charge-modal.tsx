import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, Plus, Trash2, X } from "lucide-react";
import { formatINR, round2 } from "@/lib/gst/calculator";
import { MANUAL_CHARGE_GST_RATE, MAX_MANUAL_KOTS, ManualKotInput, normalizeManualKots, quoteManualCharge } from "@/lib/billing/manual-kot";
import { ChargeFormState } from "./billing-types";
import styles from "./post-charge-modal.module.css";

interface PostChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStay: any;
  folioId?: string;
  roomNumber?: string;
  chargeForm: ChargeFormState;
  setChargeForm: React.Dispatch<React.SetStateAction<ChargeFormState>>;
  onSubmit: (event: React.FormEvent) => Promise<void>;
  onPostKots: (kots: ManualKotInput[], requestId: string) => Promise<void>;
  loading: boolean;
}

interface KotDraft { id: string; kotNumber: string; description: string; amount: string; }
const categories = [
  { code: "RESTAURANT_FOOD", label: "Food & beverage / KOT", description: "Kitchen Order (KOT)", sac: "996331" },
  { code: "STAY_EXTENSION", label: "Stay extension", description: "Stay Extension Charge", sac: "996311" },
  { code: "ROOM_TARIFF", label: "Room tariff / extra bed", description: "Room Tariff / Extra Bed Adjustment", sac: "996311" },
  { code: "LAUNDRY", label: "Laundry & pressing", description: "Laundry & Pressing Service", sac: "9997" },
  { code: "TRANSPORT", label: "Travel / cab / transfer", description: "Cab / Airport Pick & Drop", sac: "9964" },
  { code: "MISC", label: "Other guest service", description: "Guest Service Charge", sac: "9999" },
];

export function PostChargeModal({ isOpen, onClose, activeStay, folioId, roomNumber, chargeForm, setChargeForm, onSubmit, onPostKots, loading }: PostChargeModalProps) {
  const [rows, setRows] = useState<KotDraft[]>([{ id: "kot-first", kotNumber: "", description: "", amount: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const categoryInput = useRef<HTMLSelectElement>(null);
  const slipInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const rowCounter = useRef(0);
  const nextFocus = useRef<string | null>(null);
  const posting = useRef(false);
  const closeAction = useRef(onClose);
  const busy = useRef(loading);
  closeAction.current = onClose;
  busy.current = loading;
  const pending = useRef<{ id: string; folioId?: string; signature: string } | null>(null);
  const isKot = chargeForm.chargeCode === "RESTAURANT_FOOD";
  const locked = loading || uncertain;
  const blankRow = (): KotDraft => ({ id: `kot-${++rowCounter.current}`, kotNumber: "", description: "", amount: "" });

  useEffect(() => {
    if (!isOpen) return;
    if (pending.current && pending.current.folioId === folioId) {
      setChargeForm(previous => ({ ...previous, chargeCode: "RESTAURANT_FOOD", sacHsn: "996331" }));
      return;
    }
    pending.current = null;
    setUncertain(false);
    setError(null);
    setSuccess(null);
    setRows([{ ...blankRow(), kotNumber: chargeForm.kotNumber || "", description: chargeForm.chargeCode === "RESTAURANT_FOOD" && chargeForm.description !== "Kitchen Order (KOT)" ? chargeForm.description : "", amount: chargeForm.chargeCode === "RESTAURANT_FOOD" && Number(chargeForm.amount) > 0 ? chargeForm.amount : "" }]);
    // Seed only on opening/context change, never while a staff member edits a row.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, folioId]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    if (!categoryInput.current?.disabled) categoryInput.current?.focus();
    else dialog.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy.current && !posting.current) { event.preventDefault(); closeAction.current(); }
      if (event.key !== "Tab") return;
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]') || []).filter(element => element.getClientRects().length > 0);
      if (!controls.length) { event.preventDefault(); dialog.current?.focus(); return; }
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keyboard);
    return () => { document.removeEventListener("keydown", keyboard); if (previousFocus?.isConnected) previousFocus.focus(); };
  }, [isOpen]);

  useEffect(() => {
    if (nextFocus.current) { slipInputs.current[nextFocus.current]?.focus(); nextFocus.current = null; }
  }, [rows]);

  if (!isOpen) return null;

  const quotes = isKot ? rows.map(row => quoteManualCharge(Number(row.amount) || 0)) : [quoteManualCharge(Number(chargeForm.amount) || 0, chargeForm.sacHsn)];
  const totals = quotes.reduce((sum, quote) => ({ taxable: round2(sum.taxable + quote.taxableAmount), cgst: round2(sum.cgst + quote.components.cgstAmount), sgst: round2(sum.sgst + quote.components.sgstAmount), total: round2(sum.total + quote.totalAmount) }), { taxable: 0, cgst: 0, sgst: 0, total: 0 });
  const updateRow = (id: string, field: keyof Omit<KotDraft, "id">, value: string) => { setRows(previous => previous.map(row => row.id === id ? { ...row, [field]: value } : row)); setError(null); setSuccess(null); };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading || posting.current) return;
    setError(null);
    if (!isKot) {
      if (!chargeForm.description.trim() || !Number.isFinite(Number(chargeForm.amount)) || Number(chargeForm.amount) <= 0) { setError("Enter a description and an amount greater than ₹0."); return; }
      posting.current = true;
      try { await onSubmit(event); } finally { posting.current = false; }
      return;
    }
    let entries: ManualKotInput[];
    try { entries = normalizeManualKots(rows); } catch (validation) { setError(validation instanceof Error ? validation.message : "Check the KOT entries."); return; }
    const signature = JSON.stringify(entries);
    if (pending.current && pending.current.signature !== signature) { setError("Retry the original entries first. This batch may already have been posted; check the folio before starting a different batch."); return; }
    if (!pending.current) pending.current = { id: crypto.randomUUID(), folioId, signature };
    posting.current = true;
    try {
      await onPostKots(entries, pending.current.id);
      pending.current = null;
      setUncertain(false);
      setSuccess(`${entries.length} KOT${entries.length === 1 ? "" : "s"} posted · ${formatINR(round2(entries.reduce((sum, entry) => sum + entry.amount, 0)))}. You can add more here.`);
      const row = blankRow(); nextFocus.current = row.id; setRows([row]);
    } catch (problem) {
      const status = (problem as { status?: number })?.status;
      const unknownOutcome = !status || status >= 500;
      setUncertain(unknownOutcome);
      if (!unknownOutcome) pending.current = null;
      const message = problem instanceof Error ? problem.message : "Could not post the KOTs.";
      setError(unknownOutcome ? `${message} Retry posting to confirm the same batch without adding duplicates. Check the folio before starting another batch.` : message);
    } finally { posting.current = false; }
  };

  return <div className={styles.overlay}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="post-charge-heading" tabIndex={-1} className={styles.dialog}>
      <header className={styles.header}><div><h2 id="post-charge-heading">Post charge to Room {roomNumber || activeStay?.roomAssignments?.[0]?.room?.number || "N/A"}</h2><p>Guest: {activeStay?.primaryGuest?.name || "In-house guest"}</p></div><button type="button" className={styles.iconButton} onClick={onClose} disabled={loading} aria-label="Close charge form"><X size={19} aria-hidden="true" /></button></header>
      <form onSubmit={submit} noValidate className={styles.form} aria-busy={loading}>
        {success && <div role="status" className={`${styles.message} ${styles.success}`}><CheckCircle2 size={18} aria-hidden="true" /><span>{success}</span></div>}
        {error && <div role="alert" className={`${styles.message} ${styles.error}`}><AlertCircle size={18} aria-hidden="true" /><span>{error}</span></div>}
        <div className={styles.field}>
          <label htmlFor="charge-category">Service or category</label>
          <div className={styles.selectWrap}><select ref={categoryInput} id="charge-category" className={styles.categorySelect} value={chargeForm.chargeCode} disabled={locked} aria-describedby="charge-category-help" onKeyDown={event => { if (event.key === "Escape") event.stopPropagation(); }} onChange={event => { const category = categories.find(item => item.code === event.target.value) || categories[0]; setChargeForm(previous => ({ ...previous, chargeCode: category.code, sacHsn: category.sac, description: category.description })); setError(null); setSuccess(null); }}>{categories.map(category => <option key={category.code} value={category.code}>{category.label}</option>)}</select><ChevronDown size={18} aria-hidden="true" /></div>
          <p id="charge-category-help" className={styles.hint}>{isKot ? "Enter one row per KOT slip. Each amount includes GST." : "Post a charge for this service. The entered amount includes GST."}</p>
        </div>

        {isKot ? <>
          <div className={styles.sectionHeading}><h3>KOT slips ({rows.length})</h3><span className={styles.taxBadge}>{MANUAL_CHARGE_GST_RATE}% GST included</span></div>
          <div className={styles.rows}>{rows.map((row, index) => <div className={styles.row} key={row.id}>
            <p className={styles.rowTitle}>KOT {index + 1}</p>
            <div className={styles.field}><label htmlFor={`${row.id}-number`}>Slip number <span className="text-zinc-500">(optional)</span></label><input ref={element => { slipInputs.current[row.id] = element; }} id={`${row.id}-number`} value={row.kotNumber} disabled={locked} placeholder="e.g. KOT-1042" maxLength={80} onChange={event => updateRow(row.id, "kotNumber", event.target.value)} /></div>
            <div className={styles.field}><label htmlFor={`${row.id}-amount`}>Amount</label><div className={styles.money}><span aria-hidden="true">₹</span><input id={`${row.id}-amount`} type="number" inputMode="decimal" min="0.01" step="0.01" required value={row.amount} disabled={locked} placeholder="0.00" onChange={event => updateRow(row.id, "amount", event.target.value)} /></div></div>
            <button type="button" className={`${styles.iconButton} ${styles.remove}`} disabled={locked || rows.length === 1} aria-label={`Remove KOT ${index + 1}`} onClick={() => { setRows(previous => previous.filter(item => item.id !== row.id)); setError(null); setSuccess(null); }}><Trash2 size={17} aria-hidden="true" /></button>
            <div className={`${styles.field} ${styles.rowDetails}`}><label htmlFor={`${row.id}-description`}>Details <span className="text-zinc-500">(optional)</span></label><input id={`${row.id}-description`} value={row.description} disabled={locked} placeholder="e.g. Dinner / room service" maxLength={450} onChange={event => updateRow(row.id, "description", event.target.value)} /></div>
          </div>)}</div>
          <button type="button" className={styles.add} disabled={locked || rows.length >= MAX_MANUAL_KOTS} onClick={() => { const row = blankRow(); nextFocus.current = row.id; setRows(previous => [...previous, row]); setError(null); }}><Plus size={17} aria-hidden="true" />Add another KOT</button>
        </> : <>
          <div className={styles.field}><label htmlFor="charge-reference">Slip number <span className="text-zinc-500">(optional)</span></label><input id="charge-reference" value={chargeForm.kotNumber || ""} disabled={loading} placeholder="e.g. KOT-1042" onChange={event => setChargeForm(previous => ({ ...previous, kotNumber: event.target.value }))} /></div>
          <div className={styles.field}><label htmlFor="charge-description">Description</label><input id="charge-description" required value={chargeForm.description} disabled={loading} onChange={event => setChargeForm(previous => ({ ...previous, description: event.target.value }))} /></div>
          <div className={styles.field}><label htmlFor="charge-amount">Amount · {MANUAL_CHARGE_GST_RATE}% GST included</label><div className={styles.money}><span aria-hidden="true">₹</span><input id="charge-amount" type="number" inputMode="decimal" min="0.01" step="0.01" required value={chargeForm.amount} disabled={loading} placeholder="0.00" onChange={event => setChargeForm(previous => ({ ...previous, amount: event.target.value }))} /></div></div>
        </>}

        <div className={styles.totals} aria-label="Charge totals">
          <div className={styles.totalRow}><span>Taxable amount</span><span>{formatINR(totals.taxable)}</span></div>
          <div className={styles.totalRow}><span>CGST ({MANUAL_CHARGE_GST_RATE / 2}%)</span><span>{formatINR(totals.cgst)}</span></div>
          <div className={styles.totalRow}><span>SGST ({MANUAL_CHARGE_GST_RATE / 2}%)</span><span>{formatINR(totals.sgst)}</span></div>
          <div className={`${styles.totalRow} ${styles.grandTotal}`}><span>{isKot ? `${rows.length} KOT${rows.length === 1 ? "" : "s"} · total to post` : "Total to post"}</span><span>{formatINR(totals.total)}</span></div>
        </div>
        {isKot && <p className={styles.hint}>Each KOT appears as a separate charge in the room folio. You can post up to {MAX_MANUAL_KOTS} slips together.</p>}
        <footer className={styles.footer}><button type="button" className="ui-button ui-button-secondary" onClick={onClose} disabled={loading}>{success ? "Done" : "Cancel"}</button><button type="submit" className="ui-button ui-button-primary" disabled={loading}>{loading ? "Posting…" : uncertain ? "Retry posting" : isKot ? `Post ${rows.length === 1 ? "KOT" : `${rows.length} KOTs`}` : "Post charge"}</button></footer>
      </form>
    </div>
  </div>;
}
