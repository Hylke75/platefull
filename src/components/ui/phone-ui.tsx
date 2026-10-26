// Herbruikbare appcomponenten. Markup en classnames volgen design-source/dist/app.js
// letterlijk; de styling komt uit src/styles/styles.css en brand-v2.css.
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

export function AppHeader({ initials = 'EV' }: { initials?: string }) {
  return (
    <header className="app-header">
      <span className="app-brand"><img src="/assets/plateful-icon.svg" alt="" />plateful<i>.</i></span>
      <span className="avatar-small">{initials}</span>
    </header>
  );
}

export function SubHeader({ title, onBack, backHref }: { title: string; onBack?: () => void; backHref?: string }) {
  return (
    <div className="sub-app-head">
      {backHref
        ? <a className="round-back" href={backHref} aria-label="Terug">‹</a>
        : <button className="round-back" data-action="back" aria-label="Terug" onClick={onBack}>‹</button>}
      <span className="head-kicker">{title}</span>
      <span className="head-icon">✳</span>
    </div>
  );
}

export interface DayPillData { key: string; dayLabel: string; dayNumber: string; selected?: boolean; href?: string }

export function DatePill({ day }: { day: DayPillData }) {
  const inner = <><b>{day.dayLabel}</b><strong>{day.dayNumber}</strong></>;
  const className = `day-pill${day.selected ? ' selected' : ''}`;
  return day.href ? <a className={className} href={day.href} aria-current={day.selected ? 'date' : undefined}>{inner}</a> : <span className={className}>{inner}</span>;
}

export function DayLine({ days, label }: { days: DayPillData[]; label?: ReactNode }) {
  return (
    <div className="day-line">
      <div className="day-pills">{days.map((d) => <DatePill key={d.key} day={d} />)}</div>
      {label ? <span className="little-label">{label}</span> : null}
    </div>
  );
}

export function MealHeroCard({ image, name, tag, minutes, diners }: { image: string; name: string; tag: string; minutes: ReactNode; diners: number }) {
  return (
    <article className="dinner-hero">
      <img src={image} alt={name} />
      <div className="dinner-overlay">
        <span className="small-glass-tag">✳ {tag}</span>
        <div>
          <h3>{name}</h3>
          <div className="dinner-metadata"><span>◷ {minutes} min</span><span>◉ {diners} personen</span><span>♡ 1 maaltijd</span></div>
        </div>
      </div>
    </article>
  );
}

export function MatchPanel({ title, badge, initials, comment, note, badgeVariant = 'ok' }: {
  title: string; badge: ReactNode; initials: string[]; comment: string; note: ReactNode; badgeVariant?: 'ok' | 'check';
}) {
  return (
    <div className="match-panel">
      <div className="match-top"><span>{title}</span><span className={`match-badge${badgeVariant === 'check' ? ' is-check' : ''}`}>{badge}</span></div>
      <div className="avatar-row">
        <div className="mini-avatars">{initials.map((i, idx) => <span key={idx}>{i}</span>)}</div>
        <span className="avatar-comment">{comment}</span>
      </div>
      <div className="micro-note"><span>✳</span>{note}</div>
    </div>
  );
}

export function PlanBStrip({ title, subtitle, onClick, href }: { title: string; subtitle: string; onClick?: () => void; href?: string }) {
  const inner = <><span><strong>{title}</strong><small>{subtitle}</small></span><span className="arrow-circle">→</span></>;
  return href
    ? <a className="planb-strip" href={href}>{inner}</a>
    : <button className="planb-strip" data-action="planb" onClick={onClick}>{inner}</button>;
}

export function FamilyAvatar({ color, initial, style }: { color: string; initial: string; style?: CSSProperties }) {
  return <span className={`person-avatar ${color}`} style={style}>{initial}</span>;
}

export function FamilyPersonRow({ color, initial, name, role, sub, onClick, href }: {
  color: string; initial: string; name: string; role: string; sub: ReactNode; onClick?: () => void; href?: string;
}) {
  const inner = (
    <>
      <FamilyAvatar color={color} initial={initial} />
      <span className="person-detail">
        <strong>{name} <span style={{ fontSize: 10, fontWeight: 500, color: '#91a294' }}>· {role}</span></strong>
        <small>{sub}</small>
      </span>
      <span className="person-arrow">›</span>
    </>
  );
  return href ? <a className="family-person" href={href}>{inner}</a> : <button className="family-person" onClick={onClick}>{inner}</button>;
}

export function TasteChip({ type, children }: { type: string; children: ReactNode }) {
  return <span className={`taste-status ${type}`}>{children}</span>;
}

export function TasteRow({ food, label, type, children }: { food: ReactNode; label: ReactNode; type: string; children?: ReactNode }) {
  return <div className="taste-row"><span>{food}</span>{children ?? <TasteChip type={type}>{label}</TasteChip>}</div>;
}

export function Switch({ on, onToggle, label, disabled }: { on: boolean; onToggle: () => void; label: string; disabled?: boolean }) {
  return <button className={`switch${on ? ' is-on' : ''}`} data-action="toggle-override" aria-label={label} aria-pressed={on} onClick={onToggle} disabled={disabled} />;
}

export function ShoppingItem({ label, amount, checked, onChange, disabled, extra }: {
  label: ReactNode; amount: ReactNode; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; extra?: ReactNode;
}) {
  return (
    <label className={`shopping-item${checked ? ' done' : ''}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}{extra}</span>
      <span className="amount">{amount}</span>
    </label>
  );
}

export function PrimaryButton({ children, wide, style, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { wide?: boolean }) {
  return <button className={`btn btn-primary${wide ? ' btn-wide' : ''}`} style={style} {...rest}>{children}</button>;
}

export function SecondaryButton({ children, wide, style, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { wide?: boolean }) {
  return <button className={`btn btn-plain${wide ? ' btn-wide' : ''}`} style={style} {...rest}>{children}</button>;
}

export function OrangeButton({ children, wide, style, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { wide?: boolean }) {
  return <button className={`btn btn-orange${wide ? ' btn-wide' : ''}`} style={style} {...rest}>{children}</button>;
}

export function Toast({ message }: { message: string }) {
  return <div className="toast" role="status">{message}</div>;
}

export function SafeNote({ children }: { children: ReactNode }) {
  return <p className="safe-note">{children}</p>;
}

export function RecipeStep({ index, total, title, body, minutes }: { index: number; total: number; title: string; body: string; minutes?: number | null }) {
  return (
    <div className="recipe-step">
      <div>STAP {index} VAN {total}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {minutes ? <div className="step-timer">◷ {minutes} minuten</div> : null}
    </div>
  );
}
