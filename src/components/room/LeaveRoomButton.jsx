export default function LeaveRoomButton({ onLeave }) {
  return (
    <button
      data-testid="leave-room"
      onClick={onLeave}
      className="flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-900/40 transition duration-200 hover:-translate-y-px hover:bg-red-500 hover:shadow-red-700/40 active:translate-y-0 active:scale-95"
    >
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
      </svg>
      Leave Room
    </button>
  )
}
