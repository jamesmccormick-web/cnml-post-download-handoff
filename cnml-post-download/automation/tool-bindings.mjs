// Explicit catalog profile, confirmed against the connected Runlayer definitions.
// Canonical operation identities and argument/receipt validation remain unchanged.
export const catalogAliases = Object.freeze({
 mcp__google_sheets__get_metadata: 'google_she_get_metadata',
 mcp__google_sheets__fetch: 'google_she_fetch',
 mcp__google_sheets__update: 'update',
 mcp__google_sheets__append: 'append',
 mcp__gmail__send_email: 'send_email',
});
export function bindings(names, profile = 'direct') {
 if (!['direct', 'runlayer-catalog'].includes(profile)) throw new Error('Unknown tool binding profile');
 return Object.fromEntries(names.map(name => [name, profile === 'runlayer-catalog' ? (catalogAliases[name] ?? name) : name]));
}
export function checkedBindings(names, check) {
 const expected = bindings(names, check?.profile ?? 'direct');
 if (!check || check.missing?.length || !names.every(n => check.available?.includes(n))) throw new Error('Required Runlayer tools unavailable; refresh tools and accept-tools');
 if (check.bindings && JSON.stringify(Object.entries(check.bindings).sort()) !== JSON.stringify(Object.entries(expected).sort())) throw new Error('Unapproved tool bindings');
 if (check.profile === 'runlayer-catalog' && !check.bindings) throw new Error('Catalog bindings missing');
 return expected;
}
