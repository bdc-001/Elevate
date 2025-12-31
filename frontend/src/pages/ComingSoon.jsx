import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Rocket, ArrowLeft } from 'lucide-react';

export default function ComingSoon() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="text-center max-w-2xl">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full mb-8">
          <Rocket size={48} className="text-blue-600" />
        </div>
        
        <h1 className="text-5xl font-bold text-slate-800 mb-4">Coming Soon</h1>
        <p className="text-xl text-slate-600 mb-8">
          This feature is under development and will be available soon.
        </p>
        
        <div className="bg-white rounded-lg p-8 border border-slate-200 mb-8">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Available Features:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
              <div>
                <p className="font-medium text-slate-800">Dashboard</p>
                <p className="text-sm text-slate-600">View customer success metrics</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
              <div>
                <p className="font-medium text-slate-800">Customers</p>
                <p className="text-sm text-slate-600">Manage customer accounts</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
              <div>
                <p className="font-medium text-slate-800">Activities</p>
                <p className="text-sm text-slate-600">Log customer interactions</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
              <div>
                <p className="font-medium text-slate-800">Risks & Opportunities</p>
                <p className="text-sm text-slate-600">Track risks and sales pipeline</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center space-x-4">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="flex items-center space-x-2"
            data-testid="go-back-button"
          >
            <ArrowLeft size={18} />
            <span>Go Back</span>
          </Button>
          <Button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="go-home-button"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
