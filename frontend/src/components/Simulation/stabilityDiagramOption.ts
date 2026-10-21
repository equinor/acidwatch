import type { EChartsCoreOption } from "echarts/core";
import { StabilityDiagramPanel } from "@/dto/SimulationResults";

export const buildStabilityDiagramOption = (diagram: StabilityDiagramPanel): EChartsCoreOption => {
    const points = diagram.regions.flatMap((region) => region.points);
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);

    return {
        animation: false,
        title: { text: diagram.label ?? "", left: "center", textStyle: { fontSize: 14 } },
        tooltip: { formatter: (params: { name: string }) => params.name },
        toolbox: { right: 8, feature: { restore: {} } },
        dataZoom: [
            { type: "inside", xAxisIndex: 0, filterMode: "none" },
            { type: "inside", yAxisIndex: 0, filterMode: "none" },
        ],
        grid: { left: 24, right: 16, top: 40, bottom: 24, containLabel: true },
        xAxis: {
            type: "value",
            name: diagram.x_label ?? "",
            nameLocation: "middle",
            nameGap: 26,
            min: Math.min(...xs),
            max: Math.max(...xs),
        },
        yAxis: {
            type: "value",
            name: diagram.y_label ?? "",
            nameLocation: "middle",
            nameGap: 38,
            min: Math.min(...ys),
            max: Math.max(...ys),
        },
        series: [
            {
                type: "custom",
                clip: true,
                data: diagram.regions.map((region, index) => ({ name: region.name, value: [index] })),
                renderItem: (
                    _params: unknown,
                    api: { value: (dim: number) => number; coord: (point: number[]) => number[] }
                ) => {
                    const region = diagram.regions[api.value(0)];
                    return {
                        type: "group",
                        children: [
                            {
                                type: "polygon",
                                shape: { points: region.points.map((point) => api.coord(point)) },
                                style: { fill: "#fff", stroke: "#444", lineWidth: 1 },
                            },
                            {
                                type: "text",
                                style: {
                                    text: region.name,
                                    x: api.coord(region.centroid)[0],
                                    y: api.coord(region.centroid)[1],
                                    textAlign: "center",
                                    textVerticalAlign: "middle",
                                    fontSize: 11,
                                    fill: "#222",
                                },
                            },
                        ],
                    };
                },
            },
        ],
    };
};
