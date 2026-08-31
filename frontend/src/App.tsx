import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/Login/LoginPage';
import AgendaPage from './pages/Agenda/AgendaPage';
import ClientsPage from './pages/Clients/ClientsPage';
import CatalogPage from './pages/Catalog/CatalogPage';
import FinancePage from './pages/Finance/FinancePage';
import StaffPage from './pages/Staff/StaffPage';
import MyClientsPage from './pages/MyClients/MyClientsPage';
import WhatsappPage from './pages/Whatsapp/WhatsappPage';
import SettingsPage from './pages/Settings/SettingsPage';
import NavBar from './components/NavBar';

function ProtectedLayout({
  children,
  ownerOnly = false,
  professionalOnly = false,
}: {
  children: React.ReactNode;
  ownerOnly?: boolean;
  professionalOnly?: boolean;
}) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (ownerOnly && session.role !== 'OWNER' && session.role !== 'SYSADMIN') return <Navigate to="/" replace />;
  if (professionalOnly && session.role !== 'PROFESSIONAL') return <Navigate to="/" replace />;

  return (
    <>
      <NavBar />
      {children}
    </>
  );
}

function AppRoutes() {
  const { session } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedLayout>
            <AgendaPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/mis-clientas"
        element={
          <ProtectedLayout professionalOnly>
            <MyClientsPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/clientes"
        element={
          <ProtectedLayout ownerOnly>
            <ClientsPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/catalogo"
        element={
          <ProtectedLayout ownerOnly>
            <CatalogPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/finanzas"
        element={
          <ProtectedLayout ownerOnly>
            <FinancePage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/personal"
        element={
          <ProtectedLayout ownerOnly>
            <StaffPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/whatsapp"
        element={
          <ProtectedLayout ownerOnly>
            <WhatsappPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/configuracion"
        element={
          <ProtectedLayout ownerOnly>
            <SettingsPage />
          </ProtectedLayout>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" richColors closeButton toastOptions={{ style: { borderRadius: '0.75rem' } }} />
      </BrowserRouter>
    </AuthProvider>
  );
}
