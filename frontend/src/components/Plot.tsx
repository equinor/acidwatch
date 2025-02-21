import React from "react";
import { Scatter, Bar } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

interface PlotProps {
    data: {
        Initial: Record<string, number>;
        LabResult: Record<string, number>;
        Arcs: Record<string, number>;
        Co2SpecDemo: Record<string, number>;
    };
}

const Plot: React.FC<PlotProps> = ({ data }) => {
    const scatterChartData = {
        datasets: [
            {
                label: "Initial",
                data: Object.entries(data.Initial).map(([compound, conc]) => ({ x: compound, y: conc })),
                backgroundColor: "rgba(75, 192, 192, 1)",
            },
            {
                label: "Lab results",
                data: Object.entries(data.LabResult).map(([compound, conc]) => ({ x: compound, y: conc })),
                backgroundColor: "rgba(255, 99, 132, 1)",
            },
            {
                label: "ARCS",
                data: Object.entries(data.Arcs).map(([compound, conc]) => ({ x: compound, y: conc })),
                backgroundColor: "rgba(54, 162, 235, 1)",
            },
            {
                label: "CO2 Spec demo",
                data: Object.entries(data.Co2SpecDemo).map(([compound, conc]) => ({ x: compound, y: conc })),
                backgroundColor: "rgba(255, 255, 0, 1)",
            },
        ],
    };
    const barChartData = {
        labels: Object.keys(data.Initial),
        datasets: [
            {
                label: "Initial",
                data: Object.values(data.Initial),
                backgroundColor: "rgba(75, 192, 192, 1)",
            },
            {
                label: "Lab results",
                data: Object.values(data.LabResult),
                backgroundColor: "rgba(255, 99, 132, 1)",
            },
            {
                label: "ARCS",
                data: Object.values(data.Arcs),
                backgroundColor: "rgba(54, 162, 235, 1)",
            },
            {
                label: "Co2SpecDemo",
                data: Object.values(data.Co2SpecDemo),
                backgroundColor: "rgba(255,255, 0, 1)",
            },
        ],
    };

    const options = {
        scales: {
            x: {
                type: "category" as const,
                labels: Object.keys(data.Initial),
                title: {
                    display: true,
                    text: "Compound",
                },
            },
            y: {
                title: {
                    display: true,
                    text: "Concentration",
                },
            },
        },
    };

    return (
        <div>
            <h3>Scatter Plot</h3>
            <div style={{ width: 600, height: 400 }}>
                <Scatter data={scatterChartData} options={options} />
            </div>
            <h3>Bar Chart</h3>
            <div style={{ width: 600, height: 400 }}>
                <Bar data={barChartData} options={options} />
            </div>
        </div>
    );
};

export default Plot;
