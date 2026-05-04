import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const ClientDetail = () => {
  const { id } = useParams();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/clients" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-2xl font-bold text-gray-900">Client Details</h1>
      </div>
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
        <p className="text-gray-500">ID: {id}</p>
        <p className="text-gray-400 mt-2">Full detail view coming soon. API endpoints are ready.</p>
      </div>
    </div>
  );
};

export default ClientDetail;
