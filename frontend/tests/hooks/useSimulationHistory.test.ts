import { describe, it, expect } from "vitest";
import { Entry, __testing__ } from "@/hooks/useSimulationHistory";

const { getFromStorage, ContextStore } = __testing__;

describe("getFromStorage", () => {
    it("works with an empty storage object", () => {
        expect(getFromStorage({})).toEqual({ entries: [], nextIndex: 0 });
    });

    it("works with unknown data in store", () => {
        expect(getFromStorage({ dummyData: "123" })).toEqual({ entries: [], nextIndex: 0 });
    });

    it("parses one entry correctly", () => {
        const entryData = {
            id: "00000000-0000-0000-0000-000000000000",
            createdAt: new Date(),
            displayName: "Some model",
        };
        const entryDataAsStr = JSON.stringify(entryData);

        expect(
            getFromStorage({
                "simulation[0]": entryDataAsStr,
            })
        ).toEqual({
            entries: [{ ...entryData, index: 0 }],
            nextIndex: 1,
        });
    });

    it("parses multiples entries with unrelated data interspersed", () => {
        const entryData1 = {
            id: "00000000-0000-0000-0000-000000000000",
            createdAt: new Date(),
            displayName: "Some model",
        };
        const entryData2 = {
            id: "00000000-0000-0000-0000-000000000000",
            createdAt: new Date(),
            finishedAt: new Date(),
            displayName: "Some other model",
        };
        const storage = {
            temperature: "kelvin",
            "simulation[123]": JSON.stringify(entryData1),
            pressure: "bara",
            "simulation[124]": JSON.stringify(entryData2),
            teamPasswordToEverything: "hunter2",
        };

        expect(getFromStorage(storage)).toEqual({
            entries: [
                { ...entryData1, index: 123 },
                { ...entryData2, index: 124 },
            ],
            nextIndex: 125,
        });
    });

    it("nextIndex order doesn't matter", () => {
        const entryData1 = {
            id: "00000000-0000-0000-0000-000000000000",
            createdAt: new Date(),
            displayName: "Some model",
        };
        const entryData2 = {
            id: "00000000-0000-0000-0000-000000000000",
            createdAt: new Date(),
            finishedAt: new Date(),
            displayName: "Some other model",
        };
        const storage = {
            "simulation[10]": JSON.stringify(entryData1),
            "simulation[1]": JSON.stringify(entryData2),
        };

        expect(getFromStorage(storage)).toEqual({
            entries: [
                { ...entryData1, index: 10 },
                { ...entryData2, index: 1 },
            ],
            nextIndex: 11,
        });
    });

    it("entries are ordered by date, oldest first", () => {
        const entryData1: Entry = {
            id: "00000000-0000-0000-0000-000000000000",
            createdAt: new Date(2021, 1),
            displayName: "First model",
        };
        const entryData2: Entry = {
            id: "00000000-0000-0000-0000-000000000000",
            createdAt: new Date(2022, 1),
            displayName: "Second model",
        };
        const entryData3: Entry = {
            id: "00000000-0000-0000-0000-000000000000",
            createdAt: new Date(2023, 1),
            displayName: "Third",
        };

        const storage = {
            "simulation[1]": JSON.stringify(entryData2),
            "simulation[5]": JSON.stringify(entryData3),
            "simulation[10]": JSON.stringify(entryData1),
        };

        expect(getFromStorage(storage)).toEqual({
            entries: [
                { ...entryData1, index: 10 },
                { ...entryData2, index: 1 },
                { ...entryData3, index: 5 },
            ],
            nextIndex: 11,
        });
    });
});

describe("ContextStore", () => {
    it("adding an entry results in a non-empty entries list and storage", () => {
        const storage = {};
        const contextStore = new ContextStore(
            {
                entries: [],
                nextIndex: 0,
            },
            storage
        );

        const entry: Entry = {
            id: "id",
            createdAt: new Date(),
            displayName: "Some Model",
        };

        contextStore.addEntry(entry);

        expect(contextStore.entries).toEqual([{ ...entry, index: 0 }]);
        expect(storage).toEqual({ "simulation[0]": JSON.stringify(entry) });
    });

    it("adding an entry calls registered listeners", () => {
        const contextStore = new ContextStore(
            {
                entries: [],
                nextIndex: 0,
            },
            {}
        );

        let listenerCalled = false;
        contextStore.subscribe(() => {
            listenerCalled = true;
        });

        contextStore.addEntry({} as any);

        expect(listenerCalled).toBe(true);
    });
});
