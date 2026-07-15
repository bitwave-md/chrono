import { UppercaseCode } from "../../shared/domain/uppercase-code.ts";

export class TeamKey extends UppercaseCode {
  constructor(input: string) {
    super(input, "Team key", 2, 12);
  }
}
