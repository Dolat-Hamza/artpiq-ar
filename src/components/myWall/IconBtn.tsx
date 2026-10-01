export default function IconBtn({ children, onClick, label }:
  { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      title={label}
      className="h-7 w-7 flex items-center justify-center text-ink hover:bg-ink hover:text-paper transition-colors"
    >
      {children}
    </button>
  )
}
