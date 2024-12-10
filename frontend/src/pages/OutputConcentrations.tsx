import React from "react";
import createPlotlyComponent from "react-plotly.js/factory";
import { Table, Typography } from "@equinor/eds-core-react";
import { SimulationResults } from "../dto/SimulationResults";
import Plotly from "plotly.js-basic-dist";

const Plot = createPlotlyComponent(Plotly);

interface ResultsProps {
    simulationResults: SimulationResults;
}

const Results: React.FC<ResultsProps> = ({ simulationResults }) => {
    let chartData, initFinalDiff, comps, values, variance;

    try {
        chartData = simulationResults.chart_data;
        initFinalDiff = simulationResults.results.initfinaldiff;

        comps = Object.values(chartData.comps);
        values = Object.values(chartData.values);
        variance = Object.values(chartData.variance);
    } catch (error) {
        console.error("Error processing simulation results:", error);
        console.log("Simulation Results:", simulationResults);
        return <div></div>;
    }

    return (
        <div>
            <Typography variant="h4">Change in concentrations</Typography>
            <Plot
                data={[
                    {
                        type: "bar",
                        x: comps,
                        y: values,
                        text: values.map((value, index) => `Value: ${value}<br>Variance: ${variance[index]}`),
                        textposition: "none",
                        hoverinfo: "text",
                    },
                ]}
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
