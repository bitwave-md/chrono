import { UppercaseCode } from "../../shared/domain/uppercase-code.ts";

export class IssuePrefix extends UppercaseCode {
  constructor(input: string) {
    super(input, "Issue prefix", 2, 10);
  }
}
