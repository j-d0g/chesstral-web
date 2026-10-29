import React, { useEffect, useRef, useState } from 'react'
import { apiService } from '../services/apiService'
import type { MoveRating } from './RatingForm'
import RatingForm from './RatingForm'
import { CommentaryMessage } from '../types/CommentaryMessage'
import '../styles/CommentaryBox.css'

interface CommentaryBoxProps {
  commentaryHistory: CommentaryMessage[]
  commentaryBoxRef: React.RefObject<HTMLDivElement>
  onRatingSubmit: (index: number) => void
  uuid: string
}

const CommentaryBox: React.FC<CommentaryBoxProps> = ({
  commentaryHistory,
  commentaryBoxRef,
  onRatingSubmit,
  uuid,
}) => {
  const [expandedMessageIndex, setExpandedMessageIndex] = useState<number | null>(null)
  const messageRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (commentaryBoxRef.current) {
      commentaryBoxRef.current.scrollTop = commentaryBoxRef.current.scrollHeight
    }
  }, [commentaryHistory, commentaryBoxRef])

  useEffect(() => {
    if (expandedMessageIndex === null) return
    const messageElement = messageRefs.current[expandedMessageIndex]
    const box = commentaryBoxRef.current
    if (messageElement && box) {
      const messageBottom = messageElement.offsetTop + messageElement.offsetHeight
      const boxBottom = box.scrollTop + box.clientHeight
      if (messageBottom > boxBottom) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }
    }
  }, [expandedMessageIndex, commentaryBoxRef])

  const handleRatingSubmit = async (index: number, rating: MoveRating) => {
    const message = commentaryHistory[index]
    await apiService.rateMove({
      game_id: uuid,
      engine: message.engineName,
      fen: message.fen,
      move: message.move,
      move_number: String(message.moveNumber ?? ''),
      commentary: message.commentary,
      ...rating,
    })
    onRatingSubmit(index)
  }

  return (
    <div ref={commentaryBoxRef} className="commentary-box">
      {commentaryHistory.map((message, index) => {
        if (message.engineName === 'You') return null
        const expanded = index === expandedMessageIndex

        return (
          <div
            key={`${message.fen}-${index}`}
            ref={(element) => { messageRefs.current[index] = element }}
            className={`commentary-message ${expanded ? 'expanded' : ''}`}
            onClick={(event) => {
              if (!(event.target as HTMLElement).closest('.rating-form')) {
                setExpandedMessageIndex(expanded ? null : index)
              }
            }}
          >
            <div className="message-content">
              <div className="message-header">
                <strong>{message.engineName}</strong>
                {message.reviewed && (
                  <span className="reviewed-message" aria-label="Rating saved">
                    <span className="tick">✓</span>
                  </span>
                )}
              </div>
              <p>{message.moveNumber} {message.moveSequence}</p>
              <p>{message.commentary}</p>
            </div>
            {expanded && (
              <div className="rating-form-container">
                {message.reviewed
                  ? <p role="status">Thanks for your feedback.</p>
                  : <RatingForm onSubmit={(rating) => handleRatingSubmit(index, rating)} />}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default CommentaryBox
