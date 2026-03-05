const fs = require('fs');
const path = require('path');

const basePath = process.argv[2];

const files = [
    'src/types/index.ts',
    'src/types/database.ts',
    'src/components/pipeline/pipeline-steps.tsx',
    'src/components/pipeline/rerun-button.tsx',
    'src/components/pipeline/run-status-poller.tsx',
    'src/components/dashboard/brief-list-item.tsx',
    'src/components/dashboard/history-filters.tsx',
    'src/app/(dashboard)/page.tsx',
    'src/app/(dashboard)/brief/[id]/page.tsx',
    'src/app/api/pipeline/start/route.ts',
    'src/app/api/pipeline/cancel/route.ts',
    'src/app/(dashboard)/history/page.tsx',
    'src/app/(dashboard)/analytics/page.tsx',
    'src/lib/pipeline/orchestrator.ts',
    'src/app/api/analytics/compute/route.ts',
    'src/components/dashboard/recent-briefs-table.tsx',
    'src/lib/export/serialize-brief.ts',
    'src/components/brief/export-dropdown.tsx',
    'src/components/brief/brief-detail-client.tsx'
];

files.forEach(relativePath => {
    const fullPath = path.join(basePath, relativePath);
    if (!fs.existsSync(fullPath)) return;

    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replace(/"failed"/g, '"error"').replace(/'failed'/g, "'error'");

    if (relativePath === 'src/components/dashboard/history-filters.tsx') {
        // Make sure the label still makes sense, e.g., <SelectItem value="error">Failed</SelectItem> or Error
        content = content.replace(/>Failed</g, '>Error<');
    }

    // Also replace any uppercase "Failed" to "Error" where relevant for display, but be careful. 
    // We'll leave the display text mostly as "Error" to make it consistent.
    content = content.replace(/status === "error" \? "error" : "error"/, 'status === "error" ? "error" : "complete"'); // Fix poller replace side effect
    content = content.replace(/status === "error"\n\s*\?\s*"error"/, 'status === "error"\n                ? "error"');

    fs.writeFileSync(fullPath, content);
    console.log('Updated ' + relativePath);
});
