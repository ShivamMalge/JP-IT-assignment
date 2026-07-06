"use client";

import { useState } from 'react';

export default function DashboardClient({ initialApplications }: { initialApplications: any[] }) {
  const [applications, setApplications] = useState(initialApplications);
  const [searchRole, setSearchRole] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [loadingApps, setLoadingApps] = useState<Record<string, boolean>>({});

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchRole) return;
    
    setIsScraping(true);
    try {
      // Trigger the scraper
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: searchRole })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to scrape');
      
      // Reload the page to get fresh data from SQLite
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
      setIsScraping(false);
    }
  };

  const handleSendEmail = async (appId: string) => {
    setLoadingApps(prev => ({ ...prev, [appId]: true }));
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: searchRole || 'Web Developer', appId })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      
      // Update local state to show SENT
      setApplications(apps => apps.map(app => 
        app.id === appId ? { ...app, status: 'SENT' } : app
      ));
    } catch (err: any) {
      alert(err.message);
      setApplications(apps => apps.map(app => 
        app.id === appId ? { ...app, status: 'FAILED' } : app
      ));
    } finally {
      setLoadingApps(prev => ({ ...prev, [appId]: false }));
    }
  };

  return (
    <>
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
            LeadGenius
          </h1>
          <p className="text-gray-400 text-lg">Automated LinkedIn Job Pipeline</p>
        </div>
        <div className="flex gap-4">
          <div className="px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-lg shadow-black/50 text-sm font-medium">
            <span className="text-blue-400 font-bold">{applications.length}</span> Total Leads
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-12 relative max-w-2xl">
        <div className="relative flex items-center">
          <input 
            type="text" 
            placeholder="e.g. Python Developer, Data Scientist..." 
            value={searchRole}
            onChange={(e) => setSearchRole(e.target.value)}
            className="w-full bg-white/5 border border-white/10 text-white rounded-full py-4 pl-6 pr-32 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all backdrop-blur-md shadow-lg"
          />
          <button 
            type="submit" 
            disabled={isScraping || !searchRole}
            className="absolute right-2 top-2 bottom-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-2 px-6 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isScraping ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Scraping...
              </>
            ) : (
              'Scrape Jobs'
            )}
          </button>
        </div>
      </form>

      {applications.length === 0 ? (
        <div className="w-full py-32 flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm">
          <div className="w-24 h-24 mb-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
            <svg className="w-10 h-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-300">No leads found</h3>
          <p className="text-gray-500 mt-2">Search above to generate automated job leads.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {applications.map((app, idx) => (
            <div 
              key={app.id || idx}
              className="group relative bg-white/[0.02] border border-white/[0.05] hover:border-blue-500/30 rounded-3xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold shadow-lg">
                      {app.authorName ? app.authorName.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-100">{app.authorName || 'Unknown Recruiter'}</h2>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {app.recruiterEmail}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-4 rounded-2xl bg-black/40 border border-white/5 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar">
                    {app.rawText}
                  </div>
                </div>
                
                <div className="flex flex-col items-start md:items-end justify-between min-w-[200px]">
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      app.status === 'SENT' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                      app.status === 'FAILED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-3 w-full">
                    {app.postUrl && (
                      <a 
                        href={app.postUrl.includes('manual_') ? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(app.authorName)}` : app.postUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-full text-center py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-colors"
                      >
                        {app.postUrl.includes('manual_') ? 'View Recruiter' : 'View on LinkedIn'}
                      </a>
                    )}
                    
                    {app.status === 'PENDING' || app.status === 'FAILED' ? (
                      <button 
                        onClick={() => handleSendEmail(app.id)}
                        disabled={loadingApps[app.id]}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-blue-500/25 text-sm font-bold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                      >
                        {loadingApps[app.id] ? (
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : null}
                        {app.status === 'FAILED' ? 'Retry Email' : 'Send Application'}
                      </button>
                    ) : (
                      <button disabled className="w-full text-center py-3 px-4 rounded-xl bg-white/5 text-gray-500 border border-white/5 text-sm font-bold cursor-not-allowed">
                        Application Sent
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
