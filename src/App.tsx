import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import Header from './components/Header';
import TabBar from './components/TabBar';
import { useUi } from './context/UiContext';
import { useNarrow } from './hooks/useMedia';
import HomePage from './pages/HomePage';
import CategoryPage from './pages/CategoryPage';
import SearchPage from './pages/SearchPage';
import VenuePage from './pages/VenuePage';
import BookingPage from './pages/BookingPage';
import PayPage from './pages/PayPage';
import ConfirmationPage from './pages/ConfirmationPage';
import AppointmentsPage from './pages/AppointmentsPage';
import BookingDetailPage from './pages/BookingDetailPage';
import ReviewPage from './pages/ReviewPage';
import AccountPage from './pages/AccountPage';
import WalletPage from './pages/WalletPage';
import PrivacyPage from './pages/PrivacyPage';
import SavedPage from './pages/SavedPage';
import InboxPage from './pages/InboxPage';
import GiftPage from './pages/GiftPage';
import HelpPage from './pages/HelpPage';
import OnboardingPage from './pages/OnboardingPage';
import VerifyPage from './pages/VerifyPage';
import ResetPage from './pages/ResetPage';
import NotFoundPage from './pages/NotFoundPage';
import BusinessRoute from './components/BusinessRoute';
import BusinessSignupPage from './pages/business/BusinessSignupPage';
import BusinessBookingsPage from './pages/business/BusinessBookingsPage';
import BusinessTreatmentsPage from './pages/business/BusinessTreatmentsPage';
import BusinessProfilePage from './pages/business/BusinessProfilePage';
import { bookUrl } from './utils/booking';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** /login and /register are kept for deep links; they open the auth modal. */
function AuthRoute() {
  const { openAuth } = useUi();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  useEffect(() => {
    openAuth({ onSuccess: () => navigate(from) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Navigate to={from} replace />;
}

/** Old single-treatment booking URL → new multi-treatment one. */
function LegacyBookRedirect() {
  const { id = '', treatmentId = '' } = useParams();
  return <Navigate to={bookUrl(id, { t: [treatmentId] })} replace />;
}

export default function App() {
  const narrow = useNarrow();
  return (
    <div className="app">
      <ScrollToTop />
      <Header />
      <main className="main" style={{ paddingBottom: narrow ? 72 : 0 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/c/:category" element={<CategoryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/venue/:id" element={<VenuePage />} />
          <Route path="/venue/:id/book" element={<BookingPage />} />
          <Route path="/venue/:id/book/:treatmentId" element={<LegacyBookRedirect />} />
          <Route path="/venue/:id/pay" element={<PayPage />} />
          <Route path="/booked/:id" element={<ConfirmationPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/booking/:id" element={<BookingDetailPage />} />
          <Route path="/review/:id" element={<ReviewPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/payments" element={<WalletPage />} />
          <Route path="/account/privacy" element={<PrivacyPage />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/gift" element={<GiftPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/onboard" element={<OnboardingPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/reset" element={<ResetPage />} />
          <Route path="/login" element={<AuthRoute />} />
          <Route path="/register" element={<AuthRoute />} />

          {/* Business (venue) side */}
          <Route path="/business/signup" element={<BusinessSignupPage />} />
          <Route path="/business" element={<Navigate to="/business/bookings" replace />} />
          <Route path="/business/bookings" element={<BusinessRoute><BusinessBookingsPage /></BusinessRoute>} />
          <Route path="/business/treatments" element={<BusinessRoute><BusinessTreatmentsPage /></BusinessRoute>} />
          <Route path="/business/profile" element={<BusinessRoute><BusinessProfilePage /></BusinessRoute>} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {narrow && <TabBar />}
    </div>
  );
}
