import * as React from "react";
import { Card, Typography } from "@equinor/eds-core-react";

type Props = {
    children: React.ReactNode;
};

type State = {
    error?: Error;
};

const Error: React.FC<{ error: Error }> = ({ error }) => (
    <Card variant="danger">
        <Card.Header>
            <Card.HeaderTitle>
                <Typography variant="h5">{error.name}</Typography>
                <Typography variant="body_short">{error.message}</Typography>
            </Card.HeaderTitle>
        </Card.Header>
        <Card.Content>
            <div style={{ overflow: "auto", fontFamily: "monospace" }}>
                <Typography variant="body_short" as="pre">
                    {error.stack}
                </Typography>
            </div>
        </Card.Content>
    </Card>
);

class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            error: undefined,
        };
    }

    static getDerivedStateFromError(error: Error) {
        return { error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error(error, info.componentStack, React.captureOwnerStack());
    }

    render() {
        const { error } = this.state;

        return error !== undefined ? <Error error={error} /> : this.props.children;
    }
}

export default ErrorBoundary;
