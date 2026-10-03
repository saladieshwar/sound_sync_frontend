export default function LeaveRoomButton({ onLeave }) {
  return (
    <button
      data-testid="leave-room"
      onClick={onLeave}
      className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
      </svg>
      Leave Room
    </button>
  )
}
