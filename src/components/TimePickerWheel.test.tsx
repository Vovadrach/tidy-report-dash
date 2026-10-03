// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TimePickerWheel } from './TimePickerWheel';
afterEach(cleanup);
describe('точність вибору часу', () => {
  it('підтвердження без змін зберігає точні години й суму', () => {
    const changed = vi.fn();
    render(<TimePickerWheel value="1:11" exactHours={1.1875} currentAmount={14.25} hourlyRate={12} onChange={changed} />);
    fireEvent.click(screen.getByRole('button', { name: 'Змінити години' }));
    fireEvent.click(screen.getByRole('button', { name: 'Підтвердити' }));
    expect(changed).toHaveBeenCalledWith('1:11', { hours: 1.1875, amount: 14.25, manual: false });
  });
  it('зберігає вручну введену суму після blur', () => {
    const changed = vi.fn();
    render(<TimePickerWheel value="1" hourlyRate={12} onChange={changed} />);
    fireEvent.click(screen.getByRole('button', { name: 'Змінити години' }));
    fireEvent.change(screen.getByLabelText('Сума за роботу'), { target: { value: '14.25' } });
    fireEvent.blur(screen.getByLabelText('Сума за роботу'));
    fireEvent.click(screen.getByRole('button', { name: 'Підтвердити' }));
    expect(changed).toHaveBeenCalledWith('1:11', { hours: 1.1875, amount: 14.25, manual: true });
  });
  it('не дозволяє від’ємну оплату', () => {
    const changed = vi.fn();
    render(<TimePickerWheel value="1" hourlyRate={12} onChange={changed} />);
    fireEvent.click(screen.getByRole('button', { name: 'Змінити години' }));
    fireEvent.change(screen.getByLabelText('Сума за роботу'), { target: { value: '-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Підтвердити' }));
    expect(changed).not.toHaveBeenCalled();
  });
});
