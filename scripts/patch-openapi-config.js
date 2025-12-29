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

// Add CSRF token function and update HEADERS
const csrfFunction = `
function getCsrfToken(): string {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta?.getAttribute('content') || '';
}
`;

// Check if the function already exists
if (!content.includes('getCsrfToken')) {
  // Add the function after the type declarations
  content = content.replace(
    'export type OpenAPIConfig = {',
    `${csrfFunction}
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

fs.writeFileSync(openAPIPath, content, 'utf8');
console.log('✅ Patched OpenAPI.ts with correct configuration');

