import { Icon, Tooltip } from "@equinor/eds-core-react";
import { styled } from "styled-components";
import { info_circle } from "@equinor/eds-icons";

Icon.add({
    info_circle,
});
const StyledMeta = styled.div`
    display: flex;
`;

export const MetaTooltip = (tooltip: string) => {
    if (!tooltip) return "";
    return (
        <StyledMeta>
            <Tooltip title={tooltip} enterDelay={700} style={{ whiteSpace: "pre-wrap" }}>
                <Icon name={"info_circle"} size={16} />
            </Tooltip>
        </StyledMeta>
    );
};
