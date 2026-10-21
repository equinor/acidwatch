import React, { useEffect, useRef } from "react";
import { init, use as registerModules } from "echarts/core";
import { CustomChart } from "echarts/charts";
import {
    GridComponent,
    TitleComponent,
    TooltipComponent,
    DataZoomComponent,
    ToolboxComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { ECharts, EChartsCoreOption } from "echarts/core";

registerModules([
    CustomChart,
    GridComponent,
    TitleComponent,
    TooltipComponent,
    DataZoomComponent,
    ToolboxComponent,
    CanvasRenderer,
]);

interface EChartProps {
    option: EChartsCoreOption;
    height?: number;
}

const EChart: React.FC<EChartProps> = ({ option, height = 320 }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<ECharts | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const chart = init(container);
        chartRef.current = chart;
        const observer = new ResizeObserver(() => chart.resize());
        observer.observe(container);

        return () => {
            observer.disconnect();
            chart.dispose();
            chartRef.current = null;
        };
    }, []);

    useEffect(() => {
        chartRef.current?.setOption(option, true);
    }, [option]);

    return <div ref={containerRef} style={{ width: "100%", height, minWidth: 0 }} />;
};

export default EChart;
