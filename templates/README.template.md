# {{name}}

{{intro}}

{{status}}

### Selected Work

{{#each selected_work}}
**[{{slug}}](https://github.com/wranngle/{{slug}})**{{#if headline}}  
*{{headline}}*{{/if}}  
{{body}}

{{/each}}
---

**Operating record**

{{#each operating_record}}
- {{.}}
{{/each}}

**Links:** {{links}}
