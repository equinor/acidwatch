import type { Source } from "./types";

export const syntheticResults: Source = {
    name: "Synthetic",
    get: async () =>
        Array.from({ length: 100 }, (_, index) => ({
            name: `Exp${index}`,
            pressure: 100,
            temperature: 25,
            time: 0,
            initialConcentrations: {
                H2O: index,
            },
            finalConcentrations: {
                H2O: index,
            },
        })),
};
