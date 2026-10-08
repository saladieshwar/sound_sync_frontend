export default function ParticipantList({ room, currentUserId, onlineIds, onTransfer }) {
  const canTransfer = [room.admin_user_id, room.controller_user_id].includes(currentUserId)

  return (
    <ul data-testid="participant-list" className="flex flex-col gap-1.5">
      {room.participants.map(({ user }) => {
        const online = onlineIds.has(user.id)
        const isController = user.id === room.controller_user_id
        return (
          <li
            key={user.id}
            data-testid={`participant-${user.id}`}
            className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-200 ${
              isController
                ? 'border-emerald-500/20 bg-emerald-500/[0.06]'
                : 'border-white/5 bg-neutral-950/40 hover:border-white/10'
            }`}
          >
            <span className="relative shrink-0">
              <span
                aria-hidden="true"
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold uppercase ring-1 ${
                  isController
                    ? 'bg-linear-to-br from-emerald-400 to-emerald-600 text-neutral-950 ring-emerald-300/30'
                    : 'bg-linear-to-br from-neutral-600 to-neutral-800 text-white ring-white/10'
                } ${online ? '' : 'opacity-60'}`}
              >
                {user.username[0]}
              </span>
              <span
                role="img"
                aria-label={online ? 'Online' : 'Offline'}
                title={online ? 'Online' : 'Offline'}
                className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full ring-2 ring-neutral-900 ${online ? 'bg-emerald-400' : 'bg-neutral-600'}`}
              />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span
                className={`truncate text-sm font-medium ${online ? 'text-neutral-100' : 'text-neutral-400'}`}
              >
                {user.username}
                {user.id === currentUserId && <span className="font-normal text-neutral-500"> (you)</span>}
              </span>
              {(user.id === room.admin_user_id || isController) && (
                <span className="flex flex-wrap gap-1">
                  {user.id === room.admin_user_id && (
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-neutral-300 ring-1 ring-white/10">
                      Admin
                    </span>
                  )}
                  {isController && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                      Controller
                    </span>
                  )}
                </span>
              )}
            </span>
            {!isController && canTransfer && (
              <button
                data-testid={`transfer-${user.id}`}
                onClick={() => onTransfer(user.id)}
                aria-label={`Give control to ${user.username}`}
                className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-xs font-medium text-neutral-300 transition duration-200 hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:text-emerald-300 active:scale-95"
              >
                Give control
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
