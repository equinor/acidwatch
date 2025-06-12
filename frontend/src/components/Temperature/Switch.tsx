import { Button, Icon, Tooltip } from "@equinor/eds-core-react";
import { thermostat } from "@equinor/eds-icons";
import { useStore } from "./store";
import { useShallow } from "zustand/shallow";

const Switch = () => {
    const [name, prettyUnit, nextUnit] = useStore(
        useShallow((state) => [state.name, state.prettyUnit, state.nextUnit])
    );

    return (
        <Tooltip title={`Temperature unit: ${name}`}>
            <Button variant="ghost" onClick={nextUnit}>
                <Icon data={thermostat} />
                {prettyUnit}
            </Button>
        </Tooltip>
    );
};

export default Switch;
