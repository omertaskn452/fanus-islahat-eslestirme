import { useDroppable } from '@dnd-kit/core'

export function FanusDroppable({ children }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'fanus',
    data: { back: true },
  })
  return (
    <div ref={setNodeRef} className={`fanus-current ${isOver ? 'over' : ''}`}>
      {children}
    </div>
  )
}
