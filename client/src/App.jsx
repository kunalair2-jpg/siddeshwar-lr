import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import LRList from "./pages/LRList";
import NewLR from "./pages/NewLR";
import LRDetail from "./pages/LRDetail";
import Settings from "./pages/Settings";
import GateControl from "./pages/GateControl";
import DepartureLog from "./pages/DepartureLog";
import DeliveryQueue from "./pages/DeliveryQueue";
import DeliveryVerification from "./pages/DeliveryVerification";
import DeliveryLog from "./pages/DeliveryLog";
import Inspections from "./pages/Inspections";
import InspectionDetail from "./pages/InspectionDetail";
import Reconciliation from "./pages/Reconciliation";

const HOME_BY_ROLE = { security: "/gate", receiver: "/delivery" };
function homeFor(role) {
  return HOME_BY_ROLE[role] || "/";
}

function PrivateRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute roles={["owner", "dispatcher"]}>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <PrivateRoute roles={["owner", "dispatcher"]}>
            <Reports />
          </PrivateRoute>
        }
      />
      <Route
        path="/lrs"
        element={
          <PrivateRoute roles={["owner", "dispatcher"]}>
            <LRList />
          </PrivateRoute>
        }
      />
      <Route
        path="/lrs/new"
        element={
          <PrivateRoute roles={["owner", "dispatcher"]}>
            <NewLR />
          </PrivateRoute>
        }
      />
      <Route
        path="/lrs/:id"
        element={
          <PrivateRoute roles={["owner", "dispatcher"]}>
            <LRDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute roles={["owner", "dispatcher"]}>
            <Settings />
          </PrivateRoute>
        }
      />
      <Route
        path="/gate"
        element={
          <PrivateRoute roles={["security"]}>
            <GateControl />
          </PrivateRoute>
        }
      />
      <Route
        path="/gate/log"
        element={
          <PrivateRoute roles={["security"]}>
            <DepartureLog />
          </PrivateRoute>
        }
      />
      <Route
        path="/delivery"
        element={
          <PrivateRoute roles={["receiver"]}>
            <DeliveryQueue />
          </PrivateRoute>
        }
      />
      <Route
        path="/delivery/:id"
        element={
          <PrivateRoute roles={["receiver"]}>
            <DeliveryVerification />
          </PrivateRoute>
        }
      />
      <Route
        path="/delivery/log"
        element={
          <PrivateRoute roles={["receiver"]}>
            <DeliveryLog />
          </PrivateRoute>
        }
      />
      <Route
        path="/inspections"
        element={
          <PrivateRoute roles={["receiver"]}>
            <Inspections />
          </PrivateRoute>
        }
      />
      <Route
        path="/inspections/:id"
        element={
          <PrivateRoute roles={["receiver"]}>
            <InspectionDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/reconciliation"
        element={
          <PrivateRoute roles={["receiver"]}>
            <Reconciliation />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
