import React from "react";
import StackedPhaseChart from "@/components/Charts/StackedPhaseChart";
import PhaseResultTable from "@/components/Simulation/PhaseResultTable";
import { StackedSimulation } from "@/functions/Formatting";

interface PhaseConcentrationsProps {
    simulations: StackedSimulation[];
}

const PhaseConcentrations: React.FC<PhaseConcentrationsProps> = ({ simulations }) => (
    <>
        <StackedPhaseChart simulations={simulations} />
        <PhaseResultTable simulations={simulations} />
    </>
);

export default PhaseConcentrations;
