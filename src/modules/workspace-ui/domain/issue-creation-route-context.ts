export interface IssueCreationFilters {
  projectId?: string;
  branchId?: string;
  mainBranch?: boolean;
}

export class IssueCreationRouteContext {
  readonly clientId: string | null;
  readonly projectId: string | null;
  readonly branchId: string | null;
  readonly filters: IssueCreationFilters;

  private constructor(
    clientId: string | null,
    projectId: string | null,
    branchScope: string | null,
  ) {
    this.clientId = clientId;
    this.projectId = projectId;
    this.branchId = projectId && branchScope && branchScope !== "all"
      ? branchScope
      : null;
    this.filters = projectId
      ? branchScope === "all"
        ? { projectId }
        : this.branchId
          ? { projectId, branchId: this.branchId }
          : { projectId, mainBranch: true }
      : {};
  }

  static from(pathname: string, branchScope: string | null) {
    return new IssueCreationRouteContext(
      pathname.match(/\/clients\/([^/]+)/)?.[1] ?? null,
      pathname.match(/\/projects\/([^/]+)/)?.[1] ?? null,
      branchScope,
    );
  }
}
