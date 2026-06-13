import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { TopNav } from './components/TopNav';
import { EmpresaPortal } from './pages/EmpresaPortal';
import { Login } from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ChoferPortal } from './pages/ChoferPortal';
import { UsuarioPortal } from './pages/UsuarioPortal';
import { EmpleadoLogin } from './pages/EmpleadoLogin';
import { EmpleadoDashboard } from './pages/EmpleadoDashboard';
import { Landing } from './pages/Landing';

// Wrapper to conditionally show TopNav (hide on login and landing)
const Layout = ({ children }) => {
  const location = useLocation();
  const isAuthView = location.pathname === '/' || location.pathname === '/login' || location.pathname.startsWith('/empleado');
  return (
    <div className="app-container">
      <Toaster position="top-right" richColors />
      {!isAuthView && <TopNav />}
      <main style={isAuthView ? { padding: 0 } : { padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
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
          <Route path="/empleado/login" element={<EmpleadoLogin />} />
          <Route path="/empleado/dashboard" element={<EmpleadoDashboard />} />
          
          <Route path="/usuario" element={
            <ProtectedRoute allowedRoles={['admin', 'usuario']}>
              <UsuarioPortal />
            </ProtectedRoute>
          } />
          
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
          
          <Route path="/" element={<Landing />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
