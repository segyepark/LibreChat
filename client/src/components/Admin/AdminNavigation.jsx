import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '~/hooks/AuthContext';
import { SystemRoles } from 'librechat-data-provider';
import { Settings, Database } from 'lucide-react';

const AdminNavigation = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  // 관리자가 아니면 렌더링하지 않음
  if (!user || user.role !== SystemRoles.ADMIN) {
    return null;
  }

  const menuItems = [
    {
      label: 'Shared RAG 관리',
      path: '/d/shared-rag',
      icon: Database,
      description: '공유 RAG 파일 관리'
    }
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Settings className="h-5 w-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-800">관리자 메뉴</h2>
      </div>
      
      <div className="grid gap-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                isActive 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                  : 'bg-white hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
              <div>
                <div className={`font-medium ${isActive ? 'text-blue-700' : 'text-gray-800'}`}>
                  {item.label}
                </div>
                <div className={`text-sm ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                  {item.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AdminNavigation;