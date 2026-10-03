import NumberFlow from '@number-flow/react';
import { useI18n } from '@/i18n';

const format = { maximumFractionDigits: 2 };

/** The GitHub UI's animated amounts share the same precision and locale. */
export const MoneyNumber = ({ value }: { value: number }) => {
  const { locale } = useI18n();
  const safeValue = Number.isFinite(value) ? value : 0;
  return <NumberFlow value={safeValue} locales={locale} format={format}
    aria-label={new Intl.NumberFormat(locale,format).format(safeValue)} />;
};
