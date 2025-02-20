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
                        <Tooltip />
                        <Scatter data={coloredGraphInput} />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
export default ResultScatterGraph;