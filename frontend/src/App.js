import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import VehicleDetail from './pages/VehicleDetail';
import Drivers from './pages/Drivers';
import DriverDetail from './pages/DriverDetail';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Trips from './pages/Trips';
import TripDetail from './pages/TripDetail';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import Accounting from './pages/Accounting';
import Banking from './pages/Banking';
import Reports from './pages/Reports';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="vehicles" element={<Vehicles />} />
            <Route path="vehicles/:id" element={<VehicleDetail />} />
            <Route path="drivers" element={<Drivers />} />
            <Route path="drivers/:id" element={<DriverDetail />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="trips" element={<Trips />} />
            <Route path="trips/:id" element={<TripDetail />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="invoices/:id" element={<InvoiceDetail />} />
            <Route path="accounting" element={<Accounting />} />
            <Route path="banking" element={<Banking />} />
            <Route path="reports" element={<Reports />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
