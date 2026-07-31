import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// jsdom does not implement the Popover API used by EDS overlays
for (const method of ["showPopover", "hidePopover", "togglePopover"] as const) {
    if (!(method in HTMLElement.prototype)) {
        HTMLElement.prototype[method] = vi.fn();
    }
}

// Ensure that the DOM is clean between every test
afterEach(() => {
    cleanup();
});
