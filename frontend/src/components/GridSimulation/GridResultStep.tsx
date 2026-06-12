import React from "react";
import { Banner } from "@equinor/eds-core-react";
import { GridSimulationResult } from "@/dto/GridSimulation";
import GridResults from "./GridResults";
import Working from "@/components/Simulation/Working";
import NoResults from "@/components/Simulation/NoResults";

type GridResultStepProps = {
    result?: GridSimulationResult;
    isLoading: boolean;
    error?: Error | null;
};

const GridResultStep: React.FC<GridResultStepProps> = ({ result, isLoading, error }) => {
    if (error) {
        return (
            <Banner style={{ marginBottom: "2rem" }}>
                <Banner.Icon variant="warning">⚠️</Banner.Icon>
                <Banner.Message>{error.message}</Banner.Message>
            </Banner>
        );
    }
    if (isLoading) {
        return <Working />;
    }
    if (result === undefined) {
        return <NoResults />;
    }
    return <GridResults result={result} />;
};

export default GridResultStep;
