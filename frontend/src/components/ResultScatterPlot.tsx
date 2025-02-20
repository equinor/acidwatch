import React from "react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from "recharts";
import { getDistributedColor } from "../functions/Colors";

interface IGraphData {
    compound: string;
    conc: number;
    label: string;
}

interface IResultScatterGraph {
    GraphInput: IGraphData[];
}

const ResultScatterGraph: React.FC<IResultScatterGraph> = ({ GraphInput }) => {

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
                        <Scatter data={GraphInput} />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
export default ResultScatterGraph;