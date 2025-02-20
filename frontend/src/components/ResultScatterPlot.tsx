import React from "react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from "recharts";
import { getDistributedColor } from "../functions/Colors";
import { convertToSubscripts } from "../functions/Formatting";

interface IGraphData {
    compound: string;
    conc: number;
    label: string;
}

interface IResultScatterGraph {
    GraphInput: IGraphData[];
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ dataKey: string; value: any; payload: any }>;
}

const ResultScatterGraph: React.FC<IResultScatterGraph> = ({ GraphInput }) => {
    const uniqueLabels = [...new Set(GraphInput.map((entry) => entry.label))];
    const labelColor: { [key: string]: string } = uniqueLabels.reduce(
        (acc, label, index) => {
            acc[label] = getDistributedColor(index, uniqueLabels.length);
            return acc;
        },
        {} as { [key: string]: string }
    );

    const coloredGraphInput = GraphInput.map((entry) => ({
        ...entry,
        fill: labelColor[entry.label] || "#000000",
    }));

    const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div
                    className="custom-tooltip"
                    style={{ backgroundColor: "white", padding: "10px", border: "1px solid #ccc" }}
                    key={payload[0].value}
                >
                    <h4>{convertToSubscripts(payload[0].value)}</h4>
                    <hr style={{ margin: "1px", borderTop: "1px solid #000" }} />
                    {GraphInput.map((entry) =>
                        entry.compound === payload[0].value ? (
                            <p
                                style={{ color: labelColor[entry.label] || "#000000" }}
                                key={`${payload[0].value} - ${entry.label}`}
                            >
                                {entry.label}: {entry.conc}
                            </p>
                        ) : (
                            <p key={`${entry.label} - ${entry.compound}`} />
                        )
                    )}
                </div>
            );
        }
    };

    return (
        <div>
            <div style={{ width: "600px" }}>
                <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart>
                        <CartesianGrid />
                        <XAxis
                            dataKey="compound"
                            type="category"
                            allowDuplicatedCategory={false}
                            tick={{ fontSize: 14 }}
                        />
                        <YAxis dataKey="conc" />
                        <ZAxis range={[200]} /> {/* Size of dots */}
                        <Tooltip content={<CustomTooltip />} />
                        <Scatter data={coloredGraphInput} />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
export default ResultScatterGraph;