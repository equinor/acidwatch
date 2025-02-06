import { fireEvent, getByTestId, getByText, render, screen } from "@testing-library/react";
import '@testing-library/jest-dom/vitest'; // Import jest-dom matchers
import React from "react";
import { describe, it, expect, vi, beforeAll } from 'vitest'
import userEvent from "@testing-library/user-event";
import { useErrorStore } from "../src/hooks/useErrorState";
import ProjectList from "../src/pages/ProjectList";
beforeAll(() => {
    HTMLDialogElement.prototype.showModal = vi.fn()
    HTMLDialogElement.prototype.close = vi.fn()
})

describe('ProjectList', () => {
    it("should should open and close the create project dialog", async () => {
        render(<ProjectList />);
        const createProjectButton = screen.getByRole("button", {name: /Create Project/i});
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

        await userEvent.click(createProjectButton);
        const dialog = await screen.findByTestId("test-dialog");
        expect(dialog).toBeInTheDocument();

        const cancelButton = screen.getByTestId("CancelButton");
        await userEvent.click(cancelButton);
        expect(dialog).not.toBeInTheDocument();
    });
});
