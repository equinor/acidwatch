import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { getDistributedColor } from "@/functions/Colors";
import { ChartDataSet } from "@/dto/ChartData";
import { Button } from "@equinor/eds-core-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, zoomPlugin);

interface BarChartProps {
    graphData: ChartDataSet[];
    aspectRatio?: number;
}

const BarChart: React.FC<BarChartProps> = ({ graphData, aspectRatio = 4 }) => {
    const chartRef = useRef<any>(null);
    const [visible, setVisible] = useState<boolean[]>(graphData.map((ds) => !ds.hidden));

    useEffect(() => {
        // Reset visibility when datasets change in length/order
        setVisible(graphData.map((ds) => !ds.hidden));
    }, [graphData]);

    const allX = useMemo(
        () => Array.from(new Set(graphData.flatMap((ds) => ds.data.map((point) => point.x)))),
        [graphData]
    );

    const datasets = useMemo(
        () =>
            graphData.map((ds, idx) => ({
                label: ds.label,
                hidden: !visible[idx],
                data: allX.map((x) => {
                    const found = ds.data.find((point) => point.x === x);
                    return found ? found.y : null;
                }),
                backgroundColor: getDistributedColor(idx, graphData.length),
            })),
        [graphData, allX, visible]
    );

    const chartData = useMemo(
        () => ({
            labels: allX,
            datasets,
        }),
        [allX, datasets]
    );

    const options = {
        responsive: true,
        aspectRatio,
        legend: { display: false },
        plugins: {
            legend: { display: false },
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

    const toggleDataset = (idx: number) => {
        setVisible((prev) => {
            const next = [...prev];
            next[idx] = !next[idx];
            const chart = chartRef.current;
            if (chart && chart.data && chart.data.datasets && chart.data.datasets[idx]) {
                chart.data.datasets[idx].hidden = !next[idx];
                chart.update();
            }
            return next;
        });
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
                {graphData.map((ds, idx) => (
                    <label key={ds.label} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                        <input type="checkbox" checked={visible[idx] ?? true} onChange={() => toggleDataset(idx)} />
                        <span
                            style={{
                                display: "inline-block",
                                width: 10,
                                height: 10,
                                backgroundColor: getDistributedColor(idx, graphData.length) as string,
                                borderRadius: 2,
                            }}
                        />
                        <span>{ds.label}</span>
                    </label>
                ))}
            </div>
        </div>
    );
};

export default BarChart;
