import { render, fireEvent } from '@testing-library/react';
import ThemeBuilder from './ThemeBuilder';

const noop = () => {};
const baseProps = {
  existingNames: ['Neon', 'Grape'],
  onSave: noop,
  onDelete: noop,
  onClose: noop,
  onPreview: noop,
};

test('creating with a name that already exists blocks save', () => {
  const onSave = jest.fn();
  const { getByPlaceholderText, getByText } = render(
    <ThemeBuilder {...baseProps} initial={null} onSave={onSave} />
  );
  fireEvent.change(getByPlaceholderText('My theme…'), { target: { value: 'Neon' } });
  expect(getByText('A theme with this name already exists.')).toBeInTheDocument();
  const save = getByText('Save');
  expect(save).toBeDisabled();
  fireEvent.click(save);
  expect(onSave).not.toHaveBeenCalled();
});

test('renaming onto another existing theme blocks save; own name stays allowed', () => {
  const onSave = jest.fn();
  const { getByPlaceholderText, getByText, queryByText } = render(
    <ThemeBuilder {...baseProps} initial={{ name: 'Grape', vars: {} }} onSave={onSave} />
  );
  // its own current name is fine
  expect(queryByText('A theme with this name already exists.')).toBeNull();
  expect(getByText('Save')).not.toBeDisabled();
  // renaming onto Neon would silently overwrite it — blocked
  fireEvent.change(getByPlaceholderText('My theme…'), { target: { value: 'Neon' } });
  expect(getByText('A theme with this name already exists.')).toBeInTheDocument();
  expect(getByText('Save')).toBeDisabled();
});

test('delete asks for confirmation before firing', () => {
  const onDelete = jest.fn();
  const { getByText } = render(
    <ThemeBuilder {...baseProps} initial={{ name: 'Grape', vars: {} }} onDelete={onDelete} />
  );
  fireEvent.click(getByText('Delete'));
  expect(onDelete).not.toHaveBeenCalled();
  fireEvent.click(getByText('Confirm Delete'));
  expect(onDelete).toHaveBeenCalledWith('Grape');
});
