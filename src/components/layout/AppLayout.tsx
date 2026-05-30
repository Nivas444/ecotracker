import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Header />
        <main className="page-content">
          <Outlet />
        </main>
        <footer className="app-footer no-print">
          <div className="powered-by-footer">
            <div className="powered-by-label">Powered By</div>
            <div className="powered-by-value">
              <img src="/image-removebg.png" alt="SortyX logo" className="powered-by-logo" />
              <span className="powered-by-brand">SortyX</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
