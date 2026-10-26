import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { UserDataProvider } from './context/UserDataContext';
import { UiProvider } from './context/UiContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <UserDataProvider>
          <UiProvider>
            <App />
          </UiProvider>
        </UserDataProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
