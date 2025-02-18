import { describe, expect, it } from "vitest"
import {convertToSubscripts} from "../src/functions/Formatting"
import React from "react";

describe("convertToSubscripts", () => {
    it("should return empty div when provided an empty string", () => {
        const inp = "";

        const res = convertToSubscripts(inp);

        expect(res).toEqual(<p>{[""]}</p>)
    })
    it("should format NO2 to NO<sub>2</sub>", () => {
        const inp = "NO2";

        const res = convertToSubscripts(inp);

        expect(res).toEqual(<p>{["NO",<sub key={0}>2</sub>,""]}</p>)
    })
    it("should only format the last 2 in 2 NO2", () => {
        const inp = "2 NO2";

        const res = convertToSubscripts(inp);
        
        expect(res).toEqual(<p>{["2 NO",<sub key={0}>2</sub>,""]}</p>)
    })
})