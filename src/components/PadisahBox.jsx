import { useDroppable } from '@dnd-kit/core'
import { IslahatCard } from './IslahatCard.jsx'

export function PadisahBox({
  padisah,
  items,
  results,
  checked,
  revealed,
  onToggleReveal,
  correctPadisahNameFor,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `box-${padisah.id}`,
    data: { padisahId: padisah.id },
  })

  return (
    <div ref={setNodeRef} className={`box ${isOver ? 'over' : ''}`}>
      <div className="box-head">
        <span className="box-name">{padisah.ad}</span>
        <span className="box-yy">{padisah.yy}. yy</span>
      </div>
      <div className="box-body">
        {items.length === 0 && (
          <div className="box-empty">buraya sürükle</div>
        )}
        {items.map(i => {
          const state = results?.[i.id]
          const isWrong = state === 'wrong'
          const isRevealed = isWrong && revealed?.has(i.id)
          return (
            <IslahatCard
              key={i.id}
              islahat={i}
              size="small"
              resultState={state}
              disabled={checked}
              onClick={isWrong ? onToggleReveal : undefined}
              revealedAnswer={isRevealed ? correctPadisahNameFor(i.id) : null}
            />
          )
        })}
      </div>
    </div>
  )
}
