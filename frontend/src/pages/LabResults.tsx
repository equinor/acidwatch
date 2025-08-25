import React, { useState, useEffect } from "react";
import { EdsDataGrid, Row } from "@equinor/eds-data-grid-react";
import { getLabResults } from "../api/api.tsx";
import { useQuery } from "@tanstack/react-query";
import ResultScatterGraph from "../components/ResultScatterPlot.tsx";
import { syntheticResults } from "../assets/syntheticResults.tsx";
import { useAvailableModels } from "../contexts/ModelContext.tsx";
import { ExperimentResult_to_ScatterGraphData } from "../functions/Formatting.tsx";
import { Autocomplete, AutocompleteChanges, Button, Card, EdsProvider, Typography } from "@equinor/eds-core-react";
import { SimulationResults } from "../dto/SimulationResults.tsx";
import { runSimulation } from "../api/api";
import { ScatterGraphData } from "../dto/ScatterGraphInput.tsx";
import { ExperimentResult } from "../dto/ExperimentResult.tsx";

const LabResults: React.FC = () => {
    const initialPrefix = "in-";
    const finalPrefix = "out-";
    const [plotComponents, setPlotComponents] = useState<string[]>([]);
    const [selectedExperiments, setSelectedExperiments] = useState<string[]>([]);
    const [simResults, setSimResults] = useState<Record<string, ScatterGraphData[]>>({});
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


    useEffect(() => {
        // check if data exists for experiment on selected row, if not, start computing, once for each model
        // Should update tables when simulated data is available (perhaps not this functions responsibility)
        // Parameter values (except for press and temp) does not exist in lab experiments, handle setting them default
        // filter on models that has the appropriate input concentrations (not all models accept all substances).
        async function fetchResults() {
            const toSimulate: Set<ExperimentResult> = new Set(
                Object.values(selectedExperiments)
                    .filter((entry) => !(entry in simResults))
                    .flatMap((entry) => labResults.filter((item) => item.name == entry))
            );

            for (const model of models) {
                for (const entry of toSimulate) {
                    // we wanna test how this works with a long ish running job
                    // await new Promise(r => setTimeout(r, 5000));

                    const simulation: SimulationResults = await runSimulation(
                        entry.initial_concentrations,
                        {},
                        model.modelId
                    );

                    const scatterGraphData: ScatterGraphData[] = Object.entries(simulation.finalConcentrations).map(
                        ([name, value]) => ({
                            x: name,
                            y: value,
                            label: model.displayName,
                        })
                    );

                    setSimResults((prevSimResults) => ({ ...prevSimResults, [entry.name]: scatterGraphData }));
                }
            }
        }
        fetchResults();
    }, [selectedExperiments, simResults, labResults, models]);

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

    const initialConcHeaders = Array.from(
        new Set(labResults.flatMap((entry) => [...Object.keys(entry.initial_concentrations)]))
    );
    const finalConcHeaders = Array.from(
        new Set(labResults.flatMap((entry) => [...Object.keys(entry.final_concentrations)]))
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
        ...Object.fromEntries(
            Object.entries(entry.initial_concentrations).map(([key, value]) => [
                initialPrefix + key,
                +Number(value).toPrecision(3),
            ])
        ),
        ...Object.fromEntries(
            Object.entries(entry.final_concentrations).map(([key, value]) => [
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
        }>
    ) => {
        setSelectedExperiments((prevSelectedExperiments) => {
            return prevSelectedExperiments.includes(row.original.id)
                ? prevSelectedExperiments.filter((key) => key !== row.original.id)
                : [...prevSelectedExperiments, ...[row.original.id]];
        });
    };

    const handlePlotComponentsChange = (changes: AutocompleteChanges<string>) => {
        setPlotComponents(changes.selectedItems);
    };

    return (
        <>
            <Typography variant="h1">Lab results</Typography>
            {issueRetrievingDataInfo}
            <>
                <Typography variant="h2">Plot summary</Typography>
                <ResultScatterGraph
                    graphData={[
                        ...ExperimentResult_to_ScatterGraphData(
                            labResults.filter((result) => selectedExperiments.includes(result.name))
                        ),
                        ...Object.values(simResults).flat(),
                    ]}
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
                    graphData={ExperimentResult_to_ScatterGraphData(
                        labResults.filter((result) => selectedExperiments.includes(result.name)),
                        plotComponents
                    )}
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
