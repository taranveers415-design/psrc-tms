import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { Truck, ArrowLeft, Wrench, Fuel, AlertTriangle, MapPin, Calendar, User, Gauge } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const VehicleDetail = () => {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchVehicle(); }, [id]);

  const fetchVehicle = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/vehicles/${id}`);
      setVehicle(res.data);
    } catch (error) { toast.error('Failed to fetch vehicle details'); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  if (!vehicle) return <div className="text-center py-12 text-gray-500">Vehicle not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/vehicles" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{vehicle.vehicle_number}</h1>
          <p className="text-gray-500">{vehicle.make} {vehicle.model} • {vehicle.vehicle_type}</p>
        </div>
      </div>

      {/* Document Alerts */}
      {vehicle.documentAlerts?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-800">Document Expiry Alerts</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {vehicle.documentAlerts.map((alert, index) => (
              <div key={index} className="bg-white rounded-lg p-3 border border-amber-100">
                <p className="text-sm font-medium text-amber-900">{alert.type}</p>
                <p className="text-xs text-amber-700">Expires: {format(new Date(alert.expiry), 'dd MMM yyyy')}</p>
                <p className="text-xs text-red-600 font-medium">{alert.daysLeft} days left</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vehicle Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2"><Gauge className="w-4 h-4 text-primary-500" /><span className="text-sm text-gray-500">Odometer</span></div>
          <p className="text-xl font-bold text-gray-900">{Number(vehicle.current_odometer).toLocaleString()} km</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2"><Truck className="w-4 h-4 text-primary-500" /><span className="text-sm text-gray-500">Capacity</span></div>
          <p className="text-xl font-bold text-gray-900">{vehicle.capacity_tons} tons</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2"><Fuel className="w-4 h-4 text-primary-500" /><span className="text-sm text-gray-500">Fuel Type</span></div>
          <p className="text-xl font-bold text-gray-900 capitalize">{vehicle.fuel_type}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2"><User className="w-4 h-4 text-primary-500" /><span className="text-sm text-gray-500">Driver</span></div>
          <p className="text-xl font-bold text-gray-900">{vehicle.driver_name || 'Unassigned'}</p>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Documents</h3></div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'RC Number', value: vehicle.rc_number, expiry: vehicle.rc_expiry },
            { label: 'Insurance', value: vehicle.insurance_number, expiry: vehicle.insurance_expiry },
            { label: 'Fitness', value: vehicle.fitness_certificate, expiry: vehicle.fitness_expiry },
            { label: 'Permit', value: vehicle.permit_type, expiry: vehicle.permit_expiry },
            { label: 'Chassis', value: vehicle.chassis_number },
            { label: 'Engine', value: vehicle.engine_number },
          ].map((doc, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">{doc.label}</p>
              <p className="text-sm font-medium text-gray-900">{doc.value || 'N/A'}</p>
              {doc.expiry && <p className="text-xs text-gray-500">Exp: {format(new Date(doc.expiry), 'dd MMM yyyy')}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Maintenance History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Maintenance History</h3>
          <button className="text-sm text-primary-600 hover:underline">Add Record</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Cost</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Odometer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(vehicle.maintenance || []).map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600">{format(new Date(record.created_at), 'dd MMM yyyy')}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 capitalize">{record.maintenance_type}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.description}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900">₹{Number(record.cost).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900">{Number(record.odometer_reading).toLocaleString()} km</td>
                </tr>
              ))}
              {(vehicle.maintenance || []).length === 0 && (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No maintenance records</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fuel Logs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Fuel Logs</h3>
          <button className="text-sm text-primary-600 hover:underline">Add Fuel Entry</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Station</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Liters</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Rate</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Odometer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(vehicle.fuelLogs || []).map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600">{format(new Date(log.filled_at), 'dd MMM yyyy')}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{log.fuel_station}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900">{log.quantity_liters} L</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900">₹{log.rate_per_liter}</td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">₹{Number(log.total_amount).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900">{Number(log.odometer_reading).toLocaleString()} km</td>
                </tr>
              ))}
              {(vehicle.fuelLogs || []).length === 0 && (
                <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">No fuel logs</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetail;
