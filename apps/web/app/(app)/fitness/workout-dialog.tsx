"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, X } from "lucide-react";
import { useFieldArray, useForm, type Control, type UseFormRegister } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Field, FormRow } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useApi, useApiMutation } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { isoToLocalInput, localInputToIso, nowForInput } from "@/lib/format";
import { toOptionalNumber } from "@/lib/utils";
import type { Exercise, Workout } from "@/types/api";

const setSchema = z.object({
  weight: z.preprocess(toOptionalNumber, z.number().min(0, "≥ 0").max(2000).optional()),
  reps: z.preprocess(toOptionalNumber, z.number().int("Whole number").min(0, "≥ 0").max(10000).optional()),
  completed: z.boolean(),
});

const schema = z.object({
  name: z.string().trim().min(1, "Required").max(120),
  startedAt: z.string().min(1, "Required"),
  durationMinutes: z.preprocess(toOptionalNumber, z.number().int().min(0).max(1440).optional()),
  notes: z.string().max(2000).optional(),
  exercises: z.array(z.object({ exerciseId: z.string().min(1, "Pick an exercise"), sets: z.array(setSchema) })),
});

type FormValues = z.input<typeof schema>;

function SetsEditor({ index, control, register }: { index: number; control: Control<FormValues>; register: UseFormRegister<FormValues> }) {
  const sets = useFieldArray({ control, name: `exercises.${index}.sets` });
  return (
    <div className="grid gap-2">
      {sets.fields.map((field, setIndex) => (
        <div key={field.id} className="grid grid-cols-[2rem_1fr_1fr_auto_auto] items-center gap-2">
          <span className="tabular text-center text-xs text-text-3">#{setIndex + 1}</span>
          <Input aria-label={`Set ${setIndex + 1} weight`} type="number" step="0.5" min={0} placeholder="kg" {...register(`exercises.${index}.sets.${setIndex}.weight`)} />
          <Input aria-label={`Set ${setIndex + 1} reps`} type="number" min={0} placeholder="reps" {...register(`exercises.${index}.sets.${setIndex}.reps`)} />
          <label className="flex items-center gap-1.5 text-xs text-text-2">
            <input type="checkbox" className="size-4 accent-[var(--accent)]" {...register(`exercises.${index}.sets.${setIndex}.completed`)} /> Done
          </label>
          <Button size="icon-sm" variant="ghost" aria-label={`Remove set ${setIndex + 1}`} onClick={() => sets.remove(setIndex)}>
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <Button size="sm" variant="ghost" className="justify-self-start" onClick={() => sets.append({ weight: undefined, reps: undefined, completed: true })}>
        <Plus className="size-4" /> Add set
      </Button>
    </div>
  );
}

export function WorkoutDialog({ workout, onClose }: { workout?: Workout; onClose: () => void }) {
  const exercises = useApi<Exercise[]>(["fitness", "exercises"], "/fitness/exercises");
  const form = useForm<FormValues, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: workout?.name ?? "",
      startedAt: workout ? isoToLocalInput(workout.startedAt) : nowForInput(-60),
      durationMinutes: workout?.durationMinutes ?? 60,
      notes: workout?.notes ?? "",
      exercises: workout?.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.map((s) => ({ weight: s.weight ?? undefined, reps: s.reps ?? undefined, completed: s.completed })) })) ?? [],
    },
  });
  const list = useFieldArray({ control: form.control, name: "exercises" });
  const save = useApiMutation(
    (v: z.output<typeof schema>) => {
      const startedAt = localInputToIso(v.startedAt);
      const body = {
        name: v.name,
        notes: v.notes || undefined,
        startedAt,
        endedAt: v.durationMinutes ? new Date(new Date(startedAt).getTime() + v.durationMinutes * 60_000).toISOString() : undefined,
        exercises: v.exercises,
      };
      return workout ? api(`/fitness/workouts/${workout.id}`, { method: "PATCH", body }) : api("/fitness/workouts", { method: "POST", body });
    },
    { invalidate: [["fitness"]], success: workout ? "Workout updated" : "Workout logged", onSuccess: onClose },
  );
  const errors = form.formState.errors;

  return (
    <Dialog open onClose={onClose} title={workout ? "Edit workout" : "Log workout"} className="w-[min(100%-2rem,40rem)]">
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4">
        <Field label="Workout" error={errors.name?.message}>
          <Input autoFocus placeholder="Upper body, 5K run…" {...form.register("name")} />
        </Field>
        <FormRow>
          <Field label="Started" error={errors.startedAt?.message}>
            <Input type="datetime-local" {...form.register("startedAt")} />
          </Field>
          <Field label="Duration (minutes)" error={errors.durationMinutes?.message}>
            <Input type="number" min={0} {...form.register("durationMinutes")} />
          </Field>
        </FormRow>
        <fieldset className="grid gap-3">
          <legend className="mb-1 text-sm font-medium text-text-2">Exercises</legend>
          {list.fields.map((field, index) => (
            <div key={field.id} className="rounded-xl border border-border p-3">
              <div className="mb-3 flex items-start gap-2">
                <Field label={`Exercise ${index + 1}`} className="flex-1" error={errors.exercises?.[index]?.exerciseId?.message}>
                  <Select {...form.register(`exercises.${index}.exerciseId`)}>
                    <option value="">Choose…</option>
                    {exercises.data?.map((e) => (
                      <option key={e.id} value={e.id}>{e.name}{e.muscleGroup ? ` · ${e.muscleGroup}` : ""}</option>
                    ))}
                  </Select>
                </Field>
                <Button size="icon-sm" variant="ghost" className="mt-7" aria-label={`Remove exercise ${index + 1}`} onClick={() => list.remove(index)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <SetsEditor index={index} control={form.control} register={form.register} />
            </div>
          ))}
          <Button variant="soft" size="sm" className="justify-self-start" onClick={() => list.append({ exerciseId: "", sets: [{ weight: undefined, reps: undefined, completed: true }] })}>
            <Plus className="size-4" /> Add exercise
          </Button>
        </fieldset>
        <Field label="Notes">
          <Textarea {...form.register("notes")} />
        </Field>
        <DialogActions>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>Save workout</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
