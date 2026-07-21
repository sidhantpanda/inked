export function WidgetLabel({ children }: { children: string }) {
  return (
    <div className="widget-label">
      <span>{children}</span>
      <i />
    </div>
  );
}
