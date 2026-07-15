import { UppercaseCode } from "../../shared/domain/uppercase-code.ts";

export class ClientKey extends UppercaseCode {
  constructor(input: string) {
    super(input, "Client key", 2, 12);
  }
}
