import * as z from "zod";
import { useSyncExternalStore } from "react";

export const Entry = z.object({
    createdAt: z.coerce.date(),
    finishedAt: z.coerce.date().optional(),
    displayName: z.string(),
    id: z.uuid(),
});
export type Entry = z.infer<typeof Entry>;
type EntryWithIndex = Entry & { index: number };
type ContextType = {
    entries: EntryWithIndex[];
    nextIndex: number;
};

const getFromStorage = (storage?: Record<string, string>): ContextType => {
    storage ??= localStorage;

    const entries: EntryWithIndex[] = [];
    let nextIndex = 0;
    for (const key in storage) {
        const keyMatch = key.match(/^simulation\[(\d+)]$/);
        if (keyMatch === null) continue;

        const index = +keyMatch[1];
        if (index >= nextIndex) nextIndex = index + 1;

        const value = storage[key]!;
        const entry = Entry.safeParse(JSON.parse(value));
        if (entry.success) {
            entries.push({ ...entry.data, index });
        } else {
            console.warn(`Couldn't parse saved simulation '${key}'`, value, entry.error);
            delete storage[key];
        }
    }

    // Sort from oldest to newest
    entries.sort((lhs, rhs) => +lhs.createdAt - +rhs.createdAt);

    return {
        entries,
        nextIndex,
    };
};

class ContextStore {
    entries: EntryWithIndex[];
    nextIndex: number;
    listeners: Set<() => void>;
    storage: Record<string, string>;

    constructor(ctx: ContextType, storage: Record<string, string>) {
        this.entries = ctx.entries;
        this.nextIndex = ctx.nextIndex;
        this.storage = storage;
        this.listeners = new Set();
    }

    static fromStorage(storage: Record<string, string>): ContextStore {
        return new ContextStore(getFromStorage(storage), storage);
    }

    addEntry(entry: Entry): void {
        this.entries.push({ ...entry, index: this.nextIndex });

        // Assign to itself so that React knows this value was updated
        // eslint-disable-next-line no-self-assign
        this.entries = this.entries;

        this.storage[`simulation[${this.nextIndex}]`] = JSON.stringify(entry);
        this.nextIndex += 1;

        this.listeners.forEach((x) => x());
    }

    finalizeEntry(id: string) {
        for (const entry of this.entries) {
            if (entry.id !== id) continue;

            if (entry.finishedAt !== undefined) continue;

            entry.finishedAt = new Date();
            this.storage[`simulation[${entry.index}]`] = JSON.stringify(entry);
            this.listeners.forEach((x) => x());
            return;
        }
    }

    subscribe(callable: () => void): () => void {
        this.listeners.add(callable);
        return () => this.listeners.delete(callable);
    }

    getSnapshot(): Entry[] {
        return this.entries;
    }
}

export const simulationHistory = ContextStore.fromStorage(localStorage);

export const useSimulationHistory = () =>
    useSyncExternalStore(
        (listener) => simulationHistory.subscribe(listener),
        () => simulationHistory.getSnapshot()
    );

export const __testing__ = {
    getFromStorage,
    ContextStore,
};
