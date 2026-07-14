export function renderTemplate(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => tokens[key] ?? match);
}
