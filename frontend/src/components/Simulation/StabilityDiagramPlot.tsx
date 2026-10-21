import React from "react";
import { StabilityDiagramPanel } from "@/dto/SimulationResults";
import EChart from "@/components/Charts/EChart";
import { buildStabilityDiagramOption } from "@/components/Simulation/stabilityDiagramOption";

interface StabilityDiagramPlotProps {
    diagram: StabilityDiagramPanel;
}

const StabilityDiagramPlot: React.FC<StabilityDiagramPlotProps> = ({ diagram }) => {
    const option = buildStabilityDiagramOption(diagram);
    return <EChart option={option} />;
};

export default StabilityDiagramPlot;
