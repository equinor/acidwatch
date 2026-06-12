import React from "react";
import { Banner } from "@equinor/eds-core-react";
import { SweepResults as SweepResultsType } from "@/dto/Sweep";
import SweepResults from "./SweepResults";
import Working from "@/components/Simulation/Working";
import NoResults from "@/components/Simulation/NoResults";

type SweepResultStepProps = {
    sweepResults?: SweepResultsType;
    isLoading: boolean;
    error?: Error | null;
};

const SweepResultStep: React.FC<SweepResultStepProps> = ({ sweepResults, isLoading, error }) => {
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
    if (sweepResults === undefined) {
        return <NoResults />;
    }
    return <SweepResults sweepResults={sweepResults} />;
};

export default SweepResultStep;
