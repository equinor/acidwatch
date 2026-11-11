import { getLabResults } from "@/api/api";
import type { Source } from "./types";

export const oasis: Source = {
    name: "Oasis",
    get: getLabResults,
};
