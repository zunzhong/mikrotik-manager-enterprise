import { Link } from 'react-router-dom';

export function SummaryCard({
  label,
  value,
  hint,
  to,
}: {
  label: string;
  value: string | number;
  hint?: string;
  to?: string;
}) {
  const content = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </>
  );
  return to ? (
    <Link className="summary-card summary-card--link" to={to}>
      {content}
    </Link>
  ) : (
    <div className="summary-card">{content}</div>
  );
}
