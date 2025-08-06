import { createContext, ReactNode, useContext, useState } from "react";

class Unit {
    name: string = "";
    unit: string = "";

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

const temperatures = [new Celsius(), new Kelvin()];

const SettingsContext = createContext<{
    temperature: Unit;
    nextTemperature: () => void;
    getUnit: (name?: string) => Unit | null;
}>({
    temperature: temperatures[0],
    nextTemperature: () => {},
    getUnit: () => null,
});

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

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [temperature, setTemperature] = useState<Unit>(getDefault(temperatures, "temperatureUnit"));

    const nextTemperature = () => {
        const unit = nextUnit(temperatures, temperature, "temperatureUnit");
        setTemperature(unit);
    };

    const getUnit = (name?: string): Unit | null => {
        if (!name) return null;

        switch (name) {
            case "kelvin":
                return temperature;

            default:
                return null;
        }
    };

    return (
        <SettingsContext.Provider value={{ temperature, nextTemperature, getUnit }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);
