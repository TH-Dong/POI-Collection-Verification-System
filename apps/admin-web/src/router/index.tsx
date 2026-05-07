import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import AppLayout from '../layouts/AppLayout';
import ConversationCenterPage from '../pages/ConversationCenterPage';
import DashboardPage from '../pages/DashboardPage';
import DisputeArbitrationPage from '../pages/DisputeArbitrationPage';
import DisputeDetailPage from '../pages/DisputeDetailPage';
import DisputeListPage from '../pages/DisputeListPage';
import DisputeResponsePage from '../pages/DisputeResponsePage';
import NoticeCenterPage from '../pages/NoticeCenterPage';
import LoginPage from '../pages/LoginPage';
import LandingPage from '../pages/LandingPage';
import NotFoundPage from '../pages/NotFoundPage';
import OperationsPage from '../pages/OperationsPage';
import PoiDetailPage from '../pages/PoiDetailPage';
import PoiListPage from '../pages/PoiListPage';
import PoiMapPage from '../pages/PoiMapPage';
import TaskCenterPage from '../pages/TaskCenterPage';
import UploadPage from '../pages/UploadPage';

export const router = createBrowserRouter([
  {
    path: '/landing',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute requiredRoles={['ADMIN', 'VERIFIER']} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: 'upload',
            element: <UploadPage />,
          },
          {
            path: 'tasks',
            element: <TaskCenterPage />,
          },
          {
            path: 'notices',
            element: <NoticeCenterPage />,
          },
          {
            path: 'chat',
            element: <ConversationCenterPage />,
          },
          {
            path: 'conversations',
            element: <ConversationCenterPage />,
          },
          {
            path: 'pois',
            element: <PoiListPage />,
          },
          {
            path: 'map',
            element: <PoiMapPage />,
          },
          {
            path: 'disputes',
            element: <DisputeListPage />,
          },
          {
            path: 'disputes/:disputeId',
            element: <DisputeDetailPage />,
          },
          {
            path: 'disputes/:disputeId/respond',
            element: <DisputeResponsePage />,
          },
          {
            path: 'disputes/:disputeId/arbitrate',
            element: <DisputeArbitrationPage />,
          },
          {
            path: 'pois/:poiId',
            element: <PoiDetailPage />,
          },
          {
            path: 'operations',
            element: <ProtectedRoute requiredRoles={['ADMIN']} />,
            children: [{ index: true, element: <OperationsPage /> }],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
