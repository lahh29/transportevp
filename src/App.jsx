import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { TopNav } from './components/TopNav';
import { EmpresaPortal } from './pages/EmpresaPortal';
import { Login } from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ChoferPortal } from './pages/ChoferPortal';
import { ChoferLogin } from './pages/ChoferLogin';
import { EmpleadoLogin } from './pages/EmpleadoLogin';
import { EmpleadoDashboard } from './pages/EmpleadoDashboard';
import { Landing } from './pages/Landing';
import { QrPrintPage } from './pages/QrPrintPage';

// Wrapper to conditionally show TopNav (hide on login and landing)
const Layout = ({ children }) => {
  const location = useLocation();
  const isAuthView = location.pathname === '/' || location.pathname === '/login' || location.pathname.startsWith('/empleado') || location.pathname === '/chofer/login';
  return (
    <div className="app-container">
      <Toaster
        position="top-center"
        richColors
        closeButton
        expand={false}
        gap={8}
        offset="max(var(--spacing-sm), env(safe-area-inset-top))"
        visibleToasts={4}
        toastOptions={{
          duration: 3500,
          className: 'vp-toast',
          style: {
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--typography-body-sm-size)',
            borderRadius: 'var(--rounded-md)',
            border: '1px solid var(--color-hairline-soft)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
            padding: 'var(--spacing-sm) var(--spacing-base)',
          },
        }}
      />
      {!isAuthView && <TopNav />}
      <main className={isAuthView ? '' : 'vp-app-main'} style={isAuthView ? { padding: 0 } : { padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/chofer/login" element={<ChoferLogin />} />
          <Route path="/empleado/login" element={<EmpleadoLogin />} />
          <Route path="/empleado/dashboard" element={<EmpleadoDashboard />} />
          
          <Route path="/chofer" element={
            <ProtectedRoute allowedRoles={['admin', 'chofer']}>
              <ChoferPortal />
            </ProtectedRoute>
          } />
          
          <Route path="/empresa" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <EmpresaPortal />
            </ProtectedRoute>
          } />

          <Route path="/empresa/imprimir-qr" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <QrPrintPage />
            </ProtectedRoute>
          } />
          
          <Route path="/" element={<Landing />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
