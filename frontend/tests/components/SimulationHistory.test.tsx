import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import SimulationHistory from "@/components/SimulationHistory";
import { SimulationHistoryProvider, useSimulationHistory } from "@/contexts/SimulationHistoryContext";
import React from "react";

// Helper component to test the context
const TestComponent: React.FC<{ onRender?: (history: any) => void }> = ({ onRender }) => {
    const context = useSimulationHistory();
    React.useEffect(() => {
        if (onRender) onRender(context);
    }, [context, onRender]);
    return null;
};

describe("SimulationHistory", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    it("should save simulation to localStorage via context", () => {
        let capturedContext: any;

        render(
            <SimulationHistoryProvider>
                <TestComponent onRender={(ctx) => (capturedContext = ctx)} />
            </SimulationHistoryProvider>
        );

        act(() => {
            capturedContext.addSimulation("sim123", "Test Model");
        });

        expect(capturedContext.history).toHaveLength(1);
        expect(capturedContext.history[0].simulationId).toBe("sim123");
        expect(capturedContext.history[0].displayName).toBe("Test Model");
        expect(capturedContext.history[0].date).toBeInstanceOf(Date);
    });

    it("should limit history to 10 items", () => {
        let capturedContext: any;

        render(
            <SimulationHistoryProvider>
                <TestComponent onRender={(ctx) => (capturedContext = ctx)} />
            </SimulationHistoryProvider>
        );

        act(() => {
            // Add 15 simulations
            for (let i = 0; i < 15; i++) {
                capturedContext.addSimulation(`sim${i}`, `Model ${i}`);
            }
        });

        expect(capturedContext.history).toHaveLength(10);
        // Most recent should be sim14
        expect(capturedContext.history[0].simulationId).toBe("sim14");
    });

    it("should not duplicate simulations", () => {
        let capturedContext: any;

        render(
            <SimulationHistoryProvider>
                <TestComponent onRender={(ctx) => (capturedContext = ctx)} />
            </SimulationHistoryProvider>
        );

        act(() => {
            capturedContext.addSimulation("sim123", "Test Model");
            capturedContext.addSimulation("sim456", "Another Model");
            capturedContext.addSimulation("sim123", "Test Model");
        });

        expect(capturedContext.history).toHaveLength(2);
        // sim123 should be first (most recent)
        expect(capturedContext.history[0].simulationId).toBe("sim123");
        expect(capturedContext.history[1].simulationId).toBe("sim456");
    });

    it("should render nothing when history is empty", () => {
        const { container } = render(
            <BrowserRouter>
                <SimulationHistoryProvider>
                    <SimulationHistory />
                </SimulationHistoryProvider>
            </BrowserRouter>
        );
        expect(container.querySelector("div > div")).toBeNull();
    });

    it("should render history items", () => {
        // Pre-populate localStorage
        const history = [
            {
                simulationId: "sim123",
                displayName: "Test Model",
                date: new Date().toISOString(),
            },
            {
                simulationId: "sim456",
                displayName: "Another Model",
                date: new Date().toISOString(),
            },
        ];
        localStorage.setItem("simulationHistory", JSON.stringify(history));

        render(
            <BrowserRouter>
                <SimulationHistoryProvider>
                    <SimulationHistory />
                </SimulationHistoryProvider>
            </BrowserRouter>
        );

        // getByText will throw if not found
        screen.getByText(/Recent Simulations/i);
        screen.getByText(/Test Model/i);
        screen.getByText(/Another Model/i);
    });

    it("should handle corrupted localStorage data", () => {
        localStorage.setItem("simulationHistory", "invalid json");

        const { container } = render(
            <BrowserRouter>
                <SimulationHistoryProvider>
                    <SimulationHistory />
                </SimulationHistoryProvider>
            </BrowserRouter>
        );

        // Should render nothing when localStorage is corrupted
        expect(container.querySelector("div > div")).toBeNull();
    });
});

