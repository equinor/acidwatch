import React, { useState, useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { EdsDataGrid, Row } from "@equinor/eds-data-grid-react";
import { getLabResults } from "../api/api.tsx";
import ResultScatterGraph from "../components/ResultScatterPlot.tsx";
import { syntheticResults } from "../assets/syntheticResults.tsx";
import { useAvailableModels } from "../contexts/ModelContext.tsx";
import { ExperimentResult_to_ScatterGraphData } from "../functions/Formatting.tsx";
import { Autocomplete, AutocompleteChanges, Button, Card, EdsProvider, Typography } from "@equinor/eds-core-react";
import { runSimulation } from "../api/api";
import { ScatterGraphData } from "../dto/ScatterGraphInput.tsx";

const LabResults: React.FC = () => {
    const initialPrefix = "in-";
    const finalPrefix = "out-";
    const [plotComponents, setPlotComponents] = useState<string[]>([]);
    const [simulationCache, setSimulationCache] = useState<Record<string, ScatterGraphData[]>>({});
    const [selectedExperiments, setSelectedExperiments] = useState<string[]>([]);
    const { models } = useAvailableModels();

    const {
        data: labResults = syntheticResults,
        error,
        isLoading,
    } = useQuery({
        queryKey: ["results"],
        queryFn: () => getLabResults(),
        retry: false,
    });

    const selectedExperimentData = useMemo(
        () => labResults.filter((result) => selectedExperiments.includes(result.name)),
        [labResults, selectedExperiments]
    );

    const simulationQueries = useQueries({
        queries: selectedExperimentData.flatMap((experiment) => {
            const filteredConcs = Object.fromEntries(
                Object.entries(experiment.initialConcentrations).filter(([, value]) => Number(value) !== 0)
            );
            return models
                .filter((model) => model.category === "Primary")
                .filter((model) => Object.entries(filteredConcs).every(([key]) => model.validSubstances.includes(key)))
                .map((model) => ({
                    queryKey: ["simulation", experiment.name, model.modelId],
                    queryFn: async (): Promise<ScatterGraphData[]> => {
                        const cacheKey = `${experiment.name}_${model.modelId}`;
                        if (simulationCache[cacheKey]) {
                            return simulationCache[cacheKey];
                        }
                        try {
                            const simulation = await runSimulation(
                                filteredConcs,
                                model.parameters && Object.keys(model.parameters).length > 0
                                    ? {
                                          pressure: experiment.pressure ?? 0,
                                          temperature: 273 + (experiment.temperature ?? 0), // Convert to Kelvin
                                      }
                                    : {},
                                model.modelId
                            );

                            const result = Object.entries(simulation.finalConcentrations).map(([name, value]) => ({
                                x: name,
                                y: value,
                                label: `${model.displayName} (${experiment.name})`,
                                experimentName: experiment.name,
                                modelName: model.displayName,
                            }));

                            // Save to cache
                            setSimulationCache((prev) => ({
                                ...prev,
                                [cacheKey]: result,
                            }));

                            return result;
                        } catch (error) {
                            console.error(
                                `Simulation failed for ${experiment.name} with model ${model.displayName}:`,
                                error
                            );
                            return [];
                        }
                    },
                    enabled: selectedExperiments.length > 0 && models.length > 0,
                    retry: 1,
                    staleTime: Infinity,
                }));
        }),
        combine: (results) => {
            const allSimResults = results
                .filter((result) => result.isSuccess && result.data)
                .flatMap((result) => result.data);

            const isLoading = results.some((result) => result.isLoading);
            const hasErrors = results.some((result) => result.isError);

            return {
                data: allSimResults,
                isLoading,
                hasErrors,
                errorCount: results.filter((result) => result.isError).length,
                totalQueries: results.length,
            };
        },
    });

    const combinedGraphData = useMemo(
        () => [...ExperimentResult_to_ScatterGraphData(selectedExperimentData), ...simulationQueries.data],
        [selectedExperimentData, simulationQueries.data]
    );

    if (isLoading) return <>Fetching results ...</>;

    let issueRetrievingDataInfo = null;
    if (error) {
        issueRetrievingDataInfo = (
            <Card variant="warning" style={{ margin: "2rem 0" }}>
                <Card.Header>
                    <Card.HeaderTitle>
                        <Typography variant="h5">Error fetching data from Oasis</Typography>
                    </Card.HeaderTitle>
                </Card.Header>
                <Card.Content>
                    <Typography variant="body_short_bold">{error.message}</Typography>
                    <Typography variant="body_short">Using synthetic demo data</Typography>
                </Card.Content>
            </Card>
        );
    }

    const simulationStatusInfo = simulationQueries.totalQueries > 0 && (
        <Card style={{ margin: "2rem 0" }}>
            <Card.Content>
                <Typography variant="body_short">
                    {simulationQueries.isLoading ? "Running simulations..." : ""}
                </Typography>
            </Card.Content>
        </Card>
    );

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
                    header: "Temperature (°C)",
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

    const rows = labResults!.map((entry) => ({
        id: entry.name,
        name: entry.name,
        time: String(entry.time),
        temperature: entry.temperature,
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

    const handleRowClick = (
        row: Row<{
            meta: object;
            id: string;
            name: string;
            time: string;
            temperature: number | null;
            pressure: number | null;
        }>
    ) => {
        setSelectedExperiments((prevSelectedExperiments) => {
            return prevSelectedExperiments.includes(row.original.id)
                ? prevSelectedExperiments.filter((key) => key !== row.original.id)
                : [...prevSelectedExperiments, row.original.id];
        });
    };

    const handlePlotComponentsChange = (changes: AutocompleteChanges<string>) => {
        setPlotComponents(changes.selectedItems);
    };

    return (
        <>
            <Typography variant="h1">Lab results</Typography>
            {issueRetrievingDataInfo}
            {simulationStatusInfo}

            <>
                <Typography variant="h2">Plot summary</Typography>
                <ResultScatterGraph
                    graphData={combinedGraphData.filter((d): d is ScatterGraphData => d !== undefined)}
                />

                <Typography variant="h2">Plot per component</Typography>
                <div style={{ width: "500px" }}>
                    <Autocomplete
                        label={"Select multiple components"}
                        options={finalConcHeaders}
                        multiple
                        onOptionsChange={handlePlotComponentsChange}
                    />
                </div>
                <ResultScatterGraph
                    graphData={ExperimentResult_to_ScatterGraphData(selectedExperimentData, plotComponents)}
                />
            </>

            <Typography variant="body_short">Select rows to compare.</Typography>
            <EdsProvider density="compact">
                <EdsDataGrid
                    columns={columns}
                    rows={rows}
                    enableColumnFiltering={true}
                    enableMultiRowSelection
                    enableRowSelection
                    onRowClick={handleRowClick}
                    rowSelectionState={{}}
                    rowStyle={(row) => (row.id in selectedExperiments ? { backgroundColor: "lightblue" } : {})}
                />
            </EdsProvider>
            <Button onClick={() => setSelectedExperiments([])}>Clear</Button>
        </>
    );
};

export default LabResults;
