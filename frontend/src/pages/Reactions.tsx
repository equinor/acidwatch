import React, { useState } from "react";
import { Button } from "@equinor/eds-core-react";

import GenericTable from "@/components/Tables/GenericTable";
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
            <h5 style={{ marginTop: "1rem" }}>Most frequent reactions</h5>
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
                <p>No reactions available.</p>
            )}

            <h5 style={{ marginTop: "1rem" }}>Most frequent paths</h5>

            {commonPaths ? <GenericTable data={commonPaths} /> : <p>No paths available.</p>}
        </div>
    );
};

export default Reactions;
