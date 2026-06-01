"use client"

import { Star } from "lucide-react"
import { useState } from "react"

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  readonly?: boolean
  size?: "sm" | "md" | "lg"
}

const SIZE_CLASSES = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null)
  const sizeClass = SIZE_CLASSES[size]

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating)
    }
  }

  const handleMouseEnter = (rating: number) => {
    if (!readonly) {
      setHoverValue(rating)
    }
  }

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverValue(null)
    }
  }

  const displayValue = hoverValue ?? value

  return (
    <div
      className="inline-flex items-center gap-1"
      role={readonly ? "img" : "radiogroup"}
      aria-label={`Calificación: ${value} de 5 estrellas`}
    >
      {[1, 2, 3, 4, 5].map((rating) => {
        const isActive = rating <= displayValue
        return (
          <button
            key={rating}
            type="button"
            onClick={() => handleClick(rating)}
            onMouseEnter={() => handleMouseEnter(rating)}
            onMouseLeave={handleMouseLeave}
            disabled={readonly}
            className={`transition-colors focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-1 rounded ${
              readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
            }`}
            aria-label={`${rating} estrella${rating !== 1 ? "s" : ""}`}
            role={readonly ? undefined : "radio"}
            aria-checked={readonly ? undefined : rating === value}
          >
            <Star
              className={`${sizeClass} transition-all ${
                isActive
                  ? "fill-amber-400 text-amber-400"
                  : "fill-none text-gray-300"
              }`}
              aria-hidden
            />
          </button>
        )
      })}
    </div>
  )
}
