export type PassId = "language" | "editorial" | "system";
export type Severity = "info" | "warning" | "error";

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
}

export interface ReviewResult {
    file: string;
    findings: Finding[];
    diff?: string;
}