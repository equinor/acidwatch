import React, { useRef, useState } from "react";
import { useSources } from "./sources";
import { Button, Checkbox, Icon, Popover } from "@equinor/eds-core-react";
import { info_circle, warning_filled } from "@equinor/eds-icons";
import { ExperimentResult } from "@/dto/ExperimentResult";
import type { Source } from "./sources/types";

type SourceItemProps = {
    result: ExperimentResult[] | Error;
    source: Source;
    active: boolean;
    loaded: boolean;
    onClick: () => void;
};

const SourceItem: React.FC<SourceItemProps> = ({ result, loaded, source, active, onClick }) => {
    const [open, setOpen] = useState(false);
    const hasError = result instanceof Error;
    const ref = useRef<HTMLElement | null>(null);

    return (
        <li style={{ display: "flex", justifyContent: "space-between" }}>
            <Checkbox
                onClick={onClick}
                label={source.name}
                disabled={!loaded || hasError}
                color={hasError ? "danger" : "secondary"}
                checked={loaded && !hasError && active}
                style={{ flex: 1 }}
            />

            <Button
                variant="ghost_icon"
                style={{ marginLeft: "1rem", visibility: hasError || source.description ? "visible" : "hidden" }}
                onClick={() => setOpen(!open)}
                color={hasError ? "danger" : "secondary"}
                ref={ref}
            >
                <Icon data={hasError ? warning_filled : info_circle} />
            </Button>
            <Popover open={open} onClose={() => setOpen(false)} anchorEl={ref.current}>
                <Popover.Header>
                    <Popover.Title>{source.name}</Popover.Title>
                </Popover.Header>
                <Popover.Content>{source.description || (result as Error)?.message}</Popover.Content>
            </Popover>
        </li>
    );
};

export const SourceSelect: React.FC = () => {
    const { sources, toggleSource, results, disabled } = useSources();

    return (
        <fieldset>
            <legend>Sources</legend>
            <ul style={{ listStyle: "none", paddingLeft: 0 }}>
                {Object.entries(sources).map(([key, source]) => (
                    <SourceItem
                        key={key}
                        result={results[key]}
                        source={source}
                        active={!disabled.includes(key)}
                        loaded={results[key] !== undefined}
                        onClick={() => toggleSource(key)}
                    />
                ))}
            </ul>
        </fieldset>
    );
};
