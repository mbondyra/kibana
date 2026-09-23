# Agent Builder Dashboards

Contains dashboard-related entities for the Agent Builder, including tools, attachment types, and a dashboard skill.

## Dashboard skill layout

The `dashboard-management` skill is organised as a small knowledge tree in the
[Open Knowledge Format](https://okf.md/spec/) so the agent reads only the guidance a request
needs:

- `SKILL.md` (always loaded) holds the operations vocabulary, the rules that apply to every
  request, the Kibana workflow, and an index that maps each task (create, change, enhance, custom
  content) to the documents to read.
- `howto/*.md` are task workflows and `reference/*.md` are looked up while performing one. Each
  document carries YAML frontmatter with `type`, `title` and `description`, and the agent reads
  them with `read_file` before its first `generate_dashboard` call.

The documents are defined in `server/skills/docs`; guidance text that is shared with the
visualization tooling stays in its original modules and is embedded from there.
