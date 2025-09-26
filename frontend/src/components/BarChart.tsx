import React, { useRef } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { getDistributedColor } from "../functions/Colors";
import { ChartDataSet } from "../dto/ChartData";
import { Button } from "@equinor/eds-core-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, zoomPlugin);

interface BarChartProps {
    graphData: ChartDataSet[];
    aspectRatio?: number;
}

const BarChart: React.FC<BarChartProps> = ({ graphData, aspectRatio = 4 }) => {
    const chartRef = useRef<any>(null);

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
        plugins: {
            zoom: {
                pan: {
                    enabled: false,
                    mode: "xy" as const,
                },
                zoom: {
                    drag: {
                        enabled: true,
                    },
                    mode: "y" as const,
                },
            },
        },
        scales: {
            x: {
                grid: { display: true },
            },
            y: {
                grid: { display: true },
            },
        },
    };

    const handleResetZoom = () => {
        if (chartRef.current) {
            chartRef.current.resetZoom();
        }
    };

    return (
        <div>
            <Bar ref={chartRef} data={chartData} options={options} />
            <Button
                variant="outlined"
                onClick={handleResetZoom}
                style={{
                    marginBottom: "12px",
                    marginTop: "12px",
                    height: "24px",
                    padding: "2px 8px",
                    fontSize: "0.85rem",
                }}
            >
                Reset zoom
            </Button>
        </div>
    );
};

export default BarChart;
