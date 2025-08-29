import React from "react";
import { SimulationResults } from "../dto/SimulationResults";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { extractPlotData } from "../functions/Formatting";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ResultsProps {
    simulationResults: SimulationResults;
}

const ResultConcPlot: React.FC<ResultsProps> = ({ simulationResults }) => {
    const chartData = extractPlotData(simulationResults);
    const options = {
        responsive: true,
        scales: {
            x: {
                ticks: {
                    autoSkip: false,
                },
            },
        },
    };

    return (
        <>
            <div style={{ width: "600px", marginLeft: "0" }}>
                <Bar data={chartData} options={options} />
            </div>
            <br />
            <br />
        </>
    );
};

export default ResultConcPlot;
