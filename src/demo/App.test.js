import { render } from '@testing-library/react';
import App from './App';

// the demo feed would otherwise open a real HTTPS connection from jsdom —
// the socket outlives the test and keeps the Jest worker from exiting
beforeEach(() => {
  jest.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));
});
afterEach(() => jest.restoreAllMocks());

// demo shell smoke test: the provider + chart wrapper mount without throwing
// and the chart chrome appears (the plot itself needs a measured parent size,
// which jsdom doesn't provide)
test('renders the chart shell', () => {
  const { container } = render(<App />);
  expect(container.querySelector('.ofc-base-content-wrapper')).not.toBeNull();
});
