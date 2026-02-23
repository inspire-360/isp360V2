import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LineProvider } from './contexts/LineContext'; // Import Line Provider
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <BrowserRouter>
      {/* ห่อด้วย LineProvider เพื่อให้เชื่อมต่อ LINE ได้ทั้งแอป */}
      <LineProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </LineProvider>
    </BrowserRouter>
  );
}
export default App;