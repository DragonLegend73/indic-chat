// @vitest-environment jsdom
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/utils';
import DashboardPage from './DashboardPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { server } from '../test/setup';
import { http, HttpResponse } from 'msw';

describe('DashboardPage', () => {
  it('renders student count correctly from mocked analytics', async () => {
    renderWithProviders(<DashboardPage />);
    
    // Total Students card (based on dashboard.json fixture: 150)
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText(/Total Students/i)).toBeInTheDocument();
    });
  });

  it('renders topics table correctly from mocked analytics', async () => {
    renderWithProviders(<DashboardPage />);

    // Table should contain 'Photosynthesis' topic from dashboard.json
    await waitFor(() => {
      expect(screen.getByText('Photosynthesis')).toBeInTheDocument();
      // Average accuracy (82) from fixture
      expect(screen.getByText('82%')).toBeInTheDocument();
    });
  });

  it('redirects to login on 401/403 errors', async () => {
    server.use(
      http.get('/api/analytics/overview', () => {
        return new HttpResponse(null, { status: 401 });
      })
    );

    renderWithProviders(<DashboardPage />);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/login');
    });
  });

  it('shows error message and retries on 500 error', async () => {
    let callCount = 0;
    server.use(
      http.get('/api/analytics/overview', () => {
        callCount++;
        if (callCount === 1) return new HttpResponse(null, { status: 500 });
        return HttpResponse.json({ total_students: 200 });
      })
    );

    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />);

    // Error appears
    expect(await screen.findByText(/500/i)).toBeInTheDocument();

    // Click retry
    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    await user.click(retryBtn);

    // Should load successfully now
    await waitFor(() => {
      expect(screen.getByText('200')).toBeInTheDocument();
    });
  });

  it('handles logout and refresh', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />);

    // Wait for load
    await waitFor(() => {
      expect(screen.getByText(/Teacher Dashboard/i)).toBeInTheDocument();
    });

    // Logout
    const logoutBtn = screen.getByRole('button', { name: /Logout/i });
    await user.click(logoutBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/login');

    // Refresh (triggered by another button)
    const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
    
    // Add a delay to overview to catch loading state
    server.use(
      http.get('/api/analytics/overview', async () => {
        await new Promise(r => setTimeout(r, 100));
        return HttpResponse.json({ total_students: 150 });
      })
    );

    await user.click(refreshBtn);
    
    // Check loading state appears
    expect(screen.getByText(/Loading analytics/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
    });
  });

  it('navigates back to student select via footer button', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />);
    
    const backBtn = await screen.findByRole('button', { name: /Back to Student Select/i });
    await user.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
