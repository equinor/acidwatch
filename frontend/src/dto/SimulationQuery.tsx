import { ExperimentResult } from "./ExperimentResult";
import { SimulationResults } from "./SimulationResults";

export interface SimulationStatus {
    modelId: string;
    experimentName: string;
    status: "pending" | "done";
}

export type UseSimulationQueriesResult = {
    data: Record<string, SimulationResults[]>;
    statuses: SimulationStatus[];
};

export type QueryResult<T> = {
    result: T;
    experiment: ExperimentResult;
    modelId: string;
};
