import React from "react";
import { Scatter } from "react-chartjs-2";
import { Chart as ChartJS, LinearScale, PointElement, LineElement, Tooltip, Legend } from "chart.js";
import { getDistributedColor } from "@/functions/Colors";

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

export interface ScatterDataSet {
    label: string;
    data: { x: number; y: number }[];
    color?: string;
}

interface ScatterPlotProps {
    datasets: ScatterDataSet[];
    xLabel?: string;
    yLabel?: string;
    showDiagonal?: boolean;
}

const ScatterPlot: React.FC<ScatterPlotProps> = ({ datasets, xLabel, yLabel, showDiagonal }) => {
    if (datasets.length === 0) return null;

    const maxVal = Math.max(...datasets.flatMap((ds) => ds.data.flatMap((p) => [Math.abs(p.x), Math.abs(p.y)])), 0);

    const chartDatasets = datasets.map((ds, idx) => ({
        label: ds.label,
        data: ds.data,
        backgroundColor: ds.color ?? getDistributedColor(idx, datasets.length),
    }));

    if (showDiagonal) {
        const diagonalBase = {
            backgroundColor: "transparent",
            showLine: true,
            borderColor: "#aaa",
            borderDash: [6, 4],
            pointRadius: 0,
            borderWidth: 1,
        };
        chartDatasets.unshift(
            {
                ...diagonalBase,
                label: "x = y",
                data: [
                    { x: 0, y: 0 },
                    { x: maxVal, y: maxVal },
                ],
            } as any,
            {
                ...diagonalBase,
                label: "+10%",
                borderDash: [3, 3],
                borderWidth: 0.5,
                data: [
                    { x: 0, y: 0 },
                    { x: maxVal, y: maxVal * 1.1 },
                ],
            } as any,
            {
                ...diagonalBase,
                label: "−10%",
                borderDash: [3, 3],
                borderWidth: 0.5,
                data: [
                    { x: 0, y: 0 },
                    { x: maxVal, y: maxVal * 0.9 },
                ],
            } as any
        );
    }

    return (
        <Scatter
            data={{ datasets: chartDatasets }}
            options={{
                responsive: true,
                aspectRatio: 1.5,
                plugins: {
                    legend: {
                        position: "right",
                        labels: {
                            boxWidth: 10,
                            font: { size: 11 },
                            filter: (item) => !["x = y", "+10%", "−10%"].includes(item.text ?? ""),
                        },
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) =>
                                `${ctx.dataset.label}: (${ctx.parsed.x?.toFixed(4)}, ${ctx.parsed.y?.toFixed(4)})`,
                        },
                    },
                },
                scales: {
                    x: { min: 0, title: { display: true, text: xLabel ?? "" } },
                    y: { min: 0, title: { display: true, text: yLabel ?? "" } },
                },
            }}
        />
    );
};

export default ScatterPlot;
