import React from "react";
import { Accordion } from "@equinor/eds-core-react";

export interface AccordionItem {
    key: string;
    header: string;
    content: React.ReactNode;
}

interface ModelAccordionLayoutProps {
    items: AccordionItem[];
}

const ModelAccordionLayout: React.FC<ModelAccordionLayoutProps> = ({ items }) => {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {items.map((item, index) => (
                <Accordion key={item.key}>
                    <Accordion.Item isExpanded={index === items.length - 1}>
                        <Accordion.Header>{item.header}</Accordion.Header>
                        <Accordion.Panel>{item.content}</Accordion.Panel>
                    </Accordion.Item>
                </Accordion>
            ))}
        </div>
    );
};

export default ModelAccordionLayout;
