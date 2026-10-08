export type IssueSeverity = "error" | "warning";

export type Issue = {
  severity: IssueSeverity;
  code: string;
  field?: string;
  messageKey: string;
  params?: Record<string, string | number>;
};

export function hasBlockingIssues(issues: Issue[]): boolean {
  return issues.some((issue) => issue.severity === "error");
}
