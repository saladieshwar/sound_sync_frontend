export default function ParticipantList({ room, currentUserId, onlineIds, onTransfer }) {
  const canTransfer = [room.admin_user_id, room.controller_user_id].includes(currentUserId)

  return (
    <ul data-testid="participant-list" className="flex flex-col gap-2">
      {room.participants.map(({ user }) => (
        <li key={user.id} className="flex items-center gap-3 rounded bg-neutral-900 px-3 py-2">
          <span
            className={`h-2 w-2 rounded-full ${onlineIds.has(user.id) ? 'bg-emerald-400' : 'bg-neutral-600'}`}
          />
          <span className="flex-1">
            {user.username}
            {user.id === currentUserId && ' (you)'}
          </span>
          {user.id === room.admin_user_id && <span className="text-xs text-neutral-400">Admin</span>}
          {user.id === room.controller_user_id ? (
            <span className="text-xs font-semibold text-emerald-400">Controller</span>
          ) : (
            canTransfer && (
              <button
                data-testid={`transfer-${user.id}`}
                onClick={() => onTransfer(user.id)}
                className="text-xs text-neutral-300 underline hover:text-white"
              >
                Give control
              </button>
            )
          )}
        </li>
      ))}
    </ul>
  )
}
