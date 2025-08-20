import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ConvertibleTextField from "../../src/components/ConvertibleTextField";
import { userEvent } from "@testing-library/user-event";
import { defaultSettingsContext, SettingsContext, Unit } from "../../src/contexts/SettingsContext";

describe("ConvertibleTextField", () => {
    it("renders with minimal props", () => {
        const { baseElement } = render(<ConvertibleTextField value={123} />);
        const inputTag = baseElement.getElementsByTagName("input")[0];
        expect(inputTag).toBeDefined();
        expect(inputTag.value).toBe("123");
    });

    it("editing the input changes the value", async () => {
        const { baseElement } = render(<ConvertibleTextField value={0} />);
        const inputTag = baseElement.getElementsByTagName("input")[0];

        await userEvent.type(inputTag, "12345");
        expect(inputTag.value).toBe("12345");
    });

    it("editing the input with maximum bound", async () => {
        const { baseElement } = render(<ConvertibleTextField value={0} max={10} />);
        const inputTag = baseElement.getElementsByTagName("input")[0];

        // You're allowed to type in any number...
        await userEvent.type(inputTag, "12345");
        expect(inputTag.value).toBe("12345");

        // ...but as soon as you blur (exit focus), we constrain the value
        await userEvent.type(inputTag, "{tab}");
        expect(inputTag.value).toBe("10");
    });

    it("onValueChange works", async () => {
        let value = 0;
        const setValue = (newValue: number) => {
            value = newValue;
        };
        const { baseElement } = render(<ConvertibleTextField value={value} onValueChange={setValue} max={10} />);
        const inputTag = baseElement.getElementsByTagName("input")[0];

        await userEvent.type(inputTag, "12345{tab}");
        expect(value).toBe(10);
    });

    it("is possible to enter negative numbers", async () => {
        let value = 0;
        const setValue = (newValue: number) => {
            value = newValue;
        };
        const { baseElement } = render(<ConvertibleTextField value={value} onValueChange={setValue} />);
        const inputTag = baseElement.getElementsByTagName("input")[0];

        // Typing just "-" resets the input
        await userEvent.clear(inputTag);
        await userEvent.type(inputTag, "-{tab}");
        expect(value).toBe(0);

        // Typing "-42" is valid
        await userEvent.clear(inputTag);
        await userEvent.type(inputTag, "-42{tab}");
        expect(value).toBe(-42);
    });
});

class DummyUnit extends Unit {
    name = "dummy";
    unit = "D";

    valueToNumber(value: number) {
        return value + 100;
    }

    valueFromNumber(value: number) {
        return value - 100;
    }
}

describe("ConvertibleTextField with a unit", () => {
    it("has the correct unit", async () => {
        let value = 0;
        const setValue = (newValue: number) => {
            value = newValue;
        };

        const unit = new DummyUnit();
        const { baseElement } = render(
            <SettingsContext.Provider value={{ ...defaultSettingsContext, getUnit: () => unit }}>
                <ConvertibleTextField value={value} onValueChange={setValue} />
            </SettingsContext.Provider>
        );
        const inputTag = baseElement.getElementsByTagName("input")[0];

        // 0 is 100 in "dummy units".
        expect(inputTag.value).toBe("100");
        expect(value).toBe(0);

        // 123 in "dummy units" is 23
        await userEvent.clear(inputTag);
        await userEvent.type(inputTag, "123{tab}");
        expect(inputTag.value).toBe("123");
        expect(value).toBe(23);
    });
});
