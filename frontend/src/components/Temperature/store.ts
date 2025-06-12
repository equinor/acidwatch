import { create } from "zustand";

const LOCAL_STORAGE_KEY = "temperatureUnit";
enum Unit {
    CELSIUS,
    KELVIN,
}

function getDefaultUnit(): Unit {
    switch (localStorage.getItem(LOCAL_STORAGE_KEY)) {
        case "1":
            return Unit.KELVIN;
        case "0":
        default:
            return Unit.CELSIUS;
    }
}

function setDefaultUnit(unit: Unit) {
    localStorage.setItem(LOCAL_STORAGE_KEY, unit.toString());
}

interface States {
    name: string;
    unit: Unit;
    prettyUnit: string;
    convertTo: (value: number) => number;
    convertFrom: (value: number) => number;
}

interface Actions {
    nextUnit: () => void;
}

const kelvinState: States = {
    name: "Kelvin",
    unit: Unit.KELVIN,
    prettyUnit: "K",
    convertTo: (value) => value,
    convertFrom: (value) => value,
};

const celsiusState: States = {
    name: "Celsius",
    unit: Unit.CELSIUS,
    prettyUnit: "°C",
    convertTo: (value) => value - 273,
    convertFrom: (value) => value + 273,
};

export const useStore = create<States & Actions>((set) => ({
    ...(getDefaultUnit() === Unit.CELSIUS ? celsiusState : kelvinState),

    nextUnit: () =>
        set((state) => {
            const newState = state.unit === Unit.CELSIUS ? kelvinState : celsiusState;
            setDefaultUnit(newState.unit);
            return newState;
        }),
}));
