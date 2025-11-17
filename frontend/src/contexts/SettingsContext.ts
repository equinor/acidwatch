import { createContext, createElement, FC, ReactNode, useContext, useState } from "react";

export class Unit {
    name: string;
    unit: string;

    constructor(name?: string, unit?: string) {
        this.name = name ?? "";
        this.unit = unit ?? "";
    }

    valueToString(value: number): string {
        return `${this.valueToNumber(value)} ${this.unit}`;
    }

    valueToNumber(value: number): number {
        return value;
    }
    valueFromNumber(value: number): number {
        return value;
    }
}

class Kelvin extends Unit {
    name = "kelvin";
    unit = "K";
}

class Celsius extends Unit {
    name = "celsius";
    unit = "°C";

    valueToNumber(value: number): number {
        return value - 273;
    }

    valueFromNumber(value: number): number {
        return value + 273;
    }
}

const customUnits: Record<string, Unit> = {};

const temperatures = [new Celsius(), new Kelvin()];

type SettingsContextType = {
    temperature: Unit;
    nextTemperature: () => void;
    getUnit: (name?: string, customUnit?: string) => Unit;
};

export const defaultSettingsContext: SettingsContextType = {
    temperature: temperatures[0],
    nextTemperature: () => {},
    getUnit: (name, customUnit) => {
        customUnit ??= "";
        const unit = customUnits[customUnit];
        if (unit !== undefined) return unit;
        return (customUnits[customUnit] = new Unit(name, customUnit));
    },
};

export const SettingsContext = createContext(defaultSettingsContext);

function getDefault(units: Unit[], keyName: string): Unit {
    const item = localStorage.getItem(keyName);
    return units.find((unit) => unit.name === item) ?? units[0];
}

function nextUnit(units: Unit[], current: Unit, keyName: string): Unit {
    const index = units.indexOf(current);
    const unit = index < 0 || index + 1 >= units.length ? units[0] : units[index + 1];

    localStorage.setItem(keyName, unit.name);

    return unit;
}

export const SettingsProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [temperature, setTemperature] = useState<Unit>(getDefault(temperatures, "temperatureUnit"));

    const settingsContext: SettingsContextType = {
        temperature,
        nextTemperature: () => {
            const unit = nextUnit(temperatures, temperature, "temperatureUnit");
            setTemperature(unit);
        },
        getUnit: (name, customUnit) => {
            if (name === "kelvin") return temperature;
            return defaultSettingsContext.getUnit(name, customUnit);
        },
    };

    return createElement(SettingsContext.Provider, { value: settingsContext }, children);
};

export const useSettings = () => useContext(SettingsContext);
