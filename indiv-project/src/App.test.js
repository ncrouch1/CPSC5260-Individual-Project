import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const label = screen.getByLabelText("Code Box");
  const textbox = screen.getByText("Code goes in here...");
  expect(label).toBeInTheDocument();
  expect(textbox).toBeInTheDocument();
});
