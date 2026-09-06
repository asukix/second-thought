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
    passId: string;
    range: Range;
    severity: "info" | "warning" | "error";
    category: string;
    message: string;
    suggestion?: string;
}

export interface ReviewResult {
    file: string;
    findings: Finding[];
    diff?: string;
}
