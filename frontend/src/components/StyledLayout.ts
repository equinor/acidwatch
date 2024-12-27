/**
 * A collection of components created with styled-components
 *
 * More info: https://styled-components.com/
 */
import styled from "styled-components";
import { tokens } from "@equinor/eds-tokens";
import { Typography } from "@equinor/eds-core-react";

const defaultGap = tokens.spacings.comfortable.medium;

export const headerHeight = "64px";

export type GridProps = {
    $columns?: string;
    $rows?: string;
    $gap?: string;
    $template?: string;
    $justifyItems?: "start" | "end" | "center" | "stretch";
    $alignItems?: "start" | "end" | "center" | "stretch";
    $justifyContent?: "start" | "end" | "center" | "stretch" | "space-around" | "space-between" | "space-evenly";
    $alignContent?: "start" | "end" | "center" | "stretch" | "space-around" | "space-between" | "space-evenly";
};

export const Grid = styled.section<GridProps>`
    display: grid;
    grid-template-columns: ${(props) => props.$columns};
    grid-template-rows: ${(props) => props.$rows};
    gap: ${(props) => props.$gap};
    grid-template: ${(props) => props.$template};
    justify-items: ${(props) => props.$justifyItems};
    align-items: ${(props) => props.$alignItems};
    justify-content: ${(props) => props.$justifyContent};
    align-content: ${(props) => props.$alignContent};
`;

export type GridItemProps = {
    $display?: string;
    $column?: string;
    $row?: string;
    $area?: string;
    $justifySelf?: "start" | "end" | "center" | "stretch";
    $alignSelf?: "start" | "end" | "center" | "stretch";
};
export const GridItem = styled.section<GridItemProps>`
    display: ${(props) => props.$display};
    grid-column: ${(props) => props.$column};
    grid-row: ${(props) => props.$row};
    grid-area: ${(props) => props.$area};
    justify-self: ${(props) => props.$justifySelf};
    align-self: ${(props) => props.$alignSelf};
`;

export const ColumnLayout = styled.section<{
    $gap?: string;
    $justifyContent?: string;
    $alignItems?: string;
    $background?: string;
    $padding?: string;
    $border?: string;
}>`
    display: flex;
    flex-direction: column;
    gap: ${(props) => (props.$gap ? props.$gap : defaultGap)};
    justify-content: ${(props) => props.$justifyContent};
    align-items: ${(props) => props.$alignItems};
    background: ${(props) => props.$background || "transparent"};
    padding: ${(props) => props.$padding || ""};
    border: ${(props) => props.$border || ""};
`;

export const RowLayout = styled.section<{
    $gap?: string;
    $alignItems?: string;
    $padding?: string;
    $flex?: string;
    $backgroundColor?: string;
    $justifyContent?: string;
}>`
    display: flex;
    flex: ${(props) => props.$flex};
    flex-direction: row;
    gap: ${(props) => (props.$gap ? props.$gap : defaultGap)};
    align-items: ${(props) => props.$alignItems};
    padding: ${(props) => props.$padding};
    background-color: ${(props) => props.$backgroundColor};
    justify-content: ${(props) => props.$justifyContent};
`;

export const LayoutItem = styled.section<{
    $gap?: string;
    $alignItem?: string;
    $padding?: string;
    $flex?: string;
    $direction?: string;
}>`
    display: flex;
    flex: ${(props) => props.$flex};
    flex-direction: ${(props) => props.$direction ?? "row"};
    gap: ${(props) => (props.$gap ? props.$gap : defaultGap)};
    align-items: ${(props) => (props.$alignItem ? props.$alignItem : "flex-end")};
    padding: ${(props) => props.$padding};
`;

export const RowItem = styled.div<{ $flex?: string }>`
    flex: ${(props) => props.$flex};
`;

export const StickyColumn = styled(ColumnLayout)<{
    bottom?: string;
    top?: string;
    padding?: string;
}>`
    position: sticky;
    top: ${(props) => props.top};
    bottom: ${(props) => props.bottom};
    z-index: 3;
    padding: ${(props) => props.padding};
`;

export const StickyColumnBottom = styled(StickyColumn)<{
    backgroundColor?: string;
}>`
    margin-top: auto;
    bottom: 0;
    padding: 20px 10px;
    box-shadow: 0px -2px 8px rgba(10, 62, 62, 0.13);
    backdrop-filter: blur(10px);
    background-color: ${(props) => (props.backgroundColor ? props.backgroundColor : "rgba(168, 200, 200, 0.2)")};
`;

export const CenterDiv = styled.div`
    display: flex;
    flex: 1;
    justify-content: center;
    align-items: center;
`;

export const EllipsisTypography = styled(Typography)`
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    width: -webkit-fill-available;
`;
