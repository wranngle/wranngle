# {{name}}: {{tagline}}

{{intro}}

{{status}}

{{#each now_hiring}}
{{#if header}}{{header}}

{{/if}}- {{item}}
{{/each}}

### Production automation proof

{{#each selected_work}}
**[{{slug}}](https://github.com/wranngle/{{slug}})**{{#if headline}}  
*{{headline}}*{{/if}}  
{{body}}

{{/each}}
---

### Reliability track record

{{#each operating_record}}
- {{.}}
{{/each}}

**Links:** {{links}}

License: [{{license}}](LICENSE)
