import React, { useState } from "react";
import { Button, Typography } from "@equinor/eds-core-react";

import GenericTable from "@/components/GenericTable";
const Reactions: React.FC<{ commonPaths: any; reactions: Record<string, any> }> = ({ commonPaths, reactions }) => {
    const [isReactionsLimited, setIsReactionsLimited] = useState<boolean>(true);
    const reactionLimit = 5;
    const displayedReactions: Record<string, any>[] = reactions
        ? isReactionsLimited
            ? Object.values(reactions).slice(0, reactionLimit)
            : Object.values(reactions)
        : [];
    const handleShowMoreLessReactions = () => {
        setIsReactionsLimited(!isReactionsLimited);
    };
    return (
        <div>
            <Typography variant="h5" style={{ marginTop: "1rem" }}>
                Most frequent reactions
            </Typography>
            {reactions ? (
                <>
                    <GenericTable data={displayedReactions} />
                    {Object.keys(reactions).length > reactionLimit && (
                        <Button variant="ghost" onClick={() => handleShowMoreLessReactions()}>
                            {isReactionsLimited ? "Show more" : "Show less"}
                        </Button>
                    )}
                </>
            ) : (
                <Typography>No reactions available.</Typography>
            )}

            <Typography variant="h5" style={{ marginTop: "1rem" }}>
                Most frequent paths
            </Typography>

            {commonPaths ? <GenericTable data={commonPaths} /> : <Typography>No paths available.</Typography>}
        </div>
    );
};

export default Reactions;
