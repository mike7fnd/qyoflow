"use client";

import { useState, useTransition } from "react";
import { updateSettings } from "@/app/(app)/settings/actions";
import { Button, Field, Input, Panel, Rule, Select } from "@/components/ui";
import { toast } from "@/components/toast";

const TIMEZONES = [
  "Asia/Manila",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Jakarta",
  "Asia/Bangkok",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];

type Form = {
  name: string;
  tagline: string;
  locationName: string;
  address: string;
  timezone: string;
};

/**
 * Two groups, one save. The save button only becomes available once something
 * has actually changed, so it doubles as an indicator of unsaved work.
 */
export function SettingsForm({ initial }: { initial: Form }) {
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const set = (key: keyof Form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function save() {
    startTransition(async () => {
      const result = await updateSettings(form);
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      setSaved(form);
      toast("Changes saved", "success");
    });
  }

  return (
    <div className="space-y-6">
      <Panel className="p-6 sm:p-7">
        <h2 className="t-h3 text-[var(--color-ink)]">Business</h2>
        <div className="mt-5 space-y-4">
          <Field label="Name" htmlFor="name">
            <Input id="name" value={form.name} onChange={set("name")} />
          </Field>
          <Field
            label="Tagline"
            htmlFor="tagline"
            hint="Shown under your name on the customer page."
          >
            <Input
              id="tagline"
              value={form.tagline}
              onChange={set("tagline")}
              placeholder="Walk-ins welcome"
            />
          </Field>
        </div>
      </Panel>

      <Panel className="p-6 sm:p-7">
        <h2 className="t-h3 text-[var(--color-ink)]">Location</h2>
        <div className="mt-5 space-y-4">
          <Field label="Location name" htmlFor="loc">
            <Input id="loc" value={form.locationName} onChange={set("locationName")} />
          </Field>
          <Field label="Address" htmlFor="address">
            <Input
              id="address"
              value={form.address}
              onChange={set("address")}
              placeholder="123 Rizal St, Calapan"
            />
          </Field>
          <Field
            label="Time zone"
            htmlFor="tz"
            hint="Queue numbers restart at midnight in this time zone."
          >
            <Select id="tz" value={form.timezone} onChange={set("timezone")}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace("_", " ")}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Panel>

      <Rule />

      <div className="flex items-center gap-3">
        <Button disabled={!dirty} loading={pending} onClick={save}>
          Save changes
        </Button>
        {!dirty && <span className="t-body-sm text-[var(--color-ink-3)]">Everything saved</span>}
      </div>
    </div>
  );
}
