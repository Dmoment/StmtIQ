#!/usr/bin/env node
/**
 * Patches the generated OpenAPI.ts with correct configuration
 * Run this after @hey-api/openapi-ts generation
 */

const fs = require('fs');
const path = require('path');

const openAPIPath = path.join(__dirname, '../app/javascript/types/generated/core/OpenAPI.ts');

if (!fs.existsSync(openAPIPath)) {
  console.error('❌ OpenAPI.ts not found at:', openAPIPath);
  process.exit(1);
}

let content = fs.readFileSync(openAPIPath, 'utf8');

// Replace the BASE URL
content = content.replace(
  /BASE: '.*',/,
  "BASE: '/api',"
);

// Add CSRF token function and Clerk token management
const helperFunctions = `
function getCsrfToken(): string {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta?.getAttribute('content') || '';
}

// Clerk token management
type ClerkTokenGetter = () => Promise<string | null>;
let clerkTokenGetter: ClerkTokenGetter | null = null;

export function setClerkTokenGetter(getter: ClerkTokenGetter): void {
  clerkTokenGetter = getter;
}

export function clearClerkTokenGetter(): void {
  clerkTokenGetter = null;
}

export async function getClerkToken(): Promise<string | null> {
  if (clerkTokenGetter) {
    return clerkTokenGetter();
  }
  return null;
}
`;

// Check if the function already exists
if (!content.includes('getCsrfToken')) {
  // Add the functions after the type declarations
  content = content.replace(
    'export type OpenAPIConfig = {',
    `${helperFunctions}
export type OpenAPIConfig = {`
  );
}

// Replace HEADERS config
content = content.replace(
  /HEADERS: undefined,/,
  `HEADERS: {
		'X-CSRF-Token': getCsrfToken(),
		'Content-Type': 'application/json',
	},`
);

// Replace TOKEN config to use Clerk token
content = content.replace(
  /TOKEN: undefined,/,
  `TOKEN: async () => {
		const token = await getClerkToken();
		return token || '';
	},`
);

fs.writeFileSync(openAPIPath, content, 'utf8');
console.log('✅ Patched OpenAPI.ts with correct configuration');

