import React from "react";
import { Typography } from "@equinor/eds-core-react";
import { SimulationResults } from "../dto/SimulationResults";
import Plot from "react-plotly.js";

import { extractPlotData } from "../functions/Formatting";

interface ResultsProps {
    simulationResults: SimulationResults;
}

const ResultConcPlot: React.FC<ResultsProps> = ({ simulationResults }) => {
    return (
        <>
            <Typography variant="h4">Change in concentrations</Typography>
            <Plot data={extractPlotData(simulationResults)} layout={{ title: { text: "" } }} />
        </>
    );
};

export default ResultConcPlot;
