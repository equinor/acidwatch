import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import SimulationHistory, { saveSimulationToHistory, getSimulationHistory } from "@/components/SimulationHistory";

describe("SimulationHistory", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    it("should save simulation to localStorage", () => {
        saveSimulationToHistory("sim123", "Test Model");
        const history = getSimulationHistory();

        expect(history).toHaveLength(1);
        expect(history[0].simulationId).toBe("sim123");
        expect(history[0].displayName).toBe("Test Model");
        expect(history[0].date).toBeInstanceOf(Date);
    });

    it("should limit history to 10 items", () => {
        // Add 15 simulations
        for (let i = 0; i < 15; i++) {
            saveSimulationToHistory(`sim${i}`, `Model ${i}`);
        }

        const history = getSimulationHistory();
        expect(history).toHaveLength(10);
        // Most recent should be sim14
        expect(history[0].simulationId).toBe("sim14");
    });

    it("should not duplicate simulations", () => {
        saveSimulationToHistory("sim123", "Test Model");
        saveSimulationToHistory("sim456", "Another Model");
        saveSimulationToHistory("sim123", "Test Model");

        const history = getSimulationHistory();
        expect(history).toHaveLength(2);
        // sim123 should be first (most recent)
        expect(history[0].simulationId).toBe("sim123");
        expect(history[1].simulationId).toBe("sim456");
    });

    it("should render nothing when history is empty", () => {
        const { container } = render(
            <BrowserRouter>
                <SimulationHistory />
            </BrowserRouter>
        );
        expect(container.firstChild).toBeNull();
    });

    it("should render history items", () => {
        saveSimulationToHistory("sim123", "Test Model");
        saveSimulationToHistory("sim456", "Another Model");

        render(
            <BrowserRouter>
                <SimulationHistory />
            </BrowserRouter>
        );

        // getByText will throw if not found
        screen.getByText(/Recent Simulations/i);
        screen.getByText(/Test Model/i);
        screen.getByText(/Another Model/i);
    });

    it("should handle corrupted localStorage data", () => {
        localStorage.setItem("simulationHistory", "invalid json");
        const history = getSimulationHistory();
        expect(history).toHaveLength(0);
    });
});
