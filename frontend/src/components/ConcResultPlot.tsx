import React from "react";
import createPlotlyComponent from "react-plotly.js/factory";
import { Typography } from "@equinor/eds-core-react";
import { SimulationResults } from "../dto/SimulationResults";
import Plotly from "plotly.js-basic-dist";
import { extractPlotData } from "../functions/Formatting";

const Plot = createPlotlyComponent(Plotly);

interface ResultsProps {
    simulationResults: SimulationResults;
}

const ResultConcPlot: React.FC<ResultsProps> = ({ simulationResults }) => {
    return (
        <div>
            <Typography variant="h4">Change in concentrations</Typography>
            <Plot data={extractPlotData(simulationResults)} layout={{ title: "" }} />
            <br></br>
        </div>
    );
};

export default ResultConcPlot;
