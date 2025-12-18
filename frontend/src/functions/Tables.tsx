import { ExperimentResult } from "@/dto/ExperimentResult";
import { Unit } from "@/contexts/SettingsContext";

export function buildLabResultsTableData(labResults: ExperimentResult[], temperatureUnit?: Unit) {
    const initialPrefix = "in-";
    const finalPrefix = "out-";

    const initialConcHeaders = Array.from(
        new Set(labResults.flatMap((entry) => [...Object.keys(entry.initialConcentrations)]))
    );
    const finalConcHeaders = Array.from(
        new Set(labResults.flatMap((entry) => [...Object.keys(entry.finalConcentrations)]))
    );

    const columns = [
        {
            columns: [
                {
                    header: "Experiment",
                    id: "name",
                    accessorKey: "name",
                    size: 200,
                },
                {
                    header: "Time",
                    id: "time",
                    accessorKey: "time",
                    size: 65,
                },
                {
                    header: `Temperature (${temperatureUnit?.unit ?? "°C"})`,
                    id: "temperature",
                    accessorKey: "temperature",
                    size: 475,
                },
                {
                    header: "Pressure",
                    id: "pressure",
                    accessorKey: "pressure",
                    size: 65,
                },
            ],
            header: "Meta data",
        },
        {
            columns: initialConcHeaders.map((header) => ({
                accessorKey: initialPrefix + header,
                header: header,
                id: initialPrefix + header,
                size: 65,
            })),
            header: "Input Concentrations",
        },
        {
            columns: finalConcHeaders.map((header) => ({
                accessorKey: finalPrefix + header,
                header: header,
                id: finalPrefix + header,
                size: 65,
            })),
            header: "Output Concentrations",
        },
    ];

    const rows = labResults.map((entry) => ({
        id: entry.name,
        name: entry.name,
        time: String(entry.time),
        temperature:
            entry.temperature === null
                ? null
                : temperatureUnit?.unit === "°C"
                  ? entry.temperature
                  : entry.temperature - 273,
        pressure: entry.pressure,
        ...Object.fromEntries(
            Object.entries(entry.initialConcentrations).map(([key, value]) => [
                initialPrefix + key,
                +Number(value).toPrecision(3),
            ])
        ),
        ...Object.fromEntries(
            Object.entries(entry.finalConcentrations).map(([key, value]) => [
                finalPrefix + key,
                +Number(value).toPrecision(3),
            ])
        ),
        meta: {},
    }));

    return { columns, rows };
}
