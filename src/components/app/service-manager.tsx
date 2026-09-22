"use client";

import { useRef, useState, useTransition } from "react";
import { createService, setServiceActive, updateService } from "@/app/(app)/services/actions";
import { Button, Empty, Input, Panel, Rule, cx } from "@/components/ui";
import { toast } from "@/components/toast";
import { useFlip, useListTransition } from "@/lib/use-list-transition";
import { duration, money } from "@/lib/format";
import type { Service } from "@/lib/types";

type Draft = { name: string; price: string; minutes: string };

const BLANK: Draft = { name: "", price: "", minutes: "15" };

export function ServiceManager({ services }: { services: Service[] }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const active = services.filter((s) => s.active);
  const retired = services.filter((s) => !s.active);

  const rows = useListTransition(active, (s) => s.id);
  const listRef = useRef<HTMLUListElement>(null);
  useFlip(listRef, rows.map((r) => r.key).join());

  function save(draft: Draft, id?: string) {
    const payload = {
      name: draft.name.trim(),
      price_cents: Math.round(Number(draft.price || 0) * 100),
      duration_min: Math.max(1, Number(draft.minutes || 15)),
    };
    startTransition(async () => {
      const result = id ? await updateService(id, payload) : await createService(payload);
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      toast(id ? "Service updated" : "Service added", "success");
      setAdding(false);
      setEditing(null);
    });
  }

  return (
    <div className="space-y-8">
      <Panel className="overflow-hidden">
        {active.length === 0 && !adding ? (
          <Empty
            title="No services yet"
            body="Add what people queue for. The time you set is how QyoFlow estimates waits."
            action={<Button onClick={() => setAdding(true)}>Add a service</Button>}
          />
        ) : (
          <ul ref={listRef}>
            {rows.map(({ key, item, state }, i) => (
              <li
                key={key}
                data-flip-key={key}
                className={cx(
                  state === "entering" && "row-enter",
                  state === "leaving" && "row-exit",
                )}
              >
                {i > 0 && <Rule />}
                {editing === item.id ? (
                  <div className="p-3">
                    <ServiceForm
                      initial={{
                        name: item.name,
                        price: String(item.price_cents / 100),
                        minutes: String(item.duration_min),
                      }}
                      pending={pending}
                      onCancel={() => setEditing(null)}
                      onSave={(draft) => save(draft, item.id)}
                    />
                  </div>
                ) : (
                  <div className="group flex items-center gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate t-body text-[var(--color-ink)]">{item.name}</p>
                      <p className="mt-0.5 t-body-sm text-[var(--color-ink-3)]">
                        {duration(item.duration_min)}
                        {item.price_cents > 0 && ` · ${money(item.price_cents)}`}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <Button size="sm" variant="tertiary" onClick={() => setEditing(item.id)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="tertiary"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const r = await setServiceActive(item.id, false);
                            if (!r.ok) toast(r.error, "error");
                          })
                        }
                      >
                        Retire
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}

            {adding && (
              <li>
                {active.length > 0 && <Rule />}
                <div className="p-3">
                  <ServiceForm
                    initial={BLANK}
                    pending={pending}
                    onCancel={() => setAdding(false)}
                    onSave={(draft) => save(draft)}
                  />
                </div>
              </li>
            )}
          </ul>
        )}
      </Panel>

      {!adding && active.length > 0 && (
        <Button variant="secondary" onClick={() => setAdding(true)}>
          Add a service
        </Button>
      )}

      {retired.length > 0 && (
        <section>
          <h2 className="t-label text-[var(--color-ink-3)]">Retired</h2>
          <p className="mt-1 max-w-[52ch] t-body-sm text-[var(--color-ink-3)]">
            Kept rather than deleted, so past queue entries still say what they
            were for.
          </p>
          <ul className="mt-3">
            {retired.map((service, i) => (
              <li key={service.id}>
                {i > 0 && <Rule />}
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <span className="min-w-0 truncate t-body-sm text-[var(--color-ink-2)]">
                    {service.name}
                  </span>
                  <Button
                    size="sm"
                    variant="tertiary"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await setServiceActive(service.id, true);
                        if (!r.ok) toast(r.error, "error");
                      })
                    }
                  >
                    Restore
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ServiceForm({
  initial,
  pending,
  onSave,
  onCancel,
}: {
  initial: Draft;
  pending: boolean;
  onSave: (draft: Draft) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const valid = draft.name.trim().length > 0;

  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--color-sunken)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="Service name"
          aria-label="Service name"
          autoFocus
          className="min-w-[10rem] flex-1"
        />
        <div className="flex h-10 items-center rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3 shadow-[var(--shadow-1)]">
          <span className="t-body-sm text-[var(--color-ink-3)]">₱</span>
          <input
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: e.target.value.replace(/\D/g, "") })}
            inputMode="numeric"
            placeholder="0"
            aria-label="Price in pesos"
            className="tnum w-16 bg-transparent px-1 t-body outline-none"
          />
        </div>
        <div className="flex h-10 items-center rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3 shadow-[var(--shadow-1)]">
          <input
            value={draft.minutes}
            onChange={(e) => setDraft({ ...draft, minutes: e.target.value.replace(/\D/g, "") })}
            inputMode="numeric"
            placeholder="15"
            aria-label="Duration in minutes"
            className="tnum w-9 bg-transparent text-right t-body outline-none"
          />
          <span className="ml-1 t-body-sm text-[var(--color-ink-3)]">min</span>
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="tertiary" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" disabled={!valid} loading={pending} onClick={() => onSave(draft)}>
          Save
        </Button>
      </div>
    </div>
  );
}
