insert into "time_categories" (
  "workspace_id",
  "name",
  "key",
  "color",
  "default_billable",
  "position"
)
select
  workspace."id",
  category."name",
  category."key",
  category."color",
  false,
  category."position"
from "workspaces" workspace
cross join (
  values
    ('Planning', 'planning', '#8B5CF6', 10),
    ('Documenting', 'documenting', '#3B82F6', 20),
    ('Developing', 'developing', '#10B981', 30),
    ('Testing', 'testing', '#F59E0B', 40),
    ('Other', 'other', '#6B7280', 50)
) as category("name", "key", "color", "position")
on conflict ("workspace_id", "key") do nothing;
