import React, { useState } from 'react'
import { describeApiError } from '../services/apiService'
import '../styles/RatingForm.css'

export interface MoveRating {
  quality: number
  responsiveness: number
  correctness: number
  relevance: number
  salience: number
  review: string
}

interface RatingFormProps {
  onSubmit: (rating: MoveRating) => Promise<void>
}

const categories: Array<{ key: keyof Omit<MoveRating, 'review'>; label: string }> = [
  { key: 'quality', label: 'Move Quality' },
  { key: 'responsiveness', label: 'Move Responsiveness' },
  { key: 'correctness', label: 'Thoughts Correctness' },
  { key: 'relevance', label: 'Thoughts Relevance' },
  { key: 'salience', label: 'Thoughts Salience' },
]

const RatingForm: React.FC<RatingFormProps> = ({ onSubmit }) => {
  const [ratings, setRatings] = useState<Omit<MoveRating, 'review'>>({
    quality: 0,
    responsiveness: 0,
    correctness: 0,
    relevance: 0,
    salience: 0,
  })
  const [review, setReview] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const [error, setError] = useState<string | null>(null)
  const allRated = Object.values(ratings).every((rating) => rating >= 1 && rating <= 5)
  const disabled = status === 'saving' || status === 'saved'

  const updateRating = (key: keyof typeof ratings, value: number) => {
    setRatings((current) => ({ ...current, [key]: value }))
    setStatus('idle')
    setError(null)
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!allRated || disabled) return

    setStatus('saving')
    setError(null)
    try {
      await onSubmit({ ...ratings, review })
      setStatus('saved')
    } catch (submitError) {
      setStatus('failed')
      setError(describeApiError(submitError))
    }
  }

  return (
    <form className="rating-form" onSubmit={submit}>
      {categories.map(({ key, label }) => (
        <div className="rating-item" key={key}>
          <label>{label}:</label>
          <div className="star-rating">
            {[5, 4, 3, 2, 1].map((value) => (
              <button
                key={value}
                type="button"
                className={`star ${value <= ratings[key] ? 'filled' : ''}`}
                aria-label={`${label}: ${value} of 5`}
                aria-pressed={ratings[key] === value}
                disabled={disabled}
                onClick={() => updateRating(key, value)}
              >
                ★
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="rating-item">
        <label htmlFor="review">Review:</label>
        <textarea
          id="review"
          value={review}
          onChange={(event) => {
            setReview(event.target.value)
            setStatus('idle')
            setError(null)
          }}
          maxLength={5000}
          disabled={disabled}
          placeholder="Share any additional feedback about the move and commentary."
        />
      </div>
      <button type="submit" disabled={!allRated || disabled}>
        {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : 'Submit'}
      </button>
      {status === 'saved' && <p role="status">Rating saved.</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  )
}

export default RatingForm
