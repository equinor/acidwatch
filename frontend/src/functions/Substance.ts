import { FORMULA_TO_NAME_MAPPER } from "@/constants/formula_map";

export function optionName(option: string): string {
    const mappedValue = FORMULA_TO_NAME_MAPPER[option];

    return mappedValue ? `${option} (${mappedValue})` : option;
}
