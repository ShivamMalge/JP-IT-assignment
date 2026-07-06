import sqlite3 from 'sqlite3';
import path from 'path';
import DashboardClient from '../components/DashboardClient';

async function fetchApplications() {
  const db = new sqlite3.Database(path.resolve(process.cwd(), '../dev.db'));
  return new Promise<any[]>((resolve, reject) => {
    db.all(`SELECT a.*, p.rawText, p.authorName, p.postUrl 
            FROM JobApplication a
            JOIN Post p ON a.postId = p.id
            ORDER BY a.createdAt DESC`, 
      (err, rows) => {
        if (err) reject(err);
        resolve(rows);
        db.close();
      }
    );
  });
}

export default async function Home() {
  const applications = await fetchApplications();

  return (
    <main className="min-h-screen bg-[#0A0A0B] text-white selection:bg-blue-500/30 p-8 md:p-24 relative overflow-hidden">
      {/* Dynamic Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <DashboardClient initialApplications={applications} />
      </div>
    </main>
  );
}
