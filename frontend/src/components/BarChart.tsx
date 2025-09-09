import React from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { getDistributedColor } from "../functions/Colors";
import { ChartDataSet } from "../dto/ChartData";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface BarChartProps {
    graphData: ChartDataSet[];
    aspectRatio?: number;
}

const BarChart: React.FC<BarChartProps> = ({
    graphData,

    aspectRatio = 4,
}) => {
    const allX = Array.from(new Set(graphData.flatMap((ds) => ds.data.map((point) => point.x))));

    const datasets = graphData.map((ds, idx) => ({
        label: ds.label,
        hidden: ds.hidden || false,
        data: allX.map((x) => {
            const found = ds.data.find((point) => point.x === x);
            return found ? found.y : null;
        }),
        backgroundColor: getDistributedColor(idx, graphData.length),
    }));

    const chartData = {
        labels: allX,
        datasets,
    };

    const options = {
        responsive: true,
        aspectRatio,
        scales: {
            x: {
                grid: { display: true },
            },
            y: {
                grid: { display: true },
            },
        },
    };

    return <Bar data={chartData} options={options} />;
};

export default BarChart;
