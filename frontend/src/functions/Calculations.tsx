
export const calculateNumberOfSimulations = (components: Record<string,{conc:number, from: number, to: number, step:number}>, selectedComponents: Set<string>) => {
    function countSteps(from:number, to:number, step:number) {
        const diff = Math.abs(to - from);
        return Math.floor(diff / step) + 1;
    }
    let res = 1;
    for ( const component of selectedComponents) {
        const {from,to,step} = components[component]
        if (step !== 0) {
            res *= countSteps(from,to,step)
        }
    }
    return res
}