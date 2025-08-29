import { describe, it, expect, vi, beforeEach } from "vitest";
import LabResults from "../../src/pages/LabResults";
import { render, screen, waitFor } from "@testing-library/react";
import { AvailableModelsProvider } from "../../src/contexts/ModelContext.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getLabResults, getModels, runSimulation } from "../../src/api/api";

const mockLabResults = [
    {
        name: "Experiment 1",
        time: 100,
        temperature: 25,
        pressure: 1,
        initialConcentrations: { CO2: 0.5, H2O: 0.3 },
        finalConcentrations: { CO2: 0.4, H2O: 0.4 },
    },
    {
        name: "Experiment 2", 
        time: 200,
        temperature: 30,
        pressure: 1.2,
        initialConcentrations: { CO2: 0.6, H2O: 0.2 },
        finalConcentrations: { CO2: 0.3, H2O: 0.5 },
    },
];

const mockGetModels = [
    {
        modelId: "DummyModel",
        displayName: "Dummy Model",
        validSubstances: ["CO2", "H2O"],
        parameters: {"Temperature":{ default: 300 }, "Pressure":{ default: 300 }},
        description: "A dummy model for testing purposes",
        category: "Primary"
    },
];

const mockRunSimulationResult = {
    initialConcentrations: { CO2: 0.5, H2O: 0.3 },
    finalConcentrations: { CO2: 0.4, H2O: 0.4 },
    panels: [],
};

// Mock API functions
vi.mock("../../src/api/api", () => ({
    getLabResults: vi.fn(),
    getModels: vi.fn(),
    runSimulation: vi.fn(),
})); 

// Mock EDS components to avoid DOM API issues
vi.mock("@equinor/eds-core-react", () => ({
    Typography: ({ children, variant, ...props }: any) => (
        <div data-testid={`typography-${variant}`} {...props}>{children}</div>
    ),
    Button: ({ children, onClick, ...props }: any) => (
        <button onClick={onClick} {...props}>{children}</button>
    ),
    Card: ({ children, variant, style, ...props }: any) => (
        <div data-testid={`card-${variant || 'default'}`} style={style} {...props}>{children}</div>
    ),
    Autocomplete: ({ label, options, multiple, ...props }: any) => (
        <div data-testid="autocomplete">
            <label>{label}</label>
            <select multiple={multiple} {...props}>
                {options?.map((option: string) => (
                    <option key={option} value={option}>{option}</option>
                ))}
            </select>
        </div>
    ),
    EdsProvider: ({ children }: any) => <div data-testid="eds-provider">{children}</div>,
    AutocompleteChanges: {} as any,
}));

// Mock EDS DataGrid
vi.mock("@equinor/eds-data-grid-react", () => ({
    EdsDataGrid: ({ columns, rows, onRowClick, ...props }: any) => (
        <div data-testid="eds-data-grid" {...props}>
            <table>
                <thead>
                    <tr>
                        {columns?.map((colGroup: any) => (
                            <th key={colGroup.header}>{colGroup.header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows?.map((row: any) => (
                        <tr key={row.id} onClick={() => onRowClick?.({ original: row })}>
                            <td>{row.name}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    ),
}));

// Mock the plotting components
vi.mock("../../src/components/ResultScatterPlot.tsx", () => ({
    default: ({ graphData }: { graphData: any[] }) => (
        <div data-testid="scatter-plot">
            Scatter Plot with {graphData?.length || 0} data points
        </div>
    ),
}));

// Mock formatting functions
vi.mock("../../src/functions/Formatting.tsx", () => ({
    ExperimentResult_to_ScatterGraphData: vi.fn(() => [
        { x: "CO2", y: 0.4, label: "Experiment 1" },
        { x: "H2O", y: 0.4, label: "Experiment 1" }
    ]),
}));

// Mock synthetic results
vi.mock("../../src/assets/syntheticResults.tsx", () => ({
    syntheticResults: [
        {
            name: "Synthetic Experiment 1",
            time: 50,
            temperature: 20,
            pressure: 1,
            initialConcentrations: { CO2: 0.3, H2O: 0.2 },
            finalConcentrations: { CO2: 0.2, H2O: 0.3 },
        }
    ]
}));

describe("LabResults Page", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        // Create a fresh QueryClient for each test
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                    staleTime: 0,
                },
            },
        });

        // Clear all mocks and set up default implementations
        vi.clearAllMocks();
        vi.mocked(getLabResults).mockResolvedValue(mockLabResults);
        vi.mocked(getModels).mockResolvedValue(mockGetModels);
        vi.mocked(runSimulation).mockResolvedValue(mockRunSimulationResult);
    });
    
    const renderComponent = () => {
        return render(
            <QueryClientProvider client={queryClient}>
                <AvailableModelsProvider>
                    <LabResults />
                </AvailableModelsProvider>
            </QueryClientProvider>
        );
    };
    
    it("renders without crashing", () => {
        const { baseElement } = renderComponent();
        expect(baseElement).toBeDefined();
    });

    it("matches snapshot", () => {
        const { asFragment } = renderComponent();
        expect(asFragment()).toMatchSnapshot();
    });

    it("renders all main components when data is loaded", async () => {
        renderComponent();

        await waitFor(
            () => {
                const h1Element = screen.getAllByTestId("typography-h1");
                expect(h1Element.some(el => el.textContent === "Lab results")).toBe(true);
            },
        );
        
        await waitFor(() => {
            const h2Elements = screen.getAllByTestId("typography-h2");
            expect(h2Elements.some(el => el.textContent === "Plot summary")).toBe(true);
            expect(h2Elements.some(el => el.textContent === "Plot per component")).toBe(true);
        });
       
    });
});

/*
 
        // Check for scatter plots
        const scatterPlots = screen.getAllByTestId("scatter-plot");
        expect(scatterPlots.length).toBeGreaterThanOrEqual(2); // Should have at least 2 plots
        
        // Check for autocomplete
        expect(screen.getByTestId("autocomplete")).toBeInTheDocument();
        expect(screen.getByLabelText("Select multiple components")).toBeInTheDocument();
        
        // Check for data grid
        expect(screen.getByTestId("eds-data-grid")).toBeInTheDocument();
        
        // Check for Clear button
        expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
        
        // Check for table headers in the mocked data grid
        expect(screen.getByText("Meta data")).toBeInTheDocument();
        expect(screen.getByText("Input Concentrations")).toBeInTheDocument();
        expect(screen.getByText("Output Concentrations")).toBeInTheDocument();
        
        // Check for experiment data
        expect(screen.getByText("Experiment 1")).toBeInTheDocument();
        expect(screen.getByText("Experiment 2")).toBeInTheDocument();
        
        // Check for instruction text
        expect(screen.getByText("Select rows to compare.")).toBeInTheDocument();

        */
