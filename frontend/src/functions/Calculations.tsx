import { InputComponentProps } from "../dto/InputComponentModel";

export const calculateNumberOfSimulations = (
    components: Record<string, InputComponentProps>,
    selectedComponents: Set<string>
) => {
    function countSteps(from: number, to: number, step: number) {
        const diff = Math.abs(to - from);
        return Math.floor(diff / step) + 1;
    }
    let res = 1;
    for (const component of selectedComponents) {
        const { from, to, step } = components[component];
        if (step !== 0) {
            res *= countSteps(from, to, step);
        }
    }
    return res;
};
