import { describe, it, expect } from "vitest";
import { buildLabResultsTableData } from "@/functions/Tables";
import { Unit } from "@/contexts/SettingsContext";
import type { ExperimentResult } from "@/dto/ExperimentResult";

describe("buildLabResultsTableData", () => {
    it("returns correct columns and rows for single experiment", () => {
        const labResults: ExperimentResult[] = [
            {
                name: "Exp1",
                time: 10,
                temperature: 25,
                pressure: 1,
                initialConcentrations: { H2O: 1.234, NaCl: 0.5678 },
                finalConcentrations: { H2O: 1.111, NaCl: 0.4444 },
            },
        ];

        const { columns, rows } = buildLabResultsTableData(labResults, new Unit("celsius", "°C"));

        expect(columns[0].header).toBe("Meta data");
        expect(columns[0].columns).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ header: "Experiment", accessorKey: "name" }),
                expect.objectContaining({ header: "Time", accessorKey: "time" }),
                expect.objectContaining({ header: "Temperature (°C)", accessorKey: "temperature" }),
                expect.objectContaining({ header: "Pressure", accessorKey: "pressure" }),
            ])
        );

        expect(columns[1].header).toBe("Input Concentrations");
        expect(columns[1].columns).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ accessorKey: "in-H2O", header: "H2O" }),
                expect.objectContaining({ accessorKey: "in-NaCl", header: "NaCl" }),
            ])
        );

        expect(columns[2].header).toBe("Output Concentrations");
        expect(columns[2].columns).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ accessorKey: "out-H2O", header: "H2O" }),
                expect.objectContaining({ accessorKey: "out-NaCl", header: "NaCl" }),
            ])
        );

        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            id: "Exp1",
            name: "Exp1",
            time: "10",
            temperature: 25,
            pressure: 1,
            "in-H2O": 1.23,
            "in-NaCl": 0.568,
            "out-H2O": 1.11,
            "out-NaCl": 0.444,
        });
    });
});
