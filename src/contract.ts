export type PassId = "language" | "editorial" | "system";
export type Severity = "info" | "warning" | "error";
// How precisely a suggested edit was narrowed: the computed minimal change, the LLM's own
// narrowing, or the whole sentence (last resort). Absent for findings without an edit.
export type EditPrecision = "minimal" | "llm" | "sentence";

export interface ReviewRequest {
    file: string;
    content: string;
    passes?: string[];
}

export interface Range {
    start: number;
    end: number;
}

export interface Finding {
    passId: PassId;
    range: Range;
    severity: Severity;
    category: string;
    message: string;
    suggestion?: string;
    editPrecision?: EditPrecision;
}

export interface ReviewResult {
    file: string;
    findings: Finding[];
    diff?: string;
}