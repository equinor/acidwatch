import React from "react";
import { Phase } from "@/dto/SimulationResults";
import { phaseLabel } from "@/utils/modelUtils";

interface PhaseSectionsProps {
    phaseKinds: Phase["kind"][];
    renderPhase: (phaseKind: Phase["kind"]) => React.ReactNode;
}

const PhaseSections: React.FC<PhaseSectionsProps> = ({ phaseKinds, renderPhase }) => {
    if (phaseKinds.length === 1) {
        return <>{renderPhase(phaseKinds[0])}</>;
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {phaseKinds.map((kind) => (
                <div key={kind}>
                    <h5 style={{ marginBottom: "0.5rem" }}>{phaseLabel(kind)}</h5>
                    {renderPhase(kind)}
                </div>
            ))}
        </div>
    );
};

export default PhaseSections;
