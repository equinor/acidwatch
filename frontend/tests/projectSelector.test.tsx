import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import ProjectSelector from "../src/components/ProjectSelector";
import React from "react";

describe("Project Selector test", () => {
    test("Test that empty ProjectSelector is valid", () => {
        render(<ProjectSelector />);
        expect(screen.getByText(/Save to project:/)).toBeDefined();
    });
});
