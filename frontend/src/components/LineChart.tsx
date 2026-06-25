import React, { useRef } from "react";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { Button } from "@equinor/eds-core-react";
import { getDistributedColor } from "@/functions/Colors";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, zoomPlugin);

export interface LineSeries {
    label: string;
    data: (number | null)[];
    color?: string;
}

interface LineChartProps {
    xValues: number[];
    series: LineSeries[];
    xAxisLabel?: string;
    yAxisLabel?: string;
    aspectRatio?: number;
}

const LineChart: React.FC<LineChartProps> = ({ xValues, series, xAxisLabel, yAxisLabel, aspectRatio = 2 }) => {
    const chartRef = useRef<any>(null);

    const datasets = series.map((s, idx) => {
        const color = s.color ?? getDistributedColor(idx, series.length);
        return {
            label: s.label,
            data: s.data,
            borderColor: color,
            backgroundColor: color,
            spanGaps: true,
            tension: 0.2,
            pointRadius: 3,
        };
    });

    const chartData = {
        labels: xValues,
        datasets,
    };

    const options = {
        responsive: true,
        aspectRatio,
        interaction: {
            mode: "nearest" as const,
            intersect: false,
        },
        plugins: {
            legend: {
                position: "right" as const,
                align: "start" as const,
                labels: {
                    boxWidth: 12,
                    padding: 6,
                    font: { size: 11 },
                },
                maxWidth: 400,
            },
            zoom: {
                pan: { enabled: false, mode: "xy" as const },
                zoom: {
                    drag: { enabled: true },
                    mode: "xy" as const,
                },
            },
        },
        scales: {
            x: {
                title: { display: !!xAxisLabel, text: xAxisLabel },
                grid: { display: true },
            },
            y: {
                title: { display: !!yAxisLabel, text: yAxisLabel },
                grid: { display: true },
            },
        },
    };

    const handleResetZoom = () => {
        chartRef.current?.resetZoom();
    };

    return (
        <div>
            <Line ref={chartRef} data={chartData} options={options} />
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

export default LineChart;
