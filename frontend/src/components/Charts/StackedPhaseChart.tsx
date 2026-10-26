import React from "react";
import BarChart from "@/components/Charts/BarChart";
import { extractChartData, StackedSimulation } from "@/functions/Formatting";

interface StackedPhaseChartProps {
    simulations: StackedSimulation[];
}

const StackedPhaseChart: React.FC<StackedPhaseChartProps> = ({ simulations }) => (
    <BarChart
        aspectRatio={2}
        graphData={extractChartData(simulations)}
        xLabel="Components"
        yLabel="Concentration (ppm·mol)"
    />
);

export default StackedPhaseChart;
