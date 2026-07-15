import { Slug } from "../../shared/domain/slug.ts";

export class TimeCategoryKey extends Slug {
  constructor(input: string) {
    super(input, "Time category keys");
  }
}
