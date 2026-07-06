import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { role } = await req.json();
    
    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }

    const rootDir = path.resolve(process.cwd(), '..');

    return new Promise((resolve) => {
      // Escape the role argument securely
      const safeRole = role.replace(/"/g, '\\"');
      
      exec(`npx tsx src/scripts/test-search.ts "${safeRole}"`, { cwd: rootDir }, (error, stdout, stderr) => {
        if (error) {
          console.error('Scrape error:', error);
          resolve(NextResponse.json({ error: 'Scraping failed', details: stderr || error.message }, { status: 500 }));
          return;
        }
        
        resolve(NextResponse.json({ success: true, logs: stdout }));
      });
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
