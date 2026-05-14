import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Home from './components/Home';

test('Home renders welcome heading', () => {
  render(<BrowserRouter><Home /></BrowserRouter>);
  expect(screen.getByText(/Welcome to Nile/i)).toBeInTheDocument();
});
