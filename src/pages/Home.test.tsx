import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Home from './Home';
import axios from 'axios';

// Mock translation
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ 
    t: (key: string) => {
      const translations: Record<string, string> = {
        'homePage.create': 'Create',
        'homePage.schedulingNotEnabled': 'Scheduling is not enabled',
        'error.apiConnection': 'API Connection Error',
        'error.apiConnectionErrorMessage': 'API Connection Error. Error message is: Network Error',
      };
      return translations[key] || key;
    }
  })
}));
jest.mock('copy-to-clipboard', () => jest.fn());
jest.mock('axios');
jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: jest.fn(),
  }),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

beforeEach(() => {
  jest.useFakeTimers();
  // Default to an empty job list
  mockedAxios.get.mockResolvedValue({ data: { data: [] } });
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});
// describe('test Home', () => {
//   it('should render loading skeleton initially', async() => {
//     mockedAxios.get.mockResolvedValue({ data: { data: [] } });
//     await act(async () => {
//       render(<Home />);
//     });
//     expect(screen.getByTestId('mock-Skeleton')).toBeInTheDocument();
//   });

//   it('should render "create" button', async () => {
//     await act(async () => {
//       render(<Home />);
//     });
//     const button = screen.getByText('Create'); // 因為 t() 會回傳 key 本身
//     expect(button).toBeInTheDocument();
//   });

// });
test('displays loading skeleton and loads job list, including job data and actions', async () => {
  // Prepare sample jobs data
  const jobsData = [
    { job_name: 'TestJob', request_method: 'GET', request_url: 'http://example.com/api', authorization_method: 'bearer', interval: '5m', data_processing_method: 'append', status: 0, isActivity: false }
  ];
  mockedAxios.get.mockResolvedValueOnce({ data: { data: jobsData } });
  // const { container } = await act(() => render(<Home />));
  let container: HTMLElement;
  await act(async () => {
    const renderResult = render(<Home />);
    container = renderResult.container;
  });
  // Initially show skeleton
  // expect(container.querySelector('.p-skeleton')).toBeInTheDocument();
  // Wait for data to load
  // await waitFor(() => screen.getByText('TestJob'));
  // Job data should be rendered in table
  expect(screen.getByText('TestJob')).toBeInTheDocument();
  expect(screen.getByText('GET')).toBeInTheDocument();
  expect(screen.getByText('/api')).toBeInTheDocument();  // short URL of request_url
  expect(screen.getByText('bearer')).toBeInTheDocument(); 
  expect(screen.getByText('5m')).toBeInTheDocument();
  expect(screen.getByText('append')).toBeInTheDocument();
  expect(screen.getByText('Idle')).toBeInTheDocument();
  // The "Create" button should be visible and enabled
  const createButton = screen.getByRole('button', { name: 'Create' });
  expect(createButton).toBeEnabled();
  // Simulate clicking the copy URL button on the first job
  const copyButton = container.querySelector('.pi.pi-copy')?.parentElement as HTMLElement;
  await act(async() => {
    fireEvent.click(copyButton);
  });
  // After clicking copy, the icon should change to check (pi-check)
  expect(container.querySelector('.pi.pi-check')).toBeInTheDocument();
  // After 3 seconds, icon should revert to copy
  await act(() => {
    jest.advanceTimersByTime(4000);
  });
  expect(container.querySelector('.pi.pi-copy')).toBeInTheDocument();
  // Toggle activity switch
  const toggleSwitch = screen.getByRole('switch');
  expect(toggleSwitch).not.toBeChecked();
  await act(() => {
    fireEvent.click(toggleSwitch);
  });
  expect(screen.getByText('Active')).toBeInTheDocument();
  expect(toggleSwitch).toBeChecked();
  // The status should change to "Active"
  await act(() => {
    fireEvent.click(toggleSwitch);
  });
  expect(screen.getByText('Idle')).toBeInTheDocument();
  expect(toggleSwitch).not.toBeChecked();
});

test('shows error toast when fetching jobs fails', async () => {
  mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));
  let container: HTMLElement;
  await act(async () => {
    const renderResult = render(<Home />);
    container = renderResult.container;
  });
  // Error toast should appear
  expect(screen.getByText('API Connection Error')).toBeInTheDocument();
  expect(screen.getByText('API Connection Error. Error message is: Network Error')).toBeInTheDocument();
});
