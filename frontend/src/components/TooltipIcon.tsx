import { Icon, Tooltip } from "@equinor/eds-core-react";
import { info_circle } from "@equinor/eds-icons";

export const TooltipIcon = ({ tooltip }: { tooltip: string }) => {
    return (
        <Tooltip title={tooltip} enterDelay={700} style={{ whiteSpace: "pre-wrap" }}>
            <Icon data={info_circle} size={24} style={{ paddingLeft: 8 }} />
        </Tooltip>
    );
};
