import { Slug } from "../../shared/domain/slug.ts";

export class ProjectSlug extends Slug {
  constructor(input: string) {
    super(input, "Project slug");
  }
}
