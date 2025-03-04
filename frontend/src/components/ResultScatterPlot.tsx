import React, { useEffect, useState } from "react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Legend, LegendProps } from "recharts";
import { getDistributedColor } from "../functions/Colors";
import { addUniqueColorToGraphEntries, convertToSubscripts, removeRedundantGraphEntries } from "../functions/Formatting";
import { ScatterGraphData } from "../dto/GraphInput";

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ dataKey: string; value: any; payload: any }>;
}

const ResultScatterGraph: React.FC<{ graphData: ScatterGraphData[] }> = ({ graphData }) => {
    const uniqueLabels = [...new Set(graphData.map((entry) => entry.label))];
    const [visiblePlots, setVisiblePlots] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setVisiblePlots(Object.fromEntries(
            Array.from(new Set(graphData.map((item) => item.label))).map((label) => [label, true])
        ))
    }, [graphData]);

    const labelColors = uniqueLabels.reduce(
            (acc, label, index) => {
                acc[label] = getDistributedColor(index, uniqueLabels.length);
                return acc;
            },
            {} as { [key: string]: string }
        )
    const uniqueGraphInput = removeRedundantGraphEntries(graphData);
    const uniqueGraphInputWithColors = addUniqueColorToGraphEntries(uniqueGraphInput, labelColors);

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
                    {uniqueGraphInputWithColors.map((entry) =>
                        entry.compound === payload[0].value && visiblePlots[entry.label] ? (
                            <p
                                style={{ color: labelColors[entry.label] || "#000000" }}
                                key={`${payload[0].value} - ${entry.label}`}
                            >
                                {entry.label}: {entry.conc}
                            </p>
                        ) : (
                            <p key={`${entry.label} - ${entry.compound} - ${entry.conc}`} />
                        )
                    )}
                </div>
            );
        }
    };
    
    const handleLegendClick = (e: any) => {
        setVisiblePlots((prev) => ({
            ...prev,
            [e.value]: !prev[e.value],
        }));
    };

    return (
        <div>
            <div style={{ width: "1200px" }}>
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
                        <Scatter data={uniqueGraphInputWithColors.filter((item) => visiblePlots[item.label] === true || false)} isAnimationActive={false} />
                        <Legend
                        verticalAlign="top"
                        payload={uniqueLabels.map((item, index) => ({
                          value: item,
                          type: 'line',
                          id: `ID${index}`,
                          color: visiblePlots[item] ? labelColors[item] : "#808080"
                        }))}
                        onClick={handleLegendClick}
                        >
                          
                        </Legend>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
export default ResultScatterGraph;