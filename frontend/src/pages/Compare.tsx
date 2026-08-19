import React from "react";
import { useSearchParams } from "react-router-dom";
import CompareGridSimulations from "@/components/Comparison/CompareGridSimulations";
import CompareSimulations from "@/components/Comparison/CompareSimulations";

const parseIds = (value: string | null): string[] => value?.split(",").filter(Boolean) ?? [];

const Compare: React.FC = () => {
    const [searchParams] = useSearchParams();
    const gridIds = parseIds(searchParams.get("grids"));

    if (gridIds.length > 0) {
        return <CompareGridSimulations gridIds={gridIds} />;
    }

    return <CompareSimulations simulationIds={parseIds(searchParams.get("ids"))} />;
};

export default Compare;
