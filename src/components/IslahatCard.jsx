import { useDraggable } from '@dnd-kit/core'

export function IslahatCard({
  islahat,
  size = 'small',
  resultState,
  disabled = false,
  onClick,
  revealedAnswer,
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `islahat-${islahat.id}`,
    data: { islahatId: islahat.id },
    disabled,
  })

  const isRevealable = !!onClick
  const classes = [
    'card',
    size === 'big' ? 'big' : 'small',
    isDragging ? 'dragging' : '',
    resultState === 'correct' ? 'correct' : '',
    resultState === 'wrong' ? 'wrong' : '',
    isRevealable ? 'clickable' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      ref={setNodeRef}
      {...(disabled ? {} : attributes)}
      {...(disabled ? {} : listeners)}
      className={classes}
      onClick={isRevealable ? () => onClick(islahat.id) : undefined}
    >
      <div className="card-text">
        {resultState === 'correct' && <span className="badge">✓</span>}
        {resultState === 'wrong' && <span className="badge">!</span>}
        {islahat.ad}
      </div>
      {revealedAnswer && (
        <div className="card-answer">
          → Doğru: <b>{revealedAnswer}</b>
        </div>
      )}
    </div>
  )
}
