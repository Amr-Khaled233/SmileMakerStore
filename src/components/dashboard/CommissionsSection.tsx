import { useEffect, useState, useCallback, useMemo } from "react";
import { Stethoscope, FileText, Check, Trash2, Pencil, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import type { CommissionLine } from "@/lib/api";
import { formatEGP } from "@/data/products";

type Group = { name: string; items: CommissionLine[]; owed: number; paid: number };

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });

export function CommissionsSection({ token }: { token: string }) {
  const [lines, setLines] = useState<CommissionLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");

  const load = useCallback(async () => {
    const data = await api.getCommissions(token).catch(() => [] as CommissionLine[]);
    setLines(data);
    setLoaded(true);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const setLineBusy = (k: string, v: boolean) => setBusy((b) => ({ ...b, [k]: v }));

  const togglePaid = async (l: CommissionLine) => {
    setLineBusy(l.key, true);
    await api.updateCommission(token, l.key, { paid: !l.paid }).catch(() => {});
    await load();
    setLineBusy(l.key, false);
  };

  const startEditAmount = (l: CommissionLine) => {
    setEditKey(l.key);
    setEditVal(String(l.amount));
  };

  const saveAmount = async (l: CommissionLine) => {
    const n = Number(editVal);
    if (isNaN(n) || n < 0) return;
    setLineBusy(l.key, true);
    await api.updateCommission(token, l.key, { amount: n }).catch(() => {});
    setEditKey(null);
    await load();
    setLineBusy(l.key, false);
  };

  const resetAmount = async (l: CommissionLine) => {
    setLineBusy(l.key, true);
    await api.updateCommission(token, l.key, { amount: null }).catch(() => {});
    await load();
    setLineBusy(l.key, false);
  };

  const remove = async (l: CommissionLine) => {
    if (!window.confirm(`مسح عمولة أوردر ${l.orderId} (${formatEGP(l.amount)})؟`)) return;
    setLineBusy(l.key, true);
    await api.deleteCommission(token, l.key).catch(() => {});
    await load();
    setLineBusy(l.key, false);
  };

  const groups = useMemo(() => {
    const make = (party: "doctor" | "report"): Group[] => {
      const m = new Map<string, CommissionLine[]>();
      for (const l of lines) {
        if (l.party !== party) continue;
        m.set(l.name, [...(m.get(l.name) ?? []), l]);
      }
      return [...m.entries()]
        .map(([name, items]) => ({
          name,
          items: items.sort((a, b) => b.date - a.date),
          owed: items.filter((i) => !i.paid).reduce((s, i) => s + i.amount, 0),
          paid: items.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0),
        }))
        .sort((a, b) => b.owed - a.owed);
    };
    return { doctors: make("doctor"), reports: make("report") };
  }, [lines]);

  const totalOwed = lines.filter((l) => !l.paid).reduce((s, l) => s + l.amount, 0);
  const totalPaid = lines.filter((l) => l.paid).reduce((s, l) => s + l.amount, 0);

  if (!loaded) {
    return <div className="text-center py-10 text-muted-foreground text-sm">جاري التحميل...</div>;
  }

  if (lines.length === 0) {
    return (
      <p className="text-center py-16 text-muted-foreground">
        لا توجد عمولات بعد — العمولات بتظهر هنا لما أوردر يستخدم كود مربوط بدكتور أو تقرير طبي.
      </p>
    );
  }

  const renderLine = (l: CommissionLine) => {
    const isEditing = editKey === l.key;
    const isBusy = busy[l.key];
    return (
      <div
        key={l.key}
        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors ${
          l.paid ? "bg-emerald-50/50 border-emerald-200" : "bg-white border-border"
        }`}
      >
        {/* Paid toggle */}
        <button
          onClick={() => togglePaid(l)}
          disabled={isBusy}
          title={l.paid ? "تم الاستلام — اضغط للتراجع" : "اضغط لتعليم كمستلَم"}
          className={`h-7 w-7 rounded-full border flex items-center justify-center shrink-0 transition-all disabled:opacity-50 ${
            l.paid
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "border-border text-transparent hover:border-emerald-400"
          }`}
        >
          <Check className="h-4 w-4" />
        </button>

        {/* Date + order */}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink">{fmtDate(l.date)}</p>
          <p className="text-[11px] text-muted-foreground" dir="ltr">
            {l.orderId} · {l.pct}% من {formatEGP(l.orderTotal)}
            {l.paid && l.paidAt ? ` · استُلم ${fmtDate(l.paidAt)}` : ""}
          </p>
        </div>

        {/* Amount (editable) */}
        {isEditing ? (
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="number"
              min={0}
              value={editVal}
              autoFocus
              onChange={(e) => setEditVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveAmount(l); if (e.key === "Escape") setEditKey(null); }}
              className="w-24 text-center lux-input text-sm py-1"
            />
            <button onClick={() => saveAmount(l)} disabled={isBusy} className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50">
              حفظ
            </button>
            <button onClick={() => setEditKey(null)} className="btn-ghost text-xs py-1.5 px-2">×</button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-sm font-bold whitespace-nowrap ${l.paid ? "text-emerald-600" : "text-deep-blue"}`}>
              {formatEGP(l.amount)}
            </span>
            {l.overridden && (
              <button
                onClick={() => resetAmount(l)}
                disabled={isBusy}
                title="رجوع للقيمة المحسوبة تلقائياً"
                className="h-6 w-6 rounded-full text-muted-foreground hover:text-deep-blue hover:bg-soft flex items-center justify-center"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={() => startEditAmount(l)}
              disabled={isBusy}
              title="تعديل القيمة"
              className="h-6 w-6 rounded-full text-muted-foreground hover:text-deep-blue hover:bg-soft flex items-center justify-center"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={() => remove(l)}
              disabled={isBusy}
              title="مسح من السجل"
              className="h-6 w-6 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderGroup = (g: Group) => (
    <div key={g.name} className="lux-card p-4">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <p className="font-medium text-ink">{g.name}</p>
        <div className="flex items-center gap-2 text-xs">
          <span className="bg-deep-blue/10 text-deep-blue font-bold rounded-full px-2.5 py-1">
            مستحق: {formatEGP(g.owed)}
          </span>
          {g.paid > 0 && (
            <span className="bg-emerald-50 text-emerald-700 rounded-full px-2.5 py-1">
              مستلَم: {formatEGP(g.paid)}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-2">{g.items.map(renderLine)}</div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="lux-card p-5">
          <p className="text-xs text-muted-foreground mb-1">إجمالي المستحق (لسه ماتدفعش)</p>
          <p className="text-2xl font-bold text-deep-blue">{formatEGP(totalOwed)}</p>
        </div>
        <div className="lux-card p-5">
          <p className="text-xs text-muted-foreground mb-1">إجمالي المستلَم</p>
          <p className="text-2xl font-bold text-emerald-600">{formatEGP(totalPaid)}</p>
        </div>
      </div>

      {/* Doctors */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Stethoscope className="h-5 w-5 text-deep-blue" />
          <h3 className="font-display text-xl">عمولات الدكاترة</h3>
        </div>
        {groups.doctors.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد عمولات دكاترة</p>
        ) : (
          <div className="space-y-3">{groups.doctors.map(renderGroup)}</div>
        )}
      </section>

      {/* Reports */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-5 w-5 text-deep-blue" />
          <h3 className="font-display text-xl">عمولات التقارير الطبية</h3>
        </div>
        {groups.reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد عمولات تقارير</p>
        ) : (
          <div className="space-y-3">{groups.reports.map(renderGroup)}</div>
        )}
      </section>
    </div>
  );
}
