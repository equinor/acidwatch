import styled from "styled-components";
import icon from "@/assets/VGH.gif";
import CenteredImage from "@/components/CenteredImage";

const BlendedWorking = styled(CenteredImage)`
    mix-blend-mode: multiply;
`;

const Working = () => <BlendedWorking src={icon} caption="Working..." />;

export default Working;
