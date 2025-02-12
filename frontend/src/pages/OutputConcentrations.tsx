import React from "react";
import createPlotlyComponent from "react-plotly.js/factory";
import { Table, Typography } from "@equinor/eds-core-react";
import { SimulationResults } from "../dto/SimulationResults";
import Plotly from "plotly.js-basic-dist";
import { useErrorStore } from "../hooks/useErrorState";
import { extractPlotData } from "../functions/Formatting";

const Plot = createPlotlyComponent(Plotly);

interface ResultsProps {
    simulationResults: SimulationResults;
}

const Results: React.FC<ResultsProps> = ({ simulationResults }) => {
    const initFinalDiff = simulationResults.results.initfinaldiff;

    return (
        <div>
            <Typography variant="h4">Change in concentrations</Typography>
            <Plot
                data={extractPlotData(simulationResults)}
                layout={{ title: "" }}
            />
            <br></br>
            <Table>
                <Table.Head>
                    <Table.Row>
                        <Table.Cell>Component</Table.Cell>
                        <Table.Cell>Initial</Table.Cell>
                        <Table.Cell>Final</Table.Cell>
                        <Table.Cell>Change</Table.Cell>
                    </Table.Row>
                </Table.Head>
                <Table.Body>
                    {Object.keys(initFinalDiff.initial).map((key, index) => (
                        <Table.Row key={index}>
                            <Table.Cell>{key}</Table.Cell>
                            <Table.Cell>{initFinalDiff.initial[key].toFixed(3)}</Table.Cell>
                            <Table.Cell>{initFinalDiff.final[key].toFixed(3)}</Table.Cell>
                            <Table.Cell>{initFinalDiff.change[key].toFixed(3)}</Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
        </div>
    );
};

export default Results;


