interface AvatarProps {
  initials: string
  avatarUrl?: string | null
  className?: string
}

export function Avatar({ initials, avatarUrl, className = '' }: AvatarProps) {
  const classes = `avatar ${className}`.trim()
  if (avatarUrl) return <img className={classes} src={avatarUrl} alt="" />
  return <span className={classes} aria-hidden="true">{initials}</span>
}
