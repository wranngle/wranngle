# {{name}}

{{intro}}

{{status}}

{{#each now_hiring}}
{{#if header}}{{header}}

{{/if}}- {{item}}
{{/each}}

{{#each reading}}
{{#if header}}{{header}}

{{/if}}- {{item}}
{{/each}}

<!-- nightstand -->

### Selected Work

{{#each selected_work}}
**[{{slug}}](https://github.com/wranngle/{{slug}})**{{#if headline}}  
*{{headline}}*{{/if}}  
{{body}}

{{/each}}
{{#each now_shipping}}
- **[{{repo}}](https://github.com/wranngle/{{repo}})** — {{last_commit_message}} (`{{short_sha}}`, {{committed_at}})
{{/each}}
---

**Operating record**

{{#each operating_record}}
- {{.}}
{{/each}}

**Links:** {{links}}
