/**
 * A collection of components created with styled-components
 *
 * More info: https://styled-components.com/
 */
import styled from "styled-components";
import { tokens } from "@equinor/eds-tokens";

const defaultGap = tokens.spacings.comfortable.medium;

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
